// Specyfikacja OpenAPI 3 serwowana przez swagger-ui-express pod /api/docs.
// Trzymana jako obiekt JS, żeby dało się ją złożyć z powtarzalnych kawałków.

const error = (code, description) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
      example: {
        error: { code, message: "Human readable message", requestId: "f0c1…" },
      },
    },
  },
});

const paginatedOf = (ref) => ({
  type: "object",
  properties: {
    data: { type: "array", items: { $ref: ref } },
    page: { type: "integer", example: 1 },
    pageSize: { type: "integer", example: 20 },
    total: { type: "integer", example: 42 },
  },
});

const pageParams = [
  { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
  { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
];

const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "integer", minimum: 1 },
};

const COMMON_RESPONSES = {
  400: error("VALIDATION_ERROR", "Nieprawidłowe dane wejściowe"),
  401: error("MISSING_TOKEN", "Brak lub nieważny token"),
  403: error("FORBIDDEN", "Rola nie pozwala na tę operację"),
  404: error("NOT_FOUND", "Zasób nie istnieje (albo należy do innego sklepu)"),
};

const openapi = {
  openapi: "3.0.3",
  info: {
    title: "FulfillHub API",
    version: "1.0.0",
    description:
      "API magazynu fulfillment: sklepy, produkty, stany magazynowe i zamówienia.\n\n" +
      "Wszystkie endpointy poza `POST /api/auth/login` i `GET /api/health` wymagają nagłówka " +
      "`Authorization: Bearer <token>`.\n\n" +
      "Rola `SHOP` widzi wyłącznie dane własnego sklepu; cudzy zasób zwraca 404, a nie 403.",
  },
  servers: [{ url: "/api", description: "Serwer aplikacji" }],
  tags: [
    { name: "Auth", description: "Logowanie i dane zalogowanego użytkownika" },
    { name: "Users", description: "Konta użytkowników (tylko ADMIN)" },
    { name: "Shops", description: "Sklepy korzystające z magazynu" },
    { name: "Products", description: "Produkty i ich stany" },
    { name: "Stock", description: "Przyjęcia, korekty i historia ruchów" },
    { name: "Orders", description: "Zamówienia i ich cykl życia" },
    { name: "Dashboard", description: "Podsumowanie dla pulpitu" },
    { name: "Health", description: "Status aplikacji" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "INSUFFICIENT_STOCK" },
              message: { type: "string" },
              details: { description: "Szczegóły zależne od kodu błędu" },
              requestId: { type: "string" },
            },
            required: ["code", "message", "requestId"],
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["ADMIN", "WAREHOUSE", "SHOP"] },
          shopId: { type: "integer", nullable: true },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Shop: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          contactEmail: { type: "string", format: "email" },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "integer" },
          shopId: { type: "integer" },
          sku: { type: "string" },
          name: { type: "string" },
          ean: { type: "string", nullable: true },
          quantityOnHand: { type: "integer" },
          quantityReserved: { type: "integer" },
          quantityAvailable: { type: "integer", description: "quantityOnHand - quantityReserved" },
          lowStockThreshold: { type: "integer" },
          isLowStock: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      StockMovement: {
        type: "object",
        properties: {
          id: { type: "integer" },
          productId: { type: "integer" },
          type: {
            type: "string",
            enum: ["RECEIPT", "ADJUSTMENT", "RESERVATION", "RELEASE", "SHIPMENT"],
          },
          quantity: { type: "integer", description: "Ze znakiem: dodatni przychód, ujemny rozchód" },
          reason: { type: "string", nullable: true },
          orderId: { type: "integer", nullable: true },
          userId: { type: "integer", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      OrderItem: {
        type: "object",
        properties: {
          id: { type: "integer" },
          productId: { type: "integer" },
          sku: { type: "string" },
          name: { type: "string" },
          quantity: { type: "integer", minimum: 1 },
        },
      },
      Shipment: {
        type: "object",
        properties: {
          id: { type: "integer" },
          carrier: { type: "string" },
          trackingNumber: { type: "string" },
          shippedAt: { type: "string", format: "date-time" },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "integer" },
          shopId: { type: "integer" },
          externalRef: { type: "string" },
          status: {
            type: "string",
            enum: ["NEW", "PICKING", "PACKED", "SHIPPED", "CANCELLED"],
          },
          recipientName: { type: "string" },
          recipientAddress: { type: "string" },
          recipientEmail: { type: "string", nullable: true },
          items: { type: "array", items: { $ref: "#/components/schemas/OrderItem" } },
          shipment: { allOf: [{ $ref: "#/components/schemas/Shipment" }], nullable: true },
          createdAt: { type: "string", format: "date-time" },
          cancelledAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      OrderSummary: {
        type: "object",
        properties: {
          id: { type: "integer" },
          shopId: { type: "integer" },
          externalRef: { type: "string" },
          status: { type: "string" },
          recipientName: { type: "string" },
          itemCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          cancelledAt: { type: "string", format: "date-time", nullable: true },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Status aplikacji i połączenia z bazą",
        security: [],
        responses: {
          200: { description: "Aplikacja działa" },
          503: { description: "Baza nie odpowiada" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Logowanie",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
              example: { email: "admin@fulfillhub.local", password: "admin123" },
            },
          },
        },
        responses: {
          200: {
            description: "Token dostępu i dane użytkownika",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    accessToken: { type: "string" },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          401: error("INVALID_CREDENTIALS", "Zły e-mail lub hasło"),
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Zalogowany użytkownik",
        responses: {
          200: {
            description: "Dane konta",
            content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
          },
          401: COMMON_RESPONSES[401],
        },
      },
    },
    "/users": {
      get: {
        tags: ["Users"],
        summary: "Lista kont (ADMIN)",
        parameters: [
          ...pageParams,
          { name: "role", in: "query", schema: { type: "string", enum: ["ADMIN", "WAREHOUSE", "SHOP"] } },
          { name: "q", in: "query", schema: { type: "string" }, description: "Fragment adresu e-mail" },
        ],
        responses: {
          200: {
            description: "Strona wyników",
            content: { "application/json": { schema: paginatedOf("#/components/schemas/User") } },
          },
          401: COMMON_RESPONSES[401],
          403: COMMON_RESPONSES[403],
        },
      },
      post: {
        tags: ["Users"],
        summary: "Nowe konto (ADMIN)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "role"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  role: { type: "string", enum: ["ADMIN", "WAREHOUSE", "SHOP"] },
                  shopId: {
                    type: "integer",
                    nullable: true,
                    description: "Wymagane dla roli SHOP, zabronione dla pozostałych",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Konto utworzone",
            content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
          },
          400: COMMON_RESPONSES[400],
          403: COMMON_RESPONSES[403],
          409: error("EMAIL_ALREADY_EXISTS", "Konto z tym adresem już istnieje"),
        },
      },
    },
    "/users/{id}": {
      parameters: [idParam],
      get: {
        tags: ["Users"],
        summary: "Szczegóły konta (ADMIN)",
        responses: {
          200: {
            description: "Konto",
            content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
          },
          404: COMMON_RESPONSES[404],
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Edycja konta (ADMIN)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
        },
        responses: {
          200: {
            description: "Konto po zmianie",
            content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
          },
          400: COMMON_RESPONSES[400],
          404: COMMON_RESPONSES[404],
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Dezaktywacja konta (ADMIN)",
        description: "Konta nie kasujemy – zostaje w historii ruchów magazynowych.",
        responses: { 204: { description: "Konto dezaktywowane" }, 404: COMMON_RESPONSES[404] },
      },
    },
    "/shops": {
      get: {
        tags: ["Shops"],
        summary: "Lista sklepów",
        description: "Rola SHOP widzi wyłącznie własny sklep.",
        parameters: [...pageParams, { name: "q", in: "query", schema: { type: "string" } }],
        responses: {
          200: {
            description: "Strona wyników",
            content: { "application/json": { schema: paginatedOf("#/components/schemas/Shop") } },
          },
          401: COMMON_RESPONSES[401],
        },
      },
      post: {
        tags: ["Shops"],
        summary: "Nowy sklep (ADMIN)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "contactEmail"],
                properties: {
                  name: { type: "string" },
                  contactEmail: { type: "string", format: "email" },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Sklep utworzony",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Shop" } } },
          },
          400: COMMON_RESPONSES[400],
          403: COMMON_RESPONSES[403],
        },
      },
    },
    "/shops/{id}": {
      parameters: [idParam],
      get: {
        tags: ["Shops"],
        summary: "Szczegóły sklepu",
        responses: {
          200: {
            description: "Sklep",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Shop" } } },
          },
          404: COMMON_RESPONSES[404],
        },
      },
      patch: {
        tags: ["Shops"],
        summary: "Edycja sklepu (ADMIN)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/Shop" } } },
        },
        responses: {
          200: {
            description: "Sklep po zmianie",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Shop" } } },
          },
          404: COMMON_RESPONSES[404],
        },
      },
      delete: {
        tags: ["Shops"],
        summary: "Usunięcie sklepu (ADMIN)",
        responses: {
          204: { description: "Sklep usunięty" },
          404: COMMON_RESPONSES[404],
          409: error("SHOP_IN_USE", "Sklep ma produkty lub zamówienia"),
        },
      },
    },
    "/products": {
      get: {
        tags: ["Products"],
        summary: "Lista produktów z paginacją, wyszukiwaniem i filtrami",
        parameters: [
          ...pageParams,
          { name: "q", in: "query", schema: { type: "string" }, description: "Fragment SKU lub nazwy" },
          {
            name: "shopId",
            in: "query",
            schema: { type: "integer" },
            description: "Ignorowane dla roli SHOP – zawsze widzi tylko swoje produkty",
          },
          { name: "lowStock", in: "query", schema: { type: "string", enum: ["true", "false"] } },
          {
            name: "sort",
            in: "query",
            schema: { type: "string", example: "-createdAt" },
            description: "id, sku, name, quantityOnHand, createdAt; prefiks \"-\" odwraca kolejność",
          },
        ],
        responses: {
          200: {
            description: "Strona wyników",
            content: { "application/json": { schema: paginatedOf("#/components/schemas/Product") } },
          },
          401: COMMON_RESPONSES[401],
        },
      },
      post: {
        tags: ["Products"],
        summary: "Nowy produkt (ADMIN, SHOP)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["shopId", "sku", "name"],
                properties: {
                  shopId: { type: "integer", description: "Dla roli SHOP wymuszane na własny sklep" },
                  sku: { type: "string" },
                  name: { type: "string" },
                  ean: { type: "string", nullable: true },
                  lowStockThreshold: { type: "integer", minimum: 0 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Produkt utworzony",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } },
          },
          400: COMMON_RESPONSES[400],
          403: COMMON_RESPONSES[403],
          409: error("SKU_ALREADY_EXISTS", "SKU zajęte w tym sklepie"),
        },
      },
    },
    "/products/{id}": {
      parameters: [idParam],
      get: {
        tags: ["Products"],
        summary: "Szczegóły produktu",
        responses: {
          200: {
            description: "Produkt",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } },
          },
          404: COMMON_RESPONSES[404],
        },
      },
      patch: {
        tags: ["Products"],
        summary: "Edycja produktu (ADMIN, SHOP)",
        description: "SKU i sklepu nie da się zmienić – identyfikują towar w historii magazynu.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  ean: { type: "string", nullable: true },
                  lowStockThreshold: { type: "integer", minimum: 0 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Produkt po zmianie",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } },
          },
          404: COMMON_RESPONSES[404],
        },
      },
      delete: {
        tags: ["Products"],
        summary: "Usunięcie produktu (ADMIN, SHOP)",
        responses: {
          204: { description: "Produkt usunięty" },
          404: COMMON_RESPONSES[404],
          409: error("PRODUCT_IN_USE", "Produkt ma historię i nie może zostać usunięty"),
        },
      },
    },
    "/products/{id}/receipts": {
      parameters: [idParam],
      post: {
        tags: ["Stock"],
        summary: "Przyjęcie dostawy (ADMIN, WAREHOUSE)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["quantity"],
                properties: {
                  quantity: { type: "integer", minimum: 1 },
                  reason: { type: "string" },
                },
              },
              example: { quantity: 20, reason: "dostawa 2026/10/001" },
            },
          },
        },
        responses: {
          200: {
            description: "Produkt po przyjęciu",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } },
          },
          400: COMMON_RESPONSES[400],
          403: COMMON_RESPONSES[403],
          404: COMMON_RESPONSES[404],
        },
      },
    },
    "/products/{id}/adjustments": {
      parameters: [idParam],
      post: {
        tags: ["Stock"],
        summary: "Korekta stanu (ADMIN, WAREHOUSE)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["newQuantityOnHand", "reason"],
                properties: {
                  newQuantityOnHand: { type: "integer", minimum: 0 },
                  reason: { type: "string" },
                },
              },
              example: { newQuantityOnHand: 18, reason: "inwentaryzacja" },
            },
          },
        },
        responses: {
          200: {
            description: "Produkt po korekcie",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } },
          },
          400: COMMON_RESPONSES[400],
          403: COMMON_RESPONSES[403],
          409: error("STOCK_BELOW_RESERVED", "Nowy stan jest poniżej rezerwacji"),
        },
      },
    },
    "/products/{id}/movements": {
      parameters: [idParam, ...pageParams],
      get: {
        tags: ["Stock"],
        summary: "Historia ruchów magazynowych produktu",
        responses: {
          200: {
            description: "Strona wyników",
            content: {
              "application/json": { schema: paginatedOf("#/components/schemas/StockMovement") },
            },
          },
          404: COMMON_RESPONSES[404],
        },
      },
    },
    "/orders": {
      get: {
        tags: ["Orders"],
        summary: "Lista zamówień",
        parameters: [
          ...pageParams,
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["NEW", "PICKING", "PACKED", "SHIPPED", "CANCELLED"] },
          },
          { name: "shopId", in: "query", schema: { type: "integer" } },
          {
            name: "q",
            in: "query",
            schema: { type: "string" },
            description: "Fragment numeru zamówienia lub nazwy odbiorcy",
          },
        ],
        responses: {
          200: {
            description: "Strona wyników",
            content: {
              "application/json": { schema: paginatedOf("#/components/schemas/OrderSummary") },
            },
          },
          401: COMMON_RESPONSES[401],
        },
      },
      post: {
        tags: ["Orders"],
        summary: "Nowe zamówienie z rezerwacją stanu (ADMIN, SHOP)",
        description:
          "Sprawdza dostępność każdej pozycji i rezerwuje towar w jednej transakcji. " +
          "Brak choćby jednej pozycji odrzuca całe zamówienie.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["shopId", "externalRef", "recipientName", "recipientAddress", "items"],
                properties: {
                  shopId: { type: "integer", description: "Dla roli SHOP wymuszane na własny sklep" },
                  externalRef: { type: "string", description: "Numer zamówienia po stronie sklepu" },
                  recipientName: { type: "string" },
                  recipientAddress: { type: "string" },
                  recipientEmail: { type: "string", format: "email", nullable: true },
                  items: {
                    type: "array",
                    minItems: 1,
                    items: {
                      type: "object",
                      required: ["productId", "quantity"],
                      properties: {
                        productId: { type: "integer" },
                        quantity: { type: "integer", minimum: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Zamówienie przyjęte, stan zarezerwowany",
            headers: { Location: { schema: { type: "string" }, description: "Adres zamówienia" } },
            content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } },
          },
          400: error("PRODUCT_NOT_IN_SHOP", "Pozycja spoza sklepu, duplikat produktu lub błąd walidacji"),
          403: COMMON_RESPONSES[403],
          409: error("INSUFFICIENT_STOCK", "Brak wystarczającego stanu dostępnego"),
        },
      },
    },
    "/orders/{id}": {
      parameters: [idParam],
      get: {
        tags: ["Orders"],
        summary: "Szczegóły zamówienia z pozycjami i przesyłką",
        responses: {
          200: {
            description: "Zamówienie",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } },
          },
          404: COMMON_RESPONSES[404],
        },
      },
    },
    "/orders/{id}/status": {
      parameters: [idParam],
      patch: {
        tags: ["Orders"],
        summary: "Zmiana statusu kompletacji (ADMIN, WAREHOUSE)",
        description:
          "Dozwolone przejścia: NEW → PICKING → PACKED. Ustawienie bieżącego statusu nic nie zmienia.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: { status: { type: "string", enum: ["PICKING", "PACKED"] } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Zamówienie po zmianie",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } },
          },
          403: COMMON_RESPONSES[403],
          404: COMMON_RESPONSES[404],
          409: error("INVALID_STATUS_TRANSITION", "Przejście niedozwolone w tym stanie"),
        },
      },
    },
    "/orders/{id}/ship": {
      parameters: [idParam],
      post: {
        tags: ["Orders"],
        summary: "Wysyłka zamówienia (ADMIN, WAREHOUSE)",
        description: "Zdejmuje stan, zwalnia rezerwację i tworzy przesyłkę. Wymaga statusu PACKED.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["carrier", "trackingNumber"],
                properties: { carrier: { type: "string" }, trackingNumber: { type: "string" } },
              },
              example: { carrier: "InPost", trackingNumber: "PL123456789" },
            },
          },
        },
        responses: {
          200: {
            description: "Zamówienie wysłane",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } },
          },
          403: COMMON_RESPONSES[403],
          404: COMMON_RESPONSES[404],
          409: error("INVALID_STATUS_TRANSITION", "Zamówienie nie jest spakowane"),
        },
      },
    },
    "/orders/{id}/cancel": {
      parameters: [idParam],
      post: {
        tags: ["Orders"],
        summary: "Anulowanie zamówienia",
        description:
          "Zwalnia rezerwację. Rola SHOP może anulować tylko zamówienie w statusie NEW. " +
          "Zamówienia wysłanego nie da się anulować.",
        responses: {
          200: {
            description: "Zamówienie anulowane",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } },
          },
          404: COMMON_RESPONSES[404],
          409: error("ORDER_ALREADY_IN_PROGRESS", "Magazyn już zaczął kompletację albo wysłał paczkę"),
        },
      },
    },
    "/dashboard/summary": {
      get: {
        tags: ["Dashboard"],
        summary: "Podsumowanie dla pulpitu",
        description: "Rola SHOP widzi liczby policzone wyłącznie na własnych danych.",
        responses: {
          200: {
            description: "Podsumowanie",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ordersByStatus: {
                      type: "object",
                      additionalProperties: { type: "integer" },
                      example: { NEW: 3, PICKING: 1, PACKED: 0, SHIPPED: 5, CANCELLED: 1 },
                    },
                    lowStockProducts: { type: "integer" },
                    recentOrders: {
                      type: "array",
                      items: { $ref: "#/components/schemas/OrderSummary" },
                    },
                  },
                },
              },
            },
          },
          401: COMMON_RESPONSES[401],
        },
      },
    },
  },
};

module.exports = { openapi };
