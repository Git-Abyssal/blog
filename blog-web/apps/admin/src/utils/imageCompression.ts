const COMPRESSION_THRESHOLD_BYTES = 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2560;
const WEBP_QUALITY = 0.88;
const COMPRESSIBLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const toWebpFilename = (filename: string) => {
  const extensionIndex = filename.lastIndexOf('.');
  const baseName = extensionIndex > 0 ? filename.substring(0, extensionIndex) : filename;
  return `${baseName || 'image'}.webp`;
};

const canvasToWebp = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY);
  });

export const compressImageForUpload = async (file: File): Promise<File> => {
  if (
    file.size <= COMPRESSION_THRESHOLD_BYTES
    || !COMPRESSIBLE_IMAGE_TYPES.has(file.type)
    || typeof createImageBitmap !== 'function'
  ) {
    return file;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const longestSide = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / longestSide);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, width, height);
    const compressedBlob = await canvasToWebp(canvas);
    if (
      !compressedBlob
      || compressedBlob.type !== 'image/webp'
      || compressedBlob.size >= file.size
    ) {
      return file;
    }

    return new File([compressedBlob], toWebpFilename(file.name), {
      type: 'image/webp',
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
};
