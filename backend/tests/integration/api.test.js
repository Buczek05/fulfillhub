import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";

import { createTestContext, resetDatabase, closeTestDatabase } from "../helpers/testDb.js";
import { seedBaseData, login, PASSWORD } from "../helpers/fixtures.js";

let app;
let db;
let adminToken;
let warehouseToken;
let shop1Token;
let shop2Token;

beforeAll(async () => {
  ({ app, db } = await createTestContext());
});

beforeEach(async () => {
  await resetDatabase(db);
  await seedBaseData(db);

  [adminToken, warehouseToken, shop1Token, shop2Token] = await Promise.all([
    login(request, app, "admin@test.local"),
    login(request, app, "magazyn@test.local"),
    login(request, app, "sklep1@test.local"),
    login(request, app, "sklep2@test.local"),
  ]);
});

afterAll(async () => {
  await closeTestDatabase();
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const newOrder = (overrides = {}) => ({
  shopId: 1,
  externalRef: "ALF-ZAM-1",
  recipientName: "Jan Kowalski",
  recipientAddress: "ul. Testowa 1, Kraków",
  items: [{ productId: 1, quantity: 4 }],
  ...overrides,
});

describe("auth", () => {
  it("returns a token and the user on correct credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.local", password: PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.user).toMatchObject({ email: "admin@test.local", role: "ADMIN" });
    expect(response.body.user.passwordHash).toBeUndefined(); // hash nigdy nie wychodzi z API
  });

  it("returns 401 on a wrong password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.local", password: "zle-haslo" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 401 without a token", async () => {
    const response = await request(app).get("/api/products");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("MISSING_TOKEN");
  });

  it("returns 401 for a deactivated account", async () => {
    const token = await login(request, app, "sklep1@test.local");
    await db("users").where({ email: "sklep1@test.local" }).update({ is_active: false });

    const response = await request(app).get("/api/auth/me").set(auth(token));

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INACTIVE_ACCOUNT");
  });
});

