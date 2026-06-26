const CREATE_KIDS_SETS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS kids_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manufacturer TEXT NOT NULL,
    setName TEXT NOT NULL,
    setNumber TEXT,
    pieceCount INTEGER,
    brickSize TEXT NOT NULL DEFAULT 'Standard',
    instructionsUrl TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`;

const CREATE_KIDS_SET_IMAGES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS kids_set_images (
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
    FOREIGN KEY (setId) REFERENCES kids_sets(id)
  )
`;

export const ensureKidsSchema = (db) => {
  db.exec(CREATE_KIDS_SETS_TABLE_SQL);
  db.exec(CREATE_KIDS_SET_IMAGES_TABLE_SQL);
};

export const KIDS_UPLOAD_SEGMENT = 'kids';
export const KIDS_UPLOAD_URL_PREFIX = '/uploads/kids';
