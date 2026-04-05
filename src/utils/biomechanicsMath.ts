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
// ---------------------------------------------------------------------------

export function calculateAngle2D(a: Point3D, b: Point3D, c: Point3D): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

// ---------------------------------------------------------------------------
// 3. Valgus / Varus — 3-tier semaphore (frontal view only)
// ---------------------------------------------------------------------------

export function isFrontalView(leftKnee: Point3D, rightKnee: Point3D): boolean {
  return Math.abs(leftKnee.z - rightKnee.z) <= 0.2;
}

export interface ValgusVarusResult {
  valgus: { active: boolean; severity: Severity; coachMessage: string; affectedSegments: AffectedSegment[] };
  varus: { active: boolean; severity: Severity; coachMessage: string; affectedSegments: AffectedSegment[] };
}

export function checkValgusVarus(
  leftKnee: Point3D,
  rightKnee: Point3D,
  leftAnkle: Point3D,
  rightAnkle: Point3D,
): ValgusVarusResult {
  const none = { active: false, severity: 'ok' as Severity, coachMessage: '', affectedSegments: [] as AffectedSegment[] };
  const result: ValgusVarusResult = { valgus: { ...none }, varus: { ...none } };

  if (!isFrontalView(leftKnee, rightKnee)) return result;

  const kneeDist = Math.abs(leftKnee.x - rightKnee.x);
  const ankleDist = Math.abs(leftAnkle.x - rightAnkle.x);

  if (ankleDist < 0.01) return result; // feet too close to evaluate

  // --- VALGUS (knees collapsing inward) ---
  if (kneeDist < ankleDist * 0.75) {
    result.valgus = {
      active: true,
      severity: 'critical',
      coachMessage: '🚨 Joelhos caindo para dentro! Force-os para fora.',
      affectedSegments: ['left_leg', 'right_leg'],
    };
  } else if (kneeDist < ankleDist * 0.90) {
    result.valgus = {
      active: true,
      severity: 'warning',
      coachMessage: 'Atenção: Joelho querendo entrar. Segure a base!',
      affectedSegments: ['left_leg', 'right_leg'],
    };
  }

  // --- VARUS (knees pushing outward) ---
  if (kneeDist > ankleDist * 1.40) {
    result.varus = {
      active: true,
      severity: 'critical',
      coachMessage: '🚨 Joelhos muito abertos! Alinhe com a ponta do pé.',
      affectedSegments: ['left_leg', 'right_leg'],
    };
  } else if (kneeDist > ankleDist * 1.25) {
    result.varus = {
      active: true,
      severity: 'warning',
      coachMessage: 'Atenção: Base muito aberta.',
      affectedSegments: ['left_leg', 'right_leg'],
    };
  }

  return result;
}

// Legacy compat wrapper
export function checkDynamicValgus(
  leftKnee: Point3D,
  rightKnee: Point3D,
  leftAnkle: Point3D,
  rightAnkle: Point3D,
): boolean {
  const r = checkValgusVarus(leftKnee, rightKnee, leftAnkle, rightAnkle);
  return r.valgus.active;
}

// ---------------------------------------------------------------------------
// 4. Frame debounce — requires N consecutive frames to change state
// ---------------------------------------------------------------------------

const DEBOUNCE_FRAMES = 3;

// Tracks consecutive frame counts per errorId
const debounceCounters: Map<string, number> = new Map();
const activeStates: Map<string, FrameWarning> = new Map();

