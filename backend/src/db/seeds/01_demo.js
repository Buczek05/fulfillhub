const bcrypt = require("bcrypt");

// Dane demo: dwa sklepy, konta dla każdej roli, produkty (w tym jeden poniżej progu)
// i zamówienia w różnych statusach – tyle, żeby dało się przeklikać cały scenariusz.
// Hasła są jawne tylko dlatego, że to dane demo; opisane są w README.
const DEMO_PASSWORD = "haslo123";

const PRODUCTS = [
  // sklep 1 – Papeteria Alfa
  { shopId: 1, sku: "ALF-KUBEK-01", name: "Kubek ceramiczny biały", ean: "5901234123457", onHand: 120, threshold: 20 },
  { shopId: 1, sku: "ALF-KUBEK-02", name: "Kubek ceramiczny czarny", ean: "5901234123464", onHand: 64, threshold: 20 },
  { shopId: 1, sku: "ALF-NOTES-A5", name: "Notes A5 w kratkę", ean: "5901234123471", onHand: 210, threshold: 50 },
  { shopId: 1, sku: "ALF-NOTES-A4", name: "Notes A4 gładki", ean: null, onHand: 85, threshold: 30 },
  { shopId: 1, sku: "ALF-DLUGOPIS", name: "Długopis żelowy czarny", ean: "5901234123488", onHand: 500, threshold: 100 },
  { shopId: 1, sku: "ALF-OLOWEK", name: "Ołówek HB", ean: null, onHand: 340, threshold: 100 },
  { shopId: 1, sku: "ALF-TORBA", name: "Torba bawełniana", ean: "5901234123495", onHand: 18, threshold: 25 }, // poniżej progu
  { shopId: 1, sku: "ALF-NAKLEJKI", name: "Zestaw naklejek", ean: null, onHand: 97, threshold: 20 },
  { shopId: 1, sku: "ALF-KALENDARZ", name: "Kalendarz biurkowy 2027", ean: "5901234123501", onHand: 42, threshold: 15 },
  { shopId: 1, sku: "ALF-PODKLADKA", name: "Podkładka pod mysz", ean: null, onHand: 73, threshold: 20 },
  // sklep 2 – Kawiarnia Beta
  { shopId: 2, sku: "BET-KAWA-250", name: "Kawa ziarnista 250 g", ean: "5902222123457", onHand: 150, threshold: 40 },
  { shopId: 2, sku: "BET-KAWA-1KG", name: "Kawa ziarnista 1 kg", ean: "5902222123464", onHand: 60, threshold: 15 },
  { shopId: 2, sku: "BET-HERBATA", name: "Herbata liściasta 100 g", ean: null, onHand: 88, threshold: 20 },
  { shopId: 2, sku: "BET-FILTRY", name: "Filtry papierowe v60", ean: "5902222123471", onHand: 240, threshold: 60 },
  { shopId: 2, sku: "BET-TERMOS", name: "Termos stalowy 500 ml", ean: "5902222123488", onHand: 27, threshold: 10 },
  { shopId: 2, sku: "BET-MLYNEK", name: "Młynek ręczny", ean: null, onHand: 12, threshold: 5 },
  { shopId: 2, sku: "BET-DRIPPER", name: "Dripper ceramiczny", ean: "5902222123495", onHand: 34, threshold: 10 },
  { shopId: 2, sku: "BET-CZAJNIK", name: "Czajnik z wąską wylewką", ean: null, onHand: 9, threshold: 6 },
];

