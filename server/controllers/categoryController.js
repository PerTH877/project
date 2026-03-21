const pool = require("../config/db");

const createCategory = async (req, res) => {
  const parentId =
    req.body.parent_id === null || req.body.parent_id === undefined || req.body.parent_id === ""
      ? null
      : Number(req.body.parent_id);
  const name = String(req.body.name || "").trim();
  const description =
    req.body.description === undefined || req.body.description === null
      ? null
      : String(req.body.description).trim();
  const commissionPercentage =
    req.body.commission_percentage === undefined ||
    req.body.commission_percentage === null ||
    req.body.commission_percentage === ""
      ? null
      : Number(req.body.commission_percentage);

  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  if (parentId !== null && (!Number.isInteger(parentId) || parentId <= 0)) {
    return res.status(400).json({ error: "parent_id must be a positive integer or null" });
  }

  if (
    commissionPercentage !== null &&
    (!Number.isFinite(commissionPercentage) ||
      commissionPercentage < 0 ||
      commissionPercentage > 100)
  ) {
    return res
      .status(400)
      .json({ error: "commission_percentage must be between 0 and 100" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    if (parentId !== null) {
      const parentResult = await client.query(
        "SELECT category_id FROM categories WHERE category_id = $1",
        [parentId]
      );
      if (!parentResult.rows.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Invalid parent_id" });
      }
    }

    const categoryResult = await client.query(
      `INSERT INTO categories (parent_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [parentId, name, description || null]
    );

    if (commissionPercentage !== null) {
      await client.query(
        `INSERT INTO category_fees (category_id, commission_percentage)
         VALUES ($1, $2)`,
        [categoryResult.rows[0].category_id, commissionPercentage]
      );
    }

    await client.query("COMMIT");
    return res.status(201).json({
      message: "Category created",
      category: categoryResult.rows[0],
    });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("createCategory:", err.message);
    return res.status(500).json({ error: "Server error" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const listCategories = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         c.category_id,
         c.parent_id,
         c.name,
         c.description,
         cf.commission_percentage,
         COUNT(p.product_id)::int AS product_count
       FROM categories c
       LEFT JOIN LATERAL (
         SELECT commission_percentage
         FROM category_fees
         WHERE category_id = c.category_id
         ORDER BY updated_at DESC, fee_id DESC
         LIMIT 1
       ) cf ON TRUE
       LEFT JOIN products p ON p.category_id = c.category_id AND p.is_active = TRUE
       GROUP BY c.category_id, cf.commission_percentage
       ORDER BY c.name ASC`
    );

    return res.json({
      categories: result.rows.map((row) => ({
        ...row,
        commission_percentage:
          row.commission_percentage === null ? null : Number(row.commission_percentage),
        product_count: Number(row.product_count ?? 0),
      })),
    });
  } catch (err) {
    console.error("listCategories:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = { createCategory, listCategories };
