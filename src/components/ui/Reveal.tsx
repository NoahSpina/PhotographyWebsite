"use client";

import { motion } from "motion/react";
import { EASE_LUXE } from "@/lib/motion";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Seconds to wait after the element scrolls into view. */
  delay?: number;
  /** Starting offset in pixels; the element lifts into place from here. */
  y?: number;
};

/** Fades and lifts its children into place the first time they scroll into view. */
export function Reveal({ children, className, delay = 0, y = 28 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1.1, ease: EASE_LUXE, delay }}
    >
      {children}
    </motion.div>
  );
}
