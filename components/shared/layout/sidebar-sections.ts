import {
  BarChart3,
  Calendar,
  ClipboardCheck,
  CreditCard,
  FileBadge,
  FileSearch,
  FileText,
  Gavel,
  Hospital,
  HeartPulse,
  Inbox,
  Layers,
  ListChecks,
  MapPin,
  Plane,
  Plug,
  QrCode,
  ReceiptText,
  Settings,
  ShieldCheck,
  Stethoscope,
  Sparkles,
  TicketCheck,
  Truck,
  UserCircle,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';
import type { SidebarSection } from './sidebar';

export const agencySections: SidebarSection[] = [
  {
    items: [
      { href: '/agency/dashboard', label: '대시보드', icon: BarChart3 },
      { href: '/agency/inbox', label: '통합 인박스', icon: Inbox },
      { href: '/agency/channels', label: '채널 연결', icon: Plug },
      { href: '/agency/leads', label: '리드', icon: Sparkles },
      { href: '/agency/cases', label: '케이스', icon: ListChecks },
    ],
  },
  {
    title: '환자 · 파트너',
    items: [
      { href: '/agency/patients', label: '환자 CRM', icon: UserCircle },
      { href: '/agency/hospitals', label: '병원 마켓플레이스', icon: Hospital },
      { href: '/agency/partners', label: '파트너업체', icon: MapPin },
      { href: '/agency/freelancers', label: '프리랜서', icon: Users },
    ],
  },
  {
    title: '운영',
    items: [
      { href: '/agency/quotes', label: 'RFQ · 견적', icon: FileSearch },
      { href: '/agency/packages', label: '의료관광 패키지', icon: Layers },
      { href: '/agency/calendar', label: '마스터 캘린더', icon: Calendar },
      { href: '/agency/visa', label: '비자 · 여행 서류', icon: Plane },
      { href: '/agency/recovery', label: 'EarlyCare 사후관리', icon: HeartPulse },
    ],
  },
  {
    title: '재무 · 분석',
    items: [
      { href: '/agency/payments', label: '결제', icon: CreditCard },
      { href: '/agency/commissions', label: '커미션 분배', icon: Wallet },
      { href: '/agency/insights', label: 'EarlyInsight 분석', icon: BarChart3 },
      { href: '/agency/billing', label: '요금제 · 청구서', icon: ReceiptText },
    ],
  },
  {
    title: '컴플라이언스',
    items: [
      { href: '/agency/compliance', label: 'KOIHA · 광고 규제', icon: ShieldCheck },
      { href: '/agency/team', label: '팀원 관리', icon: Users },
      { href: '/agency/settings', label: '설정', icon: Settings },
    ],
  },
];

export const freelancerSections: SidebarSection[] = [
  {
    items: [
      { href: '/freelancer/dashboard', label: '대시보드', icon: BarChart3 },
      { href: '/freelancer/cases', label: '내 케이스', icon: ListChecks },
      { href: '/freelancer/commissions', label: '커미션', icon: Wallet },
    ],
  },
  {
    title: '도구',
    items: [
      { href: '/freelancer/referral-codes', label: '추천 코드 · QR', icon: QrCode },
      { href: '/freelancer/tax-docs', label: '세금 서류', icon: FileBadge },
      { href: '/freelancer/disputes', label: '이의 제기', icon: Gavel },
      { href: '/freelancer/team', label: '팀원 관리', icon: Users },
      { href: '/freelancer/settings', label: '설정 · 소속', icon: Settings },
    ],
  },
];

export const medicalSections: SidebarSection[] = [
  {
    items: [
      { href: '/medical/dashboard', label: '대시보드', icon: BarChart3 },
      { href: '/medical/rfqs', label: 'RFQ 인박스', icon: Inbox },
      { href: '/medical/patients', label: '환자', icon: UserCircle },
      { href: '/medical/calendar', label: '예약 캘린더', icon: Calendar },
    ],
  },
  {
    title: '진료 · 차트',
    items: [
      { href: '/medical/charts', label: '시술 차트', icon: ClipboardCheck },
      { href: '/medical/deposits', label: '예약금', icon: CreditCard },
      { href: '/medical/resources', label: '리소스 (의사·룸)', icon: Stethoscope },
      { href: '/medical/emr', label: 'EMR 연동', icon: FileText },
    ],
  },
  {
    title: '재무 · 운영',
    items: [
      { href: '/medical/settlements', label: '정산 · 세금계산서', icon: ReceiptText },
      { href: '/medical/contracts', label: '계약', icon: TicketCheck },
      { href: '/medical/billing', label: '잔액 · 사용량', icon: Wallet },
      { href: '/medical/team', label: '팀원 관리', icon: Users },
      { href: '/medical/settings', label: '설정', icon: Settings },
    ],
  },
];

export const partnerSections: SidebarSection[] = [
  {
    items: [
      { href: '/partner/dashboard', label: '대시보드', icon: BarChart3 },
      { href: '/partner/bookings', label: '부킹', icon: TicketCheck },
      { href: '/partner/availability', label: '가용성', icon: Calendar },
    ],
  },
  {
    title: '운영',
    items: [
      { href: '/partner/menu', label: '메뉴 · 가격표', icon: Utensils },
      { href: '/partner/constraints', label: '시술 후 제약', icon: Truck },
      { href: '/partner/contracts', label: '계약', icon: TicketCheck },
    ],
  },
  {
    title: '재무',
    items: [
      { href: '/partner/settlements', label: '정산', icon: Wallet },
      { href: '/partner/billing', label: '청구서', icon: ReceiptText },
      { href: '/partner/team', label: '팀원 관리', icon: Users },
      { href: '/partner/settings', label: '설정', icon: Settings },
    ],
  },
];
