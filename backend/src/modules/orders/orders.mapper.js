function toOrderItemResponse(item) {
  return {
    id: item.id,
    productId: item.productId,
    sku: item.sku,
    name: item.name,
    quantity: item.quantity,
  };
}

function toShipmentResponse(shipment) {
  return {
    id: shipment.id,
    carrier: shipment.carrier,
    trackingNumber: shipment.trackingNumber,
    shippedAt: shipment.shippedAt.toISOString(),
  };
}

function toOrderResponse(order) {
  return {
    id: order.id,
    shopId: order.shopId,
    externalRef: order.externalRef,
    status: order.status,
    recipientName: order.recipientName,
    recipientAddress: order.recipientAddress,
    recipientEmail: order.recipientEmail ?? null,
    items: (order.items ?? []).map(toOrderItemResponse),
    shipment: order.shipment ? toShipmentResponse(order.shipment) : null,
    createdAt: order.createdAt.toISOString(),
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
  };
}

// Lista nie niesie pozycji ani przesyłki – tylko to, co widać w tabeli.
function toOrderSummaryResponse(order) {
  return {
    id: order.id,
    shopId: order.shopId,
    externalRef: order.externalRef,
    status: order.status,
    recipientName: order.recipientName,
    itemCount: Number(order.itemCount ?? 0),
    createdAt: order.createdAt.toISOString(),
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
  };
}

module.exports = { toOrderResponse, toOrderSummaryResponse };
