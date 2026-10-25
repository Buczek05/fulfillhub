// Kilka linii zamiast zależności: frontend stoi pod innym originem i musi dostać nagłówki CORS.
function createCors({ origin }) {
  return function cors(req, res, next) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.set("Vary", "Origin");

    if (req.method === "OPTIONS") return res.sendStatus(204);

    next();
  };
}

module.exports = { createCors };
