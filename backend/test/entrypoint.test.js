import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const runEntrypoint = (cwd, env = {}) =>
  new Promise((resolve, reject) => {
    const proc = spawn('node', ['entrypoint.js'], {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(new Error(`entrypoint exited with ${code}\nstdout: ${stdout}\nstderr: ${stderr}`));
    });
  });

describe('docker entrypoint', () => {
  it('passes environment variables to the backend process', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brick-entrypoint-'));
    const stubDir = path.join(tmpDir, 'backend', 'src');
    fs.mkdirSync(stubDir, { recursive: true });
    fs.writeFileSync(
      path.join(stubDir, 'server.js'),
      `console.log(JSON.stringify({
        PORT: process.env.PORT,
        DB_PATH: process.env.DB_PATH,
        STATIC_DIR: process.env.STATIC_DIR
      }));`
    );
    fs.copyFileSync(path.join(repoRoot, 'docker/entrypoint.js'), path.join(tmpDir, 'entrypoint.js'));

    try {
      const output = await runEntrypoint(tmpDir, {
        PORT: '9123',
        DB_PATH: '/tmp/custom.db',
        STATIC_DIR: '/tmp/public'
      });
      const env = JSON.parse(output);
      expect(env.PORT).toBe('9123');
      expect(env.DB_PATH).toBe('/tmp/custom.db');
      expect(env.STATIC_DIR).toBe('/tmp/public');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
