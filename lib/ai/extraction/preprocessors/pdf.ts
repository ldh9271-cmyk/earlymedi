import 'server-only';
import pdfParse from 'pdf-parse';

/**
 * Cheap PDF text extraction. If the PDF has embedded text we use it directly
 * (no OCR needed → big cost win). For scanned PDFs the engine falls back to
 * OCR over the rendered first page (Phase 4 — not implemented in Phase 3).
 */
export async function extractPdfText(input: Buffer): Promise<{ text: string; pages: number; hasTextLayer: boolean }> {
  const parsed = await pdfParse(input);
  const trimmed = parsed.text?.trim() ?? '';
  return {
    text: trimmed,
    pages: parsed.numpages ?? 0,
    hasTextLayer: trimmed.length > 80,
  };
}
