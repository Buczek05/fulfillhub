import { describe, it, expect } from "vitest";
import request from "supertest";

import { createApp } from "../../src/app.js";

// Fake bazy – szkielet aplikacji testujemy bez prawdziwego Postgresa.
const dbUp = { raw: async () => [{ "?column?": 1 }] };
const dbDown = {
  raw: async () => {
    throw new Error("connection refused");
  },
};

const now = () => new Date("2026-10-25T10:00:00.000Z");

describe("app skeleton", () => {
  it("returns 200 from /api/health when the database is reachable", async () => {
    const response = await request(createApp({ db: dbUp, now })).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.database).toBe("up");
    expect(response.body.timestamp).toBe("2026-10-25T10:00:00.000Z");
  });

  it("returns 503 from /api/health when the database is unreachable", async () => {
    const response = await request(createApp({ db: dbDown, now })).get("/api/health");

    expect(response.status).toBe(503);
    expect(response.body.status).toBe("degraded");
    expect(response.body.database).toBe("down");
  });

  it("returns a JSON 404 for an unknown route", async () => {
    const response = await request(createApp({ db: dbUp, now })).get("/api/nope");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
    expect(response.body.error.requestId).toBeTruthy();
  });

  it("returns 400 INVALID_JSON for a malformed request body", async () => {
    const response = await request(createApp({ db: dbUp, now }))
      .post("/api/health")
      .set("Content-Type", "application/json")
      .send("{ broken");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
  });
});
