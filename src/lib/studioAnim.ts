// Entrance-animation math for the Studio design editor. An element's saved x/y/opacity/scale
// (what render() draws normally) is always the animation's *end* pose; this module computes
// where it should be at any given moment before that, so the same math drives both the live
// preview (Konva.Animation, real time) and the deterministic frame-by-frame GIF export.

export type AnimType =
  | "none"
  | "fade-in"
  | "slide-in-left"
  | "slide-in-right"
  | "slide-in-top"
  | "slide-in-bottom"
  | "scale-in"
  | "bounce-in";

export type ExitType = "none" | "fade-out" | "slide-out-left" | "slide-out-right" | "slide-out-top" | "slide-out-bottom" | "scale-out";

export const EXIT_OPTIONS: { id: ExitType; label: string }[] = [
  { id: "none", label: "None" },
  { id: "fade-out", label: "Fade out" },
  { id: "slide-out-left", label: "Slide out to left" },
  { id: "slide-out-right", label: "Slide out to right" },
  { id: "slide-out-top", label: "Slide out to top" },
  { id: "slide-out-bottom", label: "Slide out to bottom" },
  { id: "scale-out", label: "Scale out" },
];

export type EmphasisType = "none" | "pulse" | "shake" | "wiggle";

export const EMPHASIS_OPTIONS: { id: EmphasisType; label: string }[] = [
  { id: "none", label: "None" },
  { id: "pulse", label: "Pulse" },
  { id: "shake", label: "Shake" },
  { id: "wiggle", label: "Wiggle (rotate)" },
];

export interface ElementAnim {
  type: AnimType;
  durationMs: number;
  delayMs: number;
  /** Exit plays after the element has been resting at its end pose for a while: it starts
   * exitDelayMs after the scene begins and animates OUT to the mirror of its own entrance
   * start pose, then the element stays hidden for the rest of the scene, exactly like a real
   * exit transition rather than just re-running the entrance backwards forever. */
  exitType?: ExitType;
  exitDurationMs?: number;
  exitDelayMs?: number;
  /** Emphasis plays once, in place, while the element is resting between its entrance and any
   * exit: a pulse/shake/wiggle draws attention without moving the element's resting position. */
  emphasisType?: EmphasisType;
  emphasisDurationMs?: number;
  emphasisDelayMs?: number;
}

export const ANIM_OPTIONS: { id: AnimType; label: string }[] = [
  { id: "none", label: "None (static)" },
  { id: "fade-in", label: "Fade in" },
  { id: "slide-in-left", label: "Slide in from left" },
  { id: "slide-in-right", label: "Slide in from right" },
  { id: "slide-in-top", label: "Slide in from top" },
  { id: "slide-in-bottom", label: "Slide in from bottom" },
  { id: "scale-in", label: "Scale in" },
  { id: "bounce-in", label: "Bounce in" },
];

export interface AnimPose {
  x: number;
  y: number;
  opacity: number;
  scaleX: number;
  scaleY: number;
}

function easeOutCubic(p: number): number {
  return 1 - Math.pow(1 - p, 3);
}

