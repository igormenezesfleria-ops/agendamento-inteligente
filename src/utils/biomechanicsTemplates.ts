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

export type AffectedSegment =
  | 'left_leg'
  | 'right_leg'
  | 'left_arm'
  | 'right_arm'
  | 'spine'
  | 'hip';

export interface BiomechanicsError {
  id: string;
  name: string;
  type: 'ANGLE_3D' | 'X_AXIS_COMPARE' | 'Y_AXIS_COMPARE' | 'Z_X_OSCILLATION';
  joints: string[];
  minSafeAngle?: number;
  maxSafeAngle?: number;
  threshold?: string;
  maxOscillationPercent?: number;
  coachMessage: string;
  affectedSegments: AffectedSegment[];
}

export interface MovementPattern {
  name: string;
  errors: BiomechanicsError[];
}

// ---------------------------------------------------------------------------
// SQUAT — separated into FRONTAL and LATERAL views
// ---------------------------------------------------------------------------

const SQUAT_FRONTAL_ERRORS: BiomechanicsError[] = [
  {
    id: 'valgus',
    name: 'Valgo Dinâmico',
    type: 'X_AXIS_COMPARE',
    joints: ['KNEE', 'ANKLE'],
    threshold: 'KNEES_CLOSER_THAN_ANKLES',
    coachMessage: 'Joelhos caindo para dentro! Force-os para fora.',
    affectedSegments: ['left_leg', 'right_leg'],
  },
  {
    id: 'varus',
    name: 'Varo Dinâmico',
    type: 'X_AXIS_COMPARE',
    joints: ['KNEE', 'ANKLE'],
    threshold: 'KNEES_WIDER_THAN_ANKLES',
    coachMessage: 'Joelhos muito abertos! Alinhe com a ponta do pé.',
    affectedSegments: ['left_leg', 'right_leg'],
  },
];

const SQUAT_LATERAL_ERRORS: BiomechanicsError[] = [
  {
    id: 'butt_wink',
    name: 'Retroversão Pélvica',
    type: 'ANGLE_3D',
    joints: ['SHOULDER', 'HIP', 'KNEE'],
    minSafeAngle: 85,
    coachMessage: 'Perdeu a lombar no fundo! Segure o abdômen.',
    affectedSegments: ['spine', 'hip'],
  },
  {
    id: 'heel_lift',
    name: 'Calcanhar Elevado',
    type: 'Y_AXIS_COMPARE',
    joints: ['HEEL', 'FOOT_INDEX'],
    coachMessage: 'Calcanhar subindo! Mantenha os pés firmes no chão.',
    affectedSegments: ['left_leg', 'right_leg'],
  },
];

export const BIOMECHANICS_TEMPLATES: Record<string, MovementPattern> = {
  // Legacy combined template (kept for backward compatibility)
  SQUAT_BILATERAL: {
    name: 'Agachamento Bilateral',
    errors: [...SQUAT_FRONTAL_ERRORS, ...SQUAT_LATERAL_ERRORS],
  },

  // Phase 24.1 — separated views
  SQUAT_FRONTAL: {
    name: 'Agachamento — Vista Frontal',
    errors: SQUAT_FRONTAL_ERRORS,
  },

  SQUAT_LATERAL: {
    name: 'Agachamento — Vista Lateral',
    errors: SQUAT_LATERAL_ERRORS,
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
        coachMessage: 'Cotovelos abrindo demais! Traga-os mais perto do corpo.',
        affectedSegments: ['left_arm', 'right_arm'],
      },
      {
        id: 'wrist_alignment',
        name: 'Punho Desalinhado',
        type: 'X_AXIS_COMPARE',
        joints: ['WRIST', 'ELBOW'],
        threshold: 'WRIST_OUTSIDE_ELBOW',
        coachMessage: 'Punho desalinhado! Mantenha-o na linha do cotovelo.',
        affectedSegments: ['left_arm', 'right_arm'],
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
        coachMessage: 'Ombros subindo! Depressão escapular — puxe os ombros para baixo.',
        affectedSegments: ['left_arm', 'right_arm'],
      },
      {
        id: 'elbow_behind',
        name: 'Cotovelo Atrasado',
        type: 'ANGLE_3D',
        joints: ['WRIST', 'ELBOW', 'SHOULDER'],
        minSafeAngle: 30,
        coachMessage: 'Cotovelo ficando para trás! Puxe em direção ao quadril.',
        affectedSegments: ['left_arm', 'right_arm'],
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
        coachMessage: 'Costas arredondando! Peito para fora e lombar neutra.',
        affectedSegments: ['spine'],
      },
      {
        id: 'bar_drift',
        name: 'Barra Afastada do Corpo',
        type: 'X_AXIS_COMPARE',
        joints: ['WRIST', 'SHOULDER'],
        threshold: 'WRIST_FORWARD_OF_SHOULDER',
        coachMessage: 'Barra se afastando! Mantenha-a rente ao corpo.',
        affectedSegments: ['left_arm', 'right_arm'],
      },
      {
        id: 'knee_overextension',
        name: 'Joelho Hiperestendido',
        type: 'ANGLE_3D',
        joints: ['HIP', 'KNEE', 'ANKLE'],
        maxSafeAngle: 175,
        coachMessage: 'Joelhos travando demais! Mantenha uma leve flexão.',
        affectedSegments: ['left_leg', 'right_leg'],
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
        coachMessage: 'Trave o cotovelo no corpo! Não balance.',
        affectedSegments: ['left_arm', 'right_arm'],
      },
      {
        id: 'shoulder_compensation',
        name: 'Compensação de Ombro',
        type: 'Y_AXIS_COMPARE',
        joints: ['SHOULDER', 'HIP'],
        threshold: 'SHOULDER_LIFT_DURING_REP',
        coachMessage: 'Ombro compensando! Isole o movimento no braço.',
        affectedSegments: ['left_arm', 'right_arm'],
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
        coachMessage: 'Cuidado com os cotovelos! Mantenha a postura controlada.',
        affectedSegments: ['left_arm', 'right_arm'],
      },
      {
        id: 'elbow_angle',
        name: 'Ângulo de Cotovelo Inconsistente',
        type: 'ANGLE_3D',
        joints: ['SHOULDER', 'ELBOW', 'WRIST'],
        minSafeAngle: 150,
        maxSafeAngle: 180,
        coachMessage: 'Mantenha o ângulo do cotovelo constante durante o movimento!',
        affectedSegments: ['left_arm', 'right_arm'],
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
        coachMessage: 'Quadril caindo! Contraia o glúteo e o abdômen.',
        affectedSegments: ['spine', 'hip'],
      },
      {
        id: 'hip_pike',
        name: 'Quadril Elevado (Pike)',
        type: 'ANGLE_3D',
        joints: ['SHOULDER', 'HIP', 'ANKLE'],
        maxSafeAngle: 185,
        coachMessage: 'Quadril subindo demais! Alinhe ombro-quadril-tornozelo.',
        affectedSegments: ['spine', 'hip'],
      },
      {
        id: 'neck_alignment',
        name: 'Pescoço Desalinhado',
        type: 'ANGLE_3D',
        joints: ['EAR', 'SHOULDER', 'HIP'],
        minSafeAngle: 160,
        maxSafeAngle: 200,
        coachMessage: 'Pescoço fora do alinhamento! Olhe para o chão à frente.',
        affectedSegments: ['spine'],
      },
    ],
  },
};
