// Healthcheck sprawdza to, bez czego API i tak nie zadziała: połączenie z bazą.
function createHealthService({ db, now = () => new Date() }) {
  async function check() {
    let database = "down";

    try {
      await db.raw("select 1");
      database = "up";
    } catch (error) {
      console.error("Health check: database unreachable", error.message);
    }

    return {
      status: database === "up" ? "ok" : "degraded",
      database,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: now().toISOString(),
    };
  }

  return { check };
}

module.exports = { createHealthService };
