import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestPngBuffer,
  createTestSvgBuffer,
  createMockImageServer,
  uploadImages
} from './helpers/fixtures.mjs';
import { createTestServer, jsonRequest, createSet } from './helpers/server.mjs';

describe('images API', () => {
  let server;
  let setId;
  let pngBuffer;

  beforeAll(async () => {
    server = await createTestServer();
    pngBuffer = await createTestPngBuffer();
    const { data } = await createSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Image Test Set'
    });
    setId = data.id;
  });

  afterAll(async () => {
    await server.stop();
  });

  it('POST /api/sets/:setId/images requires files', async () => {
    const formData = new FormData();
    const response = await fetch(`${server.baseUrl}/api/sets/${setId}/images`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toMatch(/at least one image/i);
  });

  it('POST /api/sets/:setId/images returns 404 for unknown set', async () => {
    const { response } = await uploadImages(server.baseUrl, 999999, [pngBuffer]);
    expect(response.status).toBe(404);
  });

  it('POST /api/sets/:setId/images uploads and optimizes raster images', async () => {
    const { response, data } = await uploadImages(server.baseUrl, setId, [pngBuffer]);
    expect(response.status).toBe(201);
    expect(data).toHaveLength(1);
    expect(data[0].source).toBe('upload');
    expect(data[0].fileName).toMatch(/\.webp$/);
    expect(data[0].url).toContain(`/uploads/${setId}/`);
    expect(data[0].thumbUrl).toContain('-thumb.webp');

    const filePath = path.join(server.uploadDir, String(setId), data[0].fileName);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('GET /api/sets/:setId/images lists images in sort order', async () => {
    const { response, data } = await jsonRequest(server.baseUrl, `/api/sets/${setId}/images`);
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].sortOrder).toBe(0);
  });

  it('GET /api/sets/:setId/images/:imageId/file serves the optimized file', async () => {
    const { data: images } = await jsonRequest(server.baseUrl, `/api/sets/${setId}/images`);
    const imageId = images[0].id;

    const response = await fetch(
      `${server.baseUrl}/api/sets/${setId}/images/${imageId}/file`
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('immutable');
    const body = Buffer.from(await response.arrayBuffer());
    expect(body.length).toBeGreaterThan(0);
  });

  it('PUT /api/sets/:setId/images/order reorders images', async () => {
    const { data: secondUpload } = await uploadImages(server.baseUrl, setId, [pngBuffer]);
    const { data: images } = await jsonRequest(server.baseUrl, `/api/sets/${setId}/images`);
    expect(images.length).toBeGreaterThanOrEqual(2);

    const reversedIds = [...images].reverse().map((img) => img.id);
    const { response, data } = await jsonRequest(
      server.baseUrl,
      `/api/sets/${setId}/images/order`,
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

  it('PUT /api/sets/:setId/images/order rejects invalid imageIds', async () => {
    const { data: images } = await jsonRequest(server.baseUrl, `/api/sets/${setId}/images`);
    const invalidIds = images.map((img) => img.id).slice(0, -1);

    const { response, data } = await jsonRequest(
      server.baseUrl,
      `/api/sets/${setId}/images/order`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: invalidIds })
      }
    );

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/imageIds/);
  });

  it('POST /api/sets/:setId/images/url adds an image from a URL', async () => {
    const mockServer = await createMockImageServer(pngBuffer);
    try {
      const { response, data } = await jsonRequest(
        server.baseUrl,
        `/api/sets/${setId}/images/url`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: mockServer.imageUrl })
        }
      );

      expect(response.status).toBe(201);
      expect(data.source).toBe('scrape');
      expect(data.originalUrl).toBe(mockServer.imageUrl);
    } finally {
      await mockServer.close();
    }
  });

  it('POST /api/sets/:setId/images/url rejects duplicate URLs', async () => {
    const mockServer = await createMockImageServer(pngBuffer);
    try {
      const payload = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: mockServer.imageUrl })
      };

      await jsonRequest(server.baseUrl, `/api/sets/${setId}/images/url`, payload);
      const { response, data } = await jsonRequest(
        server.baseUrl,
        `/api/sets/${setId}/images/url`,
        payload
      );

      expect(response.status).toBe(409);
      expect(data.error).toMatch(/already exists/i);
    } finally {
      await mockServer.close();
    }
  });

  it('POST /api/sets/:setId/images/url rejects invalid URLs', async () => {
    const { response, data } = await jsonRequest(
      server.baseUrl,
      `/api/sets/${setId}/images/url`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: 'not-a-url' })
      }
    );

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/invalid url/i);
  });

  it('DELETE /api/sets/:setId/images/:imageId removes image files', async () => {
    const { data: uploaded } = await uploadImages(server.baseUrl, setId, [pngBuffer]);
    const imageId = uploaded[0].id;
    const fileName = uploaded[0].fileName;

    const response = await fetch(
      `${server.baseUrl}/api/sets/${setId}/images/${imageId}`,
      { method: 'DELETE' }
    );
    expect(response.status).toBe(204);
    expect(fs.existsSync(path.join(server.uploadDir, String(setId), fileName))).toBe(false);
  });

  it('DELETE /api/sets/:setId/images removes all images for a set', async () => {
    const { data: created } = await createSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Delete All Images'
    });
    await uploadImages(server.baseUrl, created.id, [pngBuffer, pngBuffer]);

    const response = await fetch(`${server.baseUrl}/api/sets/${created.id}/images`, {
      method: 'DELETE'
    });
    expect(response.status).toBe(204);

    const { data } = await jsonRequest(server.baseUrl, `/api/sets/${created.id}/images`);
    expect(data).toEqual([]);
  });

  it('DELETE /api/sets/:id removes set after images were deleted separately', async () => {
    const { data: created } = await createSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Cascade Delete'
    });
    const { data: uploaded } = await uploadImages(server.baseUrl, created.id, [pngBuffer]);
    const setDir = path.join(server.uploadDir, String(created.id));
    expect(fs.existsSync(setDir)).toBe(true);

    const deleteImagesResponse = await fetch(`${server.baseUrl}/api/sets/${created.id}/images`, {
      method: 'DELETE'
    });
    expect(deleteImagesResponse.status).toBe(204);
    expect(fs.existsSync(path.join(setDir, uploaded[0].fileName))).toBe(false);

    const response = await fetch(`${server.baseUrl}/api/sets/${created.id}`, {
      method: 'DELETE'
    });
    expect(response.status).toBe(204);

    const { response: imagesResponse } = await jsonRequest(
      server.baseUrl,
      `/api/sets/${created.id}/images`
    );
    expect(imagesResponse.status).toBe(404);
  });

  it('DELETE /api/sets/:id with remaining images fails when foreign keys are enforced', async () => {
    const { data: created } = await createSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'FK Delete'
    });
    await uploadImages(server.baseUrl, created.id, [pngBuffer]);

    const response = await fetch(`${server.baseUrl}/api/sets/${created.id}`, {
      method: 'DELETE'
    });
    expect(response.status).toBe(500);
  });

  it('uploads SVG without generating a thumbnail file', async () => {
    const { data: created } = await createSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'SVG Upload'
    });
    const svgBuffer = createTestSvgBuffer();
    const formData = new FormData();
    formData.append('images', new Blob([svgBuffer], { type: 'image/svg+xml' }), 'icon.svg');

    const response = await fetch(`${server.baseUrl}/api/sets/${created.id}/images`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data[0].fileName).toMatch(/\.svg$/);
    expect(data[0].fileSizeThumb).toBeNull();
    expect(
      fs.existsSync(
        path.join(server.uploadDir, String(created.id), data[0].fileName.replace('.svg', '-thumb.svg'))
      )
    ).toBe(false);
  });
});
