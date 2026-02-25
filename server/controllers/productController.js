const pool = require('../config/db');

const addProduct = async (req, res) => {
    if (req.user.role !== 'seller') {
        return res.status(403).json({ error: "Access denied: Only sellers can add products." });
    }

    const { name, description, price, stock_quantity, category_id } = req.body;
    
    const seller_id = req.user.seller_id; 

    try {
        const newProduct = await pool.query(
            `INSERT INTO Products (seller_id, category_id, name, description, price, stock_quantity) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [seller_id, category_id, name, description, price, stock_quantity]
        );

        res.status(201).json({
            message: "Product added to the shelf successfully!",
            product: newProduct.rows[0]
        });
    } catch (err) {
        console.error("Add Product Error:", err.message);
        res.status(500).json({ error: "Server error while adding product" });
    }
};

module.exports = { addProduct };