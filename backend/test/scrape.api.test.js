import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestPngBuffer,
  createMockImageServer,
  createMockPageServer
} from './helpers/fixtures.mjs';
import { createTestServer, jsonRequest, createSet } from './helpers/server.mjs';

describe('scrape API', () => {
  let server;
  let setId;
  let pngBuffer;

  beforeAll(async () => {
    server = await createTestServer();
    pngBuffer = await createTestPngBuffer();
    const { data } = await createSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Scrape Test Set'
    });
    setId = data.id;
  });

  afterAll(async () => {
    await server.stop();
  });

  it('POST /api/sets/:setId/images/scrape requires rawHtml or pageUrl + containerSelector', async () => {
    const { response, data } = await jsonRequest(
      server.baseUrl,
      `/api/sets/${setId}/images/scrape`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }
    );

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/rawHtml|pageUrl/i);
  });

  it('POST /api/sets/:setId/images/scrape returns empty result when no images found', async () => {
    const { response, data } = await jsonRequest(
      server.baseUrl,
      `/api/sets/${setId}/images/scrape`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawHtml: '<div><p>No images here</p></div>' })
      }
    );

    expect(response.status).toBe(200);
    expect(data).toEqual({ found: 0, downloaded: 0, skipped: 0, images: [] });
  });

  it('POST /api/sets/:setId/images/scrape parses rawHtml and downloads images', async () => {
    const mockServer = await createMockImageServer(pngBuffer);
    try {
      const rawHtml = `
        <div class="gallery">
          <img class="zoomImg" src="ignore-me.jpg" />
          <img data-large_image="${mockServer.imageUrl}" src="/small.jpg" />
          <img srcset="${mockServer.imageUrl} 100w, ${mockServer.imageUrl} 400w" />
        </div>
      `;

      const { response, data } = await jsonRequest(
        server.baseUrl,
        `/api/sets/${setId}/images/scrape`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawHtml, baseUrl: mockServer.baseUrl })
        }
      );

      expect(response.status).toBe(201);
      expect(data.found).toBeGreaterThanOrEqual(1);
      expect(data.downloaded).toBeGreaterThanOrEqual(1);
      expect(data.images.length).toBeGreaterThanOrEqual(1);
      expect(data.images[0].source).toBe('scrape');
    } finally {
      await mockServer.close();
    }
  });

  it('POST /api/sets/:setId/images/scrape skips duplicate originalUrl values', async () => {
    const mockServer = await createMockImageServer(pngBuffer);
    try {
      const payload = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawHtml: `<img src="${mockServer.imageUrl}" />`,
          baseUrl: mockServer.baseUrl
        })
      };

      const first = await jsonRequest(server.baseUrl, `/api/sets/${setId}/images/scrape`, payload);
      const second = await jsonRequest(server.baseUrl, `/api/sets/${setId}/images/scrape`, payload);

      expect(first.data.downloaded).toBe(1);
      expect(second.data.skipped).toBeGreaterThanOrEqual(1);
      expect(second.data.downloaded).toBe(0);
    } finally {
      await mockServer.close();
    }
  });

  it('POST /api/sets/:setId/images/scrape normalizes containerSelector without leading dot', async () => {
    const mockServer = await createMockImageServer(pngBuffer);
    const pageServer = await createMockPageServer(`
      <html><body>
        <div class="product-gallery">
          <img src="${mockServer.imageUrl}" />
        </div>
      </body></html>
    `);

    try {
      const { response, data } = await jsonRequest(
        server.baseUrl,
        `/api/sets/${setId}/images/scrape`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageUrl: pageServer.pageUrl,
            containerSelector: 'product-gallery'
          })
        }
      );

      expect(response.status).toBe(201);
      expect(data.downloaded).toBeGreaterThanOrEqual(1);
    } finally {
      await mockServer.close();
      await pageServer.close();
    }
  });

  it('POST /api/sets/:setId/images/scrape returns 400 when selector matches nothing', async () => {
    const pageServer = await createMockPageServer('<html><body><div>No gallery</div></body></html>');
    try {
      const { response, data } = await jsonRequest(
        server.baseUrl,
        `/api/sets/${setId}/images/scrape`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageUrl: pageServer.pageUrl,
            containerSelector: '.missing'
          })
        }
      );

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/matched no elements/i);
    } finally {
      await pageServer.close();
    }
  });
});
