"use client";

import { MotionConfig } from "motion/react";

/** Honors prefers-reduced-motion for every Motion animation below it. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
