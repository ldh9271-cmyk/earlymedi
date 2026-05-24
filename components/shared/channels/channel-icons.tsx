import type { SVGProps } from 'react';
import type { ChannelKind } from '@/lib/channels/registry';

/**
 * Brand-accurate SVG icons for every supported messenger.
 *
 * All icons are sized to fit a 24×24 viewport so the `<ChannelCard>` can
 * scale them via Tailwind h-* / w-* without distortion. Colors are baked
 * into the SVGs (no fill="currentColor") because the channel cards already
 * use the brand color as the tile background — the icon needs to render
 * with the foreground/glyph color the brand expects (white on most,
 * brown on KakaoTalk's yellow).
 *
 * Designed as simplified pictograms based on the public brand marks —
 * not pixel-perfect replicas of trademarked logotypes. For production
 * marketing material, use the official press kits from each platform.
 */

type IconProps = SVGProps<SVGSVGElement>;

export function KakaoTalkIcon(props: IconProps): JSX.Element {
  // Yellow rounded square with brown speech bubble — the universally
  // recognised KakaoTalk mark.
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M12 4C7 4 3 7.2 3 11.2c0 2.6 1.7 4.8 4.2 6.1l-1 3.5c-.1.4.3.7.7.5l4.1-2.7c.3 0 .7.1 1 .1 5 0 9-3.2 9-7.2S17 4 12 4Z"
        fill="#3C1E1E"
      />
    </svg>
  );
}

export function LineIcon(props: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M12 3C6.5 3 2 6.7 2 11.2c0 4 3.6 7.4 8.5 8.1.3.1.8.2.9.5.1.3.1.7 0 1l-.1.7c0 .2-.2 1 .8.5 1-.4 5.6-3.3 7.6-5.7C21.1 14.7 22 13 22 11.2 22 6.7 17.5 3 12 3Z"
        fill="#FFFFFF"
      />
      <path d="M9 9h-.8c-.1 0-.2.1-.2.2v4.6c0 .1.1.2.2.2H9c.1 0 .2-.1.2-.2V9.2c0-.1-.1-.2-.2-.2Z" fill="#06C755" />
      <path
        d="M13.8 9H13c-.1 0-.2.1-.2.2v2.7L10.7 9.1l-.1-.1H9.8c-.1 0-.2.1-.2.2v4.6c0 .1.1.2.2.2h.8c.1 0 .2-.1.2-.2v-2.7l2.1 2.8.1.1H13.8c.1 0 .2-.1.2-.2V9.2c0-.1-.1-.2-.2-.2Z"
        fill="#06C755"
      />
      <path d="M7.2 12.9h-2v-3.7c0-.1-.1-.2-.2-.2h-.8c-.1 0-.2.1-.2.2v4.6c0 .1.1.2.2.2h3c.1 0 .2-.1.2-.2v-.7c0-.1-.1-.2-.2-.2Z" fill="#06C755" />
      <path d="M17.8 10.1c.1 0 .2-.1.2-.2v-.7c0-.1-.1-.2-.2-.2h-3c-.1 0-.2.1-.2.2v4.6c0 .1.1.2.2.2h3c.1 0 .2-.1.2-.2v-.7c0-.1-.1-.2-.2-.2h-2v-.7h2c.1 0 .2-.1.2-.2v-.7c0-.1-.1-.2-.2-.2h-2v-.7h2Z" fill="#06C755" />
    </svg>
  );
}

export function TelegramIcon(props: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="m21.3 3.7-19 7.4c-1.2.5-1.2 1.2-.2 1.5l4.8 1.5L18 6c.6-.4 1.1-.2.7.2l-9 8.1L9.4 19c.4 0 .6-.2.8-.4l2-1.9 4.2 3.1c.8.4 1.3.2 1.5-.7l2.7-12.7c.3-1.2-.4-1.7-1.3-1.3Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function WhatsAppIcon(props: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.4-.1-.6.2l-.9 1.1c-.2.2-.3.2-.6.1s-1.2-.4-2.3-1.4c-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.6-1.4-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.3 0 1.3.9 2.6 1.1 2.8.1.2 1.8 2.8 4.5 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3M12 22c-1.7 0-3.3-.4-4.7-1.2L2 22l1.3-5C2.5 15.5 2 13.8 2 12 2 6.5 6.5 2 12 2s10 4.5 10 10-4.5 10-10 10"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function InstagramIcon(props: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="3.5" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="#FFFFFF" />
    </svg>
  );
}

export function MessengerIcon(props: IconProps): JSX.Element {
  // Facebook Messenger lightning bubble.
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.4 5.5 3.7 7.2v3.5l3.4-1.9c.9.3 1.9.4 2.9.4 5.5 0 10-4.1 10-9.2S17.5 2 12 2Zm1 12.3-2.5-2.7L5.6 14.3l5.4-5.7 2.5 2.7 4.9-2.7-5.4 5.7Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function NaverIcon(props: IconProps): JSX.Element {
  // Naver's white "N" wordmark on the green tile.
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M13.6 12.2 9.7 6.6H6v10.8h4V11.8l4.3 5.6H18V6.6h-4v5.6h-.4Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function WeChatIcon(props: IconProps): JSX.Element {
  // Two overlapping speech bubbles — WeChat's signature mark.
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M9 4C5 4 2 6.7 2 10.1c0 1.9 1 3.6 2.5 4.7l-.6 1.8 2-1c.4.1.7.1 1.1.2-.1-.4-.2-.8-.2-1.2 0-3.2 3-5.8 6.7-5.8h.4C13.4 6.1 11.5 4 9 4Zm-2.6 4.5c-.4 0-.7-.3-.7-.7s.3-.7.7-.7.7.3.7.7-.3.7-.7.7Zm5.2 0c-.4 0-.7-.3-.7-.7s.3-.7.7-.7.7.3.7.7-.3.7-.7.7Z"
        fill="#FFFFFF"
      />
      <path
        d="M22 14.4c0-2.9-2.7-5.2-6-5.2s-6 2.3-6 5.2 2.7 5.2 6 5.2c.6 0 1.3-.1 1.9-.2l1.7.9-.5-1.5c1.7-1 2.9-2.7 2.9-4.4ZM13.7 13c-.3 0-.6-.3-.6-.6s.3-.6.6-.6.6.3.6.6-.3.6-.6.6Zm4.4 0c-.3 0-.6-.3-.6-.6s.3-.6.6-.6.6.3.6.6-.3.6-.6.6Z"
        fill="#FFFFFF"
      />
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
