const COLUMNS = [
  "id",
  "name",
  "contact_email as contactEmail",
  "is_active as isActive",
  "created_at as createdAt",
];

function createShopsRepository({ db }) {
  const table = (trx = db) => trx("shops");

  async function list({ page, pageSize, q }) {
    const base = table().modify((query) => {
      if (q) query.whereILike("name", `%${q}%`);
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

  async function create({ name, contactEmail, isActive }, trx) {
    const [created] = await table(trx)
      .insert({ name, contact_email: contactEmail, is_active: isActive })
      .returning(COLUMNS);

    return created;
  }

  async function update(id, { name, contactEmail, isActive }, trx) {
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (contactEmail !== undefined) patch.contact_email = contactEmail;
    if (isActive !== undefined) patch.is_active = isActive;

    const [updated] = await table(trx).where({ id }).update(patch).returning(COLUMNS);

    return updated;
  }

  async function remove(id, trx) {
    return table(trx).where({ id }).del();
  }

  return { list, findById, create, update, remove };
}

module.exports = { createShopsRepository };
