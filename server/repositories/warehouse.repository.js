const pool = require("../config/db");

const getAllWarehouses = async () => {
  const result = await pool.query(
    `SELECT
       w.warehouse_id,
       w.name,
       w.street_address,
       w.city,
       w.zip_code,
       w.capacity,
       w.is_active,
       COALESCE(SUM(i.stock_quantity), 0)::int AS stock_units
     FROM warehouses w
     LEFT JOIN inventory i ON i.warehouse_id = w.warehouse_id
     WHERE w.is_active = TRUE
     GROUP BY w.warehouse_id
     ORDER BY w.city ASC, w.name ASC`
  );
  return result.rows;
};

const createWarehouse = async ({ name, street_address, city, zip_code, capacity }) => {
  const result = await pool.query(
    `INSERT INTO warehouses (name, street_address, city, zip_code, capacity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, street_address, city, zip_code ?? null, capacity ?? null]
  );
  return result.rows[0];
};

/**
 * Find an inventory row by variant_id + warehouse_id.
 */
const findInventoryRow = async (variantId, warehouseId) => {
  const result = await pool.query(
    `SELECT inventory_id, stock_quantity
     FROM inventory
     WHERE variant_id = $1 AND warehouse_id = $2
     LIMIT 1`,
    [variantId, warehouseId]
  );
  return result.rows[0] || null;
};

/**
 * Increment stock_quantity by `qty` for the given inventory row.
 */
const incrementStock = async (inventoryId, qty) => {
  const result = await pool.query(
    `UPDATE inventory
     SET stock_quantity = stock_quantity + $1
     WHERE inventory_id = $2
     RETURNING inventory_id, variant_id, warehouse_id, stock_quantity`,
    [qty, inventoryId]
  );
  return result.rows[0] || null;
};

module.exports = {
  getAllWarehouses,
  createWarehouse,
  findInventoryRow,
  incrementStock,
};
