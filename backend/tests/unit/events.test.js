import { describe, it, expect, vi } from 'vitest';

import { createEventBus } from '../../src/events/eventBus.js';
import { crossedLowStockThreshold } from '../../src/events/lowStock.js';
import { createStockService } from '../../src/modules/stock/stock.service.js';
import { createOrdersService } from '../../src/modules/orders/orders.service.js';
import { STOCK_LOW, ORDER_SHIPPED } from '../../src/events/events.js';
import {
  createFakeDb,
  createFakeShopsRepository,
  createFakeProductsRepository,
  createFakeStockRepository,
  createFakeOrdersRepository,
} from '../helpers/fakes.js';

const NOW = new Date('2026-10-25T10:00:00.000Z');
const now = () => NOW;

// Szyna, która zapamiętuje emisje – wygodniejsza w asercjach niż prawdziwy EventEmitter.
function createSpyBus() {
  const emitted = [];

  return { emitted, on: () => {}, emit: (event, payload) => emitted.push({ event, payload }) };
}

describe('event bus', () => {
  it('runs handlers asynchronously and survives a failing one', async () => {
    const logger = { error: vi.fn() };
    const bus = createEventBus({ logger });
    const ok = vi.fn();

    bus.on('test.event', () => {
      throw new Error('handler exploded');
    });
    bus.on('test.event', ok);

    expect(() => bus.emit('test.event', { id: 1 })).not.toThrow();

    await new Promise((resolve) => setImmediate(resolve));

    expect(ok).toHaveBeenCalledWith({ id: 1 });
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('reguła 8: próg niskiego stanu', () => {
  const product = (onHand, reserved, threshold) => ({
    quantityOnHand: onHand,
    quantityReserved: reserved,
    lowStockThreshold: threshold,
  });

  it('reports a crossing when availability drops below the threshold', () => {
    expect(crossedLowStockThreshold(product(10, 0, 5), product(10, 6, 5))).toBe(true);
  });

  it('does not report again when stock was already low', () => {
    expect(crossedLowStockThreshold(product(10, 6, 5), product(10, 8, 5))).toBe(false);
  });

  it('does not report when availability stays at the threshold', () => {
    expect(crossedLowStockThreshold(product(10, 0, 5), product(10, 5, 5))).toBe(false);
  });

  it('does not report when availability grows', () => {
    expect(crossedLowStockThreshold(product(10, 8, 5), product(20, 8, 5))).toBe(false);
  });
});

describe('stock service – emisja stock.low', () => {
  function setup(product) {
    const productsRepository = createFakeProductsRepository([product]);
    const shopsRepository = createFakeShopsRepository([
      { id: 1, name: 'Sklep Alfa', contactEmail: 'alfa@example.com' },
    ]);
    const eventBus = createSpyBus();

    const service = createStockService({
      db: createFakeDb(),
      productsRepository,
      stockRepository: createFakeStockRepository(),
      shopsRepository,
      eventBus,
      now,
    });

    return { service, eventBus };
  }

  it('emits stock.low when a correction pushes availability below the threshold', async () => {
    const { service, eventBus } = setup({
      id: 1,
      shopId: 1,
      sku: 'ALF-001',
      quantityOnHand: 20,
      quantityReserved: 0,
      lowStockThreshold: 10,
    });

    await service.adjust(1, { newQuantityOnHand: 4, reason: 'inwentaryzacja' });

    expect(eventBus.emitted).toHaveLength(1);
    expect(eventBus.emitted[0].event).toBe(STOCK_LOW);
    expect(eventBus.emitted[0].payload.product.sku).toBe('ALF-001');
    expect(eventBus.emitted[0].payload.shop.contactEmail).toBe('alfa@example.com');
  });

  it('stays quiet when the correction keeps availability above the threshold', async () => {
    const { service, eventBus } = setup({
      id: 1,
      shopId: 1,
      sku: 'ALF-001',
      quantityOnHand: 20,
      quantityReserved: 0,
      lowStockThreshold: 10,
    });

    await service.adjust(1, { newQuantityOnHand: 15, reason: 'inwentaryzacja' });

    expect(eventBus.emitted).toHaveLength(0);
  });

  it('stays quiet when stock was already below the threshold', async () => {
    const { service, eventBus } = setup({
      id: 1,
      shopId: 1,
      sku: 'ALF-001',
      quantityOnHand: 8,
      quantityReserved: 0,
      lowStockThreshold: 10,
    });

    await service.adjust(1, { newQuantityOnHand: 6, reason: 'inwentaryzacja' });

    expect(eventBus.emitted).toHaveLength(0);
  });
});

describe('orders service – emisja zdarzeń', () => {
  function setup({ products, orders = [], items = [] }) {
    const productsRepository = createFakeProductsRepository(products);
    const shopsRepository = createFakeShopsRepository([
      { id: 1, name: 'Sklep Alfa', contactEmail: 'alfa@example.com' },
    ]);
    const eventBus = createSpyBus();

    const service = createOrdersService({
      db: createFakeDb(),
      ordersRepository: createFakeOrdersRepository({ orders, items }),
      productsRepository,
      shopsRepository,
      stockRepository: createFakeStockRepository(),
      eventBus,
      now,
    });

    return { service, eventBus };
  }

  it('emits order.shipped with the shop and the shipment', async () => {
    const { service, eventBus } = setup({
      products: [
        { id: 1, shopId: 1, sku: 'ALF-001', quantityOnHand: 10, quantityReserved: 4, lowStockThreshold: 0 },
      ],
      orders: [{ id: 1, shopId: 1, externalRef: 'ALF-ZAM-1', status: 'PACKED', cancelledAt: null }],
      items: [{ id: 1, orderId: 1, productId: 1, quantity: 4 }],
    });

    await service.ship(1, { carrier: 'InPost', trackingNumber: 'PL1' });

    expect(eventBus.emitted).toHaveLength(1);
    expect(eventBus.emitted[0].event).toBe(ORDER_SHIPPED);
    expect(eventBus.emitted[0].payload.shipment).toMatchObject({ trackingNumber: 'PL1' });
    expect(eventBus.emitted[0].payload.shop.contactEmail).toBe('alfa@example.com');
  });

  it('does not emit order.shipped twice for the same order', async () => {
    const { service, eventBus } = setup({
      products: [
        { id: 1, shopId: 1, sku: 'ALF-001', quantityOnHand: 10, quantityReserved: 4, lowStockThreshold: 0 },
      ],
      orders: [{ id: 1, shopId: 1, externalRef: 'ALF-ZAM-1', status: 'PACKED', cancelledAt: null }],
      items: [{ id: 1, orderId: 1, productId: 1, quantity: 4 }],
    });

    await service.ship(1, { carrier: 'InPost', trackingNumber: 'PL1' });
    await service.ship(1, { carrier: 'InPost', trackingNumber: 'PL1' });

    expect(eventBus.emitted).toHaveLength(1);
  });

  it('emits stock.low when a reservation pushes availability below the threshold', async () => {
    const { service, eventBus } = setup({
      products: [
        { id: 1, shopId: 1, sku: 'ALF-001', quantityOnHand: 10, quantityReserved: 0, lowStockThreshold: 5 },
      ],
    });

    await service.create({
      shopId: 1,
      externalRef: 'ALF-ZAM-9',
      recipientName: 'Jan Kowalski',
      recipientAddress: 'ul. Testowa 1',
      items: [{ productId: 1, quantity: 7 }],
    });

    expect(eventBus.emitted).toHaveLength(1);
    expect(eventBus.emitted[0].event).toBe(STOCK_LOW);
    expect(eventBus.emitted[0].payload.product.quantityReserved).toBe(7);
  });
});
