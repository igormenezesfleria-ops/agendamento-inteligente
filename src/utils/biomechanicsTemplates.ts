/**
 * Synton Biomechanics Ruleset — Central configuration for Smart Templates.
 *
 * Each movement pattern defines the common form errors we track via MediaPipe Pose.
 * Types:
 *   ANGLE_3D          – 3-point angle check (minSafeAngle / maxSafeAngle in degrees)
 *   X_AXIS_COMPARE    – horizontal alignment between two joints
 *   Y_AXIS_COMPARE    – vertical alignment between two joints
 *   Z_X_OSCILLATION   – lateral/depth drift of a joint relative to an anchor (maxOscillationPercent)
 *
 * NOTE for AI engine: Model must use MediaPipe Pose LITE (modelComplexity: 0).
 * Thresholds are evaluated with basic trigonometry (Math.atan2), NOT heavy ML inference.
 */

export interface BiomechanicsError {
  id: string;
  name: string;
  type: 'ANGLE_3D' | 'X_AXIS_COMPARE' | 'Y_AXIS_COMPARE' | 'Z_X_OSCILLATION';
  joints: string[];
  minSafeAngle?: number;
  maxSafeAngle?: number;
  threshold?: string;
  maxOscillationPercent?: number;
}

export interface MovementPattern {
  name: string;
  errors: BiomechanicsError[];
}

export const BIOMECHANICS_TEMPLATES: Record<string, MovementPattern> = {
  SQUAT_BILATERAL: {
    name: 'Agachamento Bilateral',
    errors: [
      {
        id: 'valgus',
        name: 'Valgo Dinâmico',
        type: 'X_AXIS_COMPARE',
        joints: ['KNEE', 'ANKLE'],
        threshold: 'KNEES_CLOSER_THAN_ANKLES',
      },
      {
        id: 'butt_wink',
        name: 'Retroversão Pélvica',
        type: 'ANGLE_3D',
        joints: ['SHOULDER', 'HIP', 'KNEE'],
        minSafeAngle: 60,
      },
      {
        id: 'heel_lift',
        name: 'Calcanhar Elevado',
        type: 'Y_AXIS_COMPARE',
        joints: ['HEEL', 'FOOT_INDEX'],
      },
      {
        id: 'forward_lean',
        name: 'Inclinação Excessiva do Tronco',
        type: 'ANGLE_3D',
        joints: ['SHOULDER', 'HIP', 'ANKLE'],
        minSafeAngle: 45,
      },
    ],
  },

  PUSH_HORIZONTAL: {
    name: 'Empurrar Horizontal (Supinos/Flexão)',
    errors: [
      {
        id: 'flare_out',
        name: 'Cotovelo Aberto (Flare Out)',
        type: 'ANGLE_3D',
        joints: ['HIP', 'SHOULDER', 'ELBOW'],
        maxSafeAngle: 75,
      },
      {
        id: 'wrist_alignment',
        name: 'Punho Desalinhado',
        type: 'X_AXIS_COMPARE',
        joints: ['WRIST', 'ELBOW'],
        threshold: 'WRIST_OUTSIDE_ELBOW',
      },
    ],
  },

  PULL_VERTICAL: {
    name: 'Puxar Vertical (Pulldown/Puxada)',
    errors: [
      {
        id: 'shoulder_shrug',
        name: 'Elevação de Ombro (Encolhimento)',
        type: 'Y_AXIS_COMPARE',
        joints: ['SHOULDER', 'EAR'],
        threshold: 'SHOULDER_ABOVE_BASELINE',
      },
      {
        id: 'elbow_behind',
        name: 'Cotovelo Atrasado',
        type: 'ANGLE_3D',
        joints: ['WRIST', 'ELBOW', 'SHOULDER'],
        minSafeAngle: 30,
      },
    ],
  },

  HINGE: {
    name: 'Dobradiça (Deadlift/Stiff)',
    errors: [
      {
        id: 'rounded_back',
        name: 'Cifose Lombar (Costas Arredondadas)',
        type: 'ANGLE_3D',
        joints: ['SHOULDER', 'HIP', 'KNEE'],
        minSafeAngle: 150,
      },
      {
        id: 'bar_drift',
        name: 'Barra Afastada do Corpo',
        type: 'X_AXIS_COMPARE',
        joints: ['WRIST', 'SHOULDER'],
        threshold: 'WRIST_FORWARD_OF_SHOULDER',
      },
      {
        id: 'knee_overextension',
        name: 'Joelho Hiperestendido',
        type: 'ANGLE_3D',
        joints: ['HIP', 'KNEE', 'ANKLE'],
        maxSafeAngle: 175,
      },
    ],
  },

  ISOLATION_ARM: {
    name: 'Isolados de Braço (Roscas/Tríceps)',
    errors: [
      {
        id: 'elbow_travel',
        name: 'Instabilidade de Cotovelo',
        type: 'Z_X_OSCILLATION',
        joints: ['ELBOW', 'HIP'],
        maxOscillationPercent: 10,
      },
      {
        id: 'shoulder_compensation',
        name: 'Compensação de Ombro',
        type: 'Y_AXIS_COMPARE',
        joints: ['SHOULDER', 'HIP'],
        threshold: 'SHOULDER_LIFT_DURING_REP',
      },
    ],
  },

  ISOLATION_SHOULDER: {
    name: 'Isolados de Ombro (Elevações/Desenvolvimento)',
    errors: [
      {
        id: 'trapezius_overuse',
        name: 'Uso Excessivo de Trapézio',
        type: 'Y_AXIS_COMPARE',
        joints: ['SHOULDER', 'EAR'],
        threshold: 'SHOULDER_APPROACHING_EAR',
      },
      {
        id: 'elbow_angle',
        name: 'Ângulo de Cotovelo Inconsistente',
        type: 'ANGLE_3D',
        joints: ['SHOULDER', 'ELBOW', 'WRIST'],
        minSafeAngle: 150,
        maxSafeAngle: 180,
      },
    ],
  },

  CORE_PLANK: {
    name: 'Core / Prancha (Plank)',
    errors: [
      {
        id: 'hip_sag',
        name: 'Quadril Caído',
        type: 'ANGLE_3D',
        joints: ['SHOULDER', 'HIP', 'ANKLE'],
        minSafeAngle: 165,
      },
      {
        id: 'hip_pike',
        name: 'Quadril Elevado (Pike)',
        type: 'ANGLE_3D',
        joints: ['SHOULDER', 'HIP', 'ANKLE'],
        maxSafeAngle: 185,
      },
      {
        id: 'neck_alignment',
        name: 'Pescoço Desalinhado',
        type: 'ANGLE_3D',
        joints: ['EAR', 'SHOULDER', 'HIP'],
        minSafeAngle: 160,
        maxSafeAngle: 200,
      },
    ],
  },
};
