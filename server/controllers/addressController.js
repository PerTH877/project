const pool = require('../config/db');

const createAddress = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const {
    address_type,
    street_address,
    city,
    zip_code,
    country,
    is_default,
  } = req.body;
  if (!street_address || typeof street_address !== 'string' || street_address.trim().length === 0) {
    return res.status(400).json({ error: 'street_address is required' });
  }
  if (!city || typeof city !== 'string' || city.trim().length === 0) {
    return res.status(400).json({ error: 'city is required' });
  }
  if (!zip_code || typeof zip_code !== 'string' || zip_code.trim().length === 0) {
    return res.status(400).json({ error: 'zip_code is required' });
  }
  const typeVal = address_type && typeof address_type === 'string' && address_type.trim().length > 0 ? address_type.trim() : 'Home';
  const countryVal = country && typeof country === 'string' && country.trim().length > 0 ? country.trim() : 'Bangladesh';
  const isDefaultBool = is_default === true || is_default === 'true' || is_default === 1 || is_default === '1';
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    if (isDefaultBool) {
      await client.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
    }
    const result = await client.query(
      `INSERT INTO addresses (user_id, address_type, street_address, city, zip_code, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        typeVal,
        street_address.trim(),
        city.trim(),
        zip_code.trim(),
        countryVal,
        isDefaultBool,
      ]
    );
    await client.query('COMMIT');
    return res.status(201).json({ message: 'Address created', address: result.rows[0] });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('createAddress:', err.message);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    if (client) client.release();
  }
};

const getAddresses = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await pool.query(
      'SELECT * FROM addresses WHERE user_id = $1 AND is_active = TRUE ORDER BY address_id ASC',
      [userId]
    );
    return res.json({ addresses: result.rows });
  } catch (err) {
    console.error('getAddresses:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};

const updateAddress = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const addressId = Number(req.params.address_id);
  if (!Number.isInteger(addressId) || addressId <= 0) {
    return res.status(400).json({ error: 'address_id must be a positive integer' });
  }
  const {
    address_type,
    street_address,
    city,
    zip_code,
    country,
    is_default,
    is_active,
  } = req.body;
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const addrRes = await client.query('SELECT user_id FROM addresses WHERE address_id = $1', [addressId]);
    if (addrRes.rows.length === 0 || addrRes.rows[0].user_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Address not found' });
    }
    let newDefault = false;
    if (is_default !== undefined) {
      newDefault = is_default === true || is_default === 'true' || is_default === 1 || is_default === '1';
      if (newDefault) {
        await client.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
      }
    }
    const fields = [];
    const values = [];
    let idx = 1;
    if (address_type !== undefined) {
      fields.push(`address_type = $${idx++}`);
      values.push(
        address_type && typeof address_type === 'string' && address_type.trim().length > 0
          ? address_type.trim()
          : null
      );
    }
    if (street_address !== undefined) {
      fields.push(`street_address = $${idx++}`);
      values.push(
        street_address && typeof street_address === 'string' && street_address.trim().length > 0
          ? street_address.trim()
          : null
      );
    }
    if (city !== undefined) {
      fields.push(`city = $${idx++}`);
      values.push(city && typeof city === 'string' && city.trim().length > 0 ? city.trim() : null);
    }
    if (zip_code !== undefined) {
      fields.push(`zip_code = $${idx++}`);
      values.push(
        zip_code && typeof zip_code === 'string' && zip_code.trim().length > 0
          ? zip_code.trim()
          : null
      );
    }
    if (country !== undefined) {
      fields.push(`country = $${idx++}`);
      values.push(
        country && typeof country === 'string' && country.trim().length > 0 ? country.trim() : null
      );
    }
    if (is_default !== undefined) {
      fields.push(`is_default = $${idx++}`);
      values.push(newDefault);
    }
    if (is_active !== undefined) {
      const activeBool =
        is_active === true || is_active === 'true' || is_active === 1 || is_active === '1';
      fields.push(`is_active = $${idx++}`);
      values.push(activeBool);
    }
    if (fields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    values.push(addressId);
    const query = `UPDATE addresses SET ${fields.join(', ')} WHERE address_id = $${values.length} RETURNING *`;
    const updated = await client.query(query, values);
    await client.query('COMMIT');
    return res.json({ message: 'Address updated', address: updated.rows[0] });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('updateAddress:', err.message);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    if (client) client.release();
  }
};

const deleteAddress = async (req, res) => {
  const userId = req.user?.user_id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const addressId = Number(req.params.address_id);
  if (!Number.isInteger(addressId) || addressId <= 0) {
    return res.status(400).json({ error: 'address_id must be a positive integer' });
  }
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const addrRes = await client.query('SELECT user_id FROM addresses WHERE address_id = $1', [addressId]);
    if (addrRes.rows.length === 0 || addrRes.rows[0].user_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Address not found' });
    }
    await client.query('DELETE FROM addresses WHERE address_id = $1', [addressId]);
    await client.query('COMMIT');
    return res.json({ message: 'Address deleted' });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('deleteAddress:', err.message);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    if (client) client.release();
  }
};

module.exports = { createAddress, getAddresses, updateAddress, deleteAddress };