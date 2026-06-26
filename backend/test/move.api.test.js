import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, jsonRequest, createSet } from './helpers/server.mjs';

describe('move API', () => {
  let server;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('PUT /api/sets/:id/move rejects invalid listType', async () => {
    const { data: created } = await createSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Move Invalid',
      listType: 'wishlist'
    });

    const { response, data } = await jsonRequest(server.baseUrl, `/api/sets/${created.id}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listType: 'other' })
    });

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/listType/);
  });

  it('PUT /api/sets/:id/move moves wishlist item to collection with purchasePrice', async () => {
    const { data: created } = await createSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Move To Collection',
      listType: 'wishlist',
      pieceCount: 50
    });

    const { response, data } = await jsonRequest(server.baseUrl, `/api/sets/${created.id}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listType: 'collection', purchasePrice: 25.5 })
    });

    expect(response.status).toBe(200);
    expect(data.listType).toBe('collection');
    expect(data.purchasePrice).toBe(25.5);
    expect(data.pricePerPiece).toBeCloseTo(0.51, 4);
  });

  it('PUT /api/sets/:id/move moves collection item to wishlist', async () => {
    const { data: created } = await createSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Move To Wishlist',
      listType: 'collection',
      purchasePrice: 40
    });

    const { data } = await jsonRequest(server.baseUrl, `/api/sets/${created.id}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listType: 'wishlist' })
    });

    expect(data.listType).toBe('wishlist');
    expect(data.purchasePrice).toBe(40);
  });

  it('PUT /api/sets/:id/move returns 404 for unknown id', async () => {
    const { response, data } = await jsonRequest(server.baseUrl, '/api/sets/999999/move', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listType: 'collection' })
    });

    expect(response.status).toBe(404);
    expect(data.error).toBe('Set not found');
  });
});
