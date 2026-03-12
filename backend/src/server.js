import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import express from 'express';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url))
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = process.env.DB_PATH || 'brick-library.db';
const PORT = Number(process.env.PORT || 8097);
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || '/data/uploads');

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (error) {
  console.error(`Failed to create upload directory ${UPLOAD_DIR}`, error);
  process.exit(1);
}

const db = new Database(DB_PATH);

const BASE_COLUMNS = [
  'manufacturer',
  'setName',
  'setNumber',
  'legoReferenceNumber',
  'brickSize',
  'purchasePrice',
  'pieceCount',
  'status',
  'hasOriginalBox',
  'boxedWith',
  'hasPrintedPhoto',
  'notes',
  'instructionsUrl',
  'retiredProduct',
  'theme',
  'year',
  'externalSource',
  'externalId',
  'lastEnrichedAt'
];

const CREATE_SETS_TABLE_SQL = `
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
    externalSource TEXT,
    externalId TEXT,
    lastEnrichedAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`;

const CREATE_SET_IMAGES_TABLE_SQL = `
  CREATE TABLE set_images (
    id TEXT PRIMARY KEY,
    setId INTEGER NOT NULL,
    fileName TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('upload', 'scrape')),
    originalUrl TEXT,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (setId) REFERENCES sets(id)
  )
`;

const INSERT_SET_SQL = `INSERT INTO sets (${BASE_COLUMNS.join(', ')}, createdAt, updatedAt) VALUES (${BASE_COLUMNS.map(
  (column) => `@${column}`
).join(', ')}, @createdAt, @updatedAt)`;

const INSERT_SET_IMAGE_SQL =
  'INSERT INTO set_images (id, setId, fileName, source, originalUrl, sortOrder, createdAt) VALUES (@id, @setId, @fileName, @source, @originalUrl, @sortOrder, @createdAt)';

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

const STATUSES = new Set(['New', 'Building', 'Built', 'Disassembled', 'Sold']);
const BRICK_SIZES = new Set(['Diamond', 'Mini', 'Standard']);
const getImagePath = (setId, fileName) => path.join(UPLOAD_DIR, String(setId), fileName);
const getImageUrl = (setId, fileName) => path.posix.join('/uploads', String(setId), fileName);
const CACHE_CONTROL_HEADER = 'public, max-age=31536000, immutable';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const setDir = path.join(UPLOAD_DIR, req.params.setId);
    fs.mkdir(setDir, { recursive: true }, (err) => cb(err, setDir));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  }
});
const upload = multer({ storage });
app.use('/uploads', express.static(UPLOAD_DIR, {
  setHeaders: (res) => {
    res.set('Cache-Control', CACHE_CONTROL_HEADER);
  }
}));

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

