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
        // ─── 글로우업투어 브랜드 로즈 ────────────────────────────
        // 예전에는 인디고(#4F46E5)였다. glowuptour.com 고객 포털·/biz
        // 파트너 랜딩이 이미 로즈였기 때문에 로그인만 넘어오면 색이
        // 바뀌어, 콘솔까지 한 브랜드로 맞춘 것.
        //
        // 500·600·700 은 순정 브랜드 로즈(#ff385c, 흰 글씨 대비 3.5:1)를
        // 그대로 쓰지 않고 어둡게 잡았다. bg-brand-500 + text-white 가
        // 9~12px 칩에 쓰이는 곳이 있어서, 인디고 시절 대비를 그대로
        // 유지하는 값으로 고른 것 (500 4.70 / 600 6.07 / 700 7.76 —
        // 인디고는 4.47 / 6.29 / 7.90 이었다).
        //
        // 순정 로즈가 필요한 곳(로고 마크, 대형 마케팅 면)은 brand-glow.
        brand: {
          DEFAULT: '#c2143c',
          50:  '#fff1f4',
          100: '#ffe0e6',
          200: '#fecdd6',
          300: '#fda4b6',
          400: '#fb6f8d',
          500: '#e11d48',
          600: '#c2143c',
          700: '#a3123a',
          800: '#881337',
          900: '#6d0f2c',
          950: '#4c0519',
          glow: '#ff385c', // 브랜드 마크 원색 — 로고·대형 면 전용
        },
        // 로즈와 함께 쓰는 중립값 (고객 포털·/biz 와 동일).
        surface: {
          ink:  '#222222', // 본문
          mute: '#6a6a6a', // 보조 텍스트
          line: '#ebebeb', // 보더
          tint: '#f7f7f7', // 섹션 배경
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
