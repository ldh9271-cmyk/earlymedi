import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1440px' },
    },
    extend: {
      colors: {
        // KoreaGlowUp brand
        brand: {
          DEFAULT: '#4F46E5', // Indigo 600 — 신뢰
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        hospitality: {
          DEFAULT: '#F59E0B', // Amber 500 — 호스피탈리티
          50:  '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        care: {
          DEFAULT: '#10B981', // Emerald 500 — 회복·케어
          50:  '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        // ─── Korea Glow-up Challenge (Atelier) palette ──────────────
        // 환자 포털 신규 디자인 시스템 (claude.ai design import).
        // 따뜻한 ivory 베이스 + wine 액센트 + gold 프리미엄.
        // 사용처: /[locale]/glowup/* 라우트 전용 — 기존 brand/hospitality/
        // care 토큰은 그대로 두고 새 토큰만 추가 (legacy 화면 영향 X).
        glow: {
          ivory: '#EAE6DF',  // 메인 배경 (warm sand)
          cream: '#F5F1EA',  // 카드 배경 (lighter ivory)
          paper: '#FBF8F2',  // 가장 밝은 표면 (text on dark)
          sand:  '#D8CDB9',  // 분리선·muted 배경
          dune:  '#D6CCBC',  // 보더
          ink:   '#1B1512',  // 본문 텍스트 (deep brown-black)
          jet:   '#16110E',  // 폰 프레임·헤더
          wine:  '#7C3A4B',  // 메인 CTA (deep wine)
          gold:  '#C9A86A',  // 프리미엄 액센트
          mist:  '#9A8E84',  // 라벨·메타
          stone: '#8A7F73',  // 보조 텍스트
          slate: '#5C544C',  // 본문 muted
          umber: '#6B6258',  // 라벨 텍스트
        },
        // shadcn/ui tokens
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-pretendard)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-pretendard)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        // ─── Glowup typography ──────────────────────────────────────
        // Korean display serif (h1, h2 on phone screens).
        'glow-serif':  ['var(--font-noto-serif-kr)', 'Noto Serif KR', 'serif'],
        // English/numeric italic accent (eyebrow lines, tagline).
        'glow-italic': ['var(--font-cormorant)', 'Cormorant Garamond', 'serif'],
        // Korean UI/body sans (buttons, paragraph).
        'glow-sans':   ['var(--font-pretendard)', 'Pretendard Variable', 'sans-serif'],
        // All-caps labels with letter-spacing (S1 · 온보딩 style).
        'glow-mono':   ['var(--font-space-mono)', 'Space Mono', 'monospace'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
