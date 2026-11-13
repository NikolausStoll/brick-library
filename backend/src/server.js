import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import express from 'express';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import {
  CACHE_CONTROL_HEADER,
  createImagePathHelpers,
  optimizeImage,
  unlinkImageAndThumb,
  writeThumbFromBuffer
} from './lib/images.js';
import { collectImageSources } from './lib/scrapeFromHtml.js';
import { ensureKidsSchema } from './kids/kidsSchema.js';
import { createKidsRouter } from './kids/kidsRoutes.js';

dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url))
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = process.env.DB_PATH || 'brick-library.db';
const PORT = Number(process.env.PORT || 8098);
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || '/data/uploads');

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (error) {
  console.error(`Failed to create upload directory ${UPLOAD_DIR}`, error);
  process.exit(1);
}

const { getSetDir, getImagePath, getThumbPath, getImageUrl, getThumbUrl } = createImagePathHelpers(
  UPLOAD_DIR,
  '/uploads'
);

const db = new Database(DB_PATH);

const CREATE_SETS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS sets (
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
    listType TEXT NOT NULL DEFAULT 'collection',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`;

const CREATE_SET_IMAGES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS set_images (
    id TEXT PRIMARY KEY,
    setId INTEGER NOT NULL,
    fileName TEXT NOT NULL,
    source TEXT NOT NULL,
    originalUrl TEXT,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    imageWidth INTEGER,
    imageHeight INTEGER,
    fileSize INTEGER,
    fileSizeThumb INTEGER,
    FOREIGN KEY (setId) REFERENCES sets(id)
  )
`;

const ensureSchema = () => {
  db.exec(CREATE_SETS_TABLE_SQL);
  db.exec(CREATE_SET_IMAGES_TABLE_SQL);
  const setsTableInfo = db.prepare("PRAGMA table_info('sets')").all();
  const hasListType = setsTableInfo.some((col) => col.name === 'listType');
  if (!hasListType) {
    db.exec("ALTER TABLE sets ADD COLUMN listType TEXT NOT NULL DEFAULT 'collection'");
  }
  const imagesTableInfo = db.prepare("PRAGMA table_info('set_images')").all();
  const hasFileSizeThumb = imagesTableInfo.some((col) => col.name === 'fileSizeThumb');
  if (!hasFileSizeThumb) {
    db.exec('ALTER TABLE set_images ADD COLUMN fileSizeThumb INTEGER');
  }
};

ensureSchema();
ensureKidsSchema(db);

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
  'listType'
];

const INSERT_SET_SQL = `INSERT INTO sets (${BASE_COLUMNS.join(', ')}, createdAt, updatedAt) VALUES (${BASE_COLUMNS.map(
  (column) => `@${column}`
).join(', ')}, @createdAt, @updatedAt)`;

const INSERT_SET_IMAGE_SQL =
  'INSERT INTO set_images (id, setId, fileName, source, originalUrl, sortOrder, createdAt, imageWidth, imageHeight, fileSize, fileSizeThumb) VALUES (@id, @setId, @fileName, @source, @originalUrl, @sortOrder, @createdAt, @imageWidth, @imageHeight, @fileSize, @fileSizeThumb)';

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const setDir = getSetDir(req.params.setId);
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

const preparePayload = (raw) => {
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
    listType: raw.listType === 'wishlist' ? 'wishlist' : 'collection',
    createdAt: raw.createdAt || now,
    updatedAt: now
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
    listType: row.listType ?? 'collection',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
};

const serializeImageRow = (row) => ({
  ...row,
  url: getImageUrl(row.setId, row.fileName),
  thumbUrl: getThumbUrl(row.setId, row.fileName)
});

const findImageForSet = (setId, imageId) => {
  const numericSetId = Number(setId);
  const image = selectImageByIdStmt.get(imageId);
  return image && image.setId === numericSetId ? image : null;
};

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
const selectImageByOriginalUrlStmt = db.prepare(
  'SELECT id FROM set_images WHERE setId = ? AND originalUrl = ?'
);
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
  const apiFormat = mapRow(current);
  const payload = preparePayload({ ...apiFormat, ...req.body, createdAt: current.createdAt });
  updateSetStmt.run({ id: req.params.id, ...payload });
  const updated = selectByIdStmt.get(req.params.id);
  res.json(mapRow(updated));
});

