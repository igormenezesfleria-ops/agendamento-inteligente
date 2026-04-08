/**
 * Synton Biomechanics Engine — MVP Baseline
 *
 * Simple real-time evaluation of MediaPipe Pose landmarks.
 * Only evaluates basic angle checks and distance comparisons.
 * No gamification, no standing gates, no plumb lines.
 */

import { type MovementPattern, type AffectedSegment } from './biomechanicsTemplates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Point3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export type Severity = 'ok' | 'warning' | 'critical';

export interface FrameWarning {
  errorId: string;
  errorName: string;
  coachMessage: string;
  affectedSegments: AffectedSegment[];
  severity: Severity;
  value: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// MediaPipe Pose landmark index map (33 landmarks)
// ---------------------------------------------------------------------------

const LANDMARK: Record<string, number> = {
  EAR: 7,
  SHOULDER: 12,
  ELBOW: 14,
  WRIST: 16,
  HIP: 24,
  KNEE: 26,
  ANKLE: 28,
  HEEL: 30,
  FOOT_INDEX: 32,

  L_SHOULDER: 11,
  L_ELBOW: 13,
  L_WRIST: 15,
  L_HIP: 23,
  L_KNEE: 25,
  L_ANKLE: 27,
  L_HEEL: 29,
  L_FOOT_INDEX: 31,
};

// ---------------------------------------------------------------------------
// Patterns that should use 2D-only math (lateral / side-profile view)
// ---------------------------------------------------------------------------

const LATERAL_PATTERNS = new Set([
  'ISOLATION_ARM',
  'ISOLATION_SHOULDER',
  'CORE_PLANK',
  'HINGE',
  'PULL_VERTICAL',
  'PUSH_HORIZONTAL',
  'SQUAT_LATERAL',
]);

// ---------------------------------------------------------------------------
// Camera placement hints per pattern
// ---------------------------------------------------------------------------

export type CameraHint = { emoji: string; text: string };

const CAMERA_HINTS: Record<string, CameraHint> = {
  SQUAT_BILATERAL: { emoji: '📍', text: 'Grave na DIAGONAL ou de FRENTE.' },
  SQUAT_FRONTAL: { emoji: '📍', text: 'Grave de FRENTE.' },
  SQUAT_LATERAL: { emoji: '📍', text: 'Grave de LADO (Perfil).' },
  PUSH_HORIZONTAL: { emoji: '📍', text: 'Grave de LADO (Perfil).' },
  PULL_VERTICAL: { emoji: '📍', text: 'Grave de LADO (Perfil).' },
  HINGE: { emoji: '📍', text: 'Grave de LADO (Perfil).' },
  ISOLATION_ARM: { emoji: '📍', text: 'Grave de LADO (Perfil).' },
  ISOLATION_SHOULDER: { emoji: '📍', text: 'Grave de LADO (Perfil).' },
  CORE_PLANK: { emoji: '📍', text: 'Grave de LADO (Perfil).' },
};

export function getCameraHint(patternId: string | undefined): CameraHint | null {
  if (!patternId) return null;
  return CAMERA_HINTS[patternId] ?? null;
}

// ---------------------------------------------------------------------------
// 1. calculateAngle3D — 3-point angle via dot-product (uses X, Y, Z)
// ---------------------------------------------------------------------------

export function calculateAngle3D(a: Point3D, b: Point3D, c: Point3D): number {
  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2);
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2);

  if (magBA === 0 || magBC === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

// ---------------------------------------------------------------------------
// 2. calculateAngle2D — 3-point angle via atan2 (uses ONLY X, Y)
// ---------------------------------------------------------------------------

export function calculateAngle2D(a: Point3D, b: Point3D, c: Point3D): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

// ---------------------------------------------------------------------------
// 3. Simple Valgus check (bilateral distance comparison)
// ---------------------------------------------------------------------------

export function isFrontalView(leftKnee: Point3D, rightKnee: Point3D): boolean {
  return Math.abs(leftKnee.z - rightKnee.z) <= 0.2;
}

export function checkDynamicValgus(
  leftKnee: Point3D,
  rightKnee: Point3D,
  leftAnkle: Point3D,
  rightAnkle: Point3D,
): boolean {
  if (!isFrontalView(leftKnee, rightKnee)) return false;

  const kneeDistance = Math.abs(leftKnee.x - rightKnee.x);
  const ankleDistance = Math.abs(leftAnkle.x - rightAnkle.x);

  return kneeDistance < ankleDistance * 0.85;
}

// ---------------------------------------------------------------------------
// 4. Frame debounce — requires N consecutive frames to change state
// ---------------------------------------------------------------------------

const DEBOUNCE_FRAMES = 3;

const debounceCounters: Map<string, number> = new Map();
const activeStates: Map<string, FrameWarning> = new Map();

function debounceWarnings(rawWarnings: FrameWarning[]): FrameWarning[] {
  const currentIds = new Set(rawWarnings.map(w => `${w.errorId}:${w.severity}`));

  for (const w of rawWarnings) {
    const key = `${w.errorId}:${w.severity}`;
    debounceCounters.set(key, (debounceCounters.get(key) ?? 0) + 1);
  }

  for (const key of Array.from(debounceCounters.keys())) {
    if (!currentIds.has(key)) {
      const count = (debounceCounters.get(key) ?? 0) - 1;
      if (count <= 0) {
        debounceCounters.delete(key);
        const errorId = key.split(':')[0];
        activeStates.delete(errorId);
      } else {
        debounceCounters.set(key, count);
      }
    }
  }

  for (const w of rawWarnings) {
    const key = `${w.errorId}:${w.severity}`;
    if ((debounceCounters.get(key) ?? 0) >= DEBOUNCE_FRAMES) {
      activeStates.set(w.errorId, w);
    }
  }

  return Array.from(activeStates.values());
}

// ---------------------------------------------------------------------------
// 5. Visibility gate helpers
// ---------------------------------------------------------------------------

const MIN_VISIBILITY = 0.65;

function jointsVisible(landmarks: Point3D[], joints: string[], threshold = MIN_VISIBILITY): boolean {
  for (const j of joints) {
    const idx = LANDMARK[j];
    if (idx === undefined) return false;
    const lm = landmarks[idx];
    if (!lm || (lm.visibility ?? 0) < threshold) return false;
  }
  return true;
}

const KEY_BODY_INDICES = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

export function isBodyInFrame(landmarks: Point3D[], ratio = 0.6): boolean {
  if (!landmarks || landmarks.length < 33) return false;
  let visible = 0;
  for (const idx of KEY_BODY_INDICES) {
    if (landmarks[idx] && (landmarks[idx].visibility ?? 0) >= MIN_VISIBILITY) visible++;
  }
  return visible / KEY_BODY_INDICES.length >= ratio;
}

// ---------------------------------------------------------------------------
// 6. evaluateFrame — simple real-time evaluation
// ---------------------------------------------------------------------------

function resolve(landmarks: Point3D[], joint: string): Point3D {
  const idx = LANDMARK[joint];
  if (idx !== undefined && landmarks[idx]) return landmarks[idx];
  return { x: 0, y: 0, z: 0, visibility: 0 };
}

function pickAngleFn(patternName: string | undefined): (a: Point3D, b: Point3D, c: Point3D) => number {
  if (patternName && LATERAL_PATTERNS.has(patternName)) {
    return calculateAngle2D;
  }
  return calculateAngle3D;
}

export function evaluateFrame(
  landmarks: Point3D[],
  activeTemplate: MovementPattern | null | undefined,
  patternId?: string,
): FrameWarning[] {
  if (!activeTemplate || !landmarks || landmarks.length < 33) return [];

  // Global visibility gate
  if (!isBodyInFrame(landmarks)) return [];

  const angleFn = pickAngleFn(patternId);
  const rawWarnings: FrameWarning[] = [];

  const pushWarning = (
    rule: { id: string; name: string; coachMessage: string; affectedSegments: AffectedSegment[] },
    severity: Severity,
    coachMessage: string,
    value: number,
    limit: number,
  ) => {
    rawWarnings.push({
      errorId: rule.id,
      errorName: rule.name,
      coachMessage,
      affectedSegments: rule.affectedSegments,
      severity,
      value,
      limit,
    });
  };

  for (const rule of activeTemplate.errors) {
    if (rule.joints.length > 0 && !jointsVisible(landmarks, rule.joints)) continue;

    switch (rule.type) {
      case 'ANGLE_3D': {
        if (rule.joints.length < 3) break;
        const a = resolve(landmarks, rule.joints[0]);
        const b = resolve(landmarks, rule.joints[1]);
        const c = resolve(landmarks, rule.joints[2]);
        const angle = angleFn(a, b, c);

        if (rule.minSafeAngle !== undefined && angle < rule.minSafeAngle) {
          const deficit = rule.minSafeAngle - angle;
          const severity: Severity = deficit > 15 ? 'critical' : 'warning';
          const msg = severity === 'critical' ? `🚨 ${rule.coachMessage}` : rule.coachMessage;
          pushWarning(rule, severity, msg, angle, rule.minSafeAngle);
        }
        if (rule.maxSafeAngle !== undefined && angle > rule.maxSafeAngle) {
          const excess = angle - rule.maxSafeAngle;
          const severity: Severity = excess > 15 ? 'critical' : 'warning';
          const msg = severity === 'critical' ? `🚨 ${rule.coachMessage}` : rule.coachMessage;
          pushWarning(rule, severity, msg, angle, rule.maxSafeAngle);
        }
        break;
      }

      case 'X_AXIS_COMPARE': {
        if (rule.threshold === 'KNEES_CLOSER_THAN_ANKLES') {
          if (!jointsVisible(landmarks, ['L_KNEE', 'KNEE', 'L_ANKLE', 'ANKLE'])) break;
          const lk = resolve(landmarks, 'L_KNEE');
          const rk = resolve(landmarks, 'KNEE');
          const la = resolve(landmarks, 'L_ANKLE');
          const ra = resolve(landmarks, 'ANKLE');

          const valgus = checkDynamicValgus(lk, rk, la, ra);
          if (valgus) {
            const kneeD = Math.abs(lk.x - rk.x);
            const ankleD = Math.abs(la.x - ra.x);
            const ratio = kneeD / ankleD;
            const sev: Severity = ratio < 0.70 ? 'critical' : 'warning';
            pushWarning(rule, sev, sev === 'critical' ? `🚨 ${rule.coachMessage}` : rule.coachMessage, kneeD, ankleD);
          }
          break;
        }
        if (rule.joints.length >= 2) {
          const j0 = resolve(landmarks, rule.joints[0]);
          const j1 = resolve(landmarks, rule.joints[1]);
          const diff = j0.x - j1.x;
          if (rule.threshold?.includes('FORWARD') && diff > 0.05) {
            const sev: Severity = diff > 0.10 ? 'critical' : 'warning';
            pushWarning(rule, sev, sev === 'critical' ? `🚨 ${rule.coachMessage}` : rule.coachMessage, diff, 0.05);
          }
          if (rule.threshold?.includes('OUTSIDE') && Math.abs(diff) > 0.08) {
            const sev: Severity = Math.abs(diff) > 0.14 ? 'critical' : 'warning';
            pushWarning(rule, sev, sev === 'critical' ? `🚨 ${rule.coachMessage}` : rule.coachMessage, Math.abs(diff), 0.08);
          }
        }
        break;
      }

      case 'Y_AXIS_COMPARE': {
        if (rule.joints.length < 2) break;
        if (!jointsVisible(landmarks, rule.joints)) break;

        const j0 = resolve(landmarks, rule.joints[0]);
        const j1 = resolve(landmarks, rule.joints[1]);
        const yDiff = j0.y - j1.y;

        if (rule.threshold?.includes('ABOVE') && yDiff < -0.03) {
          const sev: Severity = yDiff < -0.06 ? 'critical' : 'warning';
          pushWarning(rule, sev, sev === 'critical' ? `🚨 ${rule.coachMessage}` : rule.coachMessage, yDiff, -0.03);
        }
        if (rule.threshold?.includes('APPROACHING') && Math.abs(yDiff) < 0.05) {
          const sev: Severity = Math.abs(yDiff) < 0.02 ? 'critical' : 'warning';
          pushWarning(rule, sev, sev === 'critical' ? `🚨 ${rule.coachMessage}` : rule.coachMessage, Math.abs(yDiff), 0.05);
        }
        if (rule.threshold?.includes('LIFT') && yDiff < -0.02) {
          const sev: Severity = yDiff < -0.05 ? 'critical' : 'warning';
          pushWarning(rule, sev, sev === 'critical' ? `🚨 ${rule.coachMessage}` : rule.coachMessage, yDiff, -0.02);
        }
        break;
      }

      case 'Z_X_OSCILLATION': {
        if (rule.joints.length < 2) break;
        const moving = resolve(landmarks, rule.joints[0]);
        const anchor = resolve(landmarks, rule.joints[1]);
        const isLateral = patternId ? LATERAL_PATTERNS.has(patternId) : false;
        const drift = isLateral
          ? Math.abs(moving.x - anchor.x)
          : Math.sqrt((moving.x - anchor.x) ** 2 + (moving.z - anchor.z) ** 2);
        const maxDrift = (rule.maxOscillationPercent ?? 10) / 100;

        if (drift > maxDrift) {
          const excess = drift - maxDrift;
          const sev: Severity = excess > maxDrift * 0.5 ? 'critical' : 'warning';
          pushWarning(rule, sev, sev === 'critical' ? `🚨 ${rule.coachMessage}` : rule.coachMessage, drift * 100, rule.maxOscillationPercent ?? 10);
        }
        break;
      }
    }
  }

  return debounceWarnings(rawWarnings);
}
