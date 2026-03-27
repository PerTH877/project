ALTER TABLE Products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS Flash_Deals (
    deal_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES Products(product_id) ON DELETE CASCADE,
    discount_percentage DECIMAL(5, 2) NOT NULL CHECK (discount_percentage BETWEEN 0 AND 100),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE OR REPLACE FUNCTION get_cart_total(p_user_id INTEGER)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(
        c.quantity * 
        (p.base_price + COALESCE(pv.price_adjustment, 0)) * 
        (1 - (COALESCE(fd.max_discount, 0) / 100))
    ), 0)
    INTO total
    FROM cart c
    JOIN product_variants pv ON c.variant_id = pv.variant_id
    JOIN products p ON pv.product_id = p.product_id
    LEFT JOIN (
        SELECT product_id, MAX(discount_percentage) AS max_discount
        FROM Flash_Deals
        WHERE is_active = TRUE AND end_time > CURRENT_TIMESTAMP
        GROUP BY product_id
    ) fd ON fd.product_id = p.product_id
    WHERE c.user_id = p_user_id;
    RETURN total;
END;
$$ LANGUAGE plpgsql;

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
    -- Insert a new order with an initial zero total.
    INSERT INTO orders (user_id, address_id, total_amount)
    VALUES (p_user_id, p_address_id, 0)
    RETURNING order_id INTO new_order_id;

    -- Iterate through each cart item and copy it into Order_Items.
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
        WHERE c.user_id = p_user_id
    LOOP
        fee_percent := COALESCE(cart_rec.fee_percentage, 0);
        INSERT INTO order_items (order_id, variant_id, quantity, unit_price, platform_fee_percent)
        VALUES (new_order_id, cart_rec.variant_id, cart_rec.quantity, cart_rec.unit_price, fee_percent);
    END LOOP;

    -- Update the total amount for the order based on the inserted items.
    UPDATE orders
    SET total_amount = (
        SELECT COALESCE(SUM(quantity * unit_price), 0)
        FROM order_items
        WHERE order_id = new_order_id
    )
    WHERE order_id = new_order_id;

    -- Clear the cart for the user since all items have been moved to the order.
    DELETE FROM cart WHERE user_id = p_user_id;
END;
$$;
