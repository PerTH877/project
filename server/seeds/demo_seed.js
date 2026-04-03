/**
 * PARUVO Marketplace — Demo Seed Script v2
 * =========================================
 * Populates: Warehouses, Categories, Category_Fees, Sellers, Products,
 *            Product_Variants, Product_Media, Product_Specifications, Inventory
 *
 * Run from /server:   node seeds/demo_seed.js
 *          or:        npm run seed:demo
 *
 * All image URLs are from Unsplash CDN — hotlink-safe, no CORS issues.
 */

'use strict';

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function query(text, params) {
    const client = await pool.connect();
    try {
        return await client.query(text, params);
    } finally {
        client.release();
    }
}

async function insertReturningId(text, params) {
    const res = await query(text + ' RETURNING *', params);
    return res.rows[0];
}

const log = (msg) => process.stdout.write(`  ✓  ${msg}\n`);

// ─── 0. Cleanup (wipe previously seeded demo data) ───────────────────────────

const BD_CITIES = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur'];
const BD_CITY_ZIP_CODES = {
    Dhaka: '1207',
    Chittagong: '4000',
    Sylhet: '3100',
    Rajshahi: '6000',
    Khulna: '9000',
    Barishal: '8200',
    Rangpur: '5400',
};
const BD_CITY_STREETS = {
    Dhaka: ['House 12, Road 7, Dhanmondi', 'Plot 18, Sector 11, Uttara', 'Flat 6B, Green Road'],
    Chittagong: ['House 45, CDA Avenue', 'Flat 3A, GEC Circle', 'Road 9, Agrabad Commercial Area'],
    Sylhet: ['House 9, Zindabazar Link Road', 'Block C, Subidbazar', 'Flat 5D, Ambarkhana'],
    Rajshahi: ['House 6, Shaheb Bazar Road', 'Laxmipur Main Road', 'Padma Residential Area, Block B'],
    Khulna: ['House 22, KDA Avenue', 'Khalishpur Housing Road', 'Sonadanga Residential Area, Lane 4'],
    Barishal: ['House 10, Band Road', 'Sadar Road, Port View', 'Bogura Road, Flat 4C'],
    Rangpur: ['House 8, Station Road', 'Jahaj Company Mor, Block A', 'Modern Mor Residential Lane'],
};
const REVIEW_COMMENTS = [
    'Fast delivery in Dhaka and the box arrived in excellent condition.',
    'Original product, verified with serial number and official invoice.',
    'Delivery was smooth and the seller responded quickly before dispatch.',
    'Good packaging and the quality feels exactly as described.',
    'Received in Chittagong on time. Setup was simple and everything works well.',
    'Authentic item with clean finish. Worth the price for the quality.',
    'Very happy with the product. Courier updates were clear from start to finish.',
    'Seller sent genuine stock and included all listed accessories.',
    'Flash deal price was excellent and delivery in Sylhet was faster than expected.',
    'Purchased for family use in Khulna and the performance has been solid so far.',
];
const QA_QUESTION_BANK = [
    'Is this item original and sealed from the seller?',
    'How many days does delivery usually take outside Dhaka?',
    'Does it come with an official warranty or seller warranty?',
    'Can I confirm the exact color or storage variant before dispatch?',
    'Is cash on delivery available for this listing?',
    'Do you provide after-sales support if there is a setup issue?',
    'Will the invoice be included for warranty claim purposes?',
    'Is this product currently in stock for quick dispatch?',
];
const REVIEW_RATINGS = [5, 5, 5, 5, 4, 4, 4, 4, 4, 3, 3, 2];

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

function pickUniqueRandom(items, count) {
    const pool = [...items];
    const picked = [];
    while (pool.length && picked.length < count) {
        const index = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(index, 1)[0]);
    }
    return picked;
}

function randomDateWithinDays(maxDaysBack) {
    const now = Date.now();
    const recentBiasRoll = Math.random();
    let daysBack;

    if (recentBiasRoll < 0.65) {
        daysBack = Math.random() * Math.min(maxDaysBack, 12);
    } else if (recentBiasRoll < 0.9) {
        daysBack = 12 + (Math.random() * Math.max(maxDaysBack - 12, 1));
    } else {
        daysBack = Math.random() * maxDaysBack;
    }

    const at = new Date(now - (daysBack * 24 * 60 * 60 * 1000));
    at.setHours(
        Math.floor(Math.random() * 24),
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60),
        0
    );
    return at;
}

function buildBangladeshStreet(city) {
    return pickRandom(BD_CITY_STREETS[city] || [`House 1, Main Road, ${city}`]);
}

function buildSellerAnswer(questionText, title) {
    const lower = questionText.toLowerCase();
    if (lower.includes('warranty') || lower.includes('invoice')) {
        return `Yes, ${title} includes invoice support and warranty guidance from our seller team after delivery.`;
    }
    if (lower.includes('delivery') || lower.includes('dhaka')) {
        return 'We usually dispatch within 24 hours and delivery timing depends on the destination city, with metro zones moving the fastest.';
    }
    if (lower.includes('stock') || lower.includes('dispatch')) {
        return 'Yes, this listing is currently active in our inventory and we will confirm the exact dispatch status right after the order is placed.';
    }
    if (lower.includes('original') || lower.includes('sealed')) {
        return 'This is authentic seller inventory and we ship it with proper packaging, invoice support, and serial verification where applicable.';
    }
    return `Yes, we can confirm the active listing details for ${title} before dispatch and support you after purchase if needed.`;
}



// ─── 1. Warehouses ────────────────────────────────────────────────────────────

async function seedWarehouses() {
    console.log('\n[1/9] Seeding Warehouses…');
    const rows = [
        { name: 'Dhaka Central Hub', street_address: '12 Tejgaon Industrial Area', city: 'Dhaka', zip_code: '1208', capacity: 5000 },
        { name: 'Chittagong Port Hub', street_address: '45 Port Connect Road', city: 'Chittagong', zip_code: '4100', capacity: 3000 },
        { name: 'Sylhet Distribution', street_address: '8 Zindabazar Plaza', city: 'Sylhet', zip_code: '3100', capacity: 2000 },
    ];
    const ids = [];
    for (const w of rows) {
        const r = await insertReturningId(
            `INSERT INTO Warehouses (name, street_address, city, zip_code, capacity, is_active) VALUES ($1,$2,$3,$4,$5,TRUE)`,
            [w.name, w.street_address, w.city, w.zip_code, w.capacity]
        );
        ids.push(r.warehouse_id);
        log(`Warehouse: ${w.name}  (id=${r.warehouse_id})`);
    }
    return ids;
}

// ─── 2. Categories ────────────────────────────────────────────────────────────

async function seedCategories() {
    console.log('\n[2/9] Seeding Categories…');
    const cats = [
        { name: 'Electronics', description: 'Gadgets, devices, and electronic equipment' },
        { name: 'Computers & Laptops', description: 'Laptops, desktops, and computer peripherals' },
        { name: 'Smartphones', description: 'Mobile phones and accessories' },
        { name: 'Audio', description: 'Headphones, speakers, and audio gear' },
        { name: 'Gaming', description: 'Gaming consoles, games, and accessories' },
        { name: 'Footwear', description: 'Shoes, sneakers, and sports footwear' },
        { name: 'Cameras', description: 'Digital cameras, lenses, and accessories' },
        { name: 'Home Appliances', description: 'Smart and traditional home appliances' },
        { name: 'Tablets & Wearables', description: 'Tablets, smartwatches, and wearable tech' },
    ];
    const map = {};
    for (const c of cats) {
        const r = await insertReturningId(
            `INSERT INTO Categories (name, description) VALUES ($1,$2)`, [c.name, c.description]
        );
        map[c.name] = r.category_id;
        log(`Category: ${c.name}  (id=${r.category_id})`);
    }
    return map;
}

