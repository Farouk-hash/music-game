// admin/src/lib/imageResize.js
//
// Center-crops + resizes an image to a square of `size`×`size`.
// Returns a JPEG File under ~100 KB in most cases.
//
//   const resized = await resizeImageToSquare(file, 512, 0.85);
//   await templatesApi.uploadCover(id, resized);

export async function resizeImageToSquare(file, size = 512, quality = 0.85) {
  const bitmap = await createImageBitmap(file);
  const minSide = Math.min(bitmap.width, bitmap.height);
  const sx = Math.floor((bitmap.width - minSide) / 2);
  const sy = Math.floor((bitmap.height - minSide) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, minSide, minSide, 0, 0, size, size);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  );
  if (!blob) throw new Error('Image resize failed');

  // Return a File so FormData naming is preserved
  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}