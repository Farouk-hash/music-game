// game/src/lib/imageResize.js
//
// Client-side square-center-crop resize + JPEG re-encode.
// Extracted from ProfileModal.jsx so both avatar and cover upload can share it.
//
// Usage:
//   const file = await resizeImageToSquare(inputFile, 256, 0.85);
//   await uploadAvatar(file);
//
// The output is always a JPEG File object. Caller chooses size and quality.
// Quality default 0.85 is fine for avatars; covers can drop to 0.8 for
// slightly smaller payloads.

export async function resizeImageToSquare(file, size = 256, quality = 0.85) {
  const source = await loadImage(file);

  const minSide = Math.min(source.width, source.height);
  const sx = (source.width - minSide) / 2;
  const sy = (source.height - minSide) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, sx, sy, minSide, minSide, 0, 0, size, size);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode image'))),
      'image/jpeg',
      quality
    );
  });

  return new File([blob], 'image.jpg', { type: 'image/jpeg' });
}

async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {}
  }

  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}