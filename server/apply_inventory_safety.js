/**
 * apply_inventory_safety.js
 * Pushes fn_is_stock_available + the patched proc_create_order to live DB.
 * Idempotent — safe to re-run at any time.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');

const SQL = `
-- ============================================================
-- 1. SAFETY HELPER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION fn_is_stock_available(
    p_variant_id INTEGER,
    p_quantity    INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    total_stock INTEGER;
BEGIN
    SELECT COALESCE(SUM(stock_quantity), 0)
    INTO total_stock
    FROM Inventory
    WHERE variant_id = p_variant_id;

    RETURN total_stock >= p_quantity;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 2. PATCHED PROCEDURE
--    - Calls fn_is_stock_available on every cart item
--    - Fixes UPDATE Inventory to scope to nearby_warehouse_id
-- ============================================================
CREATE OR REPLACE PROCEDURE proc_create_order(
    IN p_user_id INTEGER,
    IN p_address_id INTEGER,
    OUT new_order_id INTEGER
)
LANGUAGE plpgsql AS $$
DECLARE
    cart_rec    RECORD;
    fee_percent DECIMAL(5,2);
    nearby_wh   INTEGER;
BEGIN
    -- Resolve user's nearest warehouse once
    SELECT nearby_warehouse_id INTO nearby_wh
    FROM Users WHERE user_id = p_user_id;

    INSERT INTO orders (user_id, address_id, total_amount)
    VALUES (p_user_id, p_address_id, 0)
    RETURNING order_id INTO new_order_id;

    FOR cart_rec IN
        SELECT c.variant_id, c.quantity,
               ((p.base_price + COALESCE(pv.price_adjustment, 0)) *
                (1 - (COALESCE(fd.max_discount, 0) / 100))) AS unit_price,
               cf.commission_percentage AS fee_percentage
        FROM cart c
        JOIN product_variants pv ON c.variant_id = pv.variant_id
        JOIN products p ON pv.product_id = p.product_id
        LEFT JOIN (
            SELECT product_id, MAX(discount_percentage) AS max_discount
            FROM Flash_Deals
            WHERE is_active = TRUE AND end_time > CURRENT_TIMESTAMP
            GROUP BY product_id
        ) fd ON fd.product_id = p.product_id
        LEFT JOIN categories cat ON p.category_id = cat.category_id
        LEFT JOIN category_fees cf ON cf.category_id = cat.category_id
        WHERE c.user_id = p_user_id AND c.is_saved = FALSE
    LOOP
        -- Guard: abort if total stock across all warehouses is insufficient
        IF NOT fn_is_stock_available(cart_rec.variant_id, cart_rec.quantity) THEN
            RAISE EXCEPTION
                'Insufficient stock for variant_id %. Requested: %, Available: %',
                cart_rec.variant_id,
                cart_rec.quantity,
                (SELECT COALESCE(SUM(stock_quantity),0) FROM Inventory WHERE variant_id = cart_rec.variant_id)
                USING ERRCODE = 'P0001';
        END IF;

        fee_percent := COALESCE(cart_rec.fee_percentage, 0);
        INSERT INTO order_items (order_id, variant_id, quantity, unit_price, platform_fee_percent)
        VALUES (new_order_id, cart_rec.variant_id, cart_rec.quantity, cart_rec.unit_price, fee_percent);

        -- Deduct stock ONLY from the user's nearby warehouse
        UPDATE Inventory
        SET stock_quantity = stock_quantity - cart_rec.quantity
        WHERE variant_id  = cart_rec.variant_id
          AND warehouse_id = nearby_wh;
    END LOOP;

    UPDATE orders
    SET total_amount = (
        SELECT COALESCE(SUM(quantity * unit_price), 0)
        FROM order_items
        WHERE order_id = new_order_id
    )
    WHERE order_id = new_order_id;

    DELETE FROM cart WHERE user_id = p_user_id AND is_saved = FALSE;
END;
$$;
`;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌  DATABASE_URL not set — check your .env file');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('✅  Connected to database');

    await client.query(SQL);
    console.log('✅  fn_is_stock_available  — created / replaced');
    console.log('✅  proc_create_order      — created / replaced');
    console.log('\n🎉  Inventory safety patch applied successfully!');
  } catch (err) {
    console.error('❌  Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