describe("role-based access", () => {
  it("rejects a SHOP user trying to book a goods receipt", async () => {
    const response = await request(app)
      .post("/api/products/1/receipts")
      .set(auth(shop1Token))
      .send({ quantity: 5 });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("lets the warehouse book a goods receipt", async () => {
    const response = await request(app)
      .post("/api/products/1/receipts")
      .set(auth(warehouseToken))
      .send({ quantity: 5 });

    expect(response.status).toBe(200);
    expect(response.body.quantityOnHand).toBe(15);
  });

  it("rejects a non-admin listing users", async () => {
    const response = await request(app).get("/api/users").set(auth(warehouseToken));

    expect(response.status).toBe(403);
  });

  it("lets an admin create a user and hides the password hash", async () => {
    const response = await request(app)
      .post("/api/users")
      .set(auth(adminToken))
      .send({ email: "nowy@test.local", password: "haslo12345", role: "WAREHOUSE" });

    expect(response.status).toBe(201);
    expect(response.headers.location).toBe(`/api/users/${response.body.id}`);
    expect(response.body).not.toHaveProperty("passwordHash");
  });
});

describe("data ownership for the SHOP role", () => {
  it("shows a shop only its own products", async () => {
    const response = await request(app).get("/api/products").set(auth(shop1Token));

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.data.every((product) => product.shopId === 1)).toBe(true);
  });

  it("ignores a shopId filter pointing at another shop", async () => {
    const response = await request(app).get("/api/products?shopId=2").set(auth(shop1Token));

    expect(response.body.data.every((product) => product.shopId === 1)).toBe(true);
  });

  it("returns 404, not 403, for another shop's product", async () => {
    const response = await request(app).get("/api/products/3").set(auth(shop1Token));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("returns 404 for another shop's order", async () => {
    const created = await request(app)
      .post("/api/orders")
      .set(auth(shop1Token))
      .send(newOrder());
    expect(created.status).toBe(201);

    const response = await request(app).get(`/api/orders/${created.body.id}`).set(auth(shop2Token));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("ORDER_NOT_FOUND");
  });

  it("forces a shop's order onto its own shop even if the body says otherwise", async () => {
    const response = await request(app)
      .post("/api/orders")
      .set(auth(shop1Token))
      .send(newOrder({ shopId: 2, items: [{ productId: 1, quantity: 1 }] }));

    expect(response.status).toBe(201);
    expect(response.body.shopId).toBe(1);
  });

  it("shows an admin every shop's orders", async () => {
    await request(app).post("/api/orders").set(auth(shop1Token)).send(newOrder());
    await request(app)
      .post("/api/orders")
      .set(auth(shop2Token))
      .send(newOrder({ shopId: 2, externalRef: "BET-ZAM-1", items: [{ productId: 3, quantity: 1 }] }));

    const response = await request(app).get("/api/orders").set(auth(adminToken));

    expect(response.body.total).toBe(2);
  });
});

describe("orders over HTTP", () => {
  it("creates an order and reserves stock in the database", async () => {
    const response = await request(app).post("/api/orders").set(auth(shop1Token)).send(newOrder());

    expect(response.status).toBe(201);
    expect(response.headers.location).toBe(`/api/orders/${response.body.id}`);
    expect(response.body.status).toBe("NEW");

    const product = await db("products").where({ id: 1 }).first();
    expect(product.quantity_reserved).toBe(4);
    expect(product.quantity_on_hand).toBe(10);

    const movements = await db("stock_movements").where({ product_id: 1, type: "RESERVATION" });
    expect(movements).toHaveLength(1);
  });

  it("returns 409 INSUFFICIENT_STOCK and reserves nothing", async () => {
    const response = await request(app)
      .post("/api/orders")
      .set(auth(shop1Token))
      .send(newOrder({ items: [{ productId: 1, quantity: 99 }] }));

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INSUFFICIENT_STOCK");
    expect(response.body.error.details).toEqual([{ sku: "ALF-001", requested: 99, available: 10 }]);

    const product = await db("products").where({ id: 1 }).first();
    expect(product.quantity_reserved).toBe(0);
  });

  it("walks an order through picking, packing and shipping", async () => {
    const created = await request(app).post("/api/orders").set(auth(shop1Token)).send(newOrder());
    const id = created.body.id;

    await request(app).patch(`/api/orders/${id}/status`).set(auth(warehouseToken)).send({ status: "PICKING" });
    await request(app).patch(`/api/orders/${id}/status`).set(auth(warehouseToken)).send({ status: "PACKED" });

    const shipped = await request(app)
      .post(`/api/orders/${id}/ship`)
      .set(auth(warehouseToken))
      .send({ carrier: "InPost", trackingNumber: "PL1" });

    expect(shipped.status).toBe(200);
    expect(shipped.body.status).toBe("SHIPPED");
    expect(shipped.body.shipment).toMatchObject({ carrier: "InPost", trackingNumber: "PL1" });

    const product = await db("products").where({ id: 1 }).first();
    expect(product.quantity_on_hand).toBe(6);
    expect(product.quantity_reserved).toBe(0);
  });

  it("rejects an invalid status jump with 409", async () => {
    const created = await request(app).post("/api/orders").set(auth(shop1Token)).send(newOrder());

    const response = await request(app)
      .patch(`/api/orders/${created.body.id}/status`)
      .set(auth(warehouseToken))
      .send({ status: "PACKED" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("releases the reservation when an order is cancelled", async () => {
    const created = await request(app).post("/api/orders").set(auth(shop1Token)).send(newOrder());

    const response = await request(app)
      .post(`/api/orders/${created.body.id}/cancel`)
      .set(auth(shop1Token));

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("CANCELLED");

    const product = await db("products").where({ id: 1 }).first();
    expect(product.quantity_reserved).toBe(0);
    expect(product.quantity_on_hand).toBe(10);
  });

  it("stops a shop from cancelling once picking started", async () => {
    const created = await request(app).post("/api/orders").set(auth(shop1Token)).send(newOrder());
    await request(app)
      .patch(`/api/orders/${created.body.id}/status`)
      .set(auth(warehouseToken))
      .send({ status: "PICKING" });

    const response = await request(app)
      .post(`/api/orders/${created.body.id}/cancel`)
      .set(auth(shop1Token));

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ORDER_ALREADY_IN_PROGRESS");
  });
});

describe("pagination, search and filtering", () => {
  beforeEach(async () => {
    const extra = Array.from({ length: 23 }, (unused, index) => ({
      shop_id: 1,
      sku: `ALF-SEQ-${String(index + 1).padStart(3, "0")}`,
      name: `Produkt sekwencyjny ${index + 1}`,
      quantity_on_hand: 5,
      quantity_reserved: 0,
      low_stock_threshold: 0,
    }));
    await db("products").insert(extra);
  });

  it("paginates products", async () => {
    const first = await request(app).get("/api/products?page=1&pageSize=10").set(auth(adminToken));
    const third = await request(app).get("/api/products?page=3&pageSize=10").set(auth(adminToken));

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ page: 1, pageSize: 10, total: 26 });
    expect(first.body.data).toHaveLength(10);
    expect(third.body.data).toHaveLength(6);
    expect(third.body.data[0].id).not.toBe(first.body.data[0].id);
  });

  it("searches products by SKU fragment", async () => {
    const response = await request(app).get("/api/products?q=SEQ-01").set(auth(adminToken));

    expect(response.body.total).toBe(10); // SEQ-010 .. SEQ-019
  });

  it("filters products below the low stock threshold", async () => {
    await db("products").where({ id: 1 }).update({ low_stock_threshold: 50 });

    const response = await request(app).get("/api/products?lowStock=true").set(auth(adminToken));

    expect(response.body.total).toBe(1);
    expect(response.body.data[0].sku).toBe("ALF-001");
  });

  it("sorts products in descending order", async () => {
    const response = await request(app).get("/api/products?sort=-sku&pageSize=5").set(auth(adminToken));

    const skus = response.body.data.map((product) => product.sku);
    expect(skus).toEqual([...skus].sort().reverse());
  });

  it("rejects an unknown sort field with 400", async () => {
    const response = await request(app).get("/api/products?sort=password").set(auth(adminToken));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("filters orders by status", async () => {
    await request(app).post("/api/orders").set(auth(shop1Token)).send(newOrder());

    const matching = await request(app).get("/api/orders?status=NEW").set(auth(adminToken));
    const other = await request(app).get("/api/orders?status=SHIPPED").set(auth(adminToken));

    expect(matching.body.total).toBe(1);
    expect(other.body.total).toBe(0);
  });
});

describe("dashboard and docs", () => {
  it("summarises only the shop's own data", async () => {
    await request(app).post("/api/orders").set(auth(shop1Token)).send(newOrder());
    await request(app)
      .post("/api/orders")
      .set(auth(shop2Token))
      .send(newOrder({ shopId: 2, externalRef: "BET-ZAM-1", items: [{ productId: 3, quantity: 1 }] }));

    const shopView = await request(app).get("/api/dashboard/summary").set(auth(shop1Token));
    const adminView = await request(app).get("/api/dashboard/summary").set(auth(adminToken));

    expect(shopView.body.ordersByStatus.NEW).toBe(1);
    expect(adminView.body.ordersByStatus.NEW).toBe(2);
    expect(shopView.body.recentOrders.every((order) => order.shopId === 1)).toBe(true);
  });

  it("serves the Swagger UI without a token", async () => {
    const response = await request(app).get("/api/docs/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("swagger-ui");
  });
});
