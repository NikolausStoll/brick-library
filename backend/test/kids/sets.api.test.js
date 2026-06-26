import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, jsonRequest } from '../helpers/server.mjs';
import { createKidsSet } from './helpers.mjs';

describe('kids sets API', () => {
  let server;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('GET /api/kids/sets returns an empty list initially', async () => {
    const { response, data } = await jsonRequest(server.baseUrl, '/api/kids/sets');
    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('POST /api/kids/sets requires setName', async () => {
    const { response, data } = await createKidsSet(server.baseUrl, { setNumber: '123' });
    expect(response.status).toBe(400);
    expect(data.error).toMatch(/manufacturer and setName/);
  });

  it('POST /api/kids/sets creates a minimal set', async () => {
    const { response, data } = await createKidsSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Police Station',
      setNumber: '60316',
      pieceCount: 540,
      brickSize: 'Mini',
      instructionsUrl: 'https://example.com/pdf'
    });
    expect(response.status).toBe(201);
    expect(data.setName).toBe('Police Station');
    expect(data.manufacturer).toBe('LEGO');
    expect(data.setNumber).toBe('60316');
    expect(data.pieceCount).toBe(540);
    expect(data.brickSize).toBe('Mini');
    expect(data.instructionsUrl).toBe('https://example.com/pdf');
  });

  it('PUT /api/kids/sets/:id updates fields', async () => {
    const { data: created } = await createKidsSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Original',
      pieceCount: 100
    });
    const { data } = await jsonRequest(server.baseUrl, `/api/kids/sets/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setName: 'Updated', pieceCount: 200 })
    });
    expect(data.setName).toBe('Updated');
    expect(data.pieceCount).toBe(200);
  });

  it('DELETE /api/kids/sets/:id removes set without images', async () => {
    const { data: created } = await createKidsSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Delete Me'
    });
    const deleteResponse = await fetch(`${server.baseUrl}/api/kids/sets/${created.id}`, {
      method: 'DELETE'
    });
    expect(deleteResponse.status).toBe(204);

    const getResponse = await fetch(`${server.baseUrl}/api/kids/sets/${created.id}`);
    expect(getResponse.status).toBe(404);
  });

  it('DELETE /api/kids/sets/:id returns 404 for unknown id', async () => {
    const response = await fetch(`${server.baseUrl}/api/kids/sets/999999`, { method: 'DELETE' });
    expect(response.status).toBe(404);
  });
});
