require('./config/env');

const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const warehouseRoutes = require('./routes/warehouseRoutes');
const userRoutes = require('./routes/userRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const productRoutes = require('./routes/productRoutes');
const adminRoutes = require("./routes/adminRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const addressRoutes = require('./routes/addressRoutes');
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');

const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/warehouses', warehouseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/products', productRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlists', wishlistRoutes);

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT now()');
    res.json({ message: "Database Connected!", time: result.rows[0].now });
  } catch (err) {
    console.error(err.message);
    res.status(500).json("Database Error");
  }
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});