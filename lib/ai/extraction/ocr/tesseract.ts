import 'server-only';

/**
 * Tesseract.js OCR — pure JS fallback when Google Cloud Vision isn't
 * available. Slow (3–8s per image) but works without GCP credentials.
 * We dynamic-import to keep the cold start light.
 */
export async function ocrImageTesseract(buffer: Buffer): Promise<{ text: string }> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(['eng', 'kor', 'jpn', 'chi_sim', 'chi_tra']);
  const { data } = await worker.recognize(buffer);
  await worker.terminate();
  return { text: data.text };
}
