// Custom error with HTTP status code, caught by the central error handler.
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
  static badRequest(msg) { return new ApiError(400, msg); }
  static unauthorized(msg) { return new ApiError(401, msg || 'Unauthorized'); }
  static notFound(msg) { return new ApiError(404, msg || 'Not found'); }
  static serverError(msg) { return new ApiError(500, msg || 'Server error'); }
}
module.exports = ApiError;
