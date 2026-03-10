import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import express from 'express';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url))
});

const DB_PATH = process.env.DATABASE_PATH || 'brick-library.db';
console.log('ENV DATABASE_PATH', process.env.DATABASE_PATH);
console.log('DATABASE_PATH', DB_PATH);
const PORT = Number(process.env.PORT || 8097);

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS sets (
    id TEXT PRIMARY KEY,
    manufacturer TEXT NOT NULL,
    setName TEXT NOT NULL,
    setNumber TEXT,
    legoReferenceNumber TEXT,
    purchasePrice INTEGER,
    pieceCount INTEGER,
    status TEXT NOT NULL DEFAULT 'New',
    hasOriginalBox INTEGER NOT NULL DEFAULT 0,
    boxedWith TEXT,
    hasPrintedPhoto INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    imageUrl TEXT,
    instructionsUrl TEXT,
    retiredProduct INTEGER,
    theme TEXT,
    year INTEGER,
    externalSource TEXT,
    externalId TEXT,
    lastEnrichedAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

const app = express();
app.use(express.json());

const sanitizeBoolean = (value) => (value ? 1 : 0);
const sanitizeNullableBoolean = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'number') {
    return value === 1 ? 1 : 0;
  }
  return value === '1' || value === 'true' ? 1 : 0;
};

const STATUSES = new Set(['New', 'Building', 'Built', 'Disassembled']);

const toPriceCents = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = Number(value);
  if (Number.isNaN(normalized)) {
    return null;
  }
  return Math.round(normalized * 100);
};

const mapRow = (row) => {
  const purchasePrice = row.purchasePrice != null ? row.purchasePrice / 100 : null;
  const pieceCount = row.pieceCount != null ? Number(row.pieceCount) : null;
  const pricePerPiece =
    purchasePrice != null && pieceCount && pieceCount > 0
      ? purchasePrice / pieceCount
      : null;
  return {
    id: row.id,
    manufacturer: row.manufacturer,
    setName: row.setName,
    setNumber: row.setNumber,
    legoReferenceNumber: row.legoReferenceNumber,
    purchasePrice,
    pieceCount,
    pricePerPiece,
    status: row.status,
    hasOriginalBox: Boolean(row.hasOriginalBox),
    boxedWith: row.boxedWith,
    hasPrintedPhoto: Boolean(row.hasPrintedPhoto),
    notes: row.notes,
    imageUrl: row.imageUrl,
    instructionsUrl: row.instructionsUrl,
    retiredProduct: row.retiredProduct === null ? null : Boolean(row.retiredProduct),
    theme: row.theme,
    year: row.year,
    externalSource: row.externalSource,
    externalId: row.externalId,
    lastEnrichedAt: row.lastEnrichedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
};

const BASE_COLUMNS = [
  'manufacturer',
  'setName',
  'setNumber',
  'legoReferenceNumber',
  'purchasePrice',
  'pieceCount',
  'status',
  'hasOriginalBox',
  'boxedWith',
  'hasPrintedPhoto',
  'notes',
  'imageUrl',
  'instructionsUrl',
  'retiredProduct',
  'theme',
  'year',
  'externalSource',
  'externalId',
  'lastEnrichedAt'
];

const insertSetStmt = db.prepare(
  `INSERT INTO sets (id, ${BASE_COLUMNS.join(', ')}, createdAt, updatedAt) VALUES (@id, ${BASE_COLUMNS.map((c) => `@${c}`).join(', ')}, @createdAt, @updatedAt)`
);

const selectAllStmt = db.prepare('SELECT * FROM sets ORDER BY createdAt DESC');
const selectByIdStmt = db.prepare('SELECT * FROM sets WHERE id = ?');
const deleteStmt = db.prepare('DELETE FROM sets WHERE id = ?');

const updateSetStmt = db.prepare(
  `UPDATE sets SET ${BASE_COLUMNS.map((c) => `${c} = @${c}`).join(', ')}, updatedAt = @updatedAt WHERE id = @id`
);

const preparePayload = (raw) => {
  const now = new Date().toISOString();
  const incomingStatus = raw.status?.trim();
  const status = STATUSES.has(incomingStatus) ? incomingStatus : 'New';
  const payload = {
    manufacturer: raw.manufacturer?.trim() ?? '',
    setName: raw.setName?.trim() ?? '',
    setNumber: raw.setNumber?.trim() || null,
    legoReferenceNumber: raw.legoReferenceNumber?.trim() || null,
    purchasePrice: toPriceCents(raw.purchasePrice),
    pieceCount:
      raw.pieceCount != null
        ? Number.isNaN(Number(raw.pieceCount))
          ? null
          : Number(raw.pieceCount)
        : null,
    status,
    hasOriginalBox: sanitizeBoolean(raw.hasOriginalBox ?? false),
    boxedWith: raw.boxedWith?.trim() || null,
    hasPrintedPhoto: sanitizeBoolean(raw.hasPrintedPhoto ?? false),
    notes: raw.notes?.trim() || null,
    imageUrl: raw.imageUrl?.trim() || null,
    instructionsUrl: raw.instructionsUrl?.trim() || null,
    retiredProduct: sanitizeNullableBoolean(raw.retiredProduct),
    theme: raw.theme?.trim() || null,
    year: raw.year != null ? Number(raw.year) : null,
    externalSource: raw.externalSource || 'manual',
    externalId: raw.externalId?.trim() || null,
    lastEnrichedAt: raw.lastEnrichedAt?.trim() || null,
    createdAt: raw.createdAt || now,
    updatedAt: now
  };

  return payload;
};

app.get('/api/sets', (req, res) => {
  const rows = selectAllStmt.all();
  res.json(rows.map(mapRow));
});

app.get('/api/sets/:id', (req, res) => {
  const row = selectByIdStmt.get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Set not found' });
  }
  res.json(mapRow(row));
});

app.post('/api/sets', (req, res) => {
  if (!req.body.manufacturer || !req.body.setName) {
    return res.status(400).json({ error: 'manufacturer and setName are required' });
  }
  const id = randomUUID();
  const payload = preparePayload({ ...req.body, createdAt: new Date().toISOString() });
  insertSetStmt.run({ id, ...payload, updatedAt: payload.updatedAt });
  const created = selectByIdStmt.get(id);
  res.status(201).json(mapRow(created));
});

app.put('/api/sets/:id', (req, res) => {
  const current = selectByIdStmt.get(req.params.id);
  if (!current) {
    return res.status(404).json({ error: 'Set not found' });
  }
  const payload = preparePayload({ ...current, ...req.body, createdAt: current.createdAt });
  updateSetStmt.run({ id: req.params.id, ...payload });
  const updated = selectByIdStmt.get(req.params.id);
  res.json(mapRow(updated));
});

app.delete('/api/sets/:id', (req, res) => {
  const { changes } = deleteStmt.run(req.params.id);
  if (changes === 0) {
    return res.status(404).json({ error: 'Set not found' });
  }
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Brick Library backend listening on port ${PORT} using ${DB_PATH}`);
});
