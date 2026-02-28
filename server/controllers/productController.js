const pool = require("../config/db");

// POST /api/products
const createProduct = async (req, res) => {
  const seller_id = req.user.seller_id;
  const { category_id, title, brand, description, base_price, variants } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const productRes = await client.query(
      `INSERT INTO products (seller_id, category_id, title, brand, description, base_price)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        seller_id,
        category_id ?? null,
        title.trim(),
        brand ?? null,
        description ?? null,
        Number(base_price),
      ]
    );

    const product = productRes.rows[0];
    const createdVariants = [];

    for (const v of variants) {
      const variantRes = await client.query(
        `INSERT INTO product_variants (product_id, sku, attributes, price_adjustment)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          product.product_id,
          v.sku.trim(),
          v.attributes,
          Number(v.price_adjustment ?? 0),
        ]
      );

      const variant = variantRes.rows[0];
      createdVariants.push(variant);

      if (Array.isArray(v.inventory)) {
        for (const inv of v.inventory) {
          await client.query(
            `INSERT INTO inventory (variant_id, warehouse_id, stock_quantity, aisle_location)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (variant_id, warehouse_id)
             DO UPDATE SET stock_quantity = EXCLUDED.stock_quantity,
                           aisle_location = EXCLUDED.aisle_location`,
            [
              variant.variant_id,
              Number(inv.warehouse_id),
              Number(inv.stock_quantity),
              inv.aisle_location ?? null,
            ]
          );
        }
      }
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Product created",
      product,
      variants: createdVariants,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createProduct:", err.message);

    if (err.code === "23505") {
      return res.status(409).json({ error: "Duplicate value (likely SKU already exists)" });
    }
    return res.status(500).json({ error: "Server error while creating product" });
  } finally {
    client.release();
  }
};

// GET /api/products (public list)
const listProducts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.product_id, p.title, p.brand, p.base_price, p.created_at, p.category_id, p.seller_id
       FROM products p
       ORDER BY p.product_id DESC
       LIMIT 50`
    );
    return res.json({ products: result.rows });
  } catch (err) {
    console.error("listProducts:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getProduct = async (req, res) => {
  const { product_id } = req.params;
  try {
    const prodRes = await pool.query("SELECT * FROM products WHERE product_id = $1", [product_id]);
    if (prodRes.rows.length === 0) return res.status(404).json({ error: "Product not found" });

    const varRes = await pool.query(
      "SELECT * FROM product_variants WHERE product_id = $1 ORDER BY variant_id ASC",
      [product_id]
    );

    return res.json({ product: prodRes.rows[0], variants: varRes.rows });
  } catch (err) {
    console.error("getProduct:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = { createProduct, listProducts, getProduct };