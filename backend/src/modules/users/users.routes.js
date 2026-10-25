const { Router } = require("express");

const validate = require("../../middleware/validate");
const authorize = require("../../middleware/authorize");
const { idParamSchema } = require("../../schemas/common");
const { listUsersQuerySchema, createUserSchema, updateUserSchema } = require("./users.schemas");

function createUsersRouter(usersController) {
  const router = Router();

  // Zarządzanie kontami to wyłącznie sprawa administratora.
  router.use(authorize("ADMIN"));

  router.get("/", validate({ query: listUsersQuerySchema }), usersController.listUsers);
  router.post("/", validate({ body: createUserSchema }), usersController.createUser);
  router.get("/:id", validate({ params: idParamSchema }), usersController.getUser);
  router.patch(
    "/:id",
    validate({ params: idParamSchema, body: updateUserSchema }),
    usersController.updateUser,
  );
  router.delete("/:id", validate({ params: idParamSchema }), usersController.deleteUser);

  return router;
}

module.exports = { createUsersRouter };
