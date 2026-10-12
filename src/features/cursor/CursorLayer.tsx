import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRoute } from "../../lib/router";
import { useTuning } from "../../tuning/useTuning";
import { CURSOR_CONFIG, CURSOR_PANEL } from "./cursorConfig";
import "./cursor.css";

/** Reactive to hover/pointer capability changes, e.g. a convertible laptop
 * docking/undocking a mouse. Fine-pointer-only, as required for a cursor
 * that assumes hover and precise positioning. */
function useFinePointer(): boolean {
  const [fine, setFine] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onChange = () => setFine(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return fine;
}

const CLICKABLE_SELECTOR =
  'a[href], button:not(:disabled), [role="button"], summary, select, label[for], input[type="checkbox"], input[type="radio"], input[type="submit"], input[type="button"]';

/** Text node under a point: the caret API resolves the nearest character, so the
 * hit only counts when the point is inside one of that node's line boxes. */
function textElementAt(x: number, y: number): HTMLElement | null {
  let node: Node | null = null;
  if (document.caretPositionFromPoint) {
    node = document.caretPositionFromPoint(x, y)?.offsetNode ?? null;
  } else if (document.caretRangeFromPoint) {
    node = document.caretRangeFromPoint(x, y)?.startContainer ?? null;
  }
  if (!(node instanceof Text) || !node.data.trim()) return null;
  const owner = node.parentElement;
  if (!owner || getComputedStyle(owner).userSelect === "none" || owner.closest(`${CLICKABLE_SELECTOR}, [data-cursor="default"]`)) return null;
  const range = document.createRange();
  range.selectNodeContents(node);
  for (const r of range.getClientRects()) {
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return owner;
  }
  return null;
}
/**
 * The dot cursor, ported in spirit from ditto's `public/app.js`. Mount once
 * at the app root. Native cursor is hidden only while a fine pointer is
 * active; fully inert on touch.
 */
export function CursorLayer() {
  const tuning = useTuning(CURSOR_PANEL, CURSOR_CONFIG);
  const tuningRef = useRef(tuning);
  tuningRef.current = tuning;
  const fine = useFinePointer();
  const route = useRoute();

  const dotRef = useRef<HTMLDivElement>(null);
  /** Re-reads the surface under a resting pointer; set while the cursor is mounted. */
  const resyncRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("cur-active", fine);
    return () => document.documentElement.classList.remove("cur-active");
  }, [fine]);

  useEffect(() => {
    if (!fine) return;
    const dot = dotRef.current;
    if (!dot) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let rawX = window.innerWidth / 2;
    let rawY = window.innerHeight / 2;
    let curX = rawX;
    let curY = rawY;
    let frame = 0;
    let visible = false;
    let pressed = false;
    let isLight = false;
    let isHover = false;
    /** Element whose text the caret is over; null when the dot is a dot. */
    let textEl: HTMLElement | null = null;
    let textExitTimer = 0;
    // Set while a control (Let's chat) has swallowed the dot: the dot is pulled into this point.
    let absorbAt: { x: number; y: number } | null = null;

    const paint = (): void => {
      frame = 0;
      const follow = reducedMotion ? 1 : 1 - tuningRef.current.dot.smoothing;
      const tx = absorbAt ? absorbAt.x : rawX;
      const ty = absorbAt ? absorbAt.y : rawY;
      // Absorbed: a softer pull, so the dot visibly drifts into the circle.
      const k = absorbAt && !reducedMotion ? 0.18 : follow;
      curX += (tx - curX) * k;
      curY += (ty - curY) * k;
      dot.style.transform = `translate3d(${curX.toFixed(2)}px, ${curY.toFixed(2)}px, 0) translate(-50%, -50%)`;
      if (Math.abs(tx - curX) > 0.05 || Math.abs(ty - curY) > 0.05)
        frame = requestAnimationFrame(paint);
    };
    const request = (): void => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const show = (): void => {
      if (visible) return;
      visible = true;
      dot.classList.add("is-visible");
    };
    const hide = (): void => {
      if (!visible) return;
      visible = false;
      dot.classList.remove("is-visible");
    };

    const applyOwner = (owner: HTMLElement | null): void => {
      const light = owner?.dataset.surface === "light";
      if (light === isLight) return;
      isLight = light;
      dot.classList.toggle("is-light", light);
    };
    // Innermost visible surface whose box holds the pointer. Needed wherever
    // hit-testing can't be trusted: during a View Transition every hit (and the
    // synthetic pointer events browsers send when the page changes under a still
    // mouse) lands on <html>, which has no surface.
    const surfaceAtPointer = (): HTMLElement | null => {
      let owner: HTMLElement | null = null;
      for (const el of document.querySelectorAll<HTMLElement>(
        "[data-surface]",
      )) {
        const r = el.getBoundingClientRect();
        if (
          rawX < r.left ||
          rawX >= r.right ||
          rawY < r.top ||
          rawY >= r.bottom
        )
          continue;
        if (
          !el.checkVisibility({
            opacityProperty: true,
            visibilityProperty: true,
          })
        )
          continue;
        if (!owner || owner.contains(el)) owner = el;
      }
      return owner;
    };
    const applySurface = (target: EventTarget | null): void => {
      const owner =
        target instanceof Element
          ? target.closest<HTMLElement>("[data-surface]")
          : null;
      applyOwner(owner ?? surfaceAtPointer());
    };

    const applyHover = (target: EventTarget | null): void => {
      const hover =
        target instanceof Element &&
        Boolean(target.closest(CLICKABLE_SELECTOR));
      if (hover === isHover) return;
      isHover = hover;
      dot.classList.toggle("is-hover", hover);
    };

    const applyText = (): void => {
      const el = isHover || absorbAt ? null : textElementAt(rawX, rawY);
      if (el === textEl) return;
      if (el) {
        const t = tuningRef.current;
        const fontSize = parseFloat(getComputedStyle(el).fontSize) || 16;
        const w = t.text.width;
        const h = Math.max(t.dot.size, fontSize * t.text.height);
        const s = dot.style;
        s.setProperty("--cur-line-w", `${w}px`);
        s.setProperty("--cur-line-h", `${h}px`);
        // Unitless ratios: the dot stretches to the caret's box, the caret starts at the dot's.
        s.setProperty("--cur-tx", String(w / t.dot.size));
        s.setProperty("--cur-ty", String(h / t.dot.size));
        s.setProperty("--cur-ix", String(t.dot.size / w));
        s.setProperty("--cur-iy", String(t.dot.size / h));
      }
      const leaving = Boolean(textEl) && !el;
      textEl = el;
      dot.classList.toggle("is-text", Boolean(el));
      // The way back uses the preset's timing too, not the hover timing.
      window.clearTimeout(textExitTimer);
      dot.classList.toggle("is-text-exit", leaving);
      if (leaving)
        textExitTimer = window.setTimeout(
          () => dot.classList.remove("is-text-exit"),
          tuningRef.current.text.durationMs + 50,
        );
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerType !== "mouse") return;
      rawX = event.clientX;
      rawY = event.clientY;
      show();
      request();
      applySurface(event.target);
      applyHover(event.target);
      applyText();
    };
    const onPointerOver = (event: PointerEvent): void => {
      if (event.pointerType !== "mouse") return;
      applySurface(event.target);
      applyHover(event.target);
      applyText();
    };
    // Content scrolling under a resting pointer changes what it is over.
    const onScroll = (): void => {
      if (visible) applyText();
    };
    const onPointerDown = (event: PointerEvent): void => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      pressed = true;
      dot.classList.add("is-pressed");
    };
    const endPress = (): void => {
      if (!pressed) return;
      pressed = false;
      dot.classList.remove("is-pressed");
    };
    const onPointerLeaveWindow = (event: PointerEvent): void => {
      if (event.relatedTarget !== null) return;
      hide();
      endPress();
    };
    const onBlur = (): void => {
      hide();
      endPress();
    };
    // A page switch swaps the surface under a pointer that has not moved, so no
    // pointer event fires. The style flush commits the new colour while
    // `is-instant` has the fade off.
    resyncRef.current = (): void => {
      if (!visible) return;
      dot.classList.add("is-instant");
      applyOwner(surfaceAtPointer());
      void getComputedStyle(dot, "::before").backgroundColor;
      dot.classList.remove("is-instant");
    };

    const onAbsorb = (event: Event): void => {
      const { x, y } = (event as CustomEvent<{ x: number; y: number }>).detail;
      absorbAt = { x, y };
      dot.classList.remove("is-emerging");
      dot.classList.add("is-absorbed");
      request();
      applyText();
    };
    const onRelease = (): void => {
      if (!absorbAt) return;
      absorbAt = null;
      dot.classList.remove("is-absorbed");
      // Restart the drip-out keyframes.
      dot.classList.remove("is-emerging");
      void dot.offsetWidth;
      dot.classList.add("is-emerging");
      request();
    };
    const onEmerged = (event: AnimationEvent): void => {
      if (event.animationName === "cur-emerge")
        dot.classList.remove("is-emerging");
    };

    const onHide = (): void => dot.classList.add("is-hidden");
    const onShow = (): void => dot.classList.remove("is-hidden");

    window.addEventListener("cursor:hide", onHide);
    window.addEventListener("cursor:show", onShow);
    window.addEventListener("cursor:absorb", onAbsorb);
    window.addEventListener("cursor:release", onRelease);
    dot.addEventListener("animationend", onEmerged);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("pointerover", onPointerOver, { passive: true });
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", endPress);
    window.addEventListener("pointercancel", endPress);
    window.addEventListener("pointerout", onPointerLeaveWindow);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("cursor:hide", onHide);
      window.removeEventListener("cursor:show", onShow);
      window.removeEventListener("cursor:absorb", onAbsorb);
      window.removeEventListener("cursor:release", onRelease);
      dot.removeEventListener("animationend", onEmerged);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.clearTimeout(textExitTimer);
      window.removeEventListener("pointerover", onPointerOver);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", endPress);
      window.removeEventListener("pointercancel", endPress);
      window.removeEventListener("pointerout", onPointerLeaveWindow);
      window.removeEventListener("blur", onBlur);
      if (frame) cancelAnimationFrame(frame);
      resyncRef.current = null;
    };
  }, [fine, route]);

  // Runs inside the route commit (also inside a View Transition's update), so the
  // colour is already right when the new page is first painted.
  useLayoutEffect(() => {
    resyncRef.current?.();
  }, [route]);

  if (!fine) return null;

  return (
    <div
      ref={dotRef}
      className="cur-dot"
      data-text-preset={tuning.text.preset}
      aria-hidden="true"
      style={{
        ["--cur-size" as string]: `${tuning.dot.size}px`,
        ["--cur-pressed-scale" as string]: tuning.dot.pressedScale,
        ["--cur-color-dark" as string]: tuning.dot.colorDark,
        ["--cur-color-light" as string]: tuning.dot.colorLight,
        ["--cur-hover-scale" as string]: tuning.hover.scale,
        ["--cur-hover-opacity" as string]: tuning.hover.opacity,
        ["--cur-hover-ms" as string]: `${tuning.hover.durationMs}ms`,
        ["--cur-text-ms" as string]: `${tuning.text.durationMs}ms`,
        ["--cur-text-opacity" as string]: tuning.text.opacity,
      }}
    />
  );
}