// A gentle overshoot ease (passes 1 then settles back), used for "bounce in" so it actually
// reads as a bounce rather than just a faster fade/scale.
function easeOutBack(p: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

function startPoseFor(type: AnimType, end: AnimPose, canvasWidth: number, canvasHeight: number): AnimPose {
  const slide = Math.max(canvasWidth, canvasHeight) * 0.28;
  switch (type) {
    case "fade-in":
      return { ...end, opacity: 0 };
    case "slide-in-left":
      return { ...end, x: end.x - slide, opacity: 0 };
    case "slide-in-right":
      return { ...end, x: end.x + slide, opacity: 0 };
    case "slide-in-top":
      return { ...end, y: end.y - slide, opacity: 0 };
    case "slide-in-bottom":
      return { ...end, y: end.y + slide, opacity: 0 };
    case "scale-in":
    case "bounce-in":
      return { ...end, scaleX: end.scaleX * 0.05, scaleY: end.scaleY * 0.05, opacity: 0 };
    default:
      return end;
  }
}

// Exit poses mirror the entrance start poses (same direction/shrink), just used as the target
// to animate TOWARD instead of the pose to animate FROM.
function exitPoseFor(type: ExitType, end: AnimPose, canvasWidth: number, canvasHeight: number): AnimPose {
  const slide = Math.max(canvasWidth, canvasHeight) * 0.28;
  switch (type) {
    case "fade-out":
      return { ...end, opacity: 0 };
    case "slide-out-left":
      return { ...end, x: end.x - slide, opacity: 0 };
    case "slide-out-right":
      return { ...end, x: end.x + slide, opacity: 0 };
    case "slide-out-top":
      return { ...end, y: end.y - slide, opacity: 0 };
    case "slide-out-bottom":
      return { ...end, y: end.y + slide, opacity: 0 };
    case "scale-out":
      return { ...end, scaleX: end.scaleX * 0.05, scaleY: end.scaleY * 0.05, opacity: 0 };
    default:
      return end;
  }
}

/** An in-place attention effect layered on top of whatever pose the element is otherwise at
 * (its resting end pose): a pulse (scale bump), shake (horizontal jitter), or wiggle (rotation
 * jitter), all decaying back to nothing by the end of their own duration so they don't leave
 * the element offset afterward. Rotation is applied by the caller (Konva node rotation is a
 * separate property from AnimPose), so this returns an extra rotation delta alongside the pose. */
function emphasisDelta(
  type: EmphasisType,
  p: number,
  canvasWidth: number,
  canvasHeight: number
): { dx: number; dy: number; scaleMul: number; rotationDeg: number } {
  if (type === "none") return { dx: 0, dy: 0, scaleMul: 1, rotationDeg: 0 };
  // A full sine cycle across the effect's own duration, with an envelope that fades the swing
  // in and back out so it reads as one deliberate beat, not an abrupt jolt or a hard stop.
  const envelope = Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
  const cycles = type === "shake" ? 5 : 2;
  const wave = Math.sin(p * Math.PI * 2 * cycles) * envelope;
  if (type === "pulse") return { dx: 0, dy: 0, scaleMul: 1 + wave * 0.12, rotationDeg: 0 };
  if (type === "shake") return { dx: wave * Math.max(canvasWidth, canvasHeight) * 0.015, dy: 0, scaleMul: 1, rotationDeg: 0 };
  if (type === "wiggle") return { dx: 0, dy: 0, scaleMul: 1, rotationDeg: wave * 6 };
  return { dx: 0, dy: 0, scaleMul: 1, rotationDeg: 0 };
}

/** Pose of one element at time tMs (ms since the scene/preview/export started), including an
 * optional rotation delta (emphasis only; entrance/exit never touch rotation). Layered in
 * order: entrance first, then exit once its own window starts (the element stays hidden after
 * exit finishes), and emphasis only while resting between the two. */
export function computeAnimPose(
  base: { x: number; y: number; opacity: number; scaleX: number; scaleY: number },
  anim: ElementAnim | undefined,
  tMs: number,
  canvasWidth: number,
  canvasHeight: number
): AnimPose & { rotationDeg: number } {
  const end: AnimPose = { x: base.x, y: base.y, opacity: base.opacity, scaleX: base.scaleX, scaleY: base.scaleY };
  if (!anim) return { ...end, rotationDeg: 0 };

  const hasEntrance = anim.type !== "none" && anim.durationMs > 0;
  const entranceEndMs = hasEntrance ? anim.delayMs + anim.durationMs : 0;

  if (hasEntrance && tMs <= anim.delayMs) {
    return { ...startPoseFor(anim.type, end, canvasWidth, canvasHeight), rotationDeg: 0 };
  }
  if (hasEntrance && tMs - anim.delayMs < anim.durationMs) {
    const p = (tMs - anim.delayMs) / anim.durationMs;
    const start = startPoseFor(anim.type, end, canvasWidth, canvasHeight);
    const eased = anim.type === "bounce-in" ? easeOutBack(p) : easeOutCubic(p);
    return {
      x: start.x + (end.x - start.x) * eased,
      y: start.y + (end.y - start.y) * eased,
      opacity: Math.min(1, Math.max(0, start.opacity + (end.opacity - start.opacity) * eased)),
      scaleX: start.scaleX + (end.scaleX - start.scaleX) * eased,
      scaleY: start.scaleY + (end.scaleY - start.scaleY) * eased,
      rotationDeg: 0,
    };
  }

  // Past the entrance (or there was none): check exit next, it takes priority over emphasis
  // since a hidden/exiting element shouldn't also be pulsing.
  const hasExit = anim.exitType && anim.exitType !== "none" && (anim.exitDurationMs ?? 0) > 0;
  if (hasExit) {
    const exitStart = anim.exitDelayMs ?? Math.max(entranceEndMs, 0);
    const exitDur = anim.exitDurationMs ?? 500;
    if (tMs >= exitStart + exitDur) {
      // Exit finished: the element has left the scene, stays fully transparent.
      return { ...end, opacity: 0, rotationDeg: 0 };
    }
    if (tMs >= exitStart) {
      const p = (tMs - exitStart) / exitDur;
      const eased = easeOutCubic(p);
      const target = exitPoseFor(anim.exitType!, end, canvasWidth, canvasHeight);
      return {
        x: end.x + (target.x - end.x) * eased,
        y: end.y + (target.y - end.y) * eased,
        opacity: Math.min(1, Math.max(0, end.opacity + (target.opacity - end.opacity) * eased)),
        scaleX: end.scaleX + (target.scaleX - end.scaleX) * eased,
        scaleY: end.scaleY + (target.scaleY - end.scaleY) * eased,
        rotationDeg: 0,
      };
    }
  }

  // Resting: apply emphasis if this is its moment, otherwise the plain end pose.
  const hasEmphasis = anim.emphasisType && anim.emphasisType !== "none" && (anim.emphasisDurationMs ?? 0) > 0;
  if (hasEmphasis) {
    const emStart = anim.emphasisDelayMs ?? entranceEndMs;
    const emDur = anim.emphasisDurationMs ?? 600;
    if (tMs >= emStart && tMs < emStart + emDur) {
      const p = (tMs - emStart) / emDur;
      const d = emphasisDelta(anim.emphasisType!, p, canvasWidth, canvasHeight);
      return {
        x: end.x + d.dx,
        y: end.y + d.dy,
        opacity: end.opacity,
        scaleX: end.scaleX * d.scaleMul,
        scaleY: end.scaleY * d.scaleMul,
        rotationDeg: d.rotationDeg,
      };
    }
  }

  return { ...end, rotationDeg: 0 };
}

/** How long the whole scene's choreography takes, across every animated element's entrance,
 * emphasis, and exit. */
export function sceneMaxEndMs(anims: (ElementAnim | undefined)[]): number {
  let max = 0;
  for (const a of anims) {
    if (!a) continue;
    if (a.type !== "none") max = Math.max(max, a.delayMs + a.durationMs);
    if (a.emphasisType && a.emphasisType !== "none") {
      max = Math.max(max, (a.emphasisDelayMs ?? a.delayMs + a.durationMs) + (a.emphasisDurationMs ?? 600));
    }
    if (a.exitType && a.exitType !== "none") {
      max = Math.max(max, (a.exitDelayMs ?? a.delayMs + a.durationMs) + (a.exitDurationMs ?? 500));
    }
  }
  return max;
}
