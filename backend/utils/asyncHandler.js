// Wraps async route handlers so thrown errors go to the central error handler.
// Eliminates repetitive try/catch blocks in every route.
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
