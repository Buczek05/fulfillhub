import bcrypt from "bcrypt";

export const PASSWORD = "haslo123";

// Minimalny zestaw danych pod testy integracyjne: dwa sklepy, konto na każdą rolę i produkty.
export async function seedBaseData(db) {
  await db("shops").insert([
    { name: "Sklep Alfa", contact_email: "alfa@example.com" },
    { name: "Sklep Beta", contact_email: "beta@example.com" },
  ]);

  const passwordHash = await bcrypt.hash(PASSWORD, 4); // niskie koszty – to tylko testy
  await db("users").insert([
    { email: "admin@test.local", password_hash: passwordHash, role: "ADMIN", shop_id: null },
    { email: "magazyn@test.local", password_hash: passwordHash, role: "WAREHOUSE", shop_id: null },
    { email: "sklep1@test.local", password_hash: passwordHash, role: "SHOP", shop_id: 1 },
    { email: "sklep2@test.local", password_hash: passwordHash, role: "SHOP", shop_id: 2 },
  ]);

  await db("products").insert([
    {
      shop_id: 1,
      sku: "ALF-001",
      name: "Kubek",
      quantity_on_hand: 10,
      quantity_reserved: 0,
      low_stock_threshold: 3,
    },
    {
      shop_id: 1,
      sku: "ALF-002",
      name: "Notes",
      quantity_on_hand: 5,
      quantity_reserved: 0,
      low_stock_threshold: 2,
    },
    {
      shop_id: 2,
      sku: "BET-001",
      name: "Kawa",
      quantity_on_hand: 7,
      quantity_reserved: 0,
      low_stock_threshold: 2,
    },
  ]);
}

export async function login(request, app, email) {
  const response = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });

  if (response.status !== 200) {
    throw new Error(`Login failed for ${email}: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return response.body.accessToken;
}