const preparePayload = (raw, { keepUpdatedAt = false } = {}) => {
  const now = new Date().toISOString();
  const incomingStatus = raw.status?.trim();
  const status = STATUSES.has(incomingStatus) ? incomingStatus : 'New';
  return {
    manufacturer: raw.manufacturer?.trim() ?? '',
    setName: raw.setName?.trim() ?? '',
    setNumber: raw.setNumber?.trim() || null,
    legoReferenceNumber: raw.legoReferenceNumber?.trim() || null,
    brickSize: BRICK_SIZES.has(raw.brickSize) ? raw.brickSize : 'Standard',
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
    instructionsUrl: raw.instructionsUrl?.trim() || null,
    retiredProduct: sanitizeNullableBoolean(raw.retiredProduct),
    theme: raw.theme?.trim() || null,
    year: raw.year != null ? Number(raw.year) : null,
    externalSource: raw.externalSource || 'manual',
    externalId: raw.externalId?.trim() || null,
    lastEnrichedAt: raw.lastEnrichedAt?.trim() || null,
    createdAt: raw.createdAt || now,
    updatedAt: keepUpdatedAt ? raw.updatedAt || now : now
  };
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
    brickSize: row.brickSize ?? 'Standard',
    purchasePrice,
    pieceCount,
    pricePerPiece,
    status: row.status,
    hasOriginalBox: Boolean(row.hasOriginalBox),
    boxedWith: row.boxedWith,
    hasPrintedPhoto: Boolean(row.hasPrintedPhoto),
    notes: row.notes,
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

const serializeImageRow = (row) => ({
  ...row,
  url: getImageUrl(row.setId, row.fileName)
});

const findImageForSet = (setId, imageId) => {
  const numericSetId = Number(setId);
  const image = selectImageByIdStmt.get(imageId);
  return image && image.setId === numericSetId ? image : null;
};

const migrateLegacySchema = (existingSets, existingImages, hadSetImagesTable) => {
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN TRANSACTION');
  try {
    if (hadSetImagesTable) {
      db.exec('ALTER TABLE set_images RENAME TO set_images_old');
    }
    db.exec('ALTER TABLE sets RENAME TO sets_old');
    db.exec(CREATE_SETS_TABLE_SQL);
    db.exec(CREATE_SET_IMAGES_TABLE_SQL);
    const insertSetMigrationStmt = db.prepare(INSERT_SET_SQL);
    const insertImageMigrationStmt = db.prepare(INSERT_SET_IMAGE_SQL);
    const idMap = new Map();
    for (const row of existingSets) {
      const payload = preparePayload(row, { keepUpdatedAt: true });
      const { lastInsertRowid } = insertSetMigrationStmt.run(payload);
      idMap.set(row.id, lastInsertRowid);
    }
    if (hadSetImagesTable) {
      for (const image of existingImages) {
        const newSetId = idMap.get(image.setId);
        if (newSetId == null) {
          continue;
        }
        insertImageMigrationStmt.run({
          id: image.id,
          setId: newSetId,
          fileName: image.fileName,
          source: image.source,
          originalUrl: image.originalUrl,
          sortOrder: image.sortOrder ?? 0,
          createdAt: image.createdAt
        });
      }
      db.exec('DROP TABLE set_images_old');
    }
    db.exec('DROP TABLE sets_old');
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
};

const rebuildSetImagesTable = (existingImages) => {
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN TRANSACTION');
  try {
    db.exec('ALTER TABLE set_images RENAME TO set_images_old');
    db.exec(CREATE_SET_IMAGES_TABLE_SQL);
    const insertStmt = db.prepare(INSERT_SET_IMAGE_SQL);
    for (const image of existingImages) {
      insertStmt.run({
        id: image.id,
        setId: Number(image.setId),
        fileName: image.fileName,
        source: image.source,
        originalUrl: image.originalUrl,
        sortOrder: image.sortOrder ?? 0,
        createdAt: image.createdAt
      });
    }
    db.exec('DROP TABLE set_images_old');
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
};

const ensureSchema = () => {
  const setsTableInfo = db.prepare("PRAGMA table_info('sets')").all();
  const setImagesTableInfo = db.prepare("PRAGMA table_info('set_images')").all();
  const hasLegacyIdColumn = setsTableInfo.some(
    (column) => column.name === 'id' && column.type.toUpperCase() !== 'INTEGER'
  );
  const hasImageUrlColumn = setsTableInfo.some((column) => column.name === 'imageUrl');
  const needsSetsMigration =
    setsTableInfo.length > 0 && (hasLegacyIdColumn || hasImageUrlColumn);

  if (needsSetsMigration) {
    const existingSets = db.prepare('SELECT * FROM sets').all();
    const existingImages =
      setImagesTableInfo.length > 0 ? db.prepare('SELECT * FROM set_images').all() : [];
    migrateLegacySchema(existingSets, existingImages, setImagesTableInfo.length > 0);
  } else if (setsTableInfo.length === 0) {
    db.exec(CREATE_SETS_TABLE_SQL);
  }

  if (!needsSetsMigration) {
    const currentSetImagesInfo = db.prepare("PRAGMA table_info('set_images')").all();
    if (currentSetImagesInfo.length === 0) {
      db.exec(CREATE_SET_IMAGES_TABLE_SQL);
    } else if (
      currentSetImagesInfo.some(
        (column) => column.name === 'setId' && column.type.toUpperCase() !== 'INTEGER'
      )
    ) {
      const existingImages = db.prepare('SELECT * FROM set_images').all();
      rebuildSetImagesTable(existingImages);
    } else if (!currentSetImagesInfo.some((column) => column.name === 'sortOrder')) {
      db.exec('ALTER TABLE set_images ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0');
    }
  }
};

ensureSchema();

const insertImageStmt = db.prepare(INSERT_SET_IMAGE_SQL);
const selectImagesBySetIdStmt = db.prepare(
  'SELECT * FROM set_images WHERE setId = ? ORDER BY sortOrder ASC, createdAt ASC'
);
const selectMaxSortOrderStmt = db.prepare(
  'SELECT COALESCE(MAX(sortOrder), -1) AS maxOrder FROM set_images WHERE setId = ?'
);
const updateImageSortOrderStmt = db.prepare(
  'UPDATE set_images SET sortOrder = @sortOrder WHERE id = @id'
);
const selectImageByIdStmt = db.prepare('SELECT * FROM set_images WHERE id = ?');
const deleteImageStmt = db.prepare('DELETE FROM set_images WHERE id = ?');
const insertSetStmt = db.prepare(INSERT_SET_SQL);
const selectAllStmt = db.prepare('SELECT * FROM sets ORDER BY createdAt DESC');
const selectByIdStmt = db.prepare('SELECT * FROM sets WHERE id = ?');
const deleteStmt = db.prepare('DELETE FROM sets WHERE id = ?');
const updateSetStmt = db.prepare(
  `UPDATE sets SET ${BASE_COLUMNS.map((column) => `${column} = @${column}`).join(', ')}, updatedAt = @updatedAt WHERE id = @id`
);

const ensureSetExists = (req, res, next) => {
  const existing = selectByIdStmt.get(req.params.setId);
  if (!existing) {
    return res.status(404).json({ error: 'Set not found' });
  }
  next();
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
  const payload = preparePayload({ ...req.body, createdAt: new Date().toISOString() });
  const { lastInsertRowid } = insertSetStmt.run(payload);
  const created = selectByIdStmt.get(lastInsertRowid);
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

app.post(
  '/api/sets/:setId/images',
  ensureSetExists,
  upload.array('images', 20),
  (req, res) => {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'at least one image file is required' });
    }
    const setId = Number(req.params.setId);
    const { maxOrder } = selectMaxSortOrderStmt.get(setId);
    const now = new Date().toISOString();
    const created = files.map((file, index) => {
      const id = randomUUID();
      const sortOrder = maxOrder + 1 + index;
      insertImageStmt.run({
        id,
        setId,
        fileName: file.filename,
        source: 'upload',
        originalUrl: null,
        sortOrder,
        createdAt: now
      });
      return serializeImageRow({
        id,
        setId,
        fileName: file.filename,
        source: 'upload',
        originalUrl: null,
        sortOrder,
        createdAt: now
      });
    });
    res.status(201).json(created);
  }
);

app.get('/api/sets/:setId/images', (req, res) => {
  const { setId } = req.params;
  const existing = selectByIdStmt.get(setId);
  if (!existing) {
    return res.status(404).json({ error: 'Set not found' });
  }
  const rows = selectImagesBySetIdStmt.all(setId);
  res.json(rows.map(serializeImageRow));
});

app.get('/api/sets/:setId/images/:imageId/file', ensureSetExists, (req, res) => {
  const { setId, imageId } = req.params;
  const image = findImageForSet(setId, imageId);

  if (!image) {
    return res.status(404).json({ error: 'Image not found' });
  }
  const filePath = getImagePath(setId, image.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image file not found' });
  }
  res.set('Cache-Control', CACHE_CONTROL_HEADER);
  res.sendFile(filePath);
});

app.delete('/api/sets/:setId/images/:imageId', ensureSetExists, (req, res) => {
  const { setId, imageId } = req.params;
  const image = findImageForSet(setId, imageId);
  if (!image) {
    return res.status(404).json({ error: 'Image not found' });
  }
  const filePath = getImagePath(setId, image.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image file not found' });
  }
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to remove image file' });
  }
  deleteImageStmt.run(imageId);
  res.status(204).send();
});

