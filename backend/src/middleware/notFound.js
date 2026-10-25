const { NotFoundError } = require("../errors/AppError");

// Nieznana ścieżka też musi wrócić w formacie błędu API, nie jako HTML Expressa.
module.exports = (req, res, next) =>
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`, "ROUTE_NOT_FOUND"));
