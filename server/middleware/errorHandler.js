module.exports = function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);

  const status = Number(err?.statusCode || err?.status || 500);
  const message = status >= 500 ? 'Server error' : String(err?.message || 'Request error');

  return res.status(status).json({ error: message });
};