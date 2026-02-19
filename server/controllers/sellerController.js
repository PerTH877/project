const pool = require('../config/db');

const registerSeller = async (req, res) => {
    const {company_name, contact_email, password_hash, gst_number} = req.body;

    try{
        const sellerCheck = await pool.query('SELECT * FROM Sellers WHERE contact_email = $1', [contact_email]);
        if(sellerCheck.rows.length >0 )
        {
            return res.status(401).json("A seller with this email already exists");
        }

        const newSeller = await pool.query(
            `INSERT INTO Sellers (company_name, contact_email, password_hash, gst_number) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [company_name, contact_email, password_hash, gst_number]
        )
        res.json(newSeller.rows[0]);
    }catch(err){
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};


module.exports = {registerSeller};