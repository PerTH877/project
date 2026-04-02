const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });
const { Pool } = require('pg');

async function applyFix() {
  console.log('Using DATABASE_URL:', process.env.DATABASE_URL ? 'Loaded' : 'NOT LOADED');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Common for Supabase connections
  });
  
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected! Applying proc_create_order fix');
    
    await client.query("SET statement_timeout = '20s'");
    
    await client.query(`
      CREATE OR REPLACE PROCEDURE proc_create_order(
          IN p_user_id INTEGER,
          IN p_address_id INTEGER,
          OUT new_order_id INTEGER
      )
      LANGUAGE plpgsql AS $$
      DECLARE
          cart_rec RECORD;
          fee_percent DECIMAL(5,2);
      BEGIN
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
              fee_percent := COALESCE(cart_rec.fee_percentage, 0);
              INSERT INTO order_items (order_id, variant_id, quantity, unit_price, platform_fee_percent)
              VALUES (new_order_id, cart_rec.variant_id, cart_rec.quantity, cart_rec.unit_price, fee_percent);
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
    `);
    
    console.log('Successfully updated proc_create_order stored procedure in the live database.');
    client.release();
  } catch(e) {
    console.error('Error applying fix:', e.message);
    if (e.stack) console.error(e.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
applyFix();
