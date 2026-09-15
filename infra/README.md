# infra

## vercel-firewall-rules.json
Vercel Firewall(WAF) 커스텀 규칙 원본 — 2026-09-15 적용. 전부 IP 기준 60초 창, 초과 시 차단(403 + `X-Vercel-Mitigated: deny`).
웹훅(`/api/webhooks/*`, 토스 웹훅)·크론·잡·콘솔(/master·/agency·/medical·/partner) 서버 액션은 제외.

적용 방법(전체 교체): `PUT https://api.vercel.com/v1/security/firewall/config?projectId=…&teamId=…` 에 이 JSON 을 그대로 보낸다.
규칙 하나만 바꾸려면 대시보드(Project → Firewall → Custom Rules)에서 수정하고, 바꾼 뒤 이 파일도 맞춰 둔다.
