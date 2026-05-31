import type { Dictionary } from './kr';

const ja: Dictionary = {
  nav: {
    home: 'ホーム',
    clinics: '病院を探す',
    procedures: '施術カタログ',
    packages: 'パッケージ',
    aiConsult: 'AI 相談',
    reviews: 'レビュー',
    inquiry: '1対1相談',
    login: 'ログイン',
  },
  hero: {
    badge: 'AI 韓国医療ツーリズム・コンシェルジュ',
    title: '韓国最高の施術を、\nAIがあなたに合わせて。',
    subtitle:
      '病院・医師・料金を1画面で比較。AIコンシェルジュが24時間、韓国語・英語・中国語・日本語でご案内。',
    ctaPrimary: '無料AI相談を開始',
    ctaSecondary: '病院を見る',
    stats: {
      hospitals: '提携病院',
      procedures: '施術カテゴリ',
      patients: '年間患者数',
      languages: '対応言語',
    },
  },
  categories: {
    title: '気になる分野を選択',
    subtitle: '認証済みの病院、本物のレビュー、概算費用をカテゴリ別に一括確認。',
    items: {
      plastic_surgery: { label: '美容外科', desc: '目・鼻・輪郭・ボディ' },
      dermatology: { label: '皮膚科', desc: 'レーザー・フィラー・ボトックス・ニキビ' },
      dental: { label: '歯科', desc: 'インプラント・矯正・ホワイトニング' },
      hair: { label: '毛髪', desc: '植毛・脱毛治療' },
      health_checkup: { label: '健康診断', desc: '総合検診・人間ドック' },
      beauty_tour: { label: 'ビューティーツアー', desc: '施術 + ホテル + 観光パッケージ' },
      makeup: { label: 'ヘア&メイク', desc: '施術前後スタイリング' },
      photo_studio: { label: 'フォトスタジオ', desc: '施術後の人生写真' },
    },
    viewAll: 'すべて見る',
  },
  featured: {
    title: '本日のおすすめ病院',
    subtitle: 'KOIHA登録の外国人患者誘致医療機関の中で、レビュー・専門性・言語対応が優秀な病院',
    cta: 'すべての病院を見る',
  },
  ai: {
    title: 'AI Glow-Up — 写真1枚から始める',
    subtitle:
      '顔写真をアップロードすると、AIがおすすめ施術・概算費用・回復期間を分析します。匿名・無料。',
    bullets: [
      '顔分析 → 個別施術レコメンド',
      '施術前後シミュレーション',
      '概算費用・回復期間',
      '病院別見積もり比較',
    ],
    cta: 'AI分析を開始（無料）',
    note: 'アップロードした写真は分析後すぐ削除されます。同意なしに保存・共有しません。',
  },
  trust: {
    title: 'なぜEarlyMediなのか？',
    items: {
      koiha: {
        title: 'KOIHA登録医療機関のみ',
        desc: '韓国保健福祉部登録の外国人患者誘致医療機関と直接提携。',
      },
      ai: {
        title: '24時間AIコンシェルジュ',
        desc: '韓国語・英語・中国語・日本語・ロシア語の自動翻訳で時差ゼロ相談。',
      },
      transparent: {
        title: '透明な料金',
        desc: '病院が事前公開した価格レンジ + 最終見積もりは施術前に確定。',
      },
      aftercare: {
        title: '帰国後のケア',
        desc: 'EarlyCareアフターケア — 回復写真分析、ビデオ診療、緊急連絡。',
      },
    },
  },
  inquiryCta: {
    title: 'まだ迷っていますか？',
    subtitle: '医療コンシェルジュと1対1相談。平均応答15分以内、無料。',
    nameLabel: 'お名前',
    countryLabel: '国',
    contactLabel: '連絡先（メールまたはLINE ID）',
    interestLabel: '関心分野',
    memoLabel: 'お問い合わせ内容',
    submit: '送信',
    privacy: '送信時、プライバシーポリシーに同意したものとみなされます。',
  },
  footer: {
    tagline: '韓国医療ツーリズムの新基準 — AI + 人間のコンシェルジュ。',
    company: '会社',
    about: '会社概要',
    careers: '採用',
    press: 'プレス',
    contact: 'お問い合わせ',
    legal: '法務',
    terms: '利用規約',
    privacy: 'プライバシーポリシー',
    medicalAd: '医療広告ガイドライン',
    business: 'ビジネス',
    forHospitals: '病院・クリニック向け',
    forPartners: 'ホテル・パートナー向け',
    forFreelancers: 'フリーランス向け',
    copy: '© 2026 EarlyMedi · 韓国保健福祉部の外国人患者誘致広告ガイドライン遵守',
  },
  common: {
    loading: '読み込み中…',
    error: 'エラーが発生しました',
    retry: '再試行',
    learnMore: '詳細を見る',
    bookConsult: '相談予約',
    seeMore: 'もっと見る',
    backToHome: 'ホームに戻る',
  },
};

export default ja;
