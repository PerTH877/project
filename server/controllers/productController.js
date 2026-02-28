const pool = require("../config/db");

// POST /api/products
const createProduct = async (req, res) => {
  const seller_id = req.user?.seller_id;
  const { category_id, title, brand, description, base_price, variants } = req.body;

  if (!seller_id) return res.status(401).json({ error: "Missing seller_id in token" });
  if (!title || typeof title !== "string") return res.status(400).json({ error: "title is required" });
  if (base_price === undefined || Number.isNaN(Number(base_price))) {
    return res.status(400).json({ error: "base_price is required (number)" });
  }
  if (!Array.isArray(variants) || variants.length === 0) {
    return res.status(400).json({ error: "variants is required (non-empty array)" });
  }

  let categoryId = category_id ?? null;
  if (categoryId !== null) {
    categoryId = Number(categoryId);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({ error: "category_id must be a positive integer or null" });
    }
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    if (categoryId !== null) {
      const catRes = await client.query(
        "SELECT 1 FROM categories WHERE category_id = $1",
        [categoryId]
      );
      if (catRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "Invalid category_id (category not found). Create categories first or set category_id=null.",
        });
      }
    }

    const warehouseIds = new Set();
    for (const v of variants) {
      if (Array.isArray(v.inventory)) {
        for (const inv of v.inventory) {
          const wid = Number(inv.warehouse_id);
          if (!Number.isInteger(wid) || wid <= 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "inventory.warehouse_id must be a positive integer" });
          }
          warehouseIds.add(wid);
        }
      }
    }

    if (warehouseIds.size > 0) {
      const ids = Array.from(warehouseIds);
      const whRes = await client.query(
        "SELECT warehouse_id FROM warehouses WHERE warehouse_id = ANY($1::int[])",
        [ids]
      );
      const found = new Set(whRes.rows.map((r) => r.warehouse_id));
      const missing = ids.filter((id) => !found.has(id));
      if (missing.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `Invalid warehouse_id(s): ${missing.join(", ")}. Create warehouses first or use valid ids.`,
        });
      }
    }

    const productRes = await client.query(
      `INSERT INTO products (seller_id, category_id, title, brand, description, base_price)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        seller_id,
        categoryId,
        title.trim(),
        brand ?? null,
        description ?? null,
        Number(base_price),
      ]
    );

    const product = productRes.rows[0];
    const createdVariants = [];

    for (const v of variants) {
      if (!v?.sku || typeof v.sku !== "string") {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Each variant requires sku (string)" });
      }
      if (!v?.attributes || typeof v.attributes !== "object" || Array.isArray(v.attributes)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Each variant requires attributes (object)" });
      }

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
          const stockQty = Number(inv.stock_quantity);
          if (!Number.isFinite(stockQty) || stockQty < 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "inventory.stock_quantity must be a number >= 0" });
          }

          await client.query(
            `INSERT INTO inventory (variant_id, warehouse_id, stock_quantity, aisle_location)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (variant_id, warehouse_id)
             DO UPDATE SET stock_quantity = EXCLUDED.stock_quantity,
                           aisle_location = EXCLUDED.aisle_location`,
            [
              variant.variant_id,
              Number(inv.warehouse_id),
              stockQty,
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
    if (client) await client.query("ROLLBACK");
    console.error("createProduct:", err.message);

    if (err.code === "23505") {
      return res.status(409).json({ error: "Duplicate value (likely SKU already exists)" });
    }
    if (err.code === "23503") {
      return res.status(400).json({
        error: "Foreign key constraint failed. Check category_id / warehouse_id references.",
        detail: err.detail,
      });
    }

    return res.status(500).json({ error: "Server error while creating product" });
  } finally {
    if (client) client.release();
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

// GET /api/products/:product_id
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