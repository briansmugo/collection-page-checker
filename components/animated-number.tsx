"use client";

import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";

/**
 * A number that springs/eases up to its target value, in the style of the
 * Family wallet counters. Re-animates whenever `value` changes.
 */
export function AnimatedNumber({
  value,
  duration = 0.9,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [count, value, duration]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