app.delete('/api/sets/:id', (req, res) => {
  const setId = Number(req.params.id);
  const { changes } = deleteStmt.run(setId);
  if (changes === 0) {
    return res.status(404).json({ error: 'Set not found' });
  }
  const images = selectImagesBySetIdStmt.all(setId);
  for (const image of images) {
    unlinkImageAndThumb(getImagePath, getThumbPath, setId, image.fileName);
    deleteImageStmt.run(image.id);
  }
  try { fs.rmdirSync(getSetDir(setId)); } catch { /* dir may be gone or not empty */ }
  res.status(204).send();
});

app.put('/api/sets/:id/move', (req, res) => {
  const current = selectByIdStmt.get(req.params.id);
  if (!current) {
    return res.status(404).json({ error: 'Set not found' });
  }
  const { listType, purchasePrice } = req.body;
  if (!listType || !['collection', 'wishlist'].includes(listType)) {
    return res.status(400).json({ error: 'listType must be collection or wishlist' });
  }
  const apiFormat = mapRow(current);
  const updates = { ...apiFormat, listType, createdAt: current.createdAt };
  if (purchasePrice !== undefined) {
    updates.purchasePrice = purchasePrice;
  }
  const payload = preparePayload(updates);
  updateSetStmt.run({ id: req.params.id, ...payload });
  const updated = selectByIdStmt.get(req.params.id);
  res.json(mapRow(updated));
});

app.post(
  '/api/sets/:setId/images',
  ensureSetExists,
  upload.array('images', 20),
  async (req, res) => {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'at least one image file is required' });
    }
    const setId = Number(req.params.setId);
    const { maxOrder } = selectMaxSortOrderStmt.get(setId);
    const now = new Date().toISOString();
    const created = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const inputBuffer = fs.readFileSync(file.path);
        const { buffer, ext, width, height, fileSize } = await optimizeImage(inputBuffer);
        const id = randomUUID();
        const fileName = `${id}${ext}`;
        const optimizedPath = path.join(path.dirname(file.path), fileName);
        fs.writeFileSync(optimizedPath, buffer);
        const fileSizeThumb = await writeThumbFromBuffer(getThumbPath, setId, fileName, buffer);
        if (optimizedPath !== file.path) fs.unlinkSync(file.path);
        const sortOrder = maxOrder + 1 + i;
        const row = {
          id,
          setId,
          fileName,
          source: 'upload',
          originalUrl: null,
          sortOrder,
          createdAt: now,
          imageWidth: width,
          imageHeight: height,
          fileSize,
          fileSizeThumb
        };
        insertImageStmt.run(row);
        created.push(serializeImageRow(row));
      } catch (error) {
        console.error('Failed to optimize uploaded image', error);
      }
    }
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
  unlinkImageAndThumb(getImagePath, getThumbPath, setId, image.fileName);
  deleteImageStmt.run(imageId);
  res.status(204).send();
});

