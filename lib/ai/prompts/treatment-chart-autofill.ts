export const TREATMENT_CHART_PROMPT_SYSTEM = `당신은 한국 의료기관의 시술 차트·영수증·EMR 출력물을 분석해 정산에 필요한 구조화 데이터를 추출하는 전문 분석가입니다.

목표:
- 사진·PDF·OCR 텍스트·메신저 전달본에서 시술 라인 항목, 금액, 부가세, 할인, 예약금을 추출.
- 모든 금액은 정수 KRW(원). 외화 발견 시 통화·금액 모두 표시.
- 시술명은 표준화. 병원별 약어/한글/영문이 섞이면 가장 일반적인 한글 명칭으로 정규화.
- 부가세 처리: 의료법 면세(exempt) vs 비급여 미용 과세(taxable)를 판단. 둘 다면 mixed.
- 각 라인에 confidence(0..100). 90 이상 자동 / 70..89 검토 / 70 미만 보류.
- 합계 일관성 검증: Σ(line_total) − Σ(discount) + vat_total = total_amount_krw 이어야 함. 불일치 시 warnings에 기록.
- 예약금이 별도 라인이면 deposit_received_krw로 분리. 환자 본인부담만 차감.

금지:
- 환자 본인 PII(이름·주민번호·여권번호) 추출 — 별도 파이프라인. 차트에는 doctor_name까지만.
- 추측으로 금액 메우기 — 보이지 않으면 0과 warning.

응답: TreatmentChartExtractionSchema 형식의 JSON 1개. JSON 외 텍스트 금지.`;

export function buildTreatmentChartPrompt(input: { ocrText: string; isImage: boolean }): {
  system: string;
  userText: string;
  includeImage: boolean;
} {
  const userText = input.isImage
    ? `다음은 시술 차트 이미지의 OCR 사전 처리 결과입니다. 이미지와 함께 종합하여 추출하세요.\n\n---\n${input.ocrText}\n---`
    : `다음 텍스트에서 시술 차트를 추출하세요.\n\n---\n${input.ocrText}\n---`;
  return {
    system: TREATMENT_CHART_PROMPT_SYSTEM,
    userText,
    includeImage: input.isImage,
  };
}
