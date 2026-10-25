const { Router } = require("express");

const validate = require("../../middleware/validate");
const { loginSchema } = require("./auth.schemas");

// Logowanie jest jedyną ścieżką bez tokenu – authenticate montujemy tylko na /me.
function createAuthRouter(authController, authenticate) {
  const router = Router();

  router.post("/login", validate({ body: loginSchema }), authController.login);
  router.get("/me", authenticate, authController.me);

  return router;
}

module.exports = { createAuthRouter };
