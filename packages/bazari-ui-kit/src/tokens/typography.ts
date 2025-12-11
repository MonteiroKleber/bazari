export const fontFamily = {
  sans: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};

export const fontSize = {
  xs: ['0.75rem', { lineHeight: '1rem' }] as const,
  sm: ['0.875rem', { lineHeight: '1.25rem' }] as const,
  base: ['1rem', { lineHeight: '1.5rem' }] as const,
  lg: ['1.125rem', { lineHeight: '1.75rem' }] as const,
  xl: ['1.25rem', { lineHeight: '1.75rem' }] as const,
  '2xl': ['1.5rem', { lineHeight: '2rem' }] as const,
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }] as const,
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }] as const,
  '5xl': ['3rem', { lineHeight: '1' }] as const,
};

export const fontWeight = {
  thin: '100',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};
