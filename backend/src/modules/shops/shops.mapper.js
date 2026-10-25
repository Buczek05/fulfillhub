// Whitelist pól wychodzących z API – nigdy nie zwracamy surowego wiersza z bazy.
function toShopResponse(shop) {
  return {
    id: shop.id,
    name: shop.name,
    contactEmail: shop.contactEmail,
    isActive: shop.isActive,
    createdAt: shop.createdAt.toISOString(),
  };
}

module.exports = { toShopResponse };
