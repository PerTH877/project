const pool = require("../config/db");

const getAllWarehouses = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         warehouse_id,
         name,
         street_address,
         city,
         zip_code,
         capacity,
         is_active,
         COALESCE(SUM(i.stock_quantity), 0)::int AS stock_units
       FROM warehouses w
       LEFT JOIN inventory i ON i.warehouse_id = w.warehouse_id
       WHERE w.is_active = TRUE
       GROUP BY w.warehouse_id
       ORDER BY w.city ASC, w.name ASC`
    );

    return res.json({
      warehouses: result.rows.map((row) => ({
        ...row,
        capacity: row.capacity === null ? null : Number(row.capacity),
        stock_units: Number(row.stock_units ?? 0),
      })),
    });
  } catch (err) {
    console.error("getAllWarehouses:", err.message);
    return res.status(500).json({ error: "Server Error" });
  }
};

const createWarehouse = async (req, res) => {
  const name = String(req.body.name || "").trim();
  const streetAddress = String(req.body.street_address || "").trim();
  const city = String(req.body.city || "").trim();
  const zipCode =
    req.body.zip_code === undefined || req.body.zip_code === null
      ? null
      : String(req.body.zip_code).trim();
  const capacity =
    req.body.capacity === undefined || req.body.capacity === null || req.body.capacity === ""
      ? null
      : Number(req.body.capacity);

  if (!name || !streetAddress || !city) {
    return res.status(400).json({
      error: "name, street_address, and city are required",
    });
  }

  if (capacity !== null && (!Number.isFinite(capacity) || capacity < 0)) {
    return res.status(400).json({ error: "capacity must be a number >= 0" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const newWarehouse = await client.query(
      `INSERT INTO warehouses (name, street_address, city, zip_code, capacity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, streetAddress, city, zipCode, capacity]
    );

    await client.query("COMMIT");
    return res.status(201).json({
      message: "Warehouse created",
      warehouse: newWarehouse.rows[0],
    });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("createWarehouse:", err.message);
    return res.status(500).json({ error: "Server Error" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

module.exports = { getAllWarehouses, createWarehouse };