// ─── 3. Category Fees ─────────────────────────────────────────────────────────

async function seedCategoryFees(catMap) {
    console.log('\n[3/9] Seeding Category_Fees…');
    const fees = {
        'Electronics': 5.00, 'Computers & Laptops': 4.50, 'Smartphones': 5.50,
        'Audio': 6.00, 'Gaming': 7.00, 'Footwear': 8.00,
        'Cameras': 5.00, 'Home Appliances': 4.00, 'Tablets & Wearables': 5.50,
    };
    for (const [name, pct] of Object.entries(fees)) {
        await query(`INSERT INTO Category_Fees (category_id, commission_percentage) VALUES ($1,$2)`, [catMap[name], pct]);
        log(`Fee: ${name} → ${pct}%`);
    }
}

// ─── 4. Sellers ───────────────────────────────────────────────────────────────

async function seedSellers() {
    console.log('\n[4/9] Seeding Sellers…');
    // Keep the demo seller password aligned with the README and login examples.
    const HASH = await bcrypt.hash('seller123', 10);
    const sellers = [
        { company_name: 'TechZone BD', contact_email: 'sales@techzonebd.com', gst_number: 'GST-10023-BD', rating: 4.75, balance: 125000 },
        { company_name: 'Apple Authorized Reseller BD', contact_email: 'contact@applebd.com', gst_number: 'GST-20045-BD', rating: 4.90, balance: 350000 },
        { company_name: 'SoundWave Electronics', contact_email: 'info@soundwave.com.bd', gst_number: 'GST-30078-BD', rating: 4.55, balance: 89000 },
        { company_name: 'GearUp Sports & Lifestyle', contact_email: 'orders@gearupbd.com', gst_number: 'GST-40091-BD', rating: 4.30, balance: 45000 },
        { company_name: 'SmartHome Gadgets', contact_email: 'support@smarthomegd.com', gst_number: 'GST-50012-BD', rating: 4.60, balance: 72000 },
    ];
    const map = {};
    for (const s of sellers) {
        const r = await insertReturningId(
            `INSERT INTO Sellers (company_name, contact_email, password_hash, gst_number, rating, is_verified, balance)
       VALUES ($1,$2,$3,$4,$5,TRUE,$6)`,
            [s.company_name, s.contact_email, HASH, s.gst_number, s.rating, s.balance]
        );
        map[s.company_name] = r.seller_id;
        log(`Seller: ${s.company_name}  (id=${r.seller_id})`);
    }
    return map;
}

// ─── 5. Products ──────────────────────────────────────────────────────────────
//
// ALL image URLs below are from Unsplash CDN (images.unsplash.com).
// These are permanent, high-resolution, hotlink-safe URLs — no CORS issues.
// Format: https://images.unsplash.com/photo-<id>?w=1200&q=80&fit=crop&auto=format

