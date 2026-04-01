const warehouseRepository = require("../repositories/warehouse.repository");

const getAllWarehouses = async () => {
  const rows = await warehouseRepository.getAllWarehouses();
  return rows.map((row) => ({
    ...row,
    capacity: row.capacity === null ? null : Number(row.capacity),
    stock_units: Number(row.stock_units ?? 0),
  }));
};

const createWarehouse = async (data) => {
  const { name, street_address, city, zip_code, capacity } = data;

  if (!name || !street_address || !city) {
    const err = new Error("name, street_address, and city are required");
    err.statusCode = 400;
    throw err;
  }

  const parsedCapacity =
    capacity === undefined || capacity === null || capacity === ""
      ? null
      : Number(capacity);

  if (parsedCapacity !== null && (!Number.isFinite(parsedCapacity) || parsedCapacity < 0)) {
    const err = new Error("capacity must be a number >= 0");
    err.statusCode = 400;
    throw err;
  }

  return warehouseRepository.createWarehouse({
    name: String(name).trim(),
    street_address: String(street_address).trim(),
    city: String(city).trim(),
    zip_code: zip_code === undefined || zip_code === null ? null : String(zip_code).trim(),
    capacity: parsedCapacity,
  });
};







const restockInventory = async (variantId, warehouseId, qty) => {
  if (!Number.isInteger(qty) || qty <= 0) {
    const err = new Error("quantity must be a positive integer");
    err.statusCode = 400;
    throw err;
  }

  const inventoryRow = await warehouseRepository.findInventoryRow(variantId, warehouseId);
  if (!inventoryRow) {
    const err = new Error(
      `No inventory row found for variant_id=${variantId} at warehouse_id=${warehouseId}`
    );
    err.statusCode = 404;
    throw err;
  }

  return warehouseRepository.incrementStock(inventoryRow.inventory_id, qty);
};

module.exports = {
  getAllWarehouses,
  createWarehouse,
  restockInventory,
};
