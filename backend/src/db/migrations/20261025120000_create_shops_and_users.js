/**
 * Pierwsza migracja: sklepy i konta użytkowników.
 * Reszta tabel (produkty, ruchy magazynowe, zamówienia, przesyłki) dochodzi w etapie E1.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable("shops", (table) => {
    table.increments("id").primary();
    table.string("name", 160).notNullable();
    table.string("contact_email", 255).notNullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("email", 255).notNullable().unique();
    table.string("password_hash", 255).notNullable();
    table.string("role", 20).notNullable();
    table.integer("shop_id").unsigned().references("id").inTable("shops").onDelete("RESTRICT");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('ADMIN', 'WAREHOUSE', 'SHOP'))
  `);

  // Konto sklepu musi wskazywać sklep; ADMIN i WAREHOUSE nie są przypisani do żadnego.
  await knex.raw(`
    ALTER TABLE users
      ADD CONSTRAINT users_shop_id_matches_role_check
      CHECK ((role = 'SHOP' AND shop_id IS NOT NULL) OR (role <> 'SHOP' AND shop_id IS NULL))
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("shops");
};
