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

async function cleanup() {
  console.log('\n[0/9] Cleaning up old demo data…');
  // Order matters: children before parents
  await query('DELETE FROM Inventory');
  await query('DELETE FROM Product_Specifications');
  await query('DELETE FROM Product_Media');
  await query('DELETE FROM Product_Variants');
  await query('DELETE FROM Products');
  await query('DELETE FROM Sellers');
  await query('DELETE FROM Category_Fees');
  await query('DELETE FROM Categories');
  await query('DELETE FROM Warehouses');
  log('Previous demo data cleared.');
}

// ─── 1. Warehouses ────────────────────────────────────────────────────────────

async function seedWarehouses() {
  console.log('\n[1/9] Seeding Warehouses…');
  const rows = [
    { name: 'Dhaka Central Hub',   street_address: '12 Tejgaon Industrial Area', city: 'Dhaka',     zip_code: '1208', capacity: 5000 },
    { name: 'Chittagong Port Hub', street_address: '45 Port Connect Road',       city: 'Chittagong', zip_code: '4100', capacity: 3000 },
    { name: 'Sylhet Distribution', street_address: '8 Zindabazar Plaza',          city: 'Sylhet',    zip_code: '3100', capacity: 2000 },
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
    { name: 'Electronics',          description: 'Gadgets, devices, and electronic equipment' },
    { name: 'Computers & Laptops',  description: 'Laptops, desktops, and computer peripherals' },
    { name: 'Smartphones',          description: 'Mobile phones and accessories' },
    { name: 'Audio',                description: 'Headphones, speakers, and audio gear' },
    { name: 'Gaming',               description: 'Gaming consoles, games, and accessories' },
    { name: 'Footwear',             description: 'Shoes, sneakers, and sports footwear' },
    { name: 'Cameras',              description: 'Digital cameras, lenses, and accessories' },
    { name: 'Home Appliances',      description: 'Smart and traditional home appliances' },
    { name: 'Tablets & Wearables',  description: 'Tablets, smartwatches, and wearable tech' },
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
  // bcrypt hash of "seller123"
  const HASH = '$2b$10$5pFnVEJpjjpDwOqVGp6xh.PiHxz0F9YjI3PkJXbCsHnTOJhsUKi5q';
  const sellers = [
    { company_name: 'TechZone BD',                    contact_email: 'sales@techzonebd.com',    gst_number: 'GST-10023-BD', rating: 4.75, balance: 125000 },
    { company_name: 'Apple Authorized Reseller BD',   contact_email: 'contact@applebd.com',     gst_number: 'GST-20045-BD', rating: 4.90, balance: 350000 },
    { company_name: 'SoundWave Electronics',          contact_email: 'info@soundwave.com.bd',   gst_number: 'GST-30078-BD', rating: 4.55, balance:  89000 },
    { company_name: 'GearUp Sports & Lifestyle',      contact_email: 'orders@gearupbd.com',     gst_number: 'GST-40091-BD', rating: 4.30, balance:  45000 },
    { company_name: 'SmartHome Gadgets',              contact_email: 'support@smarthomegd.com', gst_number: 'GST-50012-BD', rating: 4.60, balance:  72000 },
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

async function seedProducts(catMap, sellerMap, warehouseIds) {
  console.log('\n[5–9/9] Seeding Products, Variants, Media, Specs & Inventory…');

  const S = sellerMap;
  const C = catMap;
  const W = warehouseIds;

  const products = [
    // 1 ─────────────────────────────────────────────────────────────────────
    {
      title: 'Apple MacBook Pro M3 14-inch', brand: 'Apple',
      seller: 'Apple Authorized Reseller BD', category: 'Computers & Laptops',
      base_price: 199999.00,
      description: 'The MacBook Pro 14-inch with M3 chip delivers exceptional performance for professionals. Liquid Retina XDR display, 22-hour battery life, and up to 24 GB unified memory.',
      variants: [
        { sku: 'MBP-M3-14-8-512-SG',  attributes: { color: 'Space Gray', ram: '8 GB',  storage: '512 GB SSD' }, price_adj: 0     },
        { sku: 'MBP-M3-14-16-1TB-SG', attributes: { color: 'Space Gray', ram: '16 GB', storage: '1 TB SSD'  }, price_adj: 40000 },
        { sku: 'MBP-M3-14-18-1TB-SL', attributes: { color: 'Silver',     ram: '18 GB', storage: '1 TB SSD'  }, price_adj: 55000 },
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
      stock: [45, 20, 10],
    },

    // 2 ─────────────────────────────────────────────────────────────────────
    {
      title: 'Samsung Galaxy S24 Ultra', brand: 'Samsung',
      seller: 'TechZone BD', category: 'Smartphones',
      base_price: 154999.00,
      description: 'The ultimate Galaxy AI phone. 6.8-inch Dynamic AMOLED 2X display, built-in S Pen, 200 MP camera with 100x Space Zoom, and Snapdragon 8 Gen 3.',
      variants: [
        { sku: 'S24U-12-256-TB', attributes: { color: 'Titanium Black',  storage: '256 GB' }, price_adj: 0     },
        { sku: 'S24U-12-512-TG', attributes: { color: 'Titanium Gray',   storage: '512 GB' }, price_adj: 15000 },
        { sku: 'S24U-12-1TB-TV', attributes: { color: 'Titanium Violet', storage: '1 TB'   }, price_adj: 30000 },
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
        { sku: 'WH-XM5-BLK', attributes: { color: 'Black'  }, price_adj: 0 },
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
        { sku: 'IPADPRO-M4-13-256-WIFI-SG', attributes: { color: 'Space Gray', storage: '256 GB', connectivity: 'Wi-Fi' },          price_adj: 0     },
        { sku: 'IPADPRO-M4-13-512-WIFI-SL', attributes: { color: 'Silver',     storage: '512 GB', connectivity: 'Wi-Fi' },          price_adj: 25000 },
        { sku: 'IPADPRO-M4-13-1TB-CELL-SG', attributes: { color: 'Space Gray', storage: '1 TB',   connectivity: 'Wi-Fi+Cellular' }, price_adj: 65000 },
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
        { sku: 'XPS15-i7-16-512-4060', attributes: { processor: 'Core i7-13700H', ram: '16 GB', storage: '512 GB', gpu: 'RTX 4060' }, price_adj: 0     },
        { sku: 'XPS15-i9-32-1TB-4070', attributes: { processor: 'Core i9-13900H', ram: '32 GB', storage: '1 TB',   gpu: 'RTX 4070' }, price_adj: 50000 },
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
        { sku: 'PX9P-128-OB', attributes: { color: 'Obsidian',    storage: '128 GB' }, price_adj: 0     },
        { sku: 'PX9P-256-PO', attributes: { color: 'Porcelain',   storage: '256 GB' }, price_adj: 10000 },
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
        { sku: 'APP2-USBC',  attributes: { connector: 'USB-C Case'   }, price_adj: 0 },
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
        { sku: 'QN55Q80C', attributes: { size: '55-inch', color: 'Titan Black' }, price_adj: 0     },
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
        { sku: 'MXMS3-GR',  attributes: { color: 'Graphite'      }, price_adj: 0 },
        { sku: 'MXMS3-PW',  attributes: { color: 'Pale Gray'     }, price_adj: 0 },
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
        { sku: 'AW9-45-SL-SPORT', attributes: { case: 'Starlight Aluminum', band: 'Starlight Sport', size: '45mm' }, price_adj: 0     },
        { sku: 'AW9-45-MN-SPORT', attributes: { case: 'Midnight Aluminum',  band: 'Midnight Sport',  size: '45mm' }, price_adj: 0     },
        { sku: 'AW9-45-SS-MILAN', attributes: { case: 'Silver Stainless',   band: 'Milanese Loop',   size: '45mm' }, price_adj: 25000 },
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
        { sku: 'NSW-OLED-WHT', attributes: { color: 'White'              }, price_adj: 0 },
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
        { sku: 'LOTTO-VENTO-BR-41', attributes: { color: 'Black/Red',  size: 'EU 41' }, price_adj: 0 },
        { sku: 'LOTTO-VENTO-BR-42', attributes: { color: 'Black/Red',  size: 'EU 42' }, price_adj: 0 },
        { sku: 'LOTTO-VENTO-BR-43', attributes: { color: 'Black/Red',  size: 'EU 43' }, price_adj: 0 },
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
        { sku: 'EOSR6M2-BODY',   attributes: { bundle: 'Body Only'               }, price_adj: 0     },
        { sku: 'EOSR6M2-KIT-L',  attributes: { bundle: 'With RF 24-105mm f/4L'   }, price_adj: 95000 },
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
      stock: [12, 6, 3],
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
        { sku: 'PS5-DISC-STD',  attributes: { edition: 'Standard Disc', color: 'White' }, price_adj: 0    },
        { sku: 'PS5-DISC-SLIM', attributes: { edition: 'Slim Disc',     color: 'White' }, price_adj: 5000 },
      ],
      media: [
        { url: 'https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?w=1200&q=80&fit=crop&auto=format', is_primary: true },
      ],
      specs: [
        { key: 'CPU', value: 'AMD Zen 2, 8 cores @ 3.5 GHz' }, { key: 'GPU', value: '10.28 TFLOPS RDNA 2' },
        { key: 'RAM', value: '16 GB GDDR6' }, { key: 'SSD', value: '825 GB Custom (5.5 GB/s)' },
        { key: 'Optical Drive', value: '4K UHD Blu-ray' }, { key: 'Resolution', value: 'Up to 8K, 4K @ 120 fps' },
      ],
      stock: [25, 12, 6],
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
        { sku: 'QC45-BLK', attributes: { color: 'Black'       }, price_adj: 0 },
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
        { sku: 'KPW11-8-AD',    attributes: { storage: '8 GB',  ads: 'With Ads'    }, price_adj: 0    },
        { sku: 'KPW11-8-NOAD',  attributes: { storage: '8 GB',  ads: 'Without Ads' }, price_adj: 1500 },
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
        { sku: 'V15-DETECT-YEL', attributes: { color: 'Yellow/Nickel'                  }, price_adj: 0    },
        { sku: 'V15-DETECT-PBS', attributes: { color: 'Prussian Blue/Bright Copper'    }, price_adj: 2000 },
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
        { sku: 'GW6C-47-BLK-BT',  attributes: { color: 'Black',  size: '47mm', connectivity: 'Bluetooth' }, price_adj: 0    },
        { sku: 'GW6C-47-SL-BT',   attributes: { color: 'Silver', size: '47mm', connectivity: 'Bluetooth' }, price_adj: 0    },
        { sku: 'GW6C-47-BLK-LTE', attributes: { color: 'Black',  size: '47mm', connectivity: 'LTE'       }, price_adj: 8000 },
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
        { sku: 'JBLCH5-BLK',  attributes: { color: 'Black' }, price_adj: 0 },
        { sku: 'JBLCH5-BLU',  attributes: { color: 'Blue'  }, price_adj: 0 },
        { sku: 'JBLCH5-RED',  attributes: { color: 'Red'   }, price_adj: 0 },
        { sku: 'JBLCH5-TEAL', attributes: { color: 'Teal'  }, price_adj: 0 },
        { sku: 'JBLCH5-WHT',  attributes: { color: 'White' }, price_adj: 0 },
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

  for (const p of products) {
    const sellerId   = S[p.seller];
    const categoryId = C[p.category];
    if (!sellerId)   throw new Error(`Seller not found: "${p.seller}"`);
    if (!categoryId) throw new Error(`Category not found: "${p.category}"`);

    // Insert Product
    const product = await insertReturningId(
      `INSERT INTO Products (seller_id, category_id, title, brand, description, base_price, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE)`,
      [sellerId, categoryId, p.title, p.brand, p.description, p.base_price]
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
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   PARUVO Marketplace — Demo Seed Script v2.0    ║');
  console.log('╚══════════════════════════════════════════════════╝');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not set in .env');
    process.exit(1);
  }

  try {
    await cleanup();
    const warehouseIds = await seedWarehouses();
    const catMap       = await seedCategories();
    await seedCategoryFees(catMap);
    const sellerMap    = await seedSellers();
    await seedProducts(catMap, sellerMap, warehouseIds);

    console.log('\n✅  Seed complete!');
    console.log('   ─────────────────────────────────────────');
    console.log('   Warehouses:        3');
    console.log('   Categories:        9  (with fees)');
    console.log('   Sellers:           5');
    console.log('   Products:         22  (with variants, media, specs, inventory)');
    console.log('   Image source:      Unsplash CDN (hotlink-safe)');
    console.log('   ─────────────────────────────────────────\n');
  } catch (err) {
    console.error('\n❌  Seed FAILED:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
