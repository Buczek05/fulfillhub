function toMovementResponse(movement) {
  return {
    id: movement.id,
    productId: movement.productId,
    type: movement.type,
    quantity: movement.quantity,
    reason: movement.reason ?? null,
    orderId: movement.orderId ?? null,
    userId: movement.userId ?? null,
    createdAt: movement.createdAt.toISOString(),
  };
}

module.exports = { toMovementResponse };
