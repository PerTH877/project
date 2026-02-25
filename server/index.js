require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db'); 

const warehouseRoutes = require('./routes/warehouseRoutes');
const userRoutes = require('./routes/userRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const productRoutes = require('./routes/productRoutes');



const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/warehouses', warehouseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/products',productRoutes);



app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT now()');
        res.json({ message: "Database Connected!", time: result.rows[0].now });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Database Error");
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


