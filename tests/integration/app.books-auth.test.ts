/**
 * API/controller tests (Supertest) against the real Express app.
 *
 * The data + storage layers are replaced with in-memory fakes via ESM module mocking,
 * so no database or Supabase is needed — but the REAL auth guard, RBAC, routing, and
 * error handling run end-to-end. (Requires the generated Prisma client, i.e. run
 * `npm install` / `prisma generate` first; executed with --experimental-vm-modules via `npm test`.)
 */
import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';

/* ----- in-memory fixtures ----- */
const base = { firstname: null, lastname: null, password: 'x', createdAt: new Date() };
const accounts: Record<number, unknown> = {
  1: { id: 1, role: 'ADMIN', status: 'ACTIVE', username: 'admin', ...base, admin: { id: 1, accountId: 1 }, user: null, library: null },
  2: { id: 2, role: 'USER', status: 'ACTIVE', username: 'user', ...base, user: { id: 2, accountId: 2 }, admin: null, library: null },
};
const bookRow = {
  id: 1, title: 'T', pages: 10, thumbnailUrl: null, fileId: 9, avgRating: 0, ratingCount: 0,
  categories: [], file: { id: 9, path: 'books/a.pdf', status: 'CHECKED', mimeType: 'application/pdf', size: 1 },
};

const fakePrisma = {
  userAccount: { findUnique: async ({ where }: { where: { id: number } }) => accounts[where.id] ?? null },
  subscription: { findFirst: async () => null },
  book: {
    findUnique: async ({ where }: { where: { id: number } }) => (where.id === 1 ? bookRow : null),
    findMany: async () => [bookRow],
  },
  auditLog: { create: async () => ({}) },
};

const fakeStorage = {
  createSignedDownloadUrl: async () => 'https://signed/url?token=abc',
  removeObject: async () => undefined,
  createSignedUploadUrl: async () => ({ uploadUrl: '', token: null, path: '' }),
  getObjectInfo: async () => null,
};

jest.unstable_mockModule('../../src/shared/database/prisma.js', () => ({ prisma: fakePrisma }));
jest.unstable_mockModule('../../src/shared/storage/index.js', () => ({
  getStorage: () => fakeStorage,
  newBookFilePath: () => 'books/a.pdf',
}));

let app: import('express').Express;
let adminToken: string;
let userToken: string;

beforeAll(async () => {
  const { signAccessToken } = await import('../../src/shared/security/jwt.js');
  const { createApp } = await import('../../src/app.js');
  app = createApp();
  adminToken = signAccessToken({ id: 1, accountId: 1, role: 'ADMIN', status: 'ACTIVE' });
  userToken = signAccessToken({ id: 2, accountId: 2, role: 'USER', status: 'ACTIVE' });
});

describe('GET /api/v1/books/:id — file exposure by role', () => {
  it('gives anonymous callers no file data', async () => {
    const res = await request(app).get('/api/v1/books/1');
    expect(res.status).toBe(200);
    expect(res.body.data.hasFile).toBe(true);
    expect(res.body.data.file).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('books/a.pdf');
    expect(JSON.stringify(res.body)).not.toContain('signed');
  });

  it('gives normal USERs no file data either', async () => {
    const res = await request(app).get('/api/v1/books/1').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.file).toBeUndefined();
  });

  it('gives ADMINs a temporary signed URL', async () => {
    const res = await request(app).get('/api/v1/books/1').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.file.signedUrl).toBe('https://signed/url?token=abc');
  });
});

describe('auth + RBAC on protected routes', () => {
  it('401s on POST /api/v1/books without a token', async () => {
    const res = await request(app).post('/api/v1/books').send({ title: 'X', pages: 1, fileId: 9 });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('403s on POST /api/v1/books for a normal USER', async () => {
    const res = await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'X', pages: 1, fileId: 9 });
    expect(res.status).toBe(403);
  });

  it('404s on an unknown route', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
