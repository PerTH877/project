

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

