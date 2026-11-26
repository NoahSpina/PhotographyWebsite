"use client";

import { useEffect, useRef } from "react";

const SECONDS_PER_FRAME = 12;
const RESUME_AFTER_MS = 2500;
const DRAG_THRESHOLD_PX = 6;
const SPEED_EASING = 5;
const FLING_DECAY = 4;
const FLING_MAX_AGE_MS = 80;
const WHEEL_LINE_PX = 16;

type DragState = {
  pointerId: number;
  startX: number;
  startOffset: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  active: boolean;
};

/**
 * Drifts a track of two identical reels to the left forever, and lets people
 * scroll it themselves with a horizontal swipe, Shift+wheel, or a drag.
 * Autoplay eases back in a moment after they let go.
 */
export function useReelScroll({ frameCount, paused }: { frameCount: number; paused: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const section = sectionRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const reel = track?.firstElementChild;
    if (!section || !viewport || !track || !(reel instanceof HTMLElement) || frameCount === 0) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let loopWidth = reel.offsetWidth;
    let offset = 0;
    let speed = 0;
    let fling = 0;
    let hovered = false;
    let focused = false;
    let lastInput = Number.NEGATIVE_INFINITY;
    let drag: DragState | null = null;
    let suppressClick = false;
    let frame = 0;
    let lastTick = 0;

    const render = () => {
      if (loopWidth > 0) offset = ((offset % loopWidth) + loopWidth) % loopWidth;
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    };

    const tick = (now: number) => {
      const dt = lastTick ? Math.min((now - lastTick) / 1000, 0.1) : 0;
      lastTick = now;

      const drifting =
        !drag &&
        !hovered &&
        !focused &&
        !pausedRef.current &&
        !reducedMotion.matches &&
        now - lastInput > RESUME_AFTER_MS;
      const target = drifting ? loopWidth / (frameCount * SECONDS_PER_FRAME) : 0;
      speed += (target - speed) * (1 - Math.exp(-SPEED_EASING * dt));
      fling *= Math.exp(-FLING_DECAY * dt);
      if (Math.abs(fling) < 1) fling = 0;

      offset += (speed + fling) * dt;
      render();
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (frame) return;
      lastTick = 0;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const onWheel = (event: WheelEvent) => {
      const horizontal = event.shiftKey
        ? event.deltaX || event.deltaY
        : Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : 0;
      if (!horizontal) return;
      // Also stops the browser treating a sideways swipe as Back/Forward.
      event.preventDefault();
      const unit = event.deltaMode === 1 ? WHEEL_LINE_PX : event.deltaMode === 2 ? viewport.clientWidth : 1;
      offset += horizontal * unit;
      fling = 0;
      lastInput = performance.now();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startOffset: offset,
        lastX: event.clientX,
        lastTime: event.timeStamp,
        velocity: 0,
        active: false,
      };
      fling = 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const dx = event.clientX - drag.startX;
      if (!drag.active) {
        if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
        drag.active = true;
        section.setPointerCapture(event.pointerId);
      }
      offset = drag.startOffset - dx;
      const elapsed = event.timeStamp - drag.lastTime;
      if (elapsed > 0) {
        const velocity = (-(event.clientX - drag.lastX) / elapsed) * 1000;
        drag.velocity = drag.velocity * 0.2 + velocity * 0.8;
      }
      drag.lastX = event.clientX;
      drag.lastTime = event.timeStamp;
      lastInput = performance.now();
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      if (drag.active) {
        if (event.timeStamp - drag.lastTime < FLING_MAX_AGE_MS) fling = drag.velocity;
        lastInput = performance.now();
        if (event.type === "pointerup") {
          suppressClick = true;
          window.setTimeout(() => {
            suppressClick = false;
          }, 0);
        }
      }
      drag = null;
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    };

    const onPointerEnter = (event: PointerEvent) => {
      if (event.pointerType === "mouse") hovered = true;
    };
    const onPointerLeave = () => {
      hovered = false;
    };
    // Keyboard focus can land on a photo that has drifted off-screen. Center it,
    // staying within the first reel, which holds every focusable photo.
    const onFocusIn = (event: FocusEvent) => {
      focused = true;
      if (!(event.target instanceof HTMLElement)) return;
      viewport.scrollLeft = 0;
      const box = event.target.getBoundingClientRect();
      const view = viewport.getBoundingClientRect();
      if (box.left >= view.left && box.right <= view.right) return;
      const left = box.left - track.getBoundingClientRect().left;
      offset = Math.max(0, left + box.width / 2 - view.width / 2);
      render();
    };
    // Any scroll the browser does to reveal focus becomes reel movement instead.
    const onViewportScroll = () => {
      if (!viewport.scrollLeft) return;
      offset += viewport.scrollLeft;
      viewport.scrollLeft = 0;
      render();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node && viewport.contains(event.relatedTarget))) focused = false;
    };

    const resizeObserver = new ResizeObserver(() => {
      loopWidth = reel.offsetWidth;
    });
    resizeObserver.observe(reel);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) start();
      else stop();
    });
    visibilityObserver.observe(section);

    section.addEventListener("wheel", onWheel, { passive: false });
    section.addEventListener("pointerdown", onPointerDown);
    section.addEventListener("pointermove", onPointerMove);
    section.addEventListener("pointerup", onPointerEnd);
    section.addEventListener("pointercancel", onPointerEnd);
    section.addEventListener("click", onClickCapture, true);
    viewport.addEventListener("pointerenter", onPointerEnter);
    viewport.addEventListener("pointerleave", onPointerLeave);
    viewport.addEventListener("focusin", onFocusIn);
    viewport.addEventListener("focusout", onFocusOut);
    viewport.addEventListener("scroll", onViewportScroll);

    return () => {
      stop();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      section.removeEventListener("wheel", onWheel);
      section.removeEventListener("pointerdown", onPointerDown);
      section.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("pointerup", onPointerEnd);
      section.removeEventListener("pointercancel", onPointerEnd);
      section.removeEventListener("click", onClickCapture, true);
      viewport.removeEventListener("pointerenter", onPointerEnter);
      viewport.removeEventListener("pointerleave", onPointerLeave);
      viewport.removeEventListener("focusin", onFocusIn);
      viewport.removeEventListener("focusout", onFocusOut);
      viewport.removeEventListener("scroll", onViewportScroll);
    };
  }, [frameCount]);

  return { sectionRef, viewportRef, trackRef };
}
