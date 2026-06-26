import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { describe, it, expect, afterAll } from 'vitest';
import { createTestServer, createSet } from './helpers/server.mjs';

describe('schema migration', () => {
  let server;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brick-lib-schema-'));

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('adds listType to legacy sets tables on startup', async () => {
    const dbPath = path.join(tmpDir, 'legacy.db');
    const uploadDir = path.join(tmpDir, 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });

    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        manufacturer TEXT NOT NULL,
        setName TEXT NOT NULL,
        setNumber TEXT,
        legoReferenceNumber TEXT,
        brickSize TEXT NOT NULL DEFAULT 'Standard',
        purchasePrice INTEGER,
        pieceCount INTEGER,
        status TEXT NOT NULL DEFAULT 'New',
        hasOriginalBox INTEGER NOT NULL DEFAULT 0,
        boxedWith TEXT,
        hasPrintedPhoto INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        instructionsUrl TEXT,
        retiredProduct INTEGER,
        theme TEXT,
        year INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO sets (
        manufacturer, setName, brickSize, status, hasOriginalBox, hasPrintedPhoto, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('LEGO', 'Legacy Set', 'Standard', 'New', 0, 0, now, now);
    db.close();

    server = await createTestServer({ dbPath, uploadDir, keepTmpDir: true });

    const { data } = await createSet(server.baseUrl, {
      manufacturer: 'LEGO',
      setName: 'Post Migration Set'
    });

    expect(data.listType).toBe('collection');

    const listResponse = await fetch(`${server.baseUrl}/api/sets`);
    const sets = await listResponse.json();
    const legacy = sets.find((set) => set.setName === 'Legacy Set');
    expect(legacy?.listType).toBe('collection');
  });
});
