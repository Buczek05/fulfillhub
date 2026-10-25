const jwt = require("jsonwebtoken");

function createTokenService({ secret, expiresIn }) {
  function sign(user) {
    return jwt.sign({ sub: String(user.id), role: user.role, shopId: user.shopId ?? null }, secret, {
      expiresIn,
    });
  }

  function verify(token) {
    return jwt.verify(token, secret);
  }

  return { sign, verify };
}

module.exports = { createTokenService };
