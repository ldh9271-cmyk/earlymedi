import 'server-only';
import sharp from 'sharp';

/**
 * Downscale + EXIF rotate + JPEG normalize a captured photo before sending
 * to OCR/Vision. Goals:
 *   - cost containment: 2048px max width
 *   - portrait orientation respected (EXIF)
 *   - re-encode to JPEG q80 (drops PNG bloat from screenshots)
 */
export async function preprocessImage(input: Buffer): Promise<{
  buffer: Buffer;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
}> {
  const pipeline = sharp(input, { failOn: 'truncated' }).rotate(); // EXIF
  const meta = await pipeline.metadata();
  const maxWidth = 2048;
  const resized =
    meta.width && meta.width > maxWidth ? pipeline.resize({ width: maxWidth }) : pipeline;
  const out = await resized.jpeg({ quality: 80, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  return {
    buffer: out.data,
    mimeType: 'image/jpeg',
    width: out.info.width,
    height: out.info.height,
  };
}
