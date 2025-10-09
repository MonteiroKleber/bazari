import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * Hook for animating number increments
 * @param value - Target number to animate to
 * @param duration - Animation duration in seconds (default: 0.5)
 * @returns Animated number value
 */
export function useCountAnimation(value: number, duration: number = 0.5) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  });

  const displayValue = useTransform(springValue, (latest) =>
    Math.round(latest)
  );

  const previousValue = useRef(0);

  useEffect(() => {
    // Only animate if value actually changed
    if (previousValue.current !== value) {
      motionValue.set(value);
      previousValue.current = value;
    }
  }, [value, motionValue]);

  return displayValue;
}
