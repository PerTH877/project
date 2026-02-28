function validateCreateProduct(req, res, next) {
  const body = req.body || {};
  const {
    category_id,
    title,
    brand,
    description,
    base_price,
    variants,
  } = body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'title is required and must be a non‑empty string' });
  }

  const priceNum = Number(base_price);
  if (base_price === undefined || base_price === null || !Number.isFinite(priceNum) || priceNum < 0) {
    return res.status(400).json({ error: 'base_price is required and must be a number ≥ 0' });
  }

  if (category_id !== undefined && category_id !== null) {
    const catNum = Number(category_id);
    if (!Number.isInteger(catNum) || catNum <= 0) {
      return res.status(400).json({ error: 'category_id must be a positive integer or null' });
    }
  }

  if (brand !== undefined && brand !== null && typeof brand !== 'string') {
    return res.status(400).json({ error: 'brand must be a string if provided' });
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    return res.status(400).json({ error: 'description must be a string if provided' });
  }

  if (!Array.isArray(variants) || variants.length === 0) {
    return res.status(400).json({ error: 'variants is required and must be a non‑empty array' });
  }

  for (const [variantIndex, v] of variants.entries()) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) {
      return res.status(400).json({ error: `variant at index ${variantIndex} must be an object` });
    }

    if (!v.sku || typeof v.sku !== 'string' || v.sku.trim().length === 0) {
      return res.status(400).json({ error: `variant at index ${variantIndex} requires sku (non‑empty string)` });
    }

    if (!v.attributes || typeof v.attributes !== 'object' || Array.isArray(v.attributes)) {
      return res.status(400).json({ error: `variant at index ${variantIndex} requires attributes (object)` });
    }

    if (v.price_adjustment !== undefined && v.price_adjustment !== null) {
      const adj = Number(v.price_adjustment);
      if (!Number.isFinite(adj)) {
        return res.status(400).json({ error: `variant at index ${variantIndex} has invalid price_adjustment (must be a number)` });
      }
    }

    if (v.inventory !== undefined && v.inventory !== null) {
      if (!Array.isArray(v.inventory)) {
        return res.status(400).json({ error: `variant at index ${variantIndex} inventory must be an array if provided` });
      }
      for (const [invIndex, inv] of v.inventory.entries()) {
        if (!inv || typeof inv !== 'object' || Array.isArray(inv)) {
          return res.status(400).json({ error: `inventory item at variant ${variantIndex}, index ${invIndex} must be an object` });
        }
        const wid = Number(inv.warehouse_id);
        if (!Number.isInteger(wid) || wid <= 0) {
          return res.status(400).json({ error: `inventory.warehouse_id at variant ${variantIndex}, index ${invIndex} must be a positive integer` });
        }
        const stockQty = Number(inv.stock_quantity);
        if (inv.stock_quantity === undefined || inv.stock_quantity === null || !Number.isFinite(stockQty) || stockQty < 0) {
          return res.status(400).json({ error: `inventory.stock_quantity at variant ${variantIndex}, index ${invIndex} must be a number ≥ 0` });
        }
        if (inv.aisle_location !== undefined && inv.aisle_location !== null && typeof inv.aisle_location !== 'string') {
          return res.status(400).json({ error: `inventory.aisle_location at variant ${variantIndex}, index ${invIndex} must be a string if provided` });
        }
      }
    }
  }

  return next();
}



module.exports = { validateCreateProduct };