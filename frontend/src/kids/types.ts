export type KidsSet = {
  id: string;
  manufacturer: string;
  setName: string;
  setNumber: string | null;
  pieceCount: number | null;
  brickSize: string;
  instructionsUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KidsSetImage = {
  id: string;
  setId: string;
  fileName: string;
  source: string;
  originalUrl: string | null;
  sortOrder: number;
  createdAt: string;
  url: string;
  thumbUrl: string;
  imageWidth: number | null;
  imageHeight: number | null;
  fileSize: number | null;
  fileSizeThumb: number | null;
};

export type KidsFormPayload = {
  manufacturer: string;
  setName: string;
  setNumber: string;
  pieceCount: string;
  brickSize: string;
  instructionsUrl: string;
};
