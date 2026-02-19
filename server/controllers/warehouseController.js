const pool = require('../config/db');
const { get } = require('../routes/userRoutes');

// FUNCTION 1: Fetch all active warehouses
const getAllWarehouses = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM Warehouses WHERE is_active = TRUE ORDER BY warehouse_id ASC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};


const createWarehouse = async(req, res) => {
    try{
        const{name, street_address ,city , zip_code , capacity} = req.body;
        const newWarehouse = await pool.query(
            `insert into warehouses (name, street_address ,city , zip_code , capacity)
            values($1,$2, $3 , $4, $5)
            returning *`,
            [name, street_address ,city , zip_code , capacity]
        );
        res.json(newWarehouse.rows[0]);
    }catch(err)
    {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
    
};

module.exports = {getAllWarehouses , createWarehouse};
