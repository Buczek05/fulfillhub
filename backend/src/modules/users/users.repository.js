const COLUMNS = [
  "id",
  "email",
  "role",
  "shop_id as shopId",
  "is_active as isActive",
  "created_at as createdAt",
];

// Hash hasła pobieramy tylko tam, gdzie jest naprawdę potrzebny – przy logowaniu.
const COLUMNS_WITH_HASH = [...COLUMNS, "password_hash as passwordHash"];

function createUsersRepository({ db }) {
  const table = (trx = db) => trx("users");

  async function list({ page, pageSize, role, q }) {
    const base = table().modify((query) => {
      if (role) query.where({ role });
      if (q) query.whereILike("email", `%${q}%`);
    });

    const [{ count }] = await base.clone().count({ count: "*" });
    const data = await base
      .clone()
      .select(COLUMNS)
      .orderBy("id", "asc")
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { data, total: Number(count) };
  }

  async function findById(id, trx) {
    return table(trx).select(COLUMNS).where({ id }).first();
  }

  async function findByEmailWithHash(email, trx) {
    return table(trx).select(COLUMNS_WITH_HASH).where({ email }).first();
  }

  async function findByEmail(email, trx) {
    return table(trx).select(COLUMNS).where({ email }).first();
  }

  async function create({ email, passwordHash, role, shopId }, trx) {
    const [created] = await table(trx)
      .insert({ email, password_hash: passwordHash, role, shop_id: shopId ?? null })
      .returning(COLUMNS);

    return created;
  }

  async function update(id, { email, passwordHash, role, shopId, isActive }, trx) {
    const patch = {};
    if (email !== undefined) patch.email = email;
    if (passwordHash !== undefined) patch.password_hash = passwordHash;
    if (role !== undefined) patch.role = role;
    if (shopId !== undefined) patch.shop_id = shopId;
    if (isActive !== undefined) patch.is_active = isActive;

    const [updated] = await table(trx).where({ id }).update(patch).returning(COLUMNS);

    return updated;
  }

  async function countByShop(shopId, trx) {
    const [{ count }] = await table(trx).where({ shop_id: shopId }).count({ count: "*" });

    return Number(count);
  }

  return { list, findById, findByEmail, findByEmailWithHash, create, update, countByShop };
}

module.exports = { createUsersRepository };
