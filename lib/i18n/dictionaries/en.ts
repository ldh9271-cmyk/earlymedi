import type { Dictionary } from './kr';

const en: Dictionary = {
  nav: {
    home: 'Home',
    clinics: 'Find Clinic',
    procedures: 'Procedures',
    packages: 'Packages',
    aiConsult: 'AI Consult',
    reviews: 'Reviews',
    inquiry: 'Talk to Us',
    login: 'Sign in',
  },
  hero: {
    badge: 'AI-Powered Korean Medical Tourism Concierge',
    title: "Korea's best treatments,\nmatched to you by AI.",
    subtitle:
      'Compare clinics, doctors, and prices in one place. Our AI concierge guides you 24/7 in English, Korean, Chinese, and Japanese.',
    ctaPrimary: 'Start Free AI Consult',
    ctaSecondary: 'Browse Clinics',
    stats: {
      hospitals: 'Partner Clinics',
      procedures: 'Procedure Categories',
      patients: 'Patients / Year',
      languages: 'Languages',
    },
  },
  categories: {
    title: 'What are you interested in?',
    subtitle: 'Verified clinics, real reviews, and price estimates — all in one place, by category.',
    items: {
      plastic_surgery: { label: 'Plastic Surgery', desc: 'Eyes · Nose · Contour · Body' },
      dermatology: { label: 'Dermatology', desc: 'Laser · Filler · Botox · Acne' },
      dental: { label: 'Dental', desc: 'Implants · Braces · Whitening' },
      hair: { label: 'Hair', desc: 'Transplant · Loss Treatment' },
      health_checkup: { label: 'Health Check-up', desc: 'Comprehensive · Premium Package' },
      beauty_tour: { label: 'Beauty Tour', desc: 'Treatment + Hotel + Tour Package' },
      makeup: { label: 'Hair & Makeup', desc: 'Pre/post-treatment styling' },
      photo_studio: { label: 'Photo Studio', desc: 'Glow-up photoshoot' },
    },
    viewAll: 'View all',
  },
  featured: {
    title: 'Featured Clinics Today',
    subtitle:
      'KOIHA-registered clinics with the strongest reviews, specialties, and language support',
    cta: 'Browse all clinics',
  },
  ai: {
    title: 'AI Glow-Up — Start with one photo',
    subtitle:
      'Upload a face photo and our AI suggests treatments, estimated costs, and recovery times. Anonymous and free.',
    bullets: [
      'Face analysis → tailored recommendations',
      'Before/after simulation',
      'Estimated cost and recovery time',
      'Quotes compared across clinics',
    ],
    cta: 'Try AI Analysis (Free)',
    note: 'Your photo is deleted immediately after analysis. Never stored or shared without consent.',
  },
  trust: {
    title: 'Why EarlyMedi?',
    items: {
      koiha: {
        title: 'KOIHA-Certified Clinics Only',
        desc: "We partner directly with Korea's Ministry of Health-registered medical institutions for foreign patients.",
      },
      ai: {
        title: '24/7 AI Concierge',
        desc: 'Automatic translation in Korean, English, Chinese, Japanese, and Russian — no timezone friction.',
      },
      transparent: {
        title: 'Transparent Pricing',
        desc: 'Clinics publish price ranges upfront. The final quote is confirmed before any procedure.',
      },
      aftercare: {
        title: 'After You Return Home',
        desc: 'EarlyCare aftercare — recovery photo analysis, video consults, emergency escalation.',
      },
    },
  },
  inquiryCta: {
    title: 'Still deciding?',
    subtitle: 'Talk 1:1 with a medical concierge. Average response under 15 minutes. Free.',
    nameLabel: 'Name',
    countryLabel: 'Country',
    contactLabel: 'Contact (Email or KakaoTalk ID)',
    interestLabel: 'Interested in',
    memoLabel: 'Your message',
    submit: 'Send Inquiry',
    privacy: 'By submitting, you agree to the Privacy Policy.',
  },
  footer: {
    tagline: 'A new standard for Korean medical tourism — AI + human concierge.',
    company: 'Company',
    about: 'About',
    careers: 'Careers',
    press: 'Press',
    contact: 'Contact',
    legal: 'Legal',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    medicalAd: 'Medical Advertising Guidelines',
    business: 'For Business',
    forHospitals: 'For Clinics',
    forPartners: 'For Hotels & Partners',
    forFreelancers: 'For Freelancers',
    copy: '© 2026 EarlyMedi · Compliant with Korea MOHW foreign-patient advertising guidelines',
  },
  common: {
    loading: 'Loading…',
    error: 'Something went wrong',
    retry: 'Try again',
    learnMore: 'Learn more',
    bookConsult: 'Book Consult',
    seeMore: 'See more',
    backToHome: 'Back to home',
  },
};

export default en;
