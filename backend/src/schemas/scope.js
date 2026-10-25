const { NotFoundError } = require("../errors/AppError");

// Rola SHOP widzi tylko swój sklep. Cudzy zasób zwraca 404, a nie 403 –
// nie zdradzamy, że taki rekord w ogóle istnieje.
function isShop(actor) {
  return actor?.role === "SHOP";
}

function scopeShopId(actor, requestedShopId) {
  return isShop(actor) ? actor.shopId : requestedShopId;
}

function assertOwnedByActor(actor, shopId, resource) {
  if (isShop(actor) && shopId !== actor.shopId) {
    throw new NotFoundError(resource, `${resource.toUpperCase()}_NOT_FOUND`);
  }
}

module.exports = { isShop, scopeShopId, assertOwnedByActor };