exports.seed = async function seed(knex) {
  // Kolejność kasowania odwrotna do zależności kluczy obcych.
  await knex("shipments").del();
  await knex("stock_movements").del();
  await knex("order_items").del();
  await knex("orders").del();
  await knex("products").del();
  await knex("users").del();
  await knex("shops").del();

  for (const table of ["shops", "users", "products", "orders", "order_items", "stock_movements", "shipments"]) {
    await knex.raw(`ALTER SEQUENCE ${table}_id_seq RESTART WITH 1`);
  }

  await knex("shops").insert([
    { name: "Papeteria Alfa", contact_email: "zamowienia@papeteria-alfa.example", is_active: true },
    { name: "Kawiarnia Beta", contact_email: "sklep@kawiarnia-beta.example", is_active: true },
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await knex("users").insert([
    { email: "admin@fulfillhub.local", password_hash: passwordHash, role: "ADMIN", shop_id: null },
    { email: "magazyn@fulfillhub.local", password_hash: passwordHash, role: "WAREHOUSE", shop_id: null },
    { email: "sklep1@fulfillhub.local", password_hash: passwordHash, role: "SHOP", shop_id: 1 },
    { email: "sklep2@fulfillhub.local", password_hash: passwordHash, role: "SHOP", shop_id: 2 },
  ]);

  await knex("products").insert(
    PRODUCTS.map((product) => ({
      shop_id: product.shopId,
      sku: product.sku,
      name: product.name,
      ean: product.ean,
      quantity_on_hand: product.onHand,
      quantity_reserved: 0,
      low_stock_threshold: product.threshold,
    })),
  );

  const products = await knex("products").select("id", "sku", "shop_id");
  const idBySku = Object.fromEntries(products.map((product) => [product.sku, product.id]));

  // Każdy stan początkowy ma swój ruch RECEIPT – historia magazynu zaczyna się od przyjęcia.
  await knex("stock_movements").insert(
    PRODUCTS.map((product) => ({
      product_id: idBySku[product.sku],
      type: "RECEIPT",
      quantity: product.onHand,
      reason: "stan początkowy",
      user_id: 2,
    })),
  );

  const orders = [
    {
      shopId: 1,
      externalRef: "ALF-2026-0001",
      status: "NEW",
      recipientName: "Jan Kowalski",
      recipientAddress: "ul. Kwiatowa 5/2, 30-001 Kraków",
      recipientEmail: "jan.kowalski@example.com",
      items: [
        { sku: "ALF-KUBEK-01", quantity: 2 },
        { sku: "ALF-NOTES-A5", quantity: 3 },
      ],
    },
    {
      shopId: 1,
      externalRef: "ALF-2026-0002",
      status: "PICKING",
      recipientName: "Anna Nowak",
      recipientAddress: "ul. Długa 12, 31-147 Kraków",
      recipientEmail: "anna.nowak@example.com",
      items: [{ sku: "ALF-TORBA", quantity: 4 }],
    },
    {
      shopId: 1,
      externalRef: "ALF-2026-0003",
      status: "PACKED",
      recipientName: "Piotr Zieliński",
      recipientAddress: "ul. Krótka 3, 30-200 Kraków",
      recipientEmail: null,
      items: [
        { sku: "ALF-DLUGOPIS", quantity: 10 },
        { sku: "ALF-OLOWEK", quantity: 10 },
      ],
    },
    {
      shopId: 2,
      externalRef: "BET-2026-0001",
      status: "NEW",
      recipientName: "Maria Wiśniewska",
      recipientAddress: "ul. Lipowa 8, 00-120 Warszawa",
      recipientEmail: "maria.w@example.com",
      items: [{ sku: "BET-KAWA-250", quantity: 6 }],
    },
    {
      shopId: 2,
      externalRef: "BET-2026-0002",
      status: "SHIPPED",
      recipientName: "Tomasz Lewandowski",
      recipientAddress: "ul. Polna 44, 61-001 Poznań",
      recipientEmail: "tomasz.l@example.com",
      items: [{ sku: "BET-TERMOS", quantity: 1 }],
      shipment: { carrier: "InPost", trackingNumber: "PL600123456789" },
    },
    {
      shopId: 2,
      externalRef: "BET-2026-0003",
      status: "CANCELLED",
      recipientName: "Katarzyna Dąbrowska",
      recipientAddress: "ul. Słoneczna 2, 80-180 Gdańsk",
      recipientEmail: null,
      items: [{ sku: "BET-MLYNEK", quantity: 1 }],
    },
  ];

  for (const order of orders) {
    const [created] = await knex("orders")
      .insert({
        shop_id: order.shopId,
        external_ref: order.externalRef,
        status: order.status,
        recipient_name: order.recipientName,
        recipient_address: order.recipientAddress,
        recipient_email: order.recipientEmail,
        cancelled_at: order.status === "CANCELLED" ? knex.fn.now() : null,
      })
      .returning("id");

    const orderId = created.id;

    for (const item of order.items) {
      const productId = idBySku[item.sku];

      await knex("order_items").insert({
        order_id: orderId,
        product_id: productId,
        quantity: item.quantity,
      });

      await knex("stock_movements").insert({
        product_id: productId,
        type: "RESERVATION",
        quantity: item.quantity,
        order_id: orderId,
        user_id: null,
      });

      if (order.status === "SHIPPED") {
        // Wysyłka zdejmuje towar i zwalnia rezerwację.
        await knex("products")
          .where({ id: productId })
          .decrement("quantity_on_hand", item.quantity);
        await knex("stock_movements").insert({
          product_id: productId,
          type: "SHIPMENT",
          quantity: -item.quantity,
          order_id: orderId,
          user_id: 2,
        });
      } else if (order.status === "CANCELLED") {
        // Anulowanie tylko zwalnia rezerwację, towar zostaje.
        await knex("stock_movements").insert({
          product_id: productId,
          type: "RELEASE",
          quantity: -item.quantity,
          order_id: orderId,
          user_id: 2,
        });
      } else {
        // Zamówienia w toku trzymają rezerwację.
        await knex("products")
          .where({ id: productId })
          .increment("quantity_reserved", item.quantity);
      }
    }

    if (order.shipment) {
      await knex("shipments").insert({
        order_id: orderId,
        carrier: order.shipment.carrier,
        tracking_number: order.shipment.trackingNumber,
      });
    }
  }
};
