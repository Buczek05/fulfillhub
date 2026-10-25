const { ForbiddenError } = require("../errors/AppError");

// Sprawdza samą rolę. Dostęp do konkretnych wierszy (czy to dane tego sklepu) pilnują services.
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(`This action requires one of roles: ${roles.join(", ")}`, "FORBIDDEN"),
      );
    }

    next();
  };
}

module.exports = authorize;
