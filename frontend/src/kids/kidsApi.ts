import type { KidsSet, KidsSetImage } from './types';

const API = '/api/kids';

const json = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return null;
};

export const fetchKidsSets = async (): Promise<KidsSet[]> => {
  const response = await fetch(`${API}/sets`);
  if (!response.ok) throw new Error('Unable to load kids sets');
  return response.json();
};

export const createKidsSet = async (body: Record<string, unknown>): Promise<KidsSet> => {
  const response = await fetch(`${API}/sets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await json(response);
  if (!response.ok) throw new Error(data?.error ?? 'Unable to save kids set');
  return data;
};

export const updateKidsSet = async (id: string, body: Record<string, unknown>): Promise<KidsSet> => {
  const response = await fetch(`${API}/sets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await json(response);
  if (!response.ok) throw new Error(data?.error ?? 'Unable to update kids set');
  return data;
};

export const deleteKidsSet = async (id: string): Promise<void> => {
  const response = await fetch(`${API}/sets/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Unable to delete kids set');
};

export const fetchKidsSetImages = async (setId: string): Promise<KidsSetImage[]> => {
  const response = await fetch(`${API}/sets/${setId}/images`);
  if (!response.ok) throw new Error('Unable to load images');
  return response.json();
};

export const uploadKidsImages = async (setId: string, files: File[]): Promise<KidsSetImage[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  const response = await fetch(`${API}/sets/${setId}/images`, { method: 'POST', body: formData });
  const data = await json(response);
  if (!response.ok) throw new Error(data?.error ?? 'Upload failed');
  return data;
};

export const addKidsImageFromUrl = async (setId: string, imageUrl: string): Promise<KidsSetImage> => {
  const response = await fetch(`${API}/sets/${setId}/images/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl })
  });
  const data = await json(response);
  if (!response.ok) throw new Error(data?.error ?? 'URL upload failed');
  return data;
};

export const scrapeKidsImages = async (
  setId: string,
  payload: { rawHtml: string; baseUrl?: string }
): Promise<{ found: number; downloaded: number; skipped: number }> => {
  const response = await fetch(`${API}/sets/${setId}/images/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await json(response);
  if (!response.ok) throw new Error(data?.error ?? 'Scrape failed');
  return data;
};

export const reorderKidsImages = async (setId: string, imageIds: string[]): Promise<KidsSetImage[]> => {
  const response = await fetch(`${API}/sets/${setId}/images/order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageIds })
  });
  const data = await json(response);
  if (!response.ok) throw new Error(data?.error ?? 'Reorder failed');
  return data;
};

export const deleteKidsImage = async (setId: string, imageId: string): Promise<void> => {
  const response = await fetch(`${API}/sets/${setId}/images/${imageId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Delete failed');
};

export const deleteAllKidsImages = async (setId: string): Promise<void> => {
  const response = await fetch(`${API}/sets/${setId}/images`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Delete all failed');
};
