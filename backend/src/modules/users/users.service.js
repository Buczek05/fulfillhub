const { NotFoundError, ConflictError, ValidationError } = require("../../errors/AppError");

function createUsersService({ usersRepository, shopsRepository, passwordHasher }) {
  async function assertShopExists(shopId) {
    if (shopId === undefined || shopId === null) return;

    const shop = await shopsRepository.findById(shopId);
    if (!shop) throw new NotFoundError("Shop", "SHOP_NOT_FOUND");
  }

  async function list({ page, pageSize, role, q }) {
    return usersRepository.list({ page, pageSize, role, q });
  }

  async function getById(id) {
    const user = await usersRepository.findById(id);
    if (!user) throw new NotFoundError("User", "USER_NOT_FOUND");

    return user;
  }

  async function create({ email, password, role, shopId }) {
    const existing = await usersRepository.findByEmail(email);
    if (existing) throw new ConflictError(`User ${email} already exists`, "EMAIL_ALREADY_EXISTS");

    await assertShopExists(shopId);

    const passwordHash = await passwordHasher.hash(password);

    return usersRepository.create({ email, passwordHash, role, shopId });
  }

  async function update(id, input) {
    const user = await getById(id);

    if (input.email && input.email !== user.email) {
      const existing = await usersRepository.findByEmail(input.email);
      if (existing) throw new ConflictError(`User ${input.email} already exists`, "EMAIL_ALREADY_EXISTS");
    }

    const role = input.role ?? user.role;
    const shopId = input.shopId !== undefined ? input.shopId : user.shopId;

    // Po zmianie roli para (rola, sklep) musi nadal trzymać się reguły z bazy.
    if (role === "SHOP" && !shopId) {
      throw new ValidationError(
        [{ location: "body", field: "shopId", message: "shopId is required for role SHOP" }],
      );
    }
    if (role !== "SHOP" && shopId) {
      throw new ValidationError(
        [{ location: "body", field: "shopId", message: "shopId is only allowed for role SHOP" }],
      );
    }

    await assertShopExists(shopId);

    const patch = { ...input, role, shopId: shopId ?? null };
    delete patch.password;
    if (input.password) patch.passwordHash = await passwordHasher.hash(input.password);

    return usersRepository.update(id, patch);
  }

  // Kont nie kasujemy – zostają w historii ruchów magazynowych, więc tylko dezaktywacja.
  async function deactivate(id) {
    await getById(id);

    return usersRepository.update(id, { isActive: false });
  }

  return { list, getById, create, update, deactivate };
}

module.exports = { createUsersService };
