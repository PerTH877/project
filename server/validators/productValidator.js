function isObject(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

const validateCreateProduct = (req, res, next) => {
  const { title, base_price, variants } = req.body;

  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "title is required (string)" });
  }
  if (base_price === undefined || Number.isNaN(Number(base_price))) {
    return res.status(400).json({ error: "base_price is required (number)" });
  }
  if (!Array.isArray(variants) || variants.length === 0) {
    return res.status(400).json({ error: "variants is required (non-empty array)" });
  }

  for (const v of variants) {
    if (!v.sku || typeof v.sku !== "string") {
      return res.status(400).json({ error: "Each variant requires sku (string)" });
    }
    if (!isObject(v.attributes)) {
      return res.status(400).json({ error: "Each variant requires attributes (object)" });
    }
    if (v.inventory && !Array.isArray(v.inventory)) {
      return res.status(400).json({ error: "variant.inventory must be an array if provided" });
    }
    if (Array.isArray(v.inventory)) {
      for (const inv of v.inventory) {
        if (!inv.warehouse_id || Number.isNaN(Number(inv.warehouse_id))) {
          return res.status(400).json({ error: "inventory.warehouse_id is required (number)" });
        }
        if (inv.stock_quantity === undefined || Number.isNaN(Number(inv.stock_quantity))) {
          return res.status(400).json({ error: "inventory.stock_quantity is required (number)" });
        }
      }
    }
  }

  return next();
};

module.exports = { validateCreateProduct };