const { AppError } = require("../errors/AppError");

// eslint-disable-next-line no-unused-vars -- Express rozpoznaje error handler po 4 parametrach
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details, requestId: req.id },
    });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "Request body is not valid JSON", requestId: req.id },
    });
  }

  console.error(`[${req.id}]`, err); // stack trace zostaje w logu serwera, nie w odpowiedzi
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Unexpected error", requestId: req.id },
  });
}

module.exports = errorHandler;