async function seedProductsBase(catMap, sellerMap, warehouseIds) {
    console.log('\n[5–9/9] Seeding Products, Variants, Media, Specs & Inventory…');

    const S = sellerMap;
    const C = catMap;
    const W = warehouseIds;
    const allVariantIds = [];

    const products = [
        // 1 ─────────────────────────────────────────────────────────────────────
        {
            title: 'Apple MacBook Pro M3 14-inch', brand: 'Apple',
            seller: 'Apple Authorized Reseller BD', category: 'Computers & Laptops',
            base_price: 199999.00,
            description: 'The MacBook Pro 14-inch with M3 chip delivers exceptional performance for professionals. Liquid Retina XDR display, 22-hour battery life, and up to 24 GB unified memory.',
            variants: [
                { sku: 'MBP-M3-14-8-512-SG', attributes: { color: 'Space Gray', ram: '8 GB', storage: '512 GB SSD' }, price_adj: 0 },
                { sku: 'MBP-M3-14-16-1TB-SG', attributes: { color: 'Space Gray', ram: '16 GB', storage: '1 TB SSD' }, price_adj: 40000 },
                { sku: 'MBP-M3-14-18-1TB-SL', attributes: { color: 'Silver', ram: '18 GB', storage: '1 TB SSD' }, price_adj: 55000 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&q=80&fit=crop&auto=format', is_primary: true },
                { url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=1200&q=80&fit=crop&auto=format', is_primary: false },
            ],
            specs: [
                { key: 'Chip', value: 'Apple M3' }, { key: 'Display', value: '14.2-inch Liquid Retina XDR' },
                { key: 'RAM', value: 'Up to 18 GB Unified Memory' }, { key: 'Storage', value: 'Up to 1 TB SSD' },
                { key: 'Battery', value: 'Up to 22 hours' }, { key: 'OS', value: 'macOS Sonoma' },
                { key: 'Ports', value: 'Thunderbolt 4, HDMI, SD Card, MagSafe 3' }, { key: 'Weight', value: '1.55 kg' },
            ],
            stock: [2, 1, 0],  // deliberately low to trigger "Low Stock" alert in UI
        },

        // 2 ─────────────────────────────────────────────────────────────────────
        {
            title: 'Samsung Galaxy S24 Ultra', brand: 'Samsung',
            seller: 'TechZone BD', category: 'Smartphones',
            base_price: 154999.00,
            description: 'The ultimate Galaxy AI phone. 6.8-inch Dynamic AMOLED 2X display, built-in S Pen, 200 MP camera with 100x Space Zoom, and Snapdragon 8 Gen 3.',
            variants: [
                { sku: 'S24U-12-256-TB', attributes: { color: 'Titanium Black', storage: '256 GB' }, price_adj: 0 },
                { sku: 'S24U-12-512-TG', attributes: { color: 'Titanium Gray', storage: '512 GB' }, price_adj: 15000 },
                { sku: 'S24U-12-1TB-TV', attributes: { color: 'Titanium Violet', storage: '1 TB' }, price_adj: 30000 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=1200&q=80&fit=crop&auto=format', is_primary: true },
                { url: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=1200&q=80&fit=crop&auto=format', is_primary: false },
            ],
            specs: [
                { key: 'Display', value: '6.8-inch Dynamic AMOLED 2X, 120 Hz' },
                { key: 'Processor', value: 'Snapdragon 8 Gen 3' }, { key: 'RAM', value: '12 GB' },
                { key: 'Main Camera', value: '200 MP + 12 MP + 10 MP + 50 MP' },
                { key: 'Battery', value: '5000 mAh, 45W Fast Charging' }, { key: 'S Pen', value: 'Built-in' },
                { key: 'OS', value: 'Android 14, One UI 6.1' }, { key: 'Connectivity', value: '5G, Wi-Fi 7, BT 5.3' },
            ],
            stock: [80, 40, 20],
        },

        // 3 ─────────────────────────────────────────────────────────────────────
        {
            title: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones', brand: 'Sony',
            seller: 'SoundWave Electronics', category: 'Audio',
            base_price: 35999.00,
            description: 'Industry-leading noise cancellation with 30-hour battery life, LDAC Hi-Res Audio, multipoint connection, and the new V1 chip.',
            variants: [
                { sku: 'WH-XM5-BLK', attributes: { color: 'Black' }, price_adj: 0 },
                { sku: 'WH-XM5-SLV', attributes: { color: 'Silver' }, price_adj: 0 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Driver Size', value: '30 mm' }, { key: 'Frequency', value: '4 Hz – 40 kHz' },
                { key: 'Battery', value: '30 hours (NC on)' }, { key: 'Charging', value: 'USB-C (3 min = 3 hrs)' },
                { key: 'Connectivity', value: 'Bluetooth 5.2, Multipoint' }, { key: 'Weight', value: '250 g' },
            ],
            stock: [60, 30, 15],
        },

        // 4 ─────────────────────────────────────────────────────────────────────
        {
            title: 'Apple iPad Pro M4 13-inch', brand: 'Apple',
            seller: 'Apple Authorized Reseller BD', category: 'Tablets & Wearables',
            base_price: 129999.00,
            description: 'The thinnest Apple product ever. M4 chip, Ultra Retina XDR tandem OLED display, extraordinary brightness and color accuracy for creative professionals.',
            variants: [
                { sku: 'IPADPRO-M4-13-256-WIFI-SG', attributes: { color: 'Space Gray', storage: '256 GB', connectivity: 'Wi-Fi' }, price_adj: 0 },
                { sku: 'IPADPRO-M4-13-512-WIFI-SL', attributes: { color: 'Silver', storage: '512 GB', connectivity: 'Wi-Fi' }, price_adj: 25000 },
                { sku: 'IPADPRO-M4-13-1TB-CELL-SG', attributes: { color: 'Space Gray', storage: '1 TB', connectivity: 'Wi-Fi+Cellular' }, price_adj: 65000 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Chip', value: 'Apple M4' }, { key: 'Display', value: '13-inch Ultra Retina XDR Tandem OLED' },
                { key: 'Resolution', value: '2752 × 2064 at 264 ppi' },
                { key: 'Connector', value: 'USB-C (Thunderbolt 4)' }, { key: 'Battery', value: 'Up to 10 hours' },
                { key: 'Thickness', value: '5.1 mm' },
            ],
            stock: [30, 15, 8],
        },

        // 5 ─────────────────────────────────────────────────────────────────────
        {
            title: 'Dell XPS 15 9530 Laptop', brand: 'Dell',
            seller: 'TechZone BD', category: 'Computers & Laptops',
            base_price: 185000.00,
            description: '15.6-inch InfinityEdge OLED display, 13th Gen Intel Core i7/i9, NVIDIA GeForce RTX 4060/4070 — the definitive creative pro laptop.',
            variants: [
                { sku: 'XPS15-i7-16-512-4060', attributes: { processor: 'Core i7-13700H', ram: '16 GB', storage: '512 GB', gpu: 'RTX 4060' }, price_adj: 0 },
                { sku: 'XPS15-i9-32-1TB-4070', attributes: { processor: 'Core i9-13900H', ram: '32 GB', storage: '1 TB', gpu: 'RTX 4070' }, price_adj: 50000 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Display', value: '15.6-inch 3.5K OLED, 60 Hz' },
                { key: 'Processor', value: 'Intel Core i7-13700H / i9-13900H' },
                { key: 'Graphics', value: 'NVIDIA GeForce RTX 4060 / 4070' },
                { key: 'Battery', value: 'Up to 13 hours' }, { key: 'OS', value: 'Windows 11 Pro' }, { key: 'Weight', value: '1.86 kg' },
            ],
            stock: [20, 10, 5],
        },

        // 6 ─────────────────────────────────────────────────────────────────────
        {
            title: 'Google Pixel 9 Pro', brand: 'Google',
            seller: 'TechZone BD', category: 'Smartphones',
            base_price: 109999.00,
            description: 'Google AI built-in, 50 MP telephoto with 5x optical zoom, 6.3-inch Super Actua display, and Google Tensor G4 chip. 7 years of guaranteed OS updates.',
            variants: [
                { sku: 'PX9P-128-OB', attributes: { color: 'Obsidian', storage: '128 GB' }, price_adj: 0 },
                { sku: 'PX9P-256-PO', attributes: { color: 'Porcelain', storage: '256 GB' }, price_adj: 10000 },
                { sku: 'PX9P-512-RQ', attributes: { color: 'Rose Quartz', storage: '512 GB' }, price_adj: 22000 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Display', value: '6.3-inch Super Actua LTPO OLED, 120 Hz' },
                { key: 'Chip', value: 'Google Tensor G4' }, { key: 'RAM', value: '16 GB' },
                { key: 'Cameras', value: '50 MP + 48 MP ultrawide + 48 MP 5x telephoto' },
                { key: 'Battery', value: '4700 mAh, 30W wired, 23W wireless' },
                { key: 'OS', value: 'Android 14 (7-yr update guarantee)' },
            ],
            stock: [50, 25, 12],
        },

        // 7 ─────────────────────────────────────────────────────────────────────
        {
            title: 'Apple AirPods Pro (2nd Generation)', brand: 'Apple',
            seller: 'Apple Authorized Reseller BD', category: 'Audio',
            base_price: 32999.00,
            description: 'Active Noise Cancellation 2x more effective than the previous generation. Adaptive Audio, Conversation Awareness, and H2 chip for breakthrough audio.',
            variants: [
                { sku: 'APP2-USBC', attributes: { connector: 'USB-C Case' }, price_adj: 0 },
                { sku: 'APP2-MAGSF', attributes: { connector: 'MagSafe Case' }, price_adj: 0 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Chip', value: 'Apple H2' }, { key: 'ANC', value: 'Active Noise Cancellation' },
                { key: 'Battery (Buds)', value: 'Up to 6 hours with ANC' },
                { key: 'Battery (Case)', value: 'Up to 30 hours total' },
                { key: 'Resistance', value: 'IP54' }, { key: 'Connectivity', value: 'Bluetooth 5.3' },
            ],
            stock: [100, 60, 30],
        },

        // 8 ─────────────────────────────────────────────────────────────────────
        {
            title: 'Samsung 55-inch QLED 4K Smart TV Q80C', brand: 'Samsung',
            seller: 'SmartHome Gadgets', category: 'Electronics',
            base_price: 89999.00,
            description: 'Quantum HDR with quantum dots for 100% Color Volume, Object Tracking Sound+, and a built-in Gaming Hub for cloud gaming. 120Hz panel with VRR.',
            variants: [
                { sku: 'QN55Q80C', attributes: { size: '55-inch', color: 'Titan Black' }, price_adj: 0 },
                { sku: 'QN65Q80C', attributes: { size: '65-inch', color: 'Titan Black' }, price_adj: 35000 },
                { sku: 'QN75Q80C', attributes: { size: '75-inch', color: 'Titan Black' }, price_adj: 80000 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Resolution', value: '4K UHD (3840 × 2160)' }, { key: 'HDR', value: 'Quantum HDR 12x' },
                { key: 'Refresh Rate', value: '120 Hz' }, { key: 'Smart Platform', value: 'Tizen OS' },
                { key: 'Audio', value: '40W, Object Tracking Sound+' }, { key: 'HDMI Ports', value: '4x HDMI 2.1' },
            ],
            stock: [15, 8, 4],
        },

        // 9 ─────────────────────────────────────────────────────────────────────
        {
            title: 'Logitech MX Master 3S Wireless Mouse', brand: 'Logitech',
            seller: 'TechZone BD', category: 'Computers & Laptops',
            base_price: 14999.00,
            description: 'Ultra-precise 8K DPI sensor works on any surface including glass. Whisper-quiet clicks, MagSpeed scroll wheel, and 70-day battery life.',
            variants: [
                { sku: 'MXMS3-GR', attributes: { color: 'Graphite' }, price_adj: 0 },
                { sku: 'MXMS3-PW', attributes: { color: 'Pale Gray' }, price_adj: 0 },
                { sku: 'MXMS3-MBK', attributes: { color: 'Midnight Black' }, price_adj: 0 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Sensor', value: 'Darkfield 8000 DPI' }, { key: 'Connectivity', value: 'Bluetooth / Logi Bolt' },
                { key: 'Battery', value: 'Up to 70 days (USB-C)' }, { key: 'Buttons', value: '7 programmable' },
                { key: 'Scroll', value: 'MagSpeed Electromagnetic' }, { key: 'Weight', value: '141 g' },
            ],
            stock: [75, 40, 20],
        },

        // 10 ────────────────────────────────────────────────────────────────────
        {
            title: 'Apple Watch Series 9 (GPS, 45mm)', brand: 'Apple',
            seller: 'Apple Authorized Reseller BD', category: 'Tablets & Wearables',
            base_price: 42999.00,
            description: 'S9 chip, brighter Always-On display, Double Tap gesture, blood oxygen monitoring and ECG app. The most capable Apple Watch ever.',
            variants: [
                { sku: 'AW9-45-SL-SPORT', attributes: { case: 'Starlight Aluminum', band: 'Starlight Sport', size: '45mm' }, price_adj: 0 },
                { sku: 'AW9-45-MN-SPORT', attributes: { case: 'Midnight Aluminum', band: 'Midnight Sport', size: '45mm' }, price_adj: 0 },
                { sku: 'AW9-45-SS-MILAN', attributes: { case: 'Silver Stainless', band: 'Milanese Loop', size: '45mm' }, price_adj: 25000 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Chip', value: 'Apple S9 SiP' }, { key: 'Display', value: 'Always-On Retina LTPO OLED' },
                { key: 'Water Resistance', value: '50 m (WR50)' },
                { key: 'Health', value: 'Blood Oxygen, ECG, Crash Detection' },
                { key: 'Battery', value: '18 hours (36 hrs Low Power Mode)' },
                { key: 'Connectivity', value: 'GPS, Bluetooth 5.3, Wi-Fi 802.11n' },
            ],
            stock: [60, 35, 18],
        },

        // 11 ────────────────────────────────────────────────────────────────────
        {
            title: 'Nintendo Switch OLED Model', brand: 'Nintendo',
            seller: 'TechZone BD', category: 'Gaming',
            base_price: 44999.00,
            description: 'Vivid 7-inch OLED screen, wide adjustable stand, 64 GB internal storage, wired LAN port in dock, and enhanced audio for immersive handheld gaming.',
            variants: [
                { sku: 'NSW-OLED-WHT', attributes: { color: 'White' }, price_adj: 0 },
                { sku: 'NSW-OLED-NEN', attributes: { color: 'Neon Blue/Neon Red' }, price_adj: 0 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Screen', value: '7-inch OLED, 1280 × 720' }, { key: 'Storage', value: '64 GB (microSD expandable)' },
                { key: 'Battery', value: '4.5–9 hours' }, { key: 'TV Output', value: '1080p via dock' },
                { key: 'Connectivity', value: 'Wi-Fi, Bluetooth 4.1' },
            ],
            stock: [40, 22, 10],
        },

        // 12 ────────────────────────────────────────────────────────────────────
        {
            title: 'Lotto Vento Running Shoes', brand: 'Lotto',
            seller: 'GearUp Sports & Lifestyle', category: 'Footwear',
            base_price: 7500.00,
            description: 'Lightweight performance running shoe built for speed and endurance. Breathable mesh upper, cushioned EVA midsole, and durable rubber outsole for excellent grip.',
            variants: [
                { sku: 'LOTTO-VENTO-WB-41', attributes: { color: 'White/Blue', size: 'EU 41' }, price_adj: 0 },
                { sku: 'LOTTO-VENTO-WB-42', attributes: { color: 'White/Blue', size: 'EU 42' }, price_adj: 0 },
                { sku: 'LOTTO-VENTO-WB-43', attributes: { color: 'White/Blue', size: 'EU 43' }, price_adj: 0 },
                { sku: 'LOTTO-VENTO-BR-41', attributes: { color: 'Black/Red', size: 'EU 41' }, price_adj: 0 },
                { sku: 'LOTTO-VENTO-BR-42', attributes: { color: 'Black/Red', size: 'EU 42' }, price_adj: 0 },
                { sku: 'LOTTO-VENTO-BR-43', attributes: { color: 'Black/Red', size: 'EU 43' }, price_adj: 0 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Upper', value: 'Breathable mesh with TPU overlays' }, { key: 'Midsole', value: 'EVA cushioning foam' },
                { key: 'Outsole', value: 'Carbon rubber with flex grooves' }, { key: 'Drop', value: '8 mm heel-to-toe' },
                { key: 'Weight', value: '280 g (EU 42)' }, { key: 'Use', value: 'Road running, training' },
            ],
            stock: [50, 30, 20],
        },

        // 13 ────────────────────────────────────────────────────────────────────
        {
            title: 'Nike Air Max 270', brand: 'Nike',
            seller: 'GearUp Sports & Lifestyle', category: 'Footwear',
            base_price: 13999.00,
            description: "Nike's largest Air unit yet in the heel provides exceptional cushioning and an ultra-comfortable lifestyle ride. Engineered mesh upper for all-day breathability.",
            variants: [
                { sku: 'AM270-BW-40', attributes: { color: 'Black/White', size: 'EU 40' }, price_adj: 0 },
                { sku: 'AM270-BW-41', attributes: { color: 'Black/White', size: 'EU 41' }, price_adj: 0 },
                { sku: 'AM270-BW-42', attributes: { color: 'Black/White', size: 'EU 42' }, price_adj: 0 },
                { sku: 'AM270-BW-43', attributes: { color: 'Black/White', size: 'EU 43' }, price_adj: 0 },
                { sku: 'AM270-BW-44', attributes: { color: 'Black/White', size: 'EU 44' }, price_adj: 0 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Upper', value: 'Engineered mesh + synthetic overlays' },
                { key: 'Midsole', value: 'Foam with 270° Air unit' }, { key: 'Air Unit', value: '270° Max Air in heel' },
                { key: 'Weight', value: '299 g approx (US 9)' }, { key: 'Use', value: 'Lifestyle, casual, light training' },
            ],
            stock: [60, 40, 25],
        },

        // 14 ────────────────────────────────────────────────────────────────────
        {
            title: 'Canon EOS R6 Mark II Mirrorless Camera Body', brand: 'Canon',
            seller: 'SmartHome Gadgets', category: 'Cameras',
            base_price: 249999.00,
            description: '40 MP full-frame CMOS sensor, DIGIC X processor, 40 fps electronic shutter, world-leading Subject Tracking AF, and 6K RAW video output.',
            variants: [
                { sku: 'EOSR6M2-BODY', attributes: { bundle: 'Body Only' }, price_adj: 0 },
                { sku: 'EOSR6M2-KIT-L', attributes: { bundle: 'With RF 24-105mm f/4L' }, price_adj: 95000 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&q=80&fit=crop&auto=format', is_primary: true },
                { url: 'https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=1200&q=80&fit=crop&auto=format', is_primary: false },
            ],
            specs: [
                { key: 'Sensor', value: '40.2 MP Full-Frame CMOS' }, { key: 'Processor', value: 'DIGIC X' },
                { key: 'Autofocus', value: 'Dual Pixel CMOS AF II, 1053 zones' },
                { key: 'Burst Rate', value: 'Up to 40 fps (electronic)' },
                { key: 'Video', value: '6K RAW, 4K 60p, 1080p 180p' }, { key: 'Stabilization', value: '8-stop In-Body IS' },
                { key: 'Weather Sealing', value: 'Yes (dust + drip resistant)' },
            ],
            stock: [2, 1, 0],  // deliberately low to trigger "Low Stock" alert in UI
        },

        // 15 ────────────────────────────────────────────────────────────────────
        {
            title: 'Anker PowerCore 26800 Portable Charger', brand: 'Anker',
            seller: 'TechZone BD', category: 'Electronics',
            base_price: 5999.00,
            description: '26800 mAh capacity charges an iPhone up to 6.5x. Three USB-A ports for simultaneous triple-device charging with MultiProtect safety.',
            variants: [
                { sku: 'ANKER-PC26800-BLK', attributes: { color: 'Black' }, price_adj: 0 },
                { sku: 'ANKER-PC26800-WHT', attributes: { color: 'White' }, price_adj: 0 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Capacity', value: '26800 mAh' }, { key: 'Output Ports', value: '3x USB-A (5V/2.4A)' },
                { key: 'Input', value: 'Micro-USB (15W)' }, { key: 'Charges', value: 'iPhone 15 up to 6.5x' },
                { key: 'Safety', value: 'MultiProtect System' }, { key: 'Weight', value: '480 g' },
            ],
            stock: [120, 80, 40],
        },

        // 16 ────────────────────────────────────────────────────────────────────
        {
            title: 'Sony PlayStation 5 Console (Disc Edition)', brand: 'Sony',
            seller: 'TechZone BD', category: 'Gaming',
            base_price: 59999.00,
            description: 'Lightning-fast load times with custom SSD, haptic feedback and adaptive triggers via DualSense, 4K gaming at up to 120 fps, and Tempest 3D audio.',
            variants: [
                { sku: 'PS5-DISC-STD', attributes: { edition: 'Standard Disc', color: 'White' }, price_adj: 0 },
                { sku: 'PS5-DISC-SLIM', attributes: { edition: 'Slim Disc', color: 'White' }, price_adj: 5000 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'CPU', value: 'AMD Zen 2, 8 cores @ 3.5 GHz' }, { key: 'GPU', value: '10.28 TFLOPS RDNA 2' },
                { key: 'RAM', value: '16 GB GDDR6' }, { key: 'SSD', value: '825 GB Custom (5.5 GB/s)' },
                { key: 'Optical Drive', value: '4K UHD Blu-ray' }, { key: 'Resolution', value: 'Up to 8K, 4K @ 120 fps' },
            ],
            stock: [2, 1, 0],  // deliberately low to trigger "Low Stock" alert in UI
        },

        // 17 ────────────────────────────────────────────────────────────────────
        {
            title: 'LG 27GN950-B 27" UltraGear 4K Nano IPS Gaming Monitor', brand: 'LG',
            seller: 'SmartHome Gadgets', category: 'Electronics',
            base_price: 79999.00,
            description: '4K Nano IPS panel, 144 Hz (160 Hz OC), 1ms GTG, NVIDIA G-SYNC Compatible, HDMI 2.1 for console gaming, and DisplayHDR 600 certification.',
            variants: [
                { sku: 'LG27GN950-BLK', attributes: { color: 'Black', resolution: '4K' }, price_adj: 0 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Panel', value: 'Nano IPS' }, { key: 'Resolution', value: '3840 × 2160 (4K UHD)' },
                { key: 'Refresh Rate', value: '144 Hz (160 Hz OC)' }, { key: 'Response Time', value: '1ms GTG' },
                { key: 'HDR', value: 'DisplayHDR 600' }, { key: 'Sync', value: 'G-SYNC Compatible + FreeSync' },
                { key: 'Color Vol', value: '98% DCI-P3' },
            ],
            stock: [18, 8, 4],
        },

        // 18 ────────────────────────────────────────────────────────────────────
        {
            title: 'Bose QuietComfort 45 Wireless Headphones', brand: 'Bose',
            seller: 'SoundWave Electronics', category: 'Audio',
            base_price: 29999.00,
            description: 'Iconic QC comfort with world-class noise cancellation, 24-hour battery life, Aware mode, and high-fidelity audio. The gold standard in comfort headphones.',
            variants: [
                { sku: 'QC45-BLK', attributes: { color: 'Black' }, price_adj: 0 },
                { sku: 'QC45-WHT', attributes: { color: 'White Smoke' }, price_adj: 0 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Modes', value: 'Quiet (ANC) & Aware' }, { key: 'Battery', value: '24 hours' },
                { key: 'Charging', value: 'USB-C (15 min = 3 hrs)' }, { key: 'Connectivity', value: 'Bluetooth 5.1, Multipoint' },
                { key: 'Weight', value: '238 g' }, { key: 'Foldable', value: 'Yes' },
            ],
            stock: [45, 25, 12],
        },

        // 19 ────────────────────────────────────────────────────────────────────
        {
            title: 'Kindle Paperwhite (11th Gen) 8 GB', brand: 'Amazon',
            seller: 'SmartHome Gadgets', category: 'Electronics',
            base_price: 13500.00,
            description: '6.8-inch glare-free display, adjustable warm light, IPX8 waterproofing, and up to 10 weeks of battery life. Now 20% faster page turning.',
            variants: [
                { sku: 'KPW11-8-AD', attributes: { storage: '8 GB', ads: 'With Ads' }, price_adj: 0 },
                { sku: 'KPW11-8-NOAD', attributes: { storage: '8 GB', ads: 'Without Ads' }, price_adj: 1500 },
                { sku: 'KPW11-16-NOAD', attributes: { storage: '16 GB', ads: 'Without Ads' }, price_adj: 3500 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Display', value: '6.8-inch 300 ppi, glare-free' },
                { key: 'Lighting', value: 'Adjustable warm + cool front light' }, { key: 'Waterproofing', value: 'IPX8' },
                { key: 'Battery', value: 'Up to 10 weeks' }, { key: 'Charging', value: 'USB-C' },
                { key: 'Connectivity', value: 'Wi-Fi (2.4 GHz + 5 GHz)' },
            ],
            stock: [90, 55, 28],
        },

        // 20 ────────────────────────────────────────────────────────────────────
        {
            title: 'Dyson V15 Detect Absolute Cordless Vacuum', brand: 'Dyson',
            seller: 'SmartHome Gadgets', category: 'Home Appliances',
            base_price: 79999.00,
            description: 'Built-in green laser reveals hidden dust on hard floors. Acoustic piezo sensor counts and sizes particles to scientifically prove your clean in real time on the LCD screen.',
            variants: [
                { sku: 'V15-DETECT-YEL', attributes: { color: 'Yellow/Nickel' }, price_adj: 0 },
                { sku: 'V15-DETECT-PBS', attributes: { color: 'Prussian Blue/Bright Copper' }, price_adj: 2000 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Suction', value: '240 AW maximum' }, { key: 'Run Time', value: 'Up to 60 minutes' },
                { key: 'Bin Volume', value: '0.77 litres' }, { key: 'Filtration', value: 'HEPA (99.99% particles)' },
                { key: 'Laser', value: 'Green Laser Detect' }, { key: 'Weight', value: '3.1 kg with head' },
            ],
            stock: [20, 10, 5],
        },

        // 21 ────────────────────────────────────────────────────────────────────
        {
            title: 'Samsung Galaxy Watch 6 Classic 47mm', brand: 'Samsung',
            seller: 'TechZone BD', category: 'Tablets & Wearables',
            base_price: 37999.00,
            description: 'Iconic rotating bezel returns with Galaxy AI health insights, advanced sleep coaching, body composition analysis, and the BioActive Sensor.',
            variants: [
                { sku: 'GW6C-47-BLK-BT', attributes: { color: 'Black', size: '47mm', connectivity: 'Bluetooth' }, price_adj: 0 },
                { sku: 'GW6C-47-SL-BT', attributes: { color: 'Silver', size: '47mm', connectivity: 'Bluetooth' }, price_adj: 0 },
                { sku: 'GW6C-47-BLK-LTE', attributes: { color: 'Black', size: '47mm', connectivity: 'LTE' }, price_adj: 8000 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Display', value: '1.47-inch Super AMOLED, 480 × 480' },
                { key: 'Processor', value: 'Exynos W930 dual core 1.4 GHz' }, { key: 'RAM/Storage', value: '2 GB / 16 GB' },
                { key: 'Bezel', value: 'Rotating bezel' }, { key: 'Battery', value: '425 mAh, up to 40 hrs' },
                { key: 'OS', value: 'Wear OS 4 + One UI Watch 6' }, { key: 'Water', value: '5 ATM + IP68' },
            ],
            stock: [40, 20, 10],
        },

        // 22 ────────────────────────────────────────────────────────────────────
        {
            title: 'JBL Charge 5 Portable Bluetooth Speaker', brand: 'JBL',
            seller: 'SoundWave Electronics', category: 'Audio',
            base_price: 14999.00,
            description: 'Bold JBL Pro sound with a separate tweeter, IP67 waterproof and dustproof, 20-hour playtime, and a built-in power bank to charge your devices on the go.',
            variants: [
                { sku: 'JBLCH5-BLK', attributes: { color: 'Black' }, price_adj: 0 },
                { sku: 'JBLCH5-BLU', attributes: { color: 'Blue' }, price_adj: 0 },
                { sku: 'JBLCH5-RED', attributes: { color: 'Red' }, price_adj: 0 },
                { sku: 'JBLCH5-TEAL', attributes: { color: 'Teal' }, price_adj: 0 },
                { sku: 'JBLCH5-WHT', attributes: { color: 'White' }, price_adj: 0 },
            ],
            media: [
                { url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=1200&q=80&fit=crop&auto=format', is_primary: true },
            ],
            specs: [
                { key: 'Output', value: '30W RMS' }, { key: 'Battery', value: '7500 mAh, up to 20 hours' },
                { key: 'Waterproofing', value: 'IP67' }, { key: 'Connectivity', value: 'Bluetooth 5.1' },
                { key: 'Power Bank', value: 'Yes (USB-A out)' }, { key: 'PartyBoost', value: 'Yes' },
                { key: 'Weight', value: '960 g' },
            ],
            stock: [80, 50, 25],
        },
    ];

    const featuredCount = Math.min(products.length, 3 + Math.floor(Math.random() * 3));
    const featuredIndexes = new Set();
    while (featuredIndexes.size < featuredCount) {
        featuredIndexes.add(Math.floor(Math.random() * products.length));
    }

    for (const [index, p] of products.entries()) {
        const sellerId = S[p.seller];
        const categoryId = C[p.category];
        const isFeatured = featuredIndexes.has(index);
        if (!sellerId) throw new Error(`Seller not found: "${p.seller}"`);
        if (!categoryId) throw new Error(`Category not found: "${p.category}"`);

        // Insert Product
        const product = await insertReturningId(
            `INSERT INTO Products (seller_id, category_id, title, brand, description, base_price, is_active, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7)`,
            [sellerId, categoryId, p.title, p.brand, p.description, p.base_price, isFeatured]
        );
        const productId = product.product_id;
        log(`Product [${productId}]: ${p.title}`);

        // Insert Variants
        const variantIds = [];
        for (const v of p.variants) {
            const variant = await insertReturningId(
                `INSERT INTO Product_Variants (product_id, sku, attributes, price_adjustment, is_active) VALUES ($1,$2,$3,$4,TRUE)`,
                [productId, v.sku, JSON.stringify(v.attributes), v.price_adj]
            );
            variantIds.push(variant.variant_id);
            allVariantIds.push(variant.variant_id);
        }

        // Insert Media
        let order = 0;
        for (const m of p.media) {
            await query(
                `INSERT INTO Product_Media (product_id, media_url, media_type, is_primary, display_order) VALUES ($1,$2,'image',$3,$4)`,
                [productId, m.url, m.is_primary, order++]
            );
        }

        // Insert Specs
        for (const spec of p.specs) {
            await query(
                `INSERT INTO Product_Specifications (product_id, spec_key, spec_value) VALUES ($1,$2,$3)`,
                [productId, spec.key, spec.value]
            );
        }

        // Insert Inventory (distribute proportionally across warehouses)
        for (let i = 0; i < variantIds.length; i++) {
            const varId = variantIds[i];
            for (let w = 0; w < W.length; w++) {
                const qty = Math.max(1, Math.floor(p.stock[w] / variantIds.length));
                await query(
                    `INSERT INTO Inventory (variant_id, warehouse_id, stock_quantity, aisle_location) VALUES ($1,$2,$3,$4)`,
                    [varId, W[w], qty, `A${(i + 1) * 2}-${String.fromCharCode(65 + w)}${(w + 1) * 3}`]
                );
            }
        }
    }

    return allVariantIds;
}

// ─── 6. Users ───────────────────────────────────────────────────────────────

async function seedUsers() {
    console.log('\n[6/9] Seeding Users (buyers)…');

    const HASH = await bcrypt.hash('buyer123', 10);
    const SPECIAL_HASH = await bcrypt.hash('pass', 10);

    // Create the specifically requested user
    const specialUser = await insertReturningId(
        `INSERT INTO Users (full_name, email, password_hash, phone_number)
         VALUES ($1,$2,$3,$4)`,
        ['User P', 'p@gmail.com', SPECIAL_HASH, '+8801000000000']
    );
    log(`User: User P (p@gmail.com) [NO_ACTIVITY_USER] (id=${specialUser.user_id})`);

    const users = [
        { full_name: 'Amin Rahman', email: 'amin.rahman@demo.paruvo.com', phone: '+8801711000001' },
        { full_name: 'Nusrat Jahan', email: 'nusrat.jahan@demo.paruvo.com', phone: '+8801711000002' },
        { full_name: 'Mehedi Hasan', email: 'mehedi.hasan@demo.paruvo.com', phone: '+8801711000003' },
        { full_name: 'Farhana Akter', email: 'farhana.akter@demo.paruvo.com', phone: '+8801711000004' },
        { full_name: 'Tanvir Alam', email: 'tanvir.alam@demo.paruvo.com', phone: '+8801711000005' },
        { full_name: 'Sadia Islam', email: 'sadia.islam@demo.paruvo.com', phone: '+8801711000006' },
        { full_name: 'Rafiul Karim', email: 'rafiul.karim@demo.paruvo.com', phone: '+8801711000007' },
        { full_name: 'Mahi Chowdhury', email: 'mahi.chowdhury@demo.paruvo.com', phone: '+8801711000008' },
        { full_name: 'Shaila Noor', email: 'shaila.noor@demo.paruvo.com', phone: '+8801711000009' },
        { full_name: 'Riad Hossain', email: 'riad.hossain@demo.paruvo.com', phone: '+8801711000010' },
    ];

    const userIds = [];
    for (const u of users) {
        const user = await insertReturningId(
            `INSERT INTO Users (full_name, email, password_hash, phone_number)
       VALUES ($1,$2,$3,$4)`,
            [u.full_name, u.email, HASH, u.phone]
        );
        userIds.push(user.user_id);
        log(`User: ${u.full_name}  (id=${user.user_id})`);
    }

    // We return ONLY the random user IDs so that 'p@gmail.com' stays with 0 activity
    return userIds;
}

// ─── 7. Orders ──────────────────────────────────────────────────────────────

async function seedOrdersBase(userIds) {
    console.log('\n[7/9] Seeding Orders (last 30 days)…');

    const orderCount = 45;
    const statusPool = ['Delivered', 'Pending', 'Returned'];
    const statusWeights = [0.68, 0.24, 0.08];

    const pickStatus = () => {
        const roll = Math.random();
        let cumulative = 0;
        for (let i = 0; i < statusPool.length; i++) {
            cumulative += statusWeights[i];
            if (roll <= cumulative) return statusPool[i];
        }
        return statusPool[0];
    };

    const orderIds = [];
    for (let i = 0; i < orderCount; i++) {
        const userId = userIds[Math.floor(Math.random() * userIds.length)];
        const inRecentWindow = Math.random() < 0.6;
        const dayOffset = inRecentWindow
            ? Math.floor(Math.random() * 10)
            : 10 + Math.floor(Math.random() * 20);
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - dayOffset);
        orderDate.setHours(
            Math.floor(Math.random() * 24),
            Math.floor(Math.random() * 60),
            Math.floor(Math.random() * 60),
            0
        );

        const order = await insertReturningId(
            `INSERT INTO Orders (user_id, status, total_amount, order_date)
       VALUES ($1,$2,$3,$4)`,
            [userId, pickStatus(), 0, orderDate]
        );

        orderIds.push(order.order_id);
    }

    log(`Orders created: ${orderIds.length}`);
    return orderIds;
}

// ─── 8. Order Items ─────────────────────────────────────────────────────────

async function seedOrderItemsBase(orderIds, variantIds) {
    console.log('\n[8/9] Seeding Order_Items…');

    const pricing = await query(
        `SELECT
       pv.variant_id,
       p.base_price,
       pv.price_adjustment,
       COALESCE(cf.commission_percentage, 5.00) AS platform_fee_percent
     FROM Product_Variants pv
     JOIN Products p ON p.product_id = pv.product_id
     LEFT JOIN Category_Fees cf ON cf.category_id = p.category_id
     WHERE pv.variant_id = ANY($1::int[])`,
        [variantIds]
    );

    const priceMap = new Map();
    for (const row of pricing.rows) {
        const unitPrice = Number(row.base_price) + Number(row.price_adjustment || 0);
        priceMap.set(Number(row.variant_id), {
            unitPrice,
            platformFeePercent: Number(row.platform_fee_percent),
        });
    }

    let itemCount = 0;
    for (const orderId of orderIds) {
        const itemLines = 1 + Math.floor(Math.random() * 3);
        const usedVariants = new Set();
        let totalAmount = 0;

        for (let i = 0; i < itemLines; i++) {
            let variantId = variantIds[Math.floor(Math.random() * variantIds.length)];
            while (usedVariants.has(variantId)) {
                variantId = variantIds[Math.floor(Math.random() * variantIds.length)];
            }
            usedVariants.add(variantId);

            const pricingInfo = priceMap.get(variantId);
            if (!pricingInfo) continue;

            const quantity = 1 + Math.floor(Math.random() * 3);
            totalAmount += quantity * pricingInfo.unitPrice;

            await query(
                `INSERT INTO Order_Items (order_id, variant_id, quantity, unit_price, platform_fee_percent)
         VALUES ($1,$2,$3,$4,$5)`,
                [orderId, variantId, quantity, pricingInfo.unitPrice, pricingInfo.platformFeePercent]
            );
            itemCount++;
        }

        await query(
            `UPDATE Orders
       SET total_amount = $1
       WHERE order_id = $2`,
            [totalAmount.toFixed(2), orderId]
        );
    }

    log(`Order items created: ${itemCount}`);
}

async function seedFlashDealsBase() {
    console.log('\n[9/9] Seeding Flash_Deals…');

    // Target specific high-visibility products for the demo
    const targetTitles = [
        'Apple MacBook Pro M3 14-inch',
        'Sony PlayStation 5 Console (Disc Edition)',
        'Samsung Galaxy S24 Ultra',
        'Canon EOS R6 Mark II Mirrorless Camera Body',
        'Samsung 55-inch QLED 4K Smart TV Q80C',
    ];

    const pickedProducts = await query(
        `SELECT product_id, title
     FROM Products
     WHERE title = ANY($1::text[])
     ORDER BY product_id ASC`,
        [targetTitles]
    );

    // Fixed discount ladder for reproducible demo results: 15%, 20%, 30%, 35%, 40%
    const discountLadder = [15, 20, 30, 35, 40];

    for (let i = 0; i < pickedProducts.rows.length; i++) {
        const row = pickedProducts.rows[i];
        const discountPercentage = discountLadder[i % discountLadder.length];

        await query(
            `INSERT INTO Flash_Deals (product_id, discount_percentage, end_time, is_active)
       VALUES ($1,$2,NOW() + INTERVAL '24 hours',TRUE)`,
            [row.product_id, discountPercentage]
        );

        log(`Flash deal: "${row.title}" | discount=${discountPercentage}% | ends in 24h`);
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────



// High-fidelity overrides layered on top of the legacy seed flow so the existing
// product catalog stays intact while orders, reviews, Q&A, and analytics data
// behave more like a production marketplace demo.


async function cleanup() {
    console.log('\n[0/12] Cleaning up old demo data...');
    await query('TRUNCATE TABLE Product_Answers RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Product_Questions RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Reviews RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Browsing_History RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Order_Items RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Orders RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE order_audit RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Addresses RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Users RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Flash_Deals RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Inventory RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Product_Specifications RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Product_Media RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Product_Variants RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Products RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Sellers RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Category_Fees RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Categories RESTART IDENTITY CASCADE');
    await query('TRUNCATE TABLE Warehouses RESTART IDENTITY CASCADE');
    log('Previous demo data cleared and ID sequences reset.');
}

async function seedProducts(catMap, sellerMap, warehouseIds) {
    const variantIds = await seedProductsBase(catMap, sellerMap, warehouseIds);
    const productRes = await query(`SELECT product_id FROM Products ORDER BY product_id ASC`);
    return {
        variantIds,
        productIds: productRes.rows.map((row) => Number(row.product_id)),
    };
}

async function seedOrders(userIds) {
    console.log('\n[7/12] Seeding Orders (last 60 days with BD city coverage)...');

    const orderCount = 240;
    const statusPool = ['Delivered', 'Processing', 'Shipped', 'Pending', 'Returned'];
    const statusWeights = [0.52, 0.16, 0.12, 0.12, 0.08];

    const pickStatus = () => {
        const roll = Math.random();
        let cumulative = 0;
        for (let i = 0; i < statusPool.length; i++) {
            cumulative += statusWeights[i];
            if (roll <= cumulative) return statusPool[i];
        }
        return statusPool[0];
    };

    const orderIds = [];
    const seenUsers = new Set();
    const citySpread = new Map(BD_CITIES.map((city) => [city, 0]));

    for (let i = 0; i < orderCount; i++) {
        const userId = pickRandom(userIds);
        const city = pickRandom(BD_CITIES);
        const orderDate = randomDateWithinDays(60);
        const address = await insertReturningId(
            `INSERT INTO Addresses (user_id, address_type, street_address, city, zip_code, country, is_default, is_active)
             VALUES ($1,$2,$3,$4,$5,'Bangladesh',$6,TRUE)`,
            [
                userId,
                Math.random() < 0.78 ? 'Home' : 'Office',
                buildBangladeshStreet(city),
                city,
                BD_CITY_ZIP_CODES[city],
                !seenUsers.has(userId),
            ]
        );
        seenUsers.add(userId);

        const order = await insertReturningId(
            `INSERT INTO Orders (user_id, address_id, status, total_amount, order_date)
             VALUES ($1,$2,$3,$4,$5)`,
            [userId, address.address_id, pickStatus(), 0, orderDate]
        );

        orderIds.push(order.order_id);
        citySpread.set(city, citySpread.get(city) + 1);
    }

    log(`Orders created: ${orderIds.length} across ${[...citySpread.values()].filter(Boolean).length} BD cities`);
    return orderIds;
}

async function seedOrderItems(orderIds, variantIds) {
    await seedOrderItemsBase(orderIds, variantIds);
    const countRes = await query(
        `SELECT COUNT(*)::int AS count
         FROM Order_Items
         WHERE order_id = ANY($1::int[])`,
        [orderIds]
    );
    return Number(countRes.rows[0]?.count || 0);
}

async function seedFlashDeals() {
    await seedFlashDealsBase();
    const countRes = await query(
        `SELECT COUNT(*)::int AS count
         FROM Flash_Deals
         WHERE is_active = TRUE`
    );
    return Number(countRes.rows[0]?.count || 0);
}

async function seedReviews(orderIds) {
    console.log('\n[10/12] Seeding Reviews from completed purchases...');

    const purchasedItems = await query(
        `SELECT
           o.user_id,
           pv.product_id,
           o.order_date,
           oi.item_id
         FROM Order_Items oi
         JOIN Orders o ON o.order_id = oi.order_id
         JOIN Product_Variants pv ON pv.variant_id = oi.variant_id
         WHERE oi.order_id = ANY($1::int[])
           AND o.status IN ('Delivered', 'Returned')
         ORDER BY o.order_date ASC, oi.item_id ASC`,
        [orderIds]
    );

    const reviewedPairs = new Set();
    let reviewCount = 0;

    for (const row of purchasedItems.rows) {
        const key = `${row.user_id}:${row.product_id}`;
        if (reviewedPairs.has(key) || Math.random() > 0.7) continue;

        const createdAt = new Date(row.order_date);
        createdAt.setDate(createdAt.getDate() + 1 + Math.floor(Math.random() * 10));
        if (createdAt > new Date()) {
            createdAt.setTime(Date.now() - Math.floor(Math.random() * 36 * 60 * 60 * 1000));
        }

        await insertReturningId(
            `INSERT INTO Reviews (user_id, product_id, rating, comment, images, created_at)
             VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
            [
                row.user_id,
                row.product_id,
                pickRandom(REVIEW_RATINGS),
                pickRandom(REVIEW_COMMENTS),
                JSON.stringify([]),
                createdAt,
            ]
        );

        reviewedPairs.add(key);
        reviewCount++;
    }

    log(`Reviews created: ${reviewCount}`);
    return reviewCount;
}

async function seedQA(productIds) {
    console.log('\n[11/12] Seeding Product Q&A...');

    const [productRes, userRes] = await Promise.all([
        query(
            `SELECT product_id, seller_id, title
             FROM Products
             WHERE product_id = ANY($1::int[])
             ORDER BY product_id ASC`,
            [productIds]
        ),
        query(`SELECT user_id FROM Users ORDER BY user_id ASC`),
    ]);

    const userIds = userRes.rows.map((row) => Number(row.user_id));
    let questionCount = 0;
    let answerCount = 0;

    for (const product of productRes.rows) {
        const questionTotal = 2 + Math.floor(Math.random() * 2);
        const selectedQuestions = pickUniqueRandom(QA_QUESTION_BANK, questionTotal);
        const askingUsers = pickUniqueRandom(userIds, questionTotal);

        for (let i = 0; i < questionTotal; i++) {
            const questionText = selectedQuestions[i];
            const createdAt = randomDateWithinDays(45);
            const question = await insertReturningId(
                `INSERT INTO Product_Questions (product_id, user_id, question_text, created_at)
                 VALUES ($1,$2,$3,$4)`,
                [product.product_id, askingUsers[i], questionText, createdAt]
            );
            questionCount++;

            const answerAt = new Date(createdAt.getTime() + ((2 + Math.floor(Math.random() * 30)) * 60 * 60 * 1000));
            await insertReturningId(
                `INSERT INTO Product_Answers (question_id, seller_id, answer_text, created_at)
                 VALUES ($1,$2,$3,$4)`,
                [question.question_id, product.seller_id, buildSellerAnswer(questionText, product.title), answerAt]
            );
            answerCount++;
        }
    }

    log(`Questions created: ${questionCount} | Answers created: ${answerCount}`);
    return { questionCount, answerCount };
}

async function seedBrowsingHistory(userIds, productIds) {
    console.log('\n[12/12] Seeding Browsing_History with featured + flash weighting...');

    const [featuredRes, flashRes] = await Promise.all([
        query(
            `SELECT product_id
             FROM Products
             WHERE product_id = ANY($1::int[])
               AND is_featured = TRUE`,
            [productIds]
        ),
        query(
            `SELECT DISTINCT product_id
             FROM Flash_Deals
             WHERE is_active = TRUE`
        ),
    ]);

    const featuredIds = featuredRes.rows.map((row) => Number(row.product_id));
    const flashDealIds = flashRes.rows.map((row) => Number(row.product_id));
    const weightedPool = [
        ...productIds,
        ...featuredIds, ...featuredIds, ...featuredIds, ...featuredIds, ...featuredIds,
        ...flashDealIds, ...flashDealIds, ...flashDealIds, ...flashDealIds, ...flashDealIds, ...flashDealIds,
    ];

    const historyTarget = 720;
    for (let i = 0; i < historyTarget; i++) {
        await query(
            `INSERT INTO Browsing_History (user_id, product_id, viewed_at)
             VALUES ($1,$2,$3)`,
            [pickRandom(userIds), pickRandom(weightedPool), randomDateWithinDays(45)]
        );
    }

    log(`Browsing events created: ${historyTarget} with ${featuredIds.length} featured and ${flashDealIds.length} flash deal products boosted`);
    return historyTarget;
}

async function main() {
    console.log('\nPARUVO Marketplace Demo Seed Script v2.0');

    if (!process.env.DATABASE_URL) {
        console.error('ERROR: DATABASE_URL not set in .env');
        process.exit(1);
    }

    try {
        await cleanup();
        const warehouseIds = await seedWarehouses();
        const catMap = await seedCategories();
        await seedCategoryFees(catMap);
        const sellerMap = await seedSellers();
        const { variantIds, productIds } = await seedProducts(catMap, sellerMap, warehouseIds);
        const userIds = await seedUsers();
        const orderIds = await seedOrders(userIds);
        const orderItemCount = await seedOrderItems(orderIds, variantIds);
        const flashDealCount = await seedFlashDeals();
        const reviewCount = await seedReviews(orderIds);
        const qaTotals = await seedQA(productIds);
        const browseCount = await seedBrowsingHistory(userIds, productIds);

        console.log('\nSeed complete!');
        console.log(`  Products:        ${productIds.length}`);
        console.log(`  Users:           ${userIds.length}`);
        console.log(`  Orders:          ${orderIds.length}`);
        console.log(`  Order items:     ${orderItemCount}`);
        console.log(`  Flash deals:     ${flashDealCount}`);
        console.log(`  Reviews:         ${reviewCount}`);
        console.log(`  Q&A pairs:       ${qaTotals.questionCount}/${qaTotals.answerCount}`);
        console.log(`  Browsing events: ${browseCount}`);
        console.log(`  Cities covered:  ${BD_CITIES.join(', ')}`);
    } catch (err) {
        console.error('\nSeed FAILED:', err.message);
        if (err.detail) console.error('Detail:', err.detail);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
