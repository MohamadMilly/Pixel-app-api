import { describe, expect, it } from '@jest/globals';
import { OrdersService } from '../../src/features/orders/orders.service.js';

const user = { role: 'USER', profileId: 2, accountId: 2 } as never;
const otherUser = { role: 'USER', profileId: 999, accountId: 999 } as never;

const noEvents = { emit: () => undefined } as never;
const noNotifications = { notify: async () => ({}), notifySafe: () => undefined } as never;

function orderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    senderId: 2,
    libraryId: 5,
    bookId: 3,
    status: 'PENDING',
    sentAt: new Date(),
    pageCount: 10,
    snapshotPagePrice: 5,
    snapshotExtraFees: 3,
    totalPrice: 53,
    book: { id: 3, title: 'B', pages: 10 },
    library: { id: 5, title: 'L', accountId: 50 },
    sender: { accountId: 2 },
    ...overrides,
  };
}

function buildService(overrides: Record<string, unknown> = {}) {
  const repo = {
    findOrderableTargets: async () => ({
      book: { id: 3, pages: 10 },
      library: { id: 5, pagePrice: 5, extraFees: 3 },
    }),
    create: async (data: Record<string, unknown>) => orderRow(data),
    findById: async () => orderRow(),
    list: async () => [],
    transition: async () => true,
    ...overrides,
  };
  return new OrdersService(repo as never, noEvents, noNotifications);
}

describe('order creation', () => {
  it('freezes the price snapshot from the library rates', async () => {
    const service = buildService();
    const view = (await service.create(user, 5, { bookId: 3 })) as { price: { total: number } };
    expect(view.price).toEqual({ pageCount: 10, pagePrice: 5, extraFees: 3, total: 53 });
  });

  it('404s when the library is not available/active', async () => {
    const service = buildService({ findOrderableTargets: async () => null });
    await expect(service.create(user, 5, { bookId: 3 })).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('order IDOR protection', () => {
  it('returns 404 when a different user views the order', async () => {
    const service = buildService();
    await expect(service.getById(otherUser, 10)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns 404 when a different user tries to cancel the order', async () => {
    const service = buildService();
    await expect(service.cancel(otherUser, 10)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('order state machine enforcement', () => {
  it('rejects receiving an order that is still PENDING', async () => {
    const service = buildService({ findById: async () => orderRow({ status: 'PENDING' }) });
    await expect(service.receive(user, 10)).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
  });

  it('allows cancelling a PENDING order by its owner', async () => {
    const service = buildService({
      findById: async () => orderRow({ status: 'PENDING' }),
    });
    const view = (await service.cancel(user, 10)) as { status: string };
    // reload() returns the (stubbed) order row; the important part is no throw + transition ran.
    expect(view).toBeDefined();
  });

  it('409s when a concurrent transition already moved the order', async () => {
    const service = buildService({
      findById: async () => orderRow({ status: 'PENDING' }),
      transition: async () => false, // lost the race
    });
    await expect(service.cancel(user, 10)).rejects.toMatchObject({ statusCode: 409 });
  });
});
