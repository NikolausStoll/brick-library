import { jsonRequest } from '../helpers/server.mjs';

export const KIDS_API = '/api/kids';

export const createKidsSet = async (baseUrl, body) =>
  jsonRequest(baseUrl, `${KIDS_API}/sets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

export const kidsUploadImages = async (baseUrl, setId, buffers) => {
  const formData = new FormData();
  buffers.forEach((buffer, index) => {
    formData.append('images', new Blob([buffer], { type: 'image/png' }), `kids-${index}.png`);
  });
  const response = await fetch(`${baseUrl}${KIDS_API}/sets/${setId}/images`, {
    method: 'POST',
    body: formData
  });
  return { response, data: await response.json() };
};
