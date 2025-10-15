import type { Transition } from 'framer-motion';

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get transition with reduced motion support
 * If user prefers reduced motion, duration is set to 0
 */
export const getTransition = (transition: Transition): Transition => {
  if (prefersReducedMotion()) {
    return { ...transition, duration: 0 };
  }
  return transition;
};

/**
 * Animation variants for common patterns
 */
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInLeft = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

export const slideInFromBottom = {
  hidden: { y: '100%' },
  visible: { y: 0 },
};

/**
 * Stagger children animation
 */
export const staggerContainer = {
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

/**
 * Default transitions
 */
export const transitions = {
  fast: { duration: 0.15, ease: 'easeOut' } as Transition,
  default: { duration: 0.2, ease: 'easeOut' } as Transition,
  smooth: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } as Transition,
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  } as Transition,
};

/**
 * Product card animations
 */
export const productCardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95 },
};

/**
 * Badge animations
 */
export const badgeVariants = {
  initial: { opacity: 0, x: -8, scale: 0.95 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

/**
 * Empty state animations
 */
export const emptyStateVariants = {
  container: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  },
  icon: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
  },
  content: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
};