app.delete('/api/sets/:setId/images', ensureSetExists, (req, res) => {
  const setId = Number(req.params.setId);
  const images = selectImagesBySetIdStmt.all(setId);
  for (const image of images) {
    unlinkImageAndThumb(getImagePath, getThumbPath, setId, image.fileName);
    deleteImageStmt.run(image.id);
  }
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

app.post('/api/sets/:setId/images/url', ensureSetExists, async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const originalUrl = parsedUrl.href;
  const setId = Number(req.params.setId);

  const existing = selectImageByOriginalUrlStmt.get(setId, originalUrl);
  if (existing) {
    return res.status(409).json({ error: 'Image with this URL already exists for this set' });
  }

  let rawBuffer;
  try {
    const imgResponse = await fetch(parsedUrl.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/*,*/*;q=0.8'
      }
    });
    if (!imgResponse.ok) {
      return res.status(502).json({ error: `Failed to fetch image: HTTP ${imgResponse.status}` });
    }
    rawBuffer = Buffer.from(await imgResponse.arrayBuffer());
  } catch (error) {
    return res.status(502).json({ error: `Failed to fetch image: ${error.message}` });
  }

  let optimized;
  try {
    optimized = await optimizeImage(rawBuffer);
  } catch (error) {
    return res.status(422).json({ error: `Failed to process image: ${error.message}` });
  }

  fs.mkdirSync(getSetDir(setId), { recursive: true });

  const { maxOrder } = selectMaxSortOrderStmt.get(setId);
  const now = new Date().toISOString();
  const id = randomUUID();
  const fileName = `${id}${optimized.ext}`;
  fs.writeFileSync(getImagePath(setId, fileName), optimized.buffer);
  const fileSizeThumb = await writeThumbFromBuffer(getThumbPath, setId, fileName, optimized.buffer);

  const sortOrder = maxOrder + 1;
  const row = {
    id,
    setId,
    fileName,
    source: 'scrape',
    originalUrl,
    sortOrder,
    createdAt: now,
    imageWidth: optimized.width,
    imageHeight: optimized.height,
    fileSize: optimized.fileSize,
    fileSizeThumb
  };
  insertImageStmt.run(row);

  const image = serializeImageRow(row);
  res.status(201).json(image);
});

app.post('/api/sets/:setId/images/scrape', ensureSetExists, async (req, res) => {
  const { pageUrl, containerSelector, rawHtml, baseUrl } = req.body;
  const scrapeResult = await collectImageSources({ pageUrl, containerSelector, rawHtml, baseUrl });

  if (scrapeResult.error) {
    return res.status(scrapeResult.status).json({ error: scrapeResult.error });
  }
  if (scrapeResult.empty) {
    return res.json({ found: 0, downloaded: 0, skipped: 0, images: [] });
  }

  const setId = Number(req.params.setId);
  fs.mkdirSync(getSetDir(setId), { recursive: true });

  const { maxOrder } = selectMaxSortOrderStmt.get(setId);
  let nextOrder = maxOrder + 1;
  const now = new Date().toISOString();
  const created = [];
  let skipped = 0;

  for (const imageUrl of scrapeResult.resolvedUrls) {
    const existing = selectImageByOriginalUrlStmt.get(setId, imageUrl);
    if (existing) {
      skipped++;
      continue;
    }

    let rawBuffer;
    try {
      const imgResponse = await fetch(imageUrl, {
        headers: { 'User-Agent': 'BrickLibrary/1.0' }
      });
      if (!imgResponse.ok) {
        skipped++;
        continue;
      }
      rawBuffer = Buffer.from(await imgResponse.arrayBuffer());
    } catch {
      skipped++;
      continue;
    }

    let optimized;
    try {
      optimized = await optimizeImage(rawBuffer);
    } catch {
      skipped++;
      continue;
    }

    const id = randomUUID();
    const fileName = `${id}${optimized.ext}`;
    fs.writeFileSync(getImagePath(setId, fileName), optimized.buffer);
    const fileSizeThumb = await writeThumbFromBuffer(getThumbPath, setId, fileName, optimized.buffer);

    const sortOrder = nextOrder++;
    const row = {
      id,
      setId,
      fileName,
      source: 'scrape',
      originalUrl: imageUrl,
      sortOrder,
      createdAt: now,
      imageWidth: optimized.width,
      imageHeight: optimized.height,
      fileSize: optimized.fileSize,
      fileSizeThumb
    };
    insertImageStmt.run(row);
    created.push(serializeImageRow(row));
  }

  res.status(201).json({
    found: scrapeResult.resolvedUrls.length,
    downloaded: created.length,
    skipped,
    images: created
  });
});

app.use('/api/kids', createKidsRouter({ db, uploadDir: UPLOAD_DIR }));

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
