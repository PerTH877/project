const pool = require('../config/db');

const registerUser = async (req , res) => {
    const {full_name, email, password_hash, phone_number, nearby_warehouse_id} = req.body;
    try{
        const userCheck = await pool.query('SELECT * FROM Users where email = $1',[email]);
        if(userCheck.rows.length> 0){
            return res.status(401).json("User already exists");
        }
        const newUser = await pool.query(
            `insert into Users (full_name, email, password_hash, phone number, nearby_warehouse_id)
            values ($1,$2,$3,$4,$5)
            returning *`,
            [full_name, email, password_hash, phone_number, nearby_warehouse_id]
        );

        res.json(newUser.rows[0]);
    }
    catch(err)
    {
        console.error(err.message);
        res.status(500).send("Server Error");
    }

};


module.exports = {registerUser};