function toProductResponse(product) {
  return {
    id: product.id,
    shopId: product.shopId,
    sku: product.sku,
    name: product.name,
    ean: product.ean ?? null,
    quantityOnHand: product.quantityOnHand,
    quantityReserved: product.quantityReserved,
    // Stan dostępny nie jest trzymany w bazie – liczymy go przy każdej odpowiedzi.
    quantityAvailable: product.quantityOnHand - product.quantityReserved,
    lowStockThreshold: product.lowStockThreshold,
    isLowStock: product.quantityOnHand - product.quantityReserved < product.lowStockThreshold,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

module.exports = { toProductResponse };
