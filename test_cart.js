const pool = require('./server/config/db');
const cartService = require('./server/services/cart.service');
cartService.getCartItems(pool, 2)
  .then(res => { console.log('OK', JSON.stringify(res, null, 2)); })
  .catch(e => { console.error('ERROR:', e.message); })
  .finally(() => process.exit(0));
