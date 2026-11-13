const API = '/api/sets';

const json = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const fetchSets = async () => {
  const response = await fetch(API);
  if (!response.ok) throw new Error('Unable to load sets');
  return response.json();
};

export const createSet = async (body: Record<string, unknown>) => {
  const response = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await json(response);
  if (!response.ok) throw new Error(data?.error ?? 'Unable to save set');
  return data;
};

export const updateSet = async (id: string, body: Record<string, unknown>) => {
  const response = await fetch(`${API}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await json(response);
  if (!response.ok) throw new Error(data?.error ?? 'Unable to update set');
  return data;
};

export const deleteSet = async (id: string): Promise<void> => {
  const response = await fetch(`${API}/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Unable to delete set');
};

export const moveSet = async (id: string, body: Record<string, unknown>) => {
  const response = await fetch(`${API}/${id}/move`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await json(response);
  if (!response.ok) throw new Error(data?.error ?? 'Failed to move set');
  return data;
};

export const fetchSetImages = async (setId: string) => {
  const response = await fetch(`${API}/${setId}/images`);
  if (!response.ok) throw new Error('Unable to load images');
  return response.json();
};

export const uploadImages = async (setId: string, files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  const response = await fetch(`${API}/${setId}/images`, { method: 'POST', body: formData });
  const data = await json(response);
  if (!response.ok) throw new Error(data?.error ?? 'Upload failed');
  return data;
};

export const addImageFromUrl = async (setId: string, imageUrl: string) => {
  const response = await fetch(`${API}/${setId}/images/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl })
  });
  const data = await json(response);
  if (!response.ok) throw new Error(data?.error ?? 'URL upload failed');
  return data;
};

export const scrapeImages = async (
  setId: string,
  payload: { rawHtml: string; baseUrl?: string }
): Promise<{ found: number; downloaded: number; skipped: number }> => {
  const response = await fetch(`${API}/${setId}/images/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await json(response);
  if (!response.ok) throw new Error(data?.error ?? 'Scrape failed');
  return data;
};

export const reorderImages = async (setId: string, imageIds: string[]) => {
  const response = await fetch(`${API}/${setId}/images/order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageIds })
  });
  const data = await json(response);
  if (!response.ok) throw new Error(data?.error ?? 'Reorder failed');
  return data;
};

export const deleteImage = async (setId: string, imageId: string): Promise<void> => {
  const response = await fetch(`${API}/${setId}/images/${imageId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Delete failed');
};

export const deleteAllImages = async (setId: string): Promise<void> => {
  const response = await fetch(`${API}/${setId}/images`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Delete all failed');
};
