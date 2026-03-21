const pool = require("../config/db");
const { parseId, fetchWishlistSummaries } = require("../utils/marketplace");

const createWishlist = async (req, res) => {
  const userId = req.user?.user_id;
  const name = String(req.body.name || "My Wishlist").trim();
  const isPublic = req.body.is_public === true || req.body.is_public === "true";

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO wishlists (user_id, name, is_public)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, name || "My Wishlist", isPublic]
    );

    await client.query("COMMIT");
    return res.status(201).json({ message: "Wishlist created", wishlist: result.rows[0] });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("createWishlist:", err.message);
    return res.status(500).json({ error: "Server error" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const getWishlists = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const wishlists = await fetchWishlistSummaries(pool, userId);
    return res.json({ wishlists });
  } catch (err) {
    console.error("getWishlists:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const addWishlistItem = async (req, res) => {
  const userId = req.user?.user_id;
  const wishlistId = parseId(req.params.wishlist_id);
  const variantId = Number(req.body.variant_id);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!wishlistId) {
    return res.status(400).json({ error: "wishlist_id must be a positive integer" });
  }

  if (!Number.isInteger(variantId) || variantId <= 0) {
    return res.status(400).json({ error: "variant_id must be a positive integer" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const wishlistResult = await client.query(
      "SELECT user_id FROM wishlists WHERE wishlist_id = $1",
      [wishlistId]
    );

    if (!wishlistResult.rows.length || wishlistResult.rows[0].user_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Wishlist not found" });
    }

    const variantResult = await client.query(
      "SELECT variant_id FROM product_variants WHERE variant_id = $1",
      [variantId]
    );

    if (!variantResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid variant_id" });
    }

    await client.query(
      `INSERT INTO wishlist_items (wishlist_id, variant_id)
       VALUES ($1, $2)
       ON CONFLICT (wishlist_id, variant_id) DO NOTHING`,
      [wishlistId, variantId]
    );

    await client.query("COMMIT");
    return res.status(201).json({ message: "Item added to wishlist" });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("addWishlistItem:", err.message);
    return res.status(500).json({ error: "Server error" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const removeWishlistItem = async (req, res) => {
  const userId = req.user?.user_id;
  const wishlistId = parseId(req.params.wishlist_id);
  const variantId = parseId(req.params.variant_id);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!wishlistId || !variantId) {
    return res
      .status(400)
      .json({ error: "wishlist_id and variant_id must be positive integers" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const wishlistResult = await client.query(
      "SELECT user_id FROM wishlists WHERE wishlist_id = $1",
      [wishlistId]
    );

    if (!wishlistResult.rows.length || wishlistResult.rows[0].user_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Wishlist not found" });
    }

    await client.query(
      "DELETE FROM wishlist_items WHERE wishlist_id = $1 AND variant_id = $2",
      [wishlistId, variantId]
    );

    await client.query("COMMIT");
    return res.json({ message: "Item removed from wishlist" });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("removeWishlistItem:", err.message);
    return res.status(500).json({ error: "Server error" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

module.exports = { createWishlist, getWishlists, addWishlistItem, removeWishlistItem };
