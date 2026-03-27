const cron = require('node-cron');
const pool = require('../config/db');

function startSubscriptionExpirationCron() {
  // Runs every day at 00:00 (midnight)
  cron.schedule('0 0 * * *', async () => {
    try {
      const query = `
        UPDATE User_Subscriptions
        SET status = 'Expired', auto_renew = FALSE
        WHERE status = 'Active'
          AND end_date < CURRENT_TIMESTAMP
      `;

      const result = await pool.query(query);
      console.log(`[subscription-cron] Expiration check complete. Rows updated: ${result.rowCount}`);
    } catch (error) {
      console.error('[subscription-cron] Failed to expire subscriptions:', error);
    }
  });
}

module.exports = { startSubscriptionExpirationCron };
