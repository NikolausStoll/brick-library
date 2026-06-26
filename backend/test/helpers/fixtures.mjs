import http from 'http';
import net from 'net';
import sharp from 'sharp';

export const createTestPngBuffer = () =>
  sharp({
    create: {
      width: 32,
      height: 24,
      channels: 3,
      background: { r: 200, g: 50, b: 50 }
    }
  })
    .png()
    .toBuffer();

export const createTestSvgBuffer = () =>
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
    'utf-8'
  );

const getFreePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

export const createMockImageServer = async (buffer, contentType = 'image/png') => {
  const port = await getFreePort();
  const imagePath = '/test-image';

  const server = http.createServer((req, res) => {
    if (req.url === imagePath || req.url?.startsWith(imagePath)) {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(buffer);
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    imageUrl: `http://127.0.0.1:${port}${imagePath}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      })
  };
};

export const createMockPageServer = async (html) => {
  const port = await getFreePort();

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

  return {
    pageUrl: `http://127.0.0.1:${port}/page`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      })
  };
};

export const uploadImages = async (baseUrl, setId, buffers, fieldName = 'images') => {
  const formData = new FormData();
  buffers.forEach((buffer, index) => {
    const blob = new Blob([buffer], { type: 'image/png' });
    formData.append(fieldName, blob, `test-${index}.png`);
  });

  const response = await fetch(`${baseUrl}/api/sets/${setId}/images`, {
    method: 'POST',
    body: formData
  });
  const data = await response.json();
  return { response, data };
};
