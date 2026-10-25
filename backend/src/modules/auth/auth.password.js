const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

// Opakowanie na bcrypt: services dostają je jako zależność, więc dają się testować bez hashowania.
function createPasswordHasher({ saltRounds = SALT_ROUNDS } = {}) {
  return {
    hash: (plain) => bcrypt.hash(plain, saltRounds),
    compare: (plain, hash) => bcrypt.compare(plain, hash),
  };
}

module.exports = { createPasswordHasher };
