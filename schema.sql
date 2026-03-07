

CREATE TABLE Warehouses (
    warehouse_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20),
    capacity INTEGER CHECK (capacity >= 0),
    is_active BOOLEAN DEFAULT TRUE
);



CREATE TABLE Categories (
    category_id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES Categories(category_id),
    name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE Category_Fees (
    fee_id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES Categories(category_id) ON DELETE CASCADE,
    commission_percentage DECIMAL(5, 2) NOT NULL CHECK (commission_percentage BETWEEN 0 AND 100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Sellers (
    seller_id SERIAL PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    contact_email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    gst_number VARCHAR(50),
    rating DECIMAL(3, 2) DEFAULT 0.00,
    is_verified BOOLEAN DEFAULT FALSE,
    balance DECIMAL(12, 2) DEFAULT 0.00
);

CREATE TABLE Subscription_Plans (
    plan_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL,
    benefits_description TEXT
);

CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nearby_warehouse_id INTEGER REFERENCES Warehouses(warehouse_id)
);

CREATE TABLE User_Subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(user_id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES Subscription_Plans(plan_id),
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' 
        CHECK (status IN ('Active', 'Expired', 'Cancelled')),
    auto_renew BOOLEAN DEFAULT TRUE
);
CREATE UNIQUE INDEX uq_user_one_active_subscription
ON User_Subscriptions (user_id)
WHERE status = 'Active';

CREATE TABLE Addresses (
    address_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(user_id),
    address_type VARCHAR(20) DEFAULT 'Home',
    street_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(50) DEFAULT 'Bangladesh',
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);


CREATE TABLE Products (
    product_id SERIAL PRIMARY KEY,
    seller_id INTEGER REFERENCES Sellers(seller_id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES Categories(category_id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE Product_Variants (
    variant_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES Products(product_id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    attributes JSONB NOT NULL,
    price_adjustment DECIMAL(10, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE
);


CREATE TABLE Product_Media (
    media_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES Products(product_id) ON DELETE CASCADE,
    media_url VARCHAR(500) NOT NULL,
    media_type VARCHAR(20) DEFAULT 'image',
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0
);

CREATE TABLE Product_Specifications (
    spec_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES Products(product_id) ON DELETE CASCADE,
    spec_key VARCHAR(100) NOT NULL,
    spec_value VARCHAR(255) NOT NULL
);

CREATE TABLE Inventory (
    inventory_id SERIAL PRIMARY KEY,
    variant_id INTEGER REFERENCES Product_Variants(variant_id) ON DELETE CASCADE,
    warehouse_id INTEGER REFERENCES Warehouses(warehouse_id) ON DELETE CASCADE,
    stock_quantity INTEGER NOT NULL CHECK (stock_quantity >= 0),
    aisle_location VARCHAR(20),
    UNIQUE(variant_id, warehouse_id)
);


CREATE TABLE Cart (
    cart_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(user_id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES Product_Variants(variant_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE Wishlists (
    wishlist_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(user_id) ON DELETE CASCADE,
    name VARCHAR(50) DEFAULT 'My Wishlist',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE Wishlist_Items (
    item_id SERIAL PRIMARY KEY,
    wishlist_id INTEGER REFERENCES Wishlists(wishlist_id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES Product_Variants(variant_id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wishlist_id, variant_id)
);


CREATE TABLE Reviews (
    review_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(user_id) ON DELETE SET NULL,
    product_id INTEGER REFERENCES Products(product_id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    images JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE Product_Questions (
    question_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES Products(product_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES Users(user_id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE Product_Answers (
    answer_id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES Product_Questions(question_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES Users(user_id) ON DELETE SET NULL,
    seller_id INTEGER REFERENCES Sellers(seller_id) ON DELETE SET NULL,
    answer_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK ( (user_id IS NOT NULL AND seller_id IS NULL) OR 
            (user_id IS NULL AND seller_id IS NOT NULL) )
);


CREATE TABLE Browsing_History (
    history_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(user_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES Products(product_id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE Discounts (
    discount_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    value DECIMAL(10, 2) NOT NULL,
    min_order_value DECIMAL(10, 2) DEFAULT 0,
    valid_until TIMESTAMP
);



CREATE TABLE Orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(user_id) ON DELETE RESTRICT,
    address_id INTEGER REFERENCES Addresses(address_id),
    discount_id INTEGER REFERENCES Discounts(discount_id),
    status VARCHAR(50) DEFAULT 'Pending' 
        CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned')),
    total_amount DECIMAL(10, 2) NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE Order_Items (
    item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES Orders(order_id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES Product_Variants(variant_id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    platform_fee_percent DECIMAL(5, 2) NOT NULL,
    platform_profit DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price * (platform_fee_percent / 100)) STORED,
    seller_earning DECIMAL(10, 2) GENERATED ALWAYS AS ((quantity * unit_price) - (quantity * unit_price * (platform_fee_percent / 100))) STORED
);



CREATE TABLE Payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES Orders(order_id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Success'
        CHECK (status IN ('Pending', 'Success', 'Failed', 'Refunded')),
    amount DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE Shipments (
    shipment_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES Orders(order_id) ON DELETE RESTRICT,
    tracking_number VARCHAR(100),
    carrier VARCHAR(50),
    estimated_arrival DATE,
    status VARCHAR(50) DEFAULT 'Processing'
        CHECK (status IN ('Processing', 'In_Transit', 'Out_for_Delivery', 'Delivered', 'Failed'))
);



CREATE TABLE Returns (
    return_id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES Order_Items(item_id) ON DELETE RESTRICT,
    reason VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Requested'
        CHECK (status IN ('Requested', 'Approved', 'Rejected', 'Refunded', 'Completed')),
    refund_amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE Seller_Payouts (
    payout_id SERIAL PRIMARY KEY,
    seller_id INTEGER REFERENCES Sellers(seller_id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL,
    payout_date DATE,
    status VARCHAR(50) DEFAULT 'Processing'
        CHECK (status IN ('Processing', 'Paid', 'Failed', 'Hold')),
    reference_number VARCHAR(100)
);

-- --------------------------------------------------------------------
-- Additional database features for project checklist compliance
--
-- The following definitions add a table for auditing order changes,
-- a trigger to automatically populate the audit table whenever the
-- orders table is modified, a function to compute the total value of
-- a user's cart, and a stored procedure to perform a multi‑step
-- checkout workflow.  These constructs demonstrate proper use of
-- triggers, functions, procedures and complex queries as required by
-- the project checklist.

-- Audit table to log inserts, updates and deletions on the Orders table.
CREATE TABLE IF NOT EXISTS order_audit (
    audit_id SERIAL PRIMARY KEY,
    order_id INTEGER,
    action VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger function to write a row into order_audit whenever the Orders
-- table is modified.  Depending on the triggering event the action
-- column is set appropriately.  This trigger runs after the main
-- operation completes.
CREATE OR REPLACE FUNCTION log_order_changes() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO order_audit (order_id, action) VALUES (NEW.order_id, 'INSERT');
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO order_audit (order_id, action) VALUES (NEW.order_id, 'UPDATE');
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO order_audit (order_id, action) VALUES (OLD.order_id, 'DELETE');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition on Orders table using the above trigger function.
DROP TRIGGER IF EXISTS trg_orders_audit ON orders;
CREATE TRIGGER trg_orders_audit
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION log_order_changes();

-- Function to compute the current total price of a user's cart.  It
-- multiplies the quantity of each cart item by the sum of the base
-- price and any price adjustment defined on the variant.  If the
-- user has no items in their cart the function returns 0.00.
CREATE OR REPLACE FUNCTION get_cart_total(p_user_id INTEGER)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(c.quantity * (p.base_price + COALESCE(pv.price_adjustment, 0))), 0)
    INTO total
    FROM cart c
    JOIN product_variants pv ON c.variant_id = pv.variant_id
    JOIN products p ON pv.product_id = p.product_id
    WHERE c.user_id = p_user_id;
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Procedure to create an order for a user.  The procedure inserts a
-- new row into Orders, then iterates over the user's current cart
-- items, inserting a corresponding row in Order_Items for each.  It
-- calculates the platform fee based on the category commission
-- percentage, updates the total amount on the order and finally
-- clears the cart.  The procedure uses local variables and a FOR loop
-- and is an example of a multi‑step workflow requiring transaction
-- control.  When called from the application the procedure should be
-- invoked inside a transaction so that errors cause a rollback.
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
    -- Insert a new order with an initial zero total.  The status is
    -- left as the default 'Pending'.
    INSERT INTO orders (user_id, address_id, total_amount)
    VALUES (p_user_id, p_address_id, 0)
    RETURNING order_id INTO new_order_id;

    -- Iterate through each cart item and copy it into Order_Items.
    FOR cart_rec IN
        SELECT c.variant_id, c.quantity,
               (p.base_price + COALESCE(pv.price_adjustment, 0)) AS unit_price,
               cf.commission_percentage AS fee_percentage
        FROM cart c
        JOIN product_variants pv ON c.variant_id = pv.variant_id
        JOIN products p ON pv.product_id = p.product_id
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

