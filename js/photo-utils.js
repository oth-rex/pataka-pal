/**
 * photo-utils.js
 * Tiny, DOM-agnostic helpers for working with images.
 * No selectors, no IDs. Pure functions only.
 */

export async function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function dataURLToImage(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}

/**
 * Resize an image to fit within maxW x maxH (keeping aspect ratio).
 * quality is 0..1 (only used for JPEG/WebP).
 * Returns a Blob.
 */
export async function resizeDataURL(dataURL, { maxW = 1600, maxH = 1600, quality = 0.85, type = "image/jpeg" } = {}) {
  const img = await dataURLToImage(dataURL);
  let { width, height } = img;

  const scale = Math.min(maxW / width, maxH / height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Pick the first file from an <input type="file"> element, applying basic filters.
 * Accepts: { maxBytes, acceptTypes: ['image/jpeg','image/png',... ] }
 * Returns { file, error }.
 */
export function pickFirstFile(inputEl, { maxBytes = 8_000_000, acceptTypes = null } = {}) {
  const files = inputEl?.files;
  if (!files || !files.length) return { file: null, error: "No file selected." };
  const file = files[0];
  if (acceptTypes && !acceptTypes.includes(file.type)) {
    return { file: null, error: `Unsupported file type: ${file.type}` };
  }
  if (file.size > maxBytes) {
    return { file: null, error: `File is too large (${Math.round(file.size/1024/1024)}MB).` };
  }
  return { file, error: null };
}
