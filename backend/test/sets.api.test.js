import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, jsonRequest, createSet } from './helpers/server.mjs';

describe('sets API', () => {
  let server;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('GET /api/sets returns an empty list initially', async () => {
    const { response, data } = await jsonRequest(server.baseUrl, '/api/sets');
    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('POST /api/sets requires manufacturer and setName', async () => {
    const { response, data } = await createSet(server.baseUrl, { manufacturer: 'LEGO' });
    expect(response.status).toBe(400);
    expect(data.error).toMatch(/manufacturer and setName/);
  });

  it('POST /api/sets creates a set with defaults and euro prices', async () => {
    const { response, data } = await createSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Millennium Falcon',
      purchasePrice: 19.99,
      pieceCount: 100,
      listType: 'collection'
    });

    expect(response.status).toBe(201);
    expect(data.manufacturer).toBe('LEGO');
    expect(data.setName).toBe('Millennium Falcon');
    expect(data.purchasePrice).toBe(19.99);
    expect(data.pieceCount).toBe(100);
    expect(data.pricePerPiece).toBeCloseTo(0.1999, 4);
    expect(data.status).toBe('New');
    expect(data.brickSize).toBe('Standard');
    expect(data.listType).toBe('collection');
    expect(data.hasOriginalBox).toBe(false);
    expect(data.retiredProduct).toBeNull();
  });

  it('POST /api/sets normalizes invalid status and brickSize', async () => {
    const { data } = await createSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Invalid Fields',
      status: 'NotAStatus',
      brickSize: 'Huge'
    });

    expect(data.status).toBe('New');
    expect(data.brickSize).toBe('Standard');
  });

  it('POST /api/sets stores wishlist items', async () => {
    const { data } = await createSet(server.baseUrl, {
      manufacturer: 'King',
      setName: 'Wishlist Set',
      listType: 'wishlist'
    });

    expect(data.listType).toBe('wishlist');
  });

  it('GET /api/sets/:id returns a single set', async () => {
    const { data: created } = await createSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Lookup Test'
    });

    const { response, data } = await jsonRequest(server.baseUrl, `/api/sets/${created.id}`);
    expect(response.status).toBe(200);
    expect(data.id).toBe(created.id);
    expect(data.setName).toBe('Lookup Test');
  });

  it('GET /api/sets/:id returns 404 for unknown id', async () => {
    const { response, data } = await jsonRequest(server.baseUrl, '/api/sets/999999');
    expect(response.status).toBe(404);
    expect(data.error).toBe('Set not found');
  });

  it('PUT /api/sets/:id updates fields without double-converting purchasePrice', async () => {
    const { data: created } = await createSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Price Round Trip',
      purchasePrice: 10
    });

    const { response, data } = await jsonRequest(server.baseUrl, `/api/sets/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Built' })
    });

    expect(response.status).toBe(200);
    expect(data.status).toBe('Built');
    expect(data.purchasePrice).toBe(10);
  });

  it('PUT /api/sets/:id updates purchasePrice in euros', async () => {
    const { data: created } = await createSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Price Update',
      purchasePrice: 5
    });

    const { data } = await jsonRequest(server.baseUrl, `/api/sets/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchasePrice: 12.5 })
    });

    expect(data.purchasePrice).toBe(12.5);
  });

  it('PUT /api/sets/:id returns 404 for unknown id', async () => {
    const { response, data } = await jsonRequest(server.baseUrl, '/api/sets/999999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Built' })
    });

    expect(response.status).toBe(404);
    expect(data.error).toBe('Set not found');
  });

  it('DELETE /api/sets/:id removes a set', async () => {
    const { data: created } = await createSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Delete Me'
    });

    const deleteResponse = await fetch(`${server.baseUrl}/api/sets/${created.id}`, {
      method: 'DELETE'
    });
    expect(deleteResponse.status).toBe(204);

    const { response } = await jsonRequest(server.baseUrl, `/api/sets/${created.id}`);
    expect(response.status).toBe(404);
  });

  it('DELETE /api/sets/:id returns 404 for unknown id', async () => {
    const response = await fetch(`${server.baseUrl}/api/sets/999999`, { method: 'DELETE' });
    expect(response.status).toBe(404);
  });
});
