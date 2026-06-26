import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestPngBuffer, createMockImageServer } from '../helpers/fixtures.mjs';
import { createTestServer, jsonRequest } from '../helpers/server.mjs';
import { KIDS_API, createKidsSet, kidsUploadImages } from './helpers.mjs';

describe('kids images API', () => {
  let server;
  let setId;
  let pngBuffer;

  beforeAll(async () => {
    server = await createTestServer();
    pngBuffer = await createTestPngBuffer();
    const { data } = await createKidsSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Image Test'
    });
    setId = data.id;
  });

  afterAll(async () => {
    await server.stop();
  });

  it('POST /api/kids/sets/:setId/images requires files', async () => {
    const formData = new FormData();
    const response = await fetch(`${server.baseUrl}${KIDS_API}/sets/${setId}/images`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toMatch(/at least one image/i);
  });

  it('POST /api/kids/sets/:setId/images returns 404 for unknown set', async () => {
    const { response } = await kidsUploadImages(server.baseUrl, 999999, [pngBuffer]);
    expect(response.status).toBe(404);
  });

  it('uploads and lists images under /uploads/kids/', async () => {
    const { response, data } = await kidsUploadImages(server.baseUrl, setId, [pngBuffer]);
    expect(response.status).toBe(201);
    expect(data[0].url).toContain('/uploads/kids/');
    expect(data[0].fileName).toMatch(/\.webp$/);

    const list = await jsonRequest(server.baseUrl, `${KIDS_API}/sets/${setId}/images`);
    expect(list.data).toHaveLength(1);
  });

  it('stores files in kids upload subdirectory', async () => {
    const { data } = await kidsUploadImages(server.baseUrl, setId, [pngBuffer]);
    const filePath = path.join(server.uploadDir, 'kids', String(setId), data[0].fileName);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('GET /api/kids/sets/:setId/images lists images in sort order', async () => {
    const { response, data } = await jsonRequest(server.baseUrl, `${KIDS_API}/sets/${setId}/images`);
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].sortOrder).toBe(0);
  });

  it('GET /api/kids/sets/:setId/images/:imageId/file serves the optimized file', async () => {
    const { data: images } = await jsonRequest(server.baseUrl, `${KIDS_API}/sets/${setId}/images`);
    const imageId = images[0].id;

    const response = await fetch(`${server.baseUrl}${KIDS_API}/sets/${setId}/images/${imageId}/file`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('immutable');
    const body = Buffer.from(await response.arrayBuffer());
    expect(body.length).toBeGreaterThan(0);
  });

  it('PUT /api/kids/sets/:setId/images/order reorders images', async () => {
    const { data: secondUpload } = await kidsUploadImages(server.baseUrl, setId, [pngBuffer]);
    const { data: images } = await jsonRequest(server.baseUrl, `${KIDS_API}/sets/${setId}/images`);
    expect(images.length).toBeGreaterThanOrEqual(2);

    const reversedIds = [...images].reverse().map((img) => img.id);
    const { response, data } = await jsonRequest(
      server.baseUrl,
      `${KIDS_API}/sets/${setId}/images/order`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: reversedIds })
      }
    );

    expect(response.status).toBe(200);
    expect(data.map((img) => img.id)).toEqual(reversedIds);
    expect(secondUpload[0].id).toBe(data[0].id);
  });

  it('PUT /api/kids/sets/:setId/images/order rejects invalid imageIds', async () => {
    const { data: images } = await jsonRequest(server.baseUrl, `${KIDS_API}/sets/${setId}/images`);
    const invalidIds = images.map((img) => img.id).slice(0, -1);

    const { response, data } = await jsonRequest(
      server.baseUrl,
      `${KIDS_API}/sets/${setId}/images/order`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: invalidIds })
      }
    );

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/imageIds/);
  });

  it('POST /api/kids/sets/:setId/images/url adds an image from a URL', async () => {
    const mockServer = await createMockImageServer(pngBuffer);
    try {
      const { response, data } = await jsonRequest(
        server.baseUrl,
        `${KIDS_API}/sets/${setId}/images/url`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: mockServer.imageUrl })
        }
      );

      expect(response.status).toBe(201);
      expect(data.source).toBe('scrape');
      expect(data.originalUrl).toBe(mockServer.imageUrl);
      expect(data.url).toContain('/uploads/kids/');
    } finally {
      await mockServer.close();
    }
  });

  it('POST /api/kids/sets/:setId/images/url rejects duplicate URLs', async () => {
    const mockServer = await createMockImageServer(pngBuffer);
    try {
      const payload = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: mockServer.imageUrl })
      };

      const first = await jsonRequest(server.baseUrl, `${KIDS_API}/sets/${setId}/images/url`, payload);
      const second = await jsonRequest(server.baseUrl, `${KIDS_API}/sets/${setId}/images/url`, payload);

      expect(first.response.status).toBe(201);
      expect(second.response.status).toBe(409);
    } finally {
      await mockServer.close();
    }
  });

  it('DELETE /api/kids/sets/:setId/images/:imageId removes image files', async () => {
    const { data: uploaded } = await kidsUploadImages(server.baseUrl, setId, [pngBuffer]);
    const imageId = uploaded[0].id;
    const fileName = uploaded[0].fileName;

    const response = await fetch(`${server.baseUrl}${KIDS_API}/sets/${setId}/images/${imageId}`, {
      method: 'DELETE'
    });
    expect(response.status).toBe(204);
    expect(fs.existsSync(path.join(server.uploadDir, 'kids', String(setId), fileName))).toBe(false);
  });

  it('DELETE /api/kids/sets/:setId/images removes all images for a set', async () => {
    const { data: created } = await createKidsSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Delete All Images'
    });
    await kidsUploadImages(server.baseUrl, created.id, [pngBuffer, pngBuffer]);

    const response = await fetch(`${server.baseUrl}${KIDS_API}/sets/${created.id}/images`, {
      method: 'DELETE'
    });
    expect(response.status).toBe(204);

    const { data } = await jsonRequest(server.baseUrl, `${KIDS_API}/sets/${created.id}/images`);
    expect(data).toEqual([]);
  });

  it('DELETE /api/kids/sets/:id removes set with images and cleans up upload directory', async () => {
    const { data: created } = await createKidsSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Cascade Delete'
    });
    const { data: uploaded } = await kidsUploadImages(server.baseUrl, created.id, [pngBuffer]);
    const setDir = path.join(server.uploadDir, 'kids', String(created.id));
    expect(fs.existsSync(setDir)).toBe(true);
    expect(fs.existsSync(path.join(setDir, uploaded[0].fileName))).toBe(true);

    const response = await fetch(`${server.baseUrl}${KIDS_API}/sets/${created.id}`, {
      method: 'DELETE'
    });
    expect(response.status).toBe(204);
    expect(fs.existsSync(setDir)).toBe(false);

    const { response: getResponse } = await jsonRequest(server.baseUrl, `${KIDS_API}/sets/${created.id}`);
    expect(getResponse.status).toBe(404);
  });
});
