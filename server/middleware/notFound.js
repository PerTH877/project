module.exports = function notFound(req, res) {
  return res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
  });
};