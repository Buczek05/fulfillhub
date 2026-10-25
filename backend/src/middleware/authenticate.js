const { UnauthorizedError } = require("../errors/AppError");

// Token mówi, kto przychodzi; baza mówi, czy to konto nadal istnieje i jest aktywne.
function createAuthenticate({ tokenService, usersRepository }) {
  return async function authenticate(req, res, next) {
    const header = req.get("Authorization") ?? "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return next(new UnauthorizedError("Missing Bearer token", "MISSING_TOKEN"));
    }

    let payload;
    try {
      payload = tokenService.verify(token);
    } catch {
      return next(new UnauthorizedError("Invalid or expired token", "INVALID_TOKEN"));
    }

    const user = await usersRepository.findById(Number(payload.sub));
    if (!user || !user.isActive) {
      return next(new UnauthorizedError("Account is no longer active", "INACTIVE_ACCOUNT"));
    }

    req.user = user;
    next();
  };
}

module.exports = { createAuthenticate };
