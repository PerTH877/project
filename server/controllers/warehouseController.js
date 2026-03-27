const warehouseService = require("../services/warehouse.service");
const { parseId } = require("../utils/marketplace");

const getAllWarehouses = async (_req, res, next) => {
  try {
    const warehouses = await warehouseService.getAllWarehouses();
    return res.json({ warehouses });
  } catch (err) {
    return next(err);
  }
};

const createWarehouse = async (req, res, next) => {
  try {
    const warehouse = await warehouseService.createWarehouse(req.body);
    return res.status(201).json({ message: "Warehouse created", warehouse });
  } catch (err) {
    return next(err);
  }
};

const restockInventory = async (req, res, next) => {
  const sellerId = req.user?.seller_id;
  if (!sellerId) return res.status(401).json({ error: "Unauthorized" });

  const variantId = parseId(req.body.variant_id);
  const warehouseId = parseId(req.body.warehouse_id);
  const quantity = Number(req.body.quantity);

  if (!variantId) return res.status(400).json({ error: "variant_id must be a positive integer" });
  if (!warehouseId) return res.status(400).json({ error: "warehouse_id must be a positive integer" });
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: "quantity must be a positive integer" });
  }

  try {
    const updated = await warehouseService.restockInventory(variantId, warehouseId, quantity);
    return res.json({ message: "Inventory restocked", inventory: updated });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getAllWarehouses, createWarehouse, restockInventory };
