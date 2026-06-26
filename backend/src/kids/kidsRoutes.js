import { Router } from 'express';
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
} from '../lib/images.js';
import { collectImageSources } from '../lib/scrapeFromHtml.js';
import { KIDS_UPLOAD_SEGMENT, KIDS_UPLOAD_URL_PREFIX } from './kidsSchema.js';

const BASE_COLUMNS = ['manufacturer', 'setName', 'setNumber', 'pieceCount', 'brickSize', 'instructionsUrl'];
const BRICK_SIZES = new Set(['Diamond', 'Mini', 'Standard']);

const prepareKidsPayload = (raw) => {
  const now = new Date().toISOString();
  return {
    manufacturer: raw.manufacturer?.trim() ?? '',
    setName: raw.setName?.trim() ?? '',
    setNumber: raw.setNumber?.trim() || null,
    pieceCount:
      raw.pieceCount != null
        ? Number.isNaN(Number(raw.pieceCount))
          ? null
          : Number(raw.pieceCount)
        : null,
    brickSize: BRICK_SIZES.has(raw.brickSize) ? raw.brickSize : 'Standard',
    instructionsUrl: raw.instructionsUrl?.trim() || null,
    createdAt: raw.createdAt || now,
    updatedAt: now
  };
};

const mapKidsRow = (row) => ({
  id: row.id,
  manufacturer: row.manufacturer,
  setName: row.setName,
  setNumber: row.setNumber,
  pieceCount: row.pieceCount != null ? Number(row.pieceCount) : null,
  brickSize: row.brickSize ?? 'Standard',
  instructionsUrl: row.instructionsUrl,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

export const createKidsRouter = ({ db, uploadDir }) => {
  const router = Router();
  const kidsUploadRoot = path.join(uploadDir, KIDS_UPLOAD_SEGMENT);
  const { getSetDir, getImagePath, getThumbPath, getImageUrl, getThumbUrl } = createImagePathHelpers(
    kidsUploadRoot,
    KIDS_UPLOAD_URL_PREFIX
  );

  const INSERT_SET_SQL = `INSERT INTO kids_sets (${BASE_COLUMNS.join(', ')}, createdAt, updatedAt) VALUES (${BASE_COLUMNS.map(
    (column) => `@${column}`
  ).join(', ')}, @createdAt, @updatedAt)`;
  const INSERT_IMAGE_SQL =
    'INSERT INTO kids_set_images (id, setId, fileName, source, originalUrl, sortOrder, createdAt, imageWidth, imageHeight, fileSize, fileSizeThumb) VALUES (@id, @setId, @fileName, @source, @originalUrl, @sortOrder, @createdAt, @imageWidth, @imageHeight, @fileSize, @fileSizeThumb)';

  const insertSetStmt = db.prepare(INSERT_SET_SQL);
  const selectAllStmt = db.prepare('SELECT * FROM kids_sets ORDER BY createdAt DESC');
  const selectByIdStmt = db.prepare('SELECT * FROM kids_sets WHERE id = ?');
  const deleteSetStmt = db.prepare('DELETE FROM kids_sets WHERE id = ?');
  const updateSetStmt = db.prepare(
    `UPDATE kids_sets SET ${BASE_COLUMNS.map((column) => `${column} = @${column}`).join(', ')}, updatedAt = @updatedAt WHERE id = @id`
  );
  const insertImageStmt = db.prepare(INSERT_IMAGE_SQL);
  const selectImagesBySetIdStmt = db.prepare(
    'SELECT * FROM kids_set_images WHERE setId = ? ORDER BY sortOrder ASC, createdAt ASC'
  );
  const selectMaxSortOrderStmt = db.prepare(
    'SELECT COALESCE(MAX(sortOrder), -1) AS maxOrder FROM kids_set_images WHERE setId = ?'
  );
  const updateImageSortOrderStmt = db.prepare(
    'UPDATE kids_set_images SET sortOrder = @sortOrder WHERE id = @id'
  );
  const selectImageByIdStmt = db.prepare('SELECT * FROM kids_set_images WHERE id = ?');
  const selectImageByOriginalUrlStmt = db.prepare(
    'SELECT id FROM kids_set_images WHERE setId = ? AND originalUrl = ?'
  );
  const deleteImageStmt = db.prepare('DELETE FROM kids_set_images WHERE id = ?');

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

  const ensureSetExists = (req, res, next) => {
    const existing = selectByIdStmt.get(req.params.setId);
    if (!existing) {
      return res.status(404).json({ error: 'Set not found' });
    }
    next();
  };

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

  router.get('/sets', (req, res) => {
    res.json(selectAllStmt.all().map(mapKidsRow));
  });

  router.get('/sets/:id', (req, res) => {
    const row = selectByIdStmt.get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Set not found' });
    }
    res.json(mapKidsRow(row));
  });

  router.post('/sets', (req, res) => {
    if (!req.body.manufacturer?.trim() || !req.body.setName?.trim()) {
      return res.status(400).json({ error: 'manufacturer and setName are required' });
    }
    const payload = prepareKidsPayload({ ...req.body, createdAt: new Date().toISOString() });
    const { lastInsertRowid } = insertSetStmt.run(payload);
    res.status(201).json(mapKidsRow(selectByIdStmt.get(lastInsertRowid)));
  });

  router.put('/sets/:id', (req, res) => {
    const current = selectByIdStmt.get(req.params.id);
    if (!current) {
      return res.status(404).json({ error: 'Set not found' });
    }
    const payload = prepareKidsPayload({
      ...mapKidsRow(current),
      ...req.body,
      createdAt: current.createdAt
    });
    updateSetStmt.run({ id: req.params.id, ...payload });
    res.json(mapKidsRow(selectByIdStmt.get(req.params.id)));
  });

  router.delete('/sets/:id', (req, res) => {
    const setId = Number(req.params.id);
    const existing = selectByIdStmt.get(setId);
    if (!existing) {
      return res.status(404).json({ error: 'Set not found' });
    }

    const images = selectImagesBySetIdStmt.all(setId);
    for (const image of images) {
      unlinkImageAndThumb(getImagePath, getThumbPath, setId, image.fileName);
      deleteImageStmt.run(image.id);
    }

    deleteSetStmt.run(setId);

    const setDir = getSetDir(setId);
    try {
      fs.rmdirSync(setDir);
    } catch {
      /* dir may be gone or not empty */
    }

    res.status(204).send();
  });

  router.post('/sets/:setId/images', ensureSetExists, upload.array('images', 20), async (req, res) => {
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

        const row = {
          id,
          setId,
          fileName,
          source: 'upload',
          originalUrl: null,
          sortOrder: maxOrder + 1 + i,
          createdAt: now,
          imageWidth: width,
          imageHeight: height,
          fileSize,
          fileSizeThumb
        };
        insertImageStmt.run(row);
        created.push(serializeImageRow(row));
      } catch (error) {
        console.error('Failed to optimize uploaded kids image', error);
      }
    }

    res.status(201).json(created);
  });

  router.get('/sets/:setId/images', (req, res) => {
    const existing = selectByIdStmt.get(req.params.setId);
    if (!existing) {
      return res.status(404).json({ error: 'Set not found' });
    }
    res.json(selectImagesBySetIdStmt.all(req.params.setId).map(serializeImageRow));
  });

  router.get('/sets/:setId/images/:imageId/file', ensureSetExists, (req, res) => {
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

  router.delete('/sets/:setId/images/:imageId', ensureSetExists, (req, res) => {
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

  router.delete('/sets/:setId/images', ensureSetExists, (req, res) => {
    const setId = Number(req.params.setId);
    const images = selectImagesBySetIdStmt.all(setId);
    for (const image of images) {
      unlinkImageAndThumb(getImagePath, getThumbPath, setId, image.fileName);
      deleteImageStmt.run(image.id);
    }
    res.status(204).send();
  });

  router.put('/sets/:setId/images/order', ensureSetExists, (req, res) => {
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
    res.json(selectImagesBySetIdStmt.all(setId).map(serializeImageRow));
  });

  router.post('/sets/:setId/images/url', ensureSetExists, async (req, res) => {
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
    if (selectImageByOriginalUrlStmt.get(setId, originalUrl)) {
      return res.status(409).json({ error: 'Image with this URL already exists for this set' });
    }

    let rawBuffer;
    try {
      const imgResponse = await fetch(parsedUrl.href, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'image/*,*/*;q=0.8'
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

    const row = {
      id,
      setId,
      fileName,
      source: 'scrape',
      originalUrl,
      sortOrder: maxOrder + 1,
      createdAt: now,
      imageWidth: optimized.width,
      imageHeight: optimized.height,
      fileSize: optimized.fileSize,
      fileSizeThumb
    };
    insertImageStmt.run(row);
    res.status(201).json(serializeImageRow(row));
  });

  router.post('/sets/:setId/images/scrape', ensureSetExists, async (req, res) => {
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
      if (selectImageByOriginalUrlStmt.get(setId, imageUrl)) {
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

      const row = {
        id,
        setId,
        fileName,
        source: 'scrape',
        originalUrl: imageUrl,
        sortOrder: nextOrder++,
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

  return router;
};
