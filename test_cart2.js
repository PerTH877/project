const pool = require('./server/config/db');
const cartService = require('./server/services/cart.service');
async function test() {
  try {
    const res = await cartService.getCartItems(pool, 2);
    console.log('OK', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit(0);
  }
}
test();
