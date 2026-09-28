// Theme design tokens
// Follows docs/architecture.md & docs/tech-stack.md

export const colors = {
  // Core palette
  seastone: '#1b2430',
  marine: '#1e3a8a',
  magma: '#ff6b1a',
  buster: '#f5c542',
  alert: '#e11d48',

  // Login page
  cardBg: '#fefdfb',
  cardText: '#1f2937',
  subtitle: '#6b7280',
  inputBorder: '#d1d5db',
  selectedBorder: '#e11d48',
  selectedBg: '#fef2f2',
  buttonBg: '#991b1b',
  buttonHover: '#b91c1c',
  linkRed: '#b91c1c',
  logoNavy: '#1e3a8a',
} as const;

export const fonts = {
  display: '"Pirata One", cursive',
  body: '"Inter", sans-serif',
} as const;
