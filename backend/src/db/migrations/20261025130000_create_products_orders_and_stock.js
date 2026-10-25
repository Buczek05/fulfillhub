/**
 * Pozostałe tabele modelu: produkty, ruchy magazynowe, zamówienia, pozycje zamówień, przesyłki.
 * Reguły, których da się pilnować w bazie (stany nieujemne, rezerwacja <= stan, unikalne SKU),
 * siedzą tu jako CHECK/UNIQUE – service i tak je sprawdza, ale baza jest ostatnią linią obrony.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable("products", (table) => {
    table.increments("id").primary();
    table.integer("shop_id").unsigned().notNullable().references("id").inTable("shops").onDelete("RESTRICT");
    table.string("sku", 64).notNullable();
    table.string("name", 200).notNullable();
    table.string("ean", 32);
    table.integer("quantity_on_hand").notNullable().defaultTo(0);
    table.integer("quantity_reserved").notNullable().defaultTo(0);
    table.integer("low_stock_threshold").notNullable().defaultTo(0);
    table.integer("version").notNullable().defaultTo(1);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(["shop_id", "sku"]);
    table.index(["shop_id"]);
  });

  await knex.raw(`
    ALTER TABLE products
      ADD CONSTRAINT products_quantity_on_hand_check CHECK (quantity_on_hand >= 0),
      ADD CONSTRAINT products_quantity_reserved_check CHECK (quantity_reserved >= 0),
      ADD CONSTRAINT products_reserved_within_on_hand_check CHECK (quantity_reserved <= quantity_on_hand),
      ADD CONSTRAINT products_low_stock_threshold_check CHECK (low_stock_threshold >= 0)
  `);

  await knex.schema.createTable("orders", (table) => {
    table.increments("id").primary();
    table.integer("shop_id").unsigned().notNullable().references("id").inTable("shops").onDelete("RESTRICT");
    table.string("external_ref", 64).notNullable();
    table.string("status", 20).notNullable().defaultTo("NEW");
    table.string("recipient_name", 160).notNullable();
    table.string("recipient_address", 500).notNullable();
    table.string("recipient_email", 255);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("cancelled_at", { useTz: true });

    table.unique(["shop_id", "external_ref"]);
    table.index(["status"]);
  });

  await knex.raw(`
    ALTER TABLE orders
      ADD CONSTRAINT orders_status_check
      CHECK (status IN ('NEW', 'PICKING', 'PACKED', 'SHIPPED', 'CANCELLED'))
  `);

  await knex.schema.createTable("order_items", (table) => {
    table.increments("id").primary();
    table.integer("order_id").unsigned().notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.integer("product_id").unsigned().notNullable().references("id").inTable("products").onDelete("RESTRICT");
    table.integer("quantity").notNullable();

    table.unique(["order_id", "product_id"]);
    table.index(["product_id"]);
  });

  await knex.raw(`
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_quantity_check CHECK (quantity > 0)
  `);

  await knex.schema.createTable("stock_movements", (table) => {
    table.increments("id").primary();
    table.integer("product_id").unsigned().notNullable().references("id").inTable("products").onDelete("RESTRICT");
    table.string("type", 20).notNullable();
    table.integer("quantity").notNullable(); // ze znakiem: + przyjęcie, - wydanie
    table.string("reason", 255);
    table.integer("order_id").unsigned().references("id").inTable("orders").onDelete("SET NULL");
    table.integer("user_id").unsigned().references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(["product_id", "created_at"]);
  });

  await knex.raw(`
    ALTER TABLE stock_movements
      ADD CONSTRAINT stock_movements_type_check
      CHECK (type IN ('RECEIPT', 'ADJUSTMENT', 'RESERVATION', 'RELEASE', 'SHIPMENT'))
  `);

  await knex.schema.createTable("shipments", (table) => {
    table.increments("id").primary();
    table.integer("order_id").unsigned().notNullable().unique().references("id").inTable("orders").onDelete("CASCADE");
    table.string("carrier", 80).notNullable();
    table.string("tracking_number", 120).notNullable();
    table.timestamp("shipped_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("shipments");
  await knex.schema.dropTableIfExists("stock_movements");
  await knex.schema.dropTableIfExists("order_items");
  await knex.schema.dropTableIfExists("orders");
  await knex.schema.dropTableIfExists("products");
};
