import { spawn } from 'child_process';
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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

const waitForExit = (proc) =>
  new Promise((resolve) => {
    if (proc.exitCode !== null) {
      resolve(proc.exitCode);
      return;
    }
    proc.once('exit', (code) => resolve(code));
  });

const waitForServer = async (url, timeoutMs = 15_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not become ready at ${url}`);
};

export const createTestServer = async (options = {}) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brick-lib-test-'));
  const dbPath = options.dbPath ?? path.join(tmpDir, 'test.db');
  const uploadDir = options.uploadDir ?? path.join(tmpDir, 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const proc = spawn('node', ['src/server.js'], {
    cwd: backendRoot,
    env: {
      ...process.env,
      PORT: String(port),
      DB_PATH: dbPath,
      UPLOAD_DIR: uploadDir
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stderr = '';
  proc.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForServer(`${baseUrl}/api/sets`);
  } catch (error) {
    proc.kill('SIGTERM');
    await waitForExit(proc);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw new Error(`${error.message}\nServer stderr:\n${stderr}`);
  }

  return {
    baseUrl,
    dbPath,
    uploadDir,
    port,
    async stop() {
      proc.kill('SIGTERM');
      await waitForExit(proc);
      if (!options.keepTmpDir) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }
  };
};

export const jsonRequest = async (baseUrl, pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  let data = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  }
  return { response, data };
};

export const createSet = async (baseUrl, body) => {
  const { response, data } = await jsonRequest(baseUrl, '/api/sets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { response, data };
};