app.put('/api/sets/:setId/images/order', ensureSetExists, (req, res) => {
  const imageIds = req.body.imageIds;
  if (!Array.isArray(imageIds)) {
    return res.status(400).json({ error: 'imageIds array is required' });
  }
  const setId = Number(req.params.setId);
  const existingImages = selectImagesBySetIdStmt.all(setId);
  const existingIds = new Set(existingImages.map((img) => img.id));
  const allValid = imageIds.every((id) => existingIds.has(id));
  if (!allValid || imageIds.length !== existingIds.size) {
    return res.status(400).json({ error: 'imageIds must contain exactly all image IDs for this set' });
  }
  const updateMany = db.transaction((ids) => {
    for (let i = 0; i < ids.length; i++) {
      updateImageSortOrderStmt.run({ id: ids[i], sortOrder: i });
    }
  });
  updateMany(imageIds);
  const rows = selectImagesBySetIdStmt.all(setId);
  res.json(rows.map(serializeImageRow));
});

const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, '../../public');
const hasStatic = fs.existsSync(path.join(STATIC_DIR, 'index.html'));

if (hasStatic) {
  app.use(express.static(STATIC_DIR));

  // SPA fallback (nur wenn es keine /api route ist)
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
  });
} else {
  console.warn(`No static frontend found. Expected index.html in: ${STATIC_DIR}`);
}

app.listen(PORT, () => {
  console.log(`Brick Library backend listening on port ${PORT} using ${DB_PATH}`);
});