function debounceWarnings(rawWarnings: FrameWarning[]): FrameWarning[] {
  const currentIds = new Set(rawWarnings.map(w => `${w.errorId}:${w.severity}`));

  // Increment counters for present warnings
  for (const w of rawWarnings) {
    const key = `${w.errorId}:${w.severity}`;
    debounceCounters.set(key, (debounceCounters.get(key) ?? 0) + 1);
  }

  // Decrement counters for absent warnings
  for (const key of Array.from(debounceCounters.keys())) {
    if (!currentIds.has(key)) {
      const count = (debounceCounters.get(key) ?? 0) - 1;
      if (count <= 0) {
        debounceCounters.delete(key);
        // Extract errorId from key
        const errorId = key.split(':')[0];
        activeStates.delete(errorId);
      } else {
        debounceCounters.set(key, count);
      }
    }
  }

  // Promote warnings that hit the threshold
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
const STRICT_VISIBILITY = 0.80; // for heel-lift and foot landmarks

/**
 * Returns true when ALL listed joints exceed the given visibility threshold.
 */
function jointsVisible(landmarks: Point3D[], joints: string[], threshold = MIN_VISIBILITY): boolean {
  for (const j of joints) {
    const idx = LANDMARK[j];
    if (idx === undefined) return false;
    const lm = landmarks[idx];
    if (!lm || (lm.visibility ?? 0) < threshold) return false;
  }
  return true;
}

/**
 * Returns true when at least `ratio` (0-1) of 16 key body landmarks are visible.
 * Used as the global "body-in-frame" gate to suppress analysis during setup.
 */
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
// 6. evaluateFrame — hybrid routing with 3-tier severity + visibility gate
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

  // ── Global visibility gate: skip ALL analysis if body not in frame ──
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
    // ── Per-rule visibility gate: skip if required joints aren't visible ──
    if (rule.joints.length > 0 && !jointsVisible(landmarks, rule.joints)) continue;

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
          if (!jointsVisible(landmarks, ['HIP', 'KNEE', 'ANKLE'])) break;
          const kneeAngle = angleFn(hip, knee, ankle);
          if (kneeAngle >= 100) break;
        }

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

      // ── X_AXIS_COMPARE ────────────────────────────────────────────────
      case 'X_AXIS_COMPARE': {
        if (rule.threshold === 'KNEES_CLOSER_THAN_ANKLES') {
          // Require all 4 knee/ankle landmarks visible
          if (!jointsVisible(landmarks, ['L_KNEE', 'KNEE', 'L_ANKLE', 'ANKLE'])) break;
          const lk = resolve(landmarks, 'L_KNEE');
          const rk = resolve(landmarks, 'KNEE');
          const la = resolve(landmarks, 'L_ANKLE');
          const ra = resolve(landmarks, 'ANKLE');
          const vv = checkValgusVarus(lk, rk, la, ra);

          if (vv.valgus.active) {
            pushWarning(
              { ...rule, id: 'valgus', affectedSegments: vv.valgus.affectedSegments },
              vv.valgus.severity,
              vv.valgus.coachMessage,
              Math.abs(lk.x - rk.x),
              Math.abs(la.x - ra.x),
            );
          }
          if (vv.varus.active) {
            pushWarning(
              { ...rule, id: 'varus', name: 'Varo Dinâmico', affectedSegments: vv.varus.affectedSegments },
              vv.varus.severity,
              vv.varus.coachMessage,
              Math.abs(lk.x - rk.x),
              Math.abs(la.x - ra.x),
            );
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

      // ── Y_AXIS_COMPARE ────────────────────────────────────────────────
      case 'Y_AXIS_COMPARE': {
        if (rule.joints.length < 2) break;

        // Heel-lift requires STRICT visibility on foot landmarks
        const isHeelLift = rule.joints[0] === 'HEEL' && rule.joints[1] === 'FOOT_INDEX';
        if (isHeelLift && !jointsVisible(landmarks, ['HEEL', 'FOOT_INDEX', 'ANKLE'], STRICT_VISIBILITY)) break;

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
        if (isHeelLift && yDiff < -0.05) {
          const sev: Severity = yDiff < -0.08 ? 'critical' : 'warning';
          pushWarning(rule, sev, sev === 'critical' ? `🚨 ${rule.coachMessage}` : rule.coachMessage, yDiff, -0.05);
        }
        break;
      }

      // ── Z_X_OSCILLATION ───────────────────────────────────────────────
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
