class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function badRequest(message, details) {
  return new ApiError(400, 'VALIDATION_ERROR', message, details);
}

function notFound(message = 'Resource not found') {
  return new ApiError(404, 'NOT_FOUND', message);
}

module.exports = { ApiError, badRequest, notFound };
