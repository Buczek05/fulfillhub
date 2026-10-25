const { UnauthorizedError } = require("../../errors/AppError");

function createAuthService({ usersRepository, tokenService, passwordHasher }) {
  // Zły e-mail, złe hasło i konto nieaktywne dają ten sam komunikat – nie podpowiadamy, co nie pasuje.
  async function login({ email, password }) {
    const user = await usersRepository.findByEmailWithHash(email);
    const passwordMatches = user ? await passwordHasher.compare(password, user.passwordHash) : false;

    if (!user || !passwordMatches || !user.isActive) {
      throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");
    }

    const { passwordHash, ...safeUser } = user;

    return { accessToken: tokenService.sign(safeUser), user: safeUser };
  }

  return { login };
}

module.exports = { createAuthService };
