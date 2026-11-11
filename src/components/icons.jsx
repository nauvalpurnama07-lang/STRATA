// Single stroke-width icon system (1.6, except 1.8 for the tiny
// checklist checkmark which needs a heavier stroke to read at that size).
// Shared by the landing page, login page, and dashboard so the visual
// language stays identical across the whole app.
export const Icon = {
  Mail: (p) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M2 4.5L8 9L14 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  Eye: (p) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  Warn: (p) => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" {...p}>
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 3.5V6.5M6 8.3V8.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Search: (p) => (
    <svg width="15" height="15" viewBox="0 0 14 14" fill="none" {...p}>
      <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.6 9.6L13 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Plus: (p) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}>
      <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Chevron: (p) => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" {...p}>
      <path d="M1 3.5L5 7.5L9 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  X: (p) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Home: (p) => (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" {...p}>
      <path d="M2 8L8.5 2L15 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 7V14.5H13V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Board: (p) => (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" {...p}>
      <rect x="2" y="2" width="4.5" height="13" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
      <rect x="9.7" y="2" width="4.5" height="8.5" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  Users: (p) => (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" {...p}>
      <circle cx="6" cy="6" r="2.3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12.2" cy="6" r="2.3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M1.8 15C1.8 12 3.6 10.2 6 10.2C6.7 10.2 7.4 10.4 8 10.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 15C9 12.3 10.7 10.6 12.9 10.6C15.1 10.6 16.7 12.3 16.7 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Settings: (p) => (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" {...p}>
      <circle cx="8.5" cy="8.5" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 1.8V3.6M8.5 13.4V15.2M15.2 8.5H13.4M3.6 8.5H1.8M13.2 3.8L11.9 5.1M5.1 11.9L3.8 13.2M13.2 13.2L11.9 11.9M5.1 5.1L3.8 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Bell: (p) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...p}>
      <path d="M4 7.5C4 4.7 6 2.5 9 2.5C12 2.5 14 4.7 14 7.5C14 11.5 15.5 12.5 15.5 12.5H2.5C2.5 12.5 4 11.5 4 7.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7.2 15C7.6 15.6 8.2 16 9 16C9.8 16 10.4 15.6 10.8 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Menu: (p) => (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" {...p}>
      <path d="M2 4.5H15M2 8.5H15M2 12.5H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Dots: (p) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}>
      <circle cx="7" cy="3" r="1.2" fill="currentColor" />
      <circle cx="7" cy="7" r="1.2" fill="currentColor" />
      <circle cx="7" cy="11" r="1.2" fill="currentColor" />
    </svg>
  ),
  Check: (p) => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" {...p}>
      <path d="M1.5 5L4 7.5L8.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Logout: (p) => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" {...p}>
      <path d="M6 2H3.5C2.7 2 2 2.7 2 3.5V11.5C2 12.3 2.7 13 3.5 13H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.5 5L13 7.5L9.5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 7.5H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  User: (p) => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" {...p}>
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  Cmd: (p) => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" {...p}>
      <path d="M3 8L6.5 11.5L12 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Task: (p) => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" {...p}>
      <rect x="2" y="2" width="4.3" height="11" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="8.7" y="2" width="4.3" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  ArrowRight: (p) => (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" {...p}>
      <path d="M2.5 8.5L8.5 2.5M8.5 2.5H3.8M8.5 2.5V7.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Play: (p) => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" {...p}>
      <path d="M4.5 3L11.5 7.5L4.5 12V3Z" fill="currentColor" />
    </svg>
  ),
  Lock: (p) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...p}>
      <rect x="3.5" y="8" width="11" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 8V5.5C6 3.6 7.6 2 9.5 2C11.4 2 13 3.6 13 5.5V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9" cy="11.8" r="1.1" fill="currentColor" />
    </svg>
  ),
  Devices: (p) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...p}>
      <rect x="2" y="1.5" width="10" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="5" width="3" height="8" rx="1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  Collab: (p) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...p}>
      <circle cx="6" cy="6" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="13" cy="6" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 15.5C2.5 12.7 4.2 11 6.5 11C7.2 11 7.9 11.2 8.4 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.5 15.5C9.5 12.9 11.1 11.3 13.2 11.3C15.3 11.3 16.9 12.9 16.9 15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Google: (p) => (
    <svg width="18" height="18" viewBox="0 0 18 18" {...p}>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  ),
  Sparkle: (p) => (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" {...p}>
      <path d="M8.5 1.5L9.9 6.1L14.5 7.5L9.9 8.9L8.5 13.5L7.1 8.9L2.5 7.5L7.1 6.1L8.5 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M13.5 11.5L14 13L15.5 13.5L14 14L13.5 15.5L13 14L11.5 13.5L13 13L13.5 11.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
  Send: (p) => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" {...p}>
      <path d="M13.5 1.5L6.5 8.5M13.5 1.5L9 13.5L6.5 8.5M13.5 1.5L1.5 6L6.5 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ZoomIn: (p) => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" {...p}>
      <circle cx="6.5" cy="6.5" r="4.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 4.3V8.7M4.3 6.5H8.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10.2 10.2L13.5 13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  ZoomOut: (p) => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" {...p}>
      <circle cx="6.5" cy="6.5" r="4.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.3 6.5H8.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10.2 10.2L13.5 13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  StickyNote: (p) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M2 2.5H14V9.5L9.5 14H2V2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9.5 14V9.5H14" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  TypeText: (p) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M3 3.5H13M8 3.5V13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Square: (p) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}>
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  Link2: (p) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}>
      <circle cx="4" cy="12" r="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 10.5L10.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Refresh: (p) => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" {...p}>
      <path d="M13 7.5C13 4.46 10.54 2 7.5 2C5.24 2 3.3 3.36 2.46 5.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M2 2V5.5H5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 7.5C2 10.54 4.46 13 7.5 13C9.76 13 11.7 11.64 12.54 9.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13 13V9.5H9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Layers: (p) => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" {...p}>
      <path d="M7.5 1.5L13.5 5L7.5 8.5L1.5 5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M1.5 8.5L7.5 12L13.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Frame: (p) => (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" {...p}>
      <path d="M2 5.5V2H5.5M11.5 2H15V5.5M15 11.5V15H11.5M5.5 15H2V11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Star: (p) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}>
      <path d="M7 1.5L8.6 5L12.3 5.4L9.5 7.9L10.3 11.6L7 9.7L3.7 11.6L4.5 7.9L1.7 5.4L5.4 5L7 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  StarFilled: (p) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}>
      <path d="M7 1.5L8.6 5L12.3 5.4L9.5 7.9L10.3 11.6L7 9.7L3.7 11.6L4.5 7.9L1.7 5.4L5.4 5L7 1.5Z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
  ChatBubble: (p) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M2 3.5C2 2.7 2.7 2 3.5 2H12.5C13.3 2 14 2.7 14 3.5V9.5C14 10.3 13.3 11 12.5 11H6.5L3.5 13.5V11H3.5C2.7 11 2 10.3 2 9.5V3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  Import: (p) => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" {...p}>
      <path d="M7.5 1.5V9.5M7.5 9.5L4.5 6.5M7.5 9.5L10.5 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 10.5V12C2 12.8 2.7 13.5 3.5 13.5H11.5C12.3 13.5 13 12.8 13 12V10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Sun: (p) => (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" {...p}>
      <circle cx="8.5" cy="8.5" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 1.5V3M8.5 14V15.5M1.5 8.5H3M14 8.5H15.5M3.5 3.5L4.6 4.6M12.4 12.4L13.5 13.5M3.5 13.5L4.6 12.4M12.4 4.6L13.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Moon: (p) => (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" {...p}>
      <path d="M14.5 10.2A6.5 6.5 0 0 1 6.8 2.5A6.5 6.5 0 1 0 14.5 10.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Trash: (p) => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" {...p}>
      <path d="M2.5 4H12.5M5.5 4V2.8C5.5 2.36 5.86 2 6.3 2H8.7C9.14 2 9.5 2.36 9.5 2.8V4M4 4V12C4 12.55 4.45 13 5 13H10C10.55 13 11 12.55 11 12V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.3 6.5V10.5M8.7 6.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Shield: (p) => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" {...p}>
      <path d="M7.5 1.5L2.5 3.7V7.2C2.5 10.5 4.6 12.8 7.5 13.8C10.4 12.8 12.5 10.5 12.5 7.2V3.7L7.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Sparkles: (p) => (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" {...p}>
      <path d="M8.5 1.5L9.9 6.1L14.5 7.5L9.9 8.9L8.5 13.5L7.1 8.9L2.5 7.5L7.1 6.1L8.5 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M13.5 11.5L14 13L15.5 13.5L14 14L13.5 15.5L13 14L11.5 13.5L13 13L13.5 11.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
  Copy: (p) => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" {...p}>
      <rect x="5" y="5" width="8" height="8" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 10H2.5C1.95 10 1.5 9.55 1.5 9V2.5C1.5 1.95 1.95 1.5 2.5 1.5H9C9.55 1.5 10 1.95 10 2.5V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

export function Logo({ className = "w-6 h-5" }) {
  return (
    <svg viewBox="0 0 26 22" fill="none" className={className} aria-hidden="true">
      <rect x="0" y="15" width="26" height="5" rx="2" fill="#34D399" />
      <rect x="3" y="8" width="20" height="5" rx="2" fill="#34D399" opacity="0.6" />
      <rect x="6.5" y="1" width="13" height="5" rx="2" fill="#34D399" opacity="0.3" />
    </svg>
  );
}
