import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';

/** What the photo is for — sets the target resolution. */
export type AiImagePurpose = 'menu' | 'dish' | 'document';

const LONG_EDGE: Record<AiImagePurpose, number> = {
  menu: 1600,
  dish: 1024,
  document: 1600,
};

/** Server limit is 1 MiB; stay under 1 MB to leave room for multipart overhead. */
export const AI_MAX_UPLOAD_BYTES = 1_000_000;
const QUALITY_STEPS = [0.8, 0.65, 0.5, 0.4];

export interface PreparedImage {
  uri: string;
  width: number;
  height: number;
  bytes: number;
  mimeType: 'image/jpeg';
}

export class ImageTooLargeError extends Error {
  constructor() {
    super('Image could not be compressed under the upload limit.');
    this.name = 'ImageTooLargeError';
  }
}

function fileSize(uri: string): number {
  try {
    return new File(uri).size ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Prepares a photo for AI upload: applies EXIF orientation, converts HEIC/PNG to
 * JPEG, scales the long edge down (never up) and recompresses until it is under
 * 1 MB. Re-encoding also drops GPS and other metadata.
 */
export async function prepareImageForAi(uri: string, purpose: AiImagePurpose): Promise<PreparedImage> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const longEdge = Math.max(original.width, original.height);
  const scale = Math.min(1, LONG_EDGE[purpose] / longEdge);

  const context = ImageManipulator.manipulate(original);
  if (scale < 1) {
    context.resize(
      original.width >= original.height
        ? { width: Math.round(original.width * scale) }
        : { height: Math.round(original.height * scale) },
    );
  }
  const rendered = await context.renderAsync();

  for (const compress of QUALITY_STEPS) {
    const saved = await rendered.saveAsync({ compress, format: SaveFormat.JPEG });
    const bytes = fileSize(saved.uri);
    if (bytes > 0 && bytes <= AI_MAX_UPLOAD_BYTES) {
      return { uri: saved.uri, width: saved.width, height: saved.height, bytes, mimeType: 'image/jpeg' };
    }
  }
  throw new ImageTooLargeError();
}
