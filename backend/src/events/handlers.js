const { ORDER_SHIPPED, STOCK_LOW } = require("./events");

function formatItems(items) {
  return items.map((item) => `  - ${item.sku} ${item.name} x ${item.quantity}`).join("\n");
}

/**
 * Podpina handlery do zdarzeń domenowych. Wszystko, co tu trafia, dzieje się
 * poza transakcją i poza cyklem request/response.
 */
function registerEventHandlers({ eventBus, mailer, config, logger = console }) {
  // Sklep (i odbiorca, jeśli podał e-mail) dowiaduje się, że paczka poszła.
  eventBus.on(ORDER_SHIPPED, async ({ order, shop, shipment }) => {
    const body = [
      `Zamówienie ${order.externalRef} zostało wysłane.`,
      "",
      `Przewoźnik: ${shipment.carrier}`,
      `Numer przesyłki: ${shipment.trackingNumber}`,
      "",
      `Odbiorca: ${order.recipientName}`,
      `Adres: ${order.recipientAddress}`,
      "",
      "Pozycje:",
      formatItems(order.items),
    ].join("\n");

    await mailer.send({
      to: [shop.contactEmail, order.recipientEmail],
      subject: `FulfillHub: zamówienie ${order.externalRef} wysłane`,
      text: body,
    });
  });

  // Alert o niskim stanie idzie do sklepu i na skrzynkę magazynu.
  eventBus.on(STOCK_LOW, async ({ product, shop }) => {
    const body = [
      `Produkt ${product.sku} (${product.name}) spadł poniżej progu niskiego stanu.`,
      "",
      `Na stanie: ${product.quantityOnHand}`,
      `Zarezerwowane: ${product.quantityReserved}`,
      `Dostępne: ${product.quantityOnHand - product.quantityReserved}`,
      `Próg: ${product.lowStockThreshold}`,
      "",
      "Czas uzupełnić zapas.",
    ].join("\n");

    await mailer.send({
      to: [shop.contactEmail, config.mail.warehouseAddress],
      subject: `FulfillHub: niski stan ${product.sku}`,
      text: body,
    });
  });

  logger.log("[events] handlers registered");
}

module.exports = { registerEventHandlers };
