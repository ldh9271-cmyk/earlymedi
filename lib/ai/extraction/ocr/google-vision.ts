import 'server-only';
import { ImageAnnotatorClient } from '@google-cloud/vision';

/**
 * Cloud Vision OCR. Falls back to a stubbed empty result when credentials
 * aren't configured (e.g. local dev without GCP) so the engine still runs.
 */
let _client: ImageAnnotatorClient | null = null;
function client(): ImageAnnotatorClient | null {
  if (_client) return _client;
  try {
    _client = new ImageAnnotatorClient();
    return _client;
  } catch {
    return null;
  }
}

export type OcrResult = {
  text: string;
  blocks: Array<{ text: string; bbox?: { x: number; y: number; w: number; h: number } }>;
  language?: string;
  available: boolean;
};

export async function ocrImage(buffer: Buffer): Promise<OcrResult> {
  const c = client();
  if (!c) return { text: '', blocks: [], available: false };
  const [resp] = await c.documentTextDetection({ image: { content: buffer.toString('base64') } });
  const full = resp.fullTextAnnotation;
  return {
    text: full?.text ?? '',
    blocks: (full?.pages?.flatMap((p) => p.blocks ?? []) ?? []).map((b) => ({
      text: (b.paragraphs ?? [])
        .flatMap((para) => (para.words ?? []).map((w) => (w.symbols ?? []).map((s) => s.text ?? '').join('')))
        .join(' '),
      bbox: b.boundingBox
        ? {
            x: b.boundingBox.vertices?.[0]?.x ?? 0,
            y: b.boundingBox.vertices?.[0]?.y ?? 0,
            w: (b.boundingBox.vertices?.[2]?.x ?? 0) - (b.boundingBox.vertices?.[0]?.x ?? 0),
            h: (b.boundingBox.vertices?.[2]?.y ?? 0) - (b.boundingBox.vertices?.[0]?.y ?? 0),
          }
        : undefined,
    })),
    language: full?.pages?.[0]?.property?.detectedLanguages?.[0]?.languageCode ?? undefined,
    available: true,
  };
}
