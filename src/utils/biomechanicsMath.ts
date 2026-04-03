/**
 * Synton Hybrid Kinematics Engine (2D + 3D)
 *
 * Pure-math utilities that evaluate MediaPipe Pose landmarks against
 * the biomechanical ruleset defined in biomechanicsTemplates.ts.
 *
 * 3D math (dot-product) is used for complex multi-plane movements (squats).
 * 2D math (atan2, x/y only) is used for strict lateral views to avoid Z-axis noise.
 *
 * All functions are stateless and designed to run at 30 fps inside
 * requestAnimationFrame without allocating garbage.
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

export interface FrameWarning {
  errorId: string;
  errorName: string;
  coachMessage: string;
  affectedSegments: AffectedSegment[];
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
]);

// ---------------------------------------------------------------------------
// Camera placement hints per pattern
// ---------------------------------------------------------------------------

export type CameraHint = { emoji: string; text: string };

const CAMERA_HINTS: Record<string, CameraHint> = {
  SQUAT_BILATERAL: { emoji: '📍', text: 'Grave na DIAGONAL ou de FRENTE.' },
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
//    Eliminates Z-axis camera noise for lateral views.
// ---------------------------------------------------------------------------

export function calculateAngle2D(a: Point3D, b: Point3D, c: Point3D): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

// ---------------------------------------------------------------------------
// 3. checkDynamicValgus — X-axis bilateral comparison (frontal view only)
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

  const kneeGap = Math.abs(leftKnee.x - rightKnee.x);
  const ankleGap = Math.abs(leftAnkle.x - rightAnkle.x);
  return ankleGap > 0.01 && kneeGap < ankleGap * 0.60;
}

// ---------------------------------------------------------------------------
// 4. evaluateFrame — hybrid routing: 2D for lateral patterns, 3D for squats
// ---------------------------------------------------------------------------

function resolve(landmarks: Point3D[], joint: string): Point3D {
  const idx = LANDMARK[joint];
  if (idx !== undefined && landmarks[idx]) return landmarks[idx];
  return { x: 0, y: 0, z: 0, visibility: 0 };
}

/**
 * Selects the correct angle function based on which movement pattern is active.
 * Lateral-view patterns (isolation, plank, hinge) → 2D only.
 * Squat and other frontal patterns → 3D.
 */
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

  const angleFn = pickAngleFn(patternId);
  const warnings: FrameWarning[] = [];

  const warn = (rule: { id: string; name: string; coachMessage: string; affectedSegments: AffectedSegment[] }, value: number, limit: number) => {
    warnings.push({ errorId: rule.id, errorName: rule.name, coachMessage: rule.coachMessage, affectedSegments: rule.affectedSegments, value, limit });
  };

  for (const rule of activeTemplate.errors) {
    switch (rule.type) {
      // ── ANGLE_3D (name kept for backward compat; uses hybrid routing) ──
      case 'ANGLE_3D': {
        if (rule.joints.length < 3) break;
        const a = resolve(landmarks, rule.joints[0]);
        const b = resolve(landmarks, rule.joints[1]);
        const c = resolve(landmarks, rule.joints[2]);
        const angle = angleFn(a, b, c);

        // Deep-flexion guard for butt_wink
        if (rule.id === 'butt_wink') {
          const hip = resolve(landmarks, 'HIP');
          const knee = resolve(landmarks, 'KNEE');
          const ankle = resolve(landmarks, 'ANKLE');
          const kneeAngle = angleFn(hip, knee, ankle);
          if (kneeAngle >= 100) break;
        }

        if (rule.minSafeAngle !== undefined && angle < rule.minSafeAngle) {
          warn(rule, angle, rule.minSafeAngle);
        }
        if (rule.maxSafeAngle !== undefined && angle > rule.maxSafeAngle) {
          warn(rule, angle, rule.maxSafeAngle);
        }
        break;
      }

      // ── X_AXIS_COMPARE ────────────────────────────────────────────────
      case 'X_AXIS_COMPARE': {
        if (rule.threshold === 'KNEES_CLOSER_THAN_ANKLES') {
          const lk = resolve(landmarks, 'L_KNEE');
          const rk = resolve(landmarks, 'KNEE');
          const la = resolve(landmarks, 'L_ANKLE');
          const ra = resolve(landmarks, 'ANKLE');
          if (checkDynamicValgus(lk, rk, la, ra)) {
            const kneeGap = Math.abs(lk.x - rk.x);
            const ankleGap = Math.abs(la.x - ra.x);
            warn(rule, kneeGap, ankleGap);
          }
        }
        if (rule.joints.length >= 2 && rule.threshold !== 'KNEES_CLOSER_THAN_ANKLES') {
          const j0 = resolve(landmarks, rule.joints[0]);
          const j1 = resolve(landmarks, rule.joints[1]);
          const diff = j0.x - j1.x;
          if (rule.threshold?.includes('FORWARD') && diff > 0.05) {
            warn(rule, diff, 0.05);
          }
          if (rule.threshold?.includes('OUTSIDE') && Math.abs(diff) > 0.08) {
            warn(rule, Math.abs(diff), 0.08);
          }
        }
        break;
      }

      // ── Y_AXIS_COMPARE ────────────────────────────────────────────────
      case 'Y_AXIS_COMPARE': {
        if (rule.joints.length < 2) break;
        const j0 = resolve(landmarks, rule.joints[0]);
        const j1 = resolve(landmarks, rule.joints[1]);
        const yDiff = j0.y - j1.y;

        if (rule.threshold?.includes('ABOVE') && yDiff < -0.03) {
          warn(rule, yDiff, -0.03);
        }
        if (rule.threshold?.includes('APPROACHING') && Math.abs(yDiff) < 0.05) {
          warn(rule, Math.abs(yDiff), 0.05);
        }
        if (rule.threshold?.includes('LIFT') && yDiff < -0.02) {
          warn(rule, yDiff, -0.02);
        }
        if (rule.joints[0] === 'HEEL' && rule.joints[1] === 'FOOT_INDEX' && yDiff < -0.05) {
          warn(rule, yDiff, -0.05);
        }
        break;
      }

      // ── Z_X_OSCILLATION ───────────────────────────────────────────────
      // For lateral patterns, use only X-axis drift (ignore Z)
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
          warn(rule, drift * 100, rule.maxOscillationPercent ?? 10);
        }
        break;
      }
    }
  }

  return warnings;
}
