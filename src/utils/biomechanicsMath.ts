/**
 * Synton 3D Vector Math Engine
 *
 * Pure-math utilities that evaluate MediaPipe Pose landmarks against
 * the biomechanical ruleset defined in biomechanicsTemplates.ts.
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
  value: number; // computed metric (angle in degrees, % oscillation, etc.)
  limit: number; // the threshold that was breached
}

// ---------------------------------------------------------------------------
// MediaPipe Pose landmark index map (33 landmarks)
// ---------------------------------------------------------------------------

const LANDMARK: Record<string, number> = {
  EAR: 7,        // right ear (left = 8, we pick right as default)
  SHOULDER: 12,  // right shoulder
  ELBOW: 14,     // right elbow
  WRIST: 16,     // right wrist
  HIP: 24,       // right hip
  KNEE: 26,      // right knee
  ANKLE: 28,     // right ankle
  HEEL: 30,      // right heel
  FOOT_INDEX: 32,// right foot index

  // Left-side duplicates (used for bilateral checks like valgus)
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
// 1. calculateAngle3D — 3-point angle via dot-product
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
// 2. checkDynamicValgus — X-axis bilateral comparison
// ---------------------------------------------------------------------------

/**
 * Returns true only when filmed roughly from the front (small Z delta between knees).
 * Also exports a helper so the UI can warn when the camera plane is wrong.
 */
export function isFrontalView(leftKnee: Point3D, rightKnee: Point3D): boolean {
  return Math.abs(leftKnee.z - rightKnee.z) <= 0.2;
}

export function checkDynamicValgus(
  leftKnee: Point3D,
  rightKnee: Point3D,
  leftAnkle: Point3D,
  rightAnkle: Point3D,
): boolean {
  // Skip entirely if filmed from the side (Z-axis divergence)
  if (!isFrontalView(leftKnee, rightKnee)) return false;

  const kneeGap = Math.abs(leftKnee.x - rightKnee.x);
  const ankleGap = Math.abs(leftAnkle.x - rightAnkle.x);
  // Only trigger if knees are significantly inside the ankle line (60% threshold)
  return ankleGap > 0.01 && kneeGap < ankleGap * 0.60;
}

// ---------------------------------------------------------------------------
// 3. evaluateFrame — run all template rules against live landmarks
// ---------------------------------------------------------------------------

function resolve(landmarks: Point3D[], joint: string): Point3D {
  const idx = LANDMARK[joint];
  if (idx !== undefined && landmarks[idx]) return landmarks[idx];
  // Fallback: return origin so calculations don't crash
  return { x: 0, y: 0, z: 0, visibility: 0 };
}

export function evaluateFrame(
  landmarks: Point3D[],
  activeTemplate: MovementPattern | null | undefined,
): FrameWarning[] {
  if (!activeTemplate || !landmarks || landmarks.length < 33) return [];

  const warnings: FrameWarning[] = [];

  for (const rule of activeTemplate.errors) {
    switch (rule.type) {
      // ── ANGLE_3D ──────────────────────────────────────────────────────
      case 'ANGLE_3D': {
        if (rule.joints.length < 3) break;
        const a = resolve(landmarks, rule.joints[0]);
        const b = resolve(landmarks, rule.joints[1]);
        const c = resolve(landmarks, rule.joints[2]);
        const angle = calculateAngle3D(a, b, c);

        // Deep-flexion guard for butt_wink: only trigger when knee angle < 100°
        if (rule.id === 'butt_wink') {
          const hip = resolve(landmarks, 'HIP');
          const knee = resolve(landmarks, 'KNEE');
          const ankle = resolve(landmarks, 'ANKLE');
          const kneeAngle = calculateAngle3D(hip, knee, ankle);
          if (kneeAngle >= 100) break; // not deep enough to evaluate butt wink
        }

        if (rule.minSafeAngle !== undefined && angle < rule.minSafeAngle) {
          warnings.push({ errorId: rule.id, errorName: rule.name, value: angle, limit: rule.minSafeAngle });
        }
        if (rule.maxSafeAngle !== undefined && angle > rule.maxSafeAngle) {
          warnings.push({ errorId: rule.id, errorName: rule.name, value: angle, limit: rule.maxSafeAngle });
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
            warnings.push({ errorId: rule.id, errorName: rule.name, value: kneeGap, limit: ankleGap });
          }
        }
        // Generic X comparison for other thresholds
        if (rule.joints.length >= 2 && rule.threshold !== 'KNEES_CLOSER_THAN_ANKLES') {
          const j0 = resolve(landmarks, rule.joints[0]);
          const j1 = resolve(landmarks, rule.joints[1]);
          const diff = j0.x - j1.x;
          // Positive diff = joint 0 is to the right of joint 1
          if (rule.threshold?.includes('FORWARD') && diff > 0.05) {
            warnings.push({ errorId: rule.id, errorName: rule.name, value: diff, limit: 0.05 });
          }
          if (rule.threshold?.includes('OUTSIDE') && Math.abs(diff) > 0.08) {
            warnings.push({ errorId: rule.id, errorName: rule.name, value: Math.abs(diff), limit: 0.08 });
          }
        }
        break;
      }

      // ── Y_AXIS_COMPARE ────────────────────────────────────────────────
      case 'Y_AXIS_COMPARE': {
        if (rule.joints.length < 2) break;
        const j0 = resolve(landmarks, rule.joints[0]);
        const j1 = resolve(landmarks, rule.joints[1]);
        const yDiff = j0.y - j1.y; // MediaPipe: lower y = higher on screen

        if (rule.threshold?.includes('ABOVE') && yDiff < -0.03) {
          warnings.push({ errorId: rule.id, errorName: rule.name, value: yDiff, limit: -0.03 });
        }
        if (rule.threshold?.includes('APPROACHING') && Math.abs(yDiff) < 0.05) {
          warnings.push({ errorId: rule.id, errorName: rule.name, value: Math.abs(yDiff), limit: 0.05 });
        }
        if (rule.threshold?.includes('LIFT') && yDiff < -0.02) {
          warnings.push({ errorId: rule.id, errorName: rule.name, value: yDiff, limit: -0.02 });
        }
        // HEEL vs FOOT_INDEX: only trigger with a significant margin (0.05 instead of 0.02)
        if (rule.joints[0] === 'HEEL' && rule.joints[1] === 'FOOT_INDEX' && yDiff < -0.05) {
          warnings.push({ errorId: rule.id, errorName: rule.name, value: yDiff, limit: -0.05 });
        }
        break;
      }

      // ── Z_X_OSCILLATION ───────────────────────────────────────────────
      case 'Z_X_OSCILLATION': {
        if (rule.joints.length < 2) break;
        const moving = resolve(landmarks, rule.joints[0]);
        const anchor = resolve(landmarks, rule.joints[1]);
        const drift = Math.sqrt((moving.x - anchor.x) ** 2 + (moving.z - anchor.z) ** 2);
        const maxDrift = (rule.maxOscillationPercent ?? 10) / 100;

        if (drift > maxDrift) {
          warnings.push({ errorId: rule.id, errorName: rule.name, value: drift * 100, limit: rule.maxOscillationPercent ?? 10 });
        }
        break;
      }
    }
  }

  return warnings;
}
