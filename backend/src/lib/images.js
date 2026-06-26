import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const IMAGE_QUALITY = Number(process.env.IMAGE_QUALITY || 80);
const IMAGE_MAX_DIMENSION = Number(process.env.IMAGE_MAX_DIMENSION || 2400);
const IMAGE_QUALITY_THUMB = Number(process.env.IMAGE_QUALITY_THUMB || 80);
const IMAGE_MAX_DIMENSION_THUMB = Number(process.env.IMAGE_MAX_DIMENSION_THUMB || 600);

export const CACHE_CONTROL_HEADER = 'public, max-age=31536000, immutable';

export const getThumbFileName = (fileName) => fileName.replace(/(\.[^.]+)$/, '-thumb$1');

export const createImagePathHelpers = (uploadRoot, urlPrefix) => {
  const getSetDir = (setId) => path.join(uploadRoot, String(setId));
  const getImagePath = (setId, fileName) => path.join(getSetDir(setId), fileName);
  const getThumbPath = (setId, fileName) => path.join(getSetDir(setId), getThumbFileName(fileName));
  const getImageUrl = (setId, fileName) => path.posix.join(urlPrefix, String(setId), fileName);
  const getThumbUrl = (setId, fileName) => path.posix.join(urlPrefix, String(setId), getThumbFileName(fileName));

  return { getSetDir, getImagePath, getThumbPath, getImageUrl, getThumbUrl };
};

export const optimizeImage = async (inputBuffer) => {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  if (metadata.format === 'svg') {
    return {
      buffer: inputBuffer,
      ext: '.svg',
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      fileSize: inputBuffer.length
    };
  }

  if (metadata.format === 'gif') {
    const { data, info } = await image.gif().toBuffer({ resolveWithObject: true });
    return {
      buffer: data,
      ext: '.gif',
      width: info.width ?? null,
      height: info.height ?? null,
      fileSize: info.size ?? data.length
    };
  }

  const pipeline = image
    .resize({
      width: IMAGE_MAX_DIMENSION,
      height: IMAGE_MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: IMAGE_QUALITY });
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return {
    buffer: data,
    ext: '.webp',
    width: info.width ?? null,
    height: info.height ?? null,
    fileSize: info.size ?? data.length
  };
};

const createThumbBuffer = async (imageBuffer) => {
  try {
    const meta = await sharp(imageBuffer).metadata();
    if (meta.format === 'svg' || meta.format === 'gif') {
      return null;
    }
    return sharp(imageBuffer)
      .resize({
        width: IMAGE_MAX_DIMENSION_THUMB,
        height: IMAGE_MAX_DIMENSION_THUMB,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: IMAGE_QUALITY_THUMB })
      .toBuffer();
  } catch {
    return null;
  }
};

export const writeThumbFromBuffer = async (getThumbPath, setId, fileName, imageBuffer) => {
  const thumbBuffer = await createThumbBuffer(imageBuffer);
  if (!thumbBuffer) return null;
  const thumbPath = getThumbPath(setId, fileName);
  fs.writeFileSync(thumbPath, thumbBuffer);
  return thumbBuffer.length;
};

export const unlinkImageAndThumb = (getImagePath, getThumbPath, setId, fileName) => {
  const mainPath = getImagePath(setId, fileName);
  try {
    fs.unlinkSync(mainPath);
  } catch {
    /* may be gone */
  }
  const thumbPath = getThumbPath(setId, fileName);
  try {
    fs.unlinkSync(thumbPath);
  } catch {
    /* may be gone */
  }
};
