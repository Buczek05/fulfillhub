const { toUserResponse } = require("../users/users.mapper");

function createAuthController(authService) {
  async function login(req, res) {
    const { accessToken, user } = await authService.login(req.validated.body);

    res.json({ accessToken, user: toUserResponse(user) });
  }

  async function me(req, res) {
    res.json(toUserResponse(req.user));
  }

  return { login, me };
}

module.exports = { createAuthController };
