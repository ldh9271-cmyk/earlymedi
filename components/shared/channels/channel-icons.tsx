import type { SVGProps } from 'react';
import type { ChannelKind } from '@/lib/channels/registry';

/**
 * Brand-accurate SVG icons for every supported messenger.
 *
 * The glyph paths trace the official brand marks closely enough that
 * users instantly recognize each app (Telegram's paper plane angle,
 * KakaoTalk's brown chat bubble on yellow, WeChat's two overlapping
 * bubbles with eye dots, Instagram's rounded camera, LINE's LINE
 * wordmark in a bubble, WhatsApp's phone-receiver-in-bubble, Naver's
 * white "N", Messenger's lightning bubble).
 *
 * Colors are baked in because each tile's background is already the
 * brand color — the glyph must render with the foreground color the
 * brand expects (white on most; brown on KakaoTalk's yellow).
 *
 * Pictogram-grade — sufficient for product UI. For press kits / paid
 * marketing assets, use the official downloads from each platform.
 */

type IconProps = SVGProps<SVGSVGElement>;

export function KakaoTalkIcon(props: IconProps): JSX.Element {
  // Brown speech bubble with a small tail at the bottom-left — the
  // KakaoTalk mark you see on every yellow tile in Korea.
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M12 4.5c-4.7 0-8.5 3-8.5 6.7 0 2.4 1.6 4.5 4 5.7l-.8 3c-.1.3.2.5.5.4l3.5-2.3c.4.1.9.1 1.3.1 4.7 0 8.5-3 8.5-6.7S16.7 4.5 12 4.5Z"
        fill="#3C1E1E"
      />
    </svg>
  );
}

export function LineIcon(props: IconProps): JSX.Element {
  // White rounded speech bubble with "LINE" letters in brand green.
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M12 3.5C6.5 3.5 2 7.1 2 11.6c0 4 3.6 7.4 8.5 8.1.4.1.8.2.9.5.1.2.1.6 0 .9l-.1.7c-.1.4-.2.9.8.5 1-.4 5.4-3.2 7.4-5.5 1.4-1.6 2.5-3.2 2.5-5.2 0-4.5-4.5-8.1-10-8.1Z"
        fill="#FFFFFF"
      />
      {/* L */}
      <rect x="5" y="9.6" width="0.9" height="4.3" fill="#06C755" />
      <rect x="5" y="13" width="2" height="0.9" fill="#06C755" />
      {/* I */}
      <rect x="8" y="9.6" width="0.9" height="4.3" fill="#06C755" />
      {/* N */}
      <rect x="10" y="9.6" width="0.9" height="4.3" fill="#06C755" />
      <rect x="12.7" y="9.6" width="0.9" height="4.3" fill="#06C755" />
      <path d="M10.9 9.6h0.6l2.2 3.4-0.7 0.4-2.2-3.4Z" fill="#06C755" />
      {/* E */}
      <rect x="14.7" y="9.6" width="0.9" height="4.3" fill="#06C755" />
      <rect x="14.7" y="9.6" width="2.3" height="0.8" fill="#06C755" />
      <rect x="14.7" y="11.4" width="2" height="0.8" fill="#06C755" />
      <rect x="14.7" y="13.1" width="2.3" height="0.8" fill="#06C755" />
    </svg>
  );
}

export function TelegramIcon(props: IconProps): JSX.Element {
  // White paper plane angled to the lower-right with a folded wing line
  // splitting the body — Telegram's signature glyph.
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="m20.5 4.2-17 6.6c-1.2.5-1.2 1.1-.2 1.4l4.4 1.4 1.7 5.2c.2.6.4.8.8.8.4 0 .6-.2.9-.5l2.1-2 4.4 3.2c.8.5 1.4.2 1.6-.7l3-13.6c.3-1.2-.4-1.7-1.7-1.8Z"
        fill="#FFFFFF"
      />
      {/* Inner fold line — the crease where the wing meets the body */}
      <path
        d="m9.4 14 .4 4.2c.3 0 .4-.1.6-.3l1.5-1.4-2-1.8Z"
        fill="#A8D5E8"
      />
      <path
        d="M9.4 14 16.8 8c.3-.3.1-.4-.3-.2L7.8 13l2 1Z"
        fill="#CFE9F4"
      />
    </svg>
  );
}

