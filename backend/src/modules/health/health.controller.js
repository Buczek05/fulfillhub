function createHealthController(healthService) {
  async function getHealth(req, res) {
    const health = await healthService.check();
    res.status(health.status === "ok" ? 200 : 503).json(health);
  }

  return { getHealth };
}

module.exports = { createHealthController };
