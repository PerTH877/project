try {
  require('./controllers/checkoutController');
  console.log('[OK] checkoutController');

  require('./controllers/cartController');
  console.log('[OK] cartController');

  require('./controllers/productController');
  console.log('[OK] productController');

  require('./routes/cartRoutes');
  console.log('[OK] cartRoutes');

  require('./routes/checkoutRoutes');
  console.log('[OK] checkoutRoutes');

  require('./services/checkout.service');
  console.log('[OK] checkout.service');

  require('./services/cart.service');
  console.log('[OK] cart.service');

  require('./repositories/checkout.repository');
  console.log('[OK] checkout.repository');

  console.log('\nAll modules loaded successfully.');
} catch (e) {
  console.error('FAILED:', e.message);
  process.exit(1);
}