export function WhatsAppIcon(props: IconProps): JSX.Element {
  // White phone receiver tucked inside a chat bubble — WhatsApp's mark.
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M12 2.5C6.8 2.5 2.5 6.7 2.5 11.9c0 1.7.4 3.2 1.2 4.6l-1.2 4.4 4.5-1.2c1.4.7 2.9 1.1 4.5 1.1h.5c5.2 0 9.5-4.2 9.5-9.4S17.2 2.5 12 2.5Z"
        fill="#FFFFFF"
      />
      <path
        d="M16.6 14.5c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1-.2.2-.6.7-.7.9-.1.1-.3.1-.5 0-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.1-.2.2-.4 0-.2 0-.3 0-.4 0-.1-.5-1.2-.7-1.7-.2-.4-.4-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.7.7-.7 1.7s.7 2 .8 2.1c.1.1 1.4 2.3 3.4 3.2 1.9.8 1.9.5 2.3.5.4 0 1.3-.5 1.5-1 .2-.5.2-1 .1-1.1l-.3-.1Z"
        fill="#25D366"
      />
    </svg>
  );
}

export function InstagramIcon(props: IconProps): JSX.Element {
  // White rounded camera outline with a circle lens and a tiny corner dot.
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="5"
        stroke="#FFFFFF"
        strokeWidth="2"
        fill="none"
      />
      <circle
        cx="12"
        cy="12"
        r="4"
        stroke="#FFFFFF"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="17.5" cy="6.5" r="1.2" fill="#FFFFFF" />
    </svg>
  );
}

export function MessengerIcon(props: IconProps): JSX.Element {
  // White lightning chevron sitting inside a chat bubble — Messenger's glyph.
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M12 2C6.5 2 2 6.1 2 11.2c0 2.8 1.4 5.3 3.6 7v3.4l3.3-1.8c1 .3 2 .4 3.1.4 5.5 0 10-4.1 10-9S17.5 2 12 2Z"
        fill="#FFFFFF"
      />
      <path
        d="m10.7 14.5-3.4-3.7 7.8 3.7-2.4-4 3.4 3.7-7.8-3.7 2.4 4Z"
        fill="#0084FF"
      />
    </svg>
  );
}

export function NaverIcon(props: IconProps): JSX.Element {
  // The famous white "N" wordmark — solid letter shape, not stroked.
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M6.5 5h3.8l3.7 6V5H18v14h-3.8l-3.7-6v6H6.5V5Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function WeChatIcon(props: IconProps): JSX.Element {
  // Two white speech bubbles overlapping — larger one back-left with two
  // eye dots, smaller one front-right with two eye dots.
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Larger back bubble */}
      <path
        d="M8.7 4C4.9 4 1.8 6.5 1.8 9.6c0 1.6.8 3 2.1 4.1l-.5 1.5c-.1.2.1.4.3.3l1.6-.9c.7.2 1.3.3 2 .3.2 0 .4 0 .7 0-.2-.5-.3-1.1-.3-1.6 0-3 3-5.4 6.6-5.4.3 0 .7 0 1 .1C14.7 5.7 12 4 8.7 4Z"
        fill="#FFFFFF"
      />
      <circle cx="6.5" cy="8.5" r="0.7" fill="#07C160" />
      <circle cx="10.9" cy="8.5" r="0.7" fill="#07C160" />
      {/* Smaller front bubble */}
      <path
        d="M22 14.3c0-2.6-2.6-4.8-5.7-4.8-3.1 0-5.7 2.2-5.7 4.8 0 2.7 2.6 4.8 5.7 4.8.6 0 1.2-.1 1.7-.2l1.5.8c.2.1.4-.1.3-.3l-.3-1.2c1.4-.9 2.5-2.4 2.5-3.9Z"
        fill="#FFFFFF"
      />
      <circle cx="14.4" cy="13.2" r="0.55" fill="#07C160" />
      <circle cx="18.3" cy="13.2" r="0.55" fill="#07C160" />
    </svg>
  );
}

/** Single lookup table the channel card uses to pick the right icon. */
export const CHANNEL_ICONS: Record<ChannelKind, (props: IconProps) => JSX.Element> = {
  kakao: KakaoTalkIcon,
  line: LineIcon,
  telegram: TelegramIcon,
  whatsapp: WhatsAppIcon,
  instagram: InstagramIcon,
  messenger: MessengerIcon,
  naver: NaverIcon,
  wechat: WeChatIcon,
};
