import 'server-only';
import type { ListingCategory } from '@/lib/listings/categories';

/**
 * 스타일 시뮬레이션 — 구글 Gemini 이미지 편집 모델에 "같은 사람, 같은 포즈,
 * 이것만 바꿔라"를 시킨다. 1차 범위는 뷰티(헤어·염색·메이크업·퍼스널컬러 톤)
 * 와 순한 피부 결 항목까지 — 성형(코·눈·윤곽)은 의료광고 규제 때문에 넣지 않는다.
 *
 * 프리셋 문구는 영어로 고정한다. 모델이 영어 지시를 가장 안정적으로 따르고,
 * 사용자가 고른 건 버튼(프리셋 키)이지 문장이 아니라서 언어와 무관하다.
 */
const MODEL = process.env.AI_SIM_MODEL ?? 'gemini-2.5-flash-image';
const KEEP = 'Keep the same person, face identity, expression, pose, lighting, background and clothing. Photorealistic, natural, no text or watermark.';

export const SIM_PRESETS: Record<string, { group: 'hair' | 'color' | 'makeup' | 'tone' | 'skin'; prompt: string }> = {
  hair_short_bob: { group: 'hair', prompt: `Change the hairstyle to a chin-length sleek bob. ${KEEP}` },
  hair_layered: { group: 'hair', prompt: `Change the hairstyle to shoulder-length layered cut with soft face-framing layers. ${KEEP}` },
  hair_wave: { group: 'hair', prompt: `Change the hairstyle to long loose waves (Korean C-curl / S-curl perm). ${KEEP}` },
  hair_bangs: { group: 'hair', prompt: `Add light see-through bangs (Korean style) to the current hairstyle. ${KEEP}` },
  color_ash_brown: { group: 'color', prompt: `Change only the hair color to ash brown, natural tone. ${KEEP}` },
  color_warm_brown: { group: 'color', prompt: `Change only the hair color to warm chocolate brown. ${KEEP}` },
  color_dark_black: { group: 'color', prompt: `Change only the hair color to glossy natural black. ${KEEP}` },
  color_milk_tea: { group: 'color', prompt: `Change only the hair color to light milk-tea beige. ${KEEP}` },
  makeup_natural: { group: 'makeup', prompt: `Apply light natural Korean daily makeup: even skin, soft brows, subtle blush, MLBB lip. ${KEEP}` },
  makeup_glam: { group: 'makeup', prompt: `Apply glamorous evening makeup: defined eyes, contour, glossy deep-red lip. ${KEEP}` },
  makeup_clean: { group: 'makeup', prompt: `Apply a clean girl makeup look: dewy skin, brushed-up brows, clear gloss lip. ${KEEP}` },
  tone_spring_warm: { group: 'tone', prompt: `Restyle to suit a spring-warm personal color: peach-coral blush and lip, warm golden-brown hair tint, a light warm-toned top. ${KEEP.replace('and clothing', '')}` },
  tone_summer_cool: { group: 'tone', prompt: `Restyle to suit a summer-cool personal color: rosy-pink blush and lip, cool ash-brown hair tint, a soft cool-toned top. ${KEEP.replace('and clothing', '')}` },
  tone_autumn_warm: { group: 'tone', prompt: `Restyle to suit an autumn-warm personal color: brick-orange lip, warm chestnut hair tint, an earthy warm-toned top. ${KEEP.replace('and clothing', '')}` },
  tone_winter_cool: { group: 'tone', prompt: `Restyle to suit a winter-cool personal color: clear berry-red lip, deep black hair, a crisp cool-toned top. ${KEEP.replace('and clothing', '')}` },
  skin_glow: { group: 'skin', prompt: `Subtly improve skin: brighter even tone, reduced blemishes and dullness, natural glow — do not change face shape or features. ${KEEP}` },
};

/** 결과 화면의 "이 스타일 잘하는 샵" — 프리셋 그룹별 추천 상품 카테고리와 카테고리 랜딩 키. */
export const SIM_GROUP_RECS: Record<'hair' | 'color' | 'makeup' | 'tone' | 'skin', { categories: ListingCategory[]; landing: string }> = {
  hair: { categories: ['hair'], landing: 'hair' },
  color: { categories: ['hair'], landing: 'hair' },
  makeup: { categories: ['makeup'], landing: 'makeup' },
  tone: { categories: ['personal_color'], landing: 'color' },
  skin: { categories: ['hospital'], landing: 'skin' },
};

export type SimOutcome =
  | { ok: true; image: string; mimeType: string; durationMs: number }
  | { ok: false; reason: 'refused' | 'failed' | 'not_configured'; durationMs: number };

export async function runSimulation(imageBase64: string, mimeType: string, presetKey: string): Promise<SimOutcome> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const preset = SIM_PRESETS[presetKey];
  const t0 = Date.now();
  if (!key || !preset) return { ok: false, reason: 'not_configured', durationMs: 0 };
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: preset.prompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
      cache: 'no-store',
    });
    const j = (await res.json()) as {
      candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> } }>;
      promptFeedback?: { blockReason?: string };
    };
    const durationMs = Date.now() - t0;
    if (!res.ok) return { ok: false, reason: 'failed', durationMs };
    const cand = j.candidates?.[0];
    const img = cand?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    if (img?.data) return { ok: true, image: img.data, mimeType: img.mimeType || 'image/png', durationMs };
    // 이미지 없이 끝났으면 안전 필터 거부로 본다 (blockReason / SAFETY / 텍스트만 온 경우)
    const refused = !!j.promptFeedback?.blockReason || /SAFETY|PROHIBITED|BLOCK/i.test(cand?.finishReason ?? '') || !!cand;
    return { ok: false, reason: refused ? 'refused' : 'failed', durationMs };
  } catch {
    return { ok: false, reason: 'failed', durationMs: Date.now() - t0 };
  }
}
