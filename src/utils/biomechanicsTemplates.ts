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
        coachMessage: 'Joelhos caindo para dentro! Force-os para fora.',
        affectedSegments: ['left_leg', 'right_leg'],
      },
      {
        id: 'butt_wink',
        name: 'Retroversão Pélvica',
        type: 'ANGLE_3D',
        joints: ['SHOULDER', 'HIP', 'KNEE'],
        minSafeAngle: 60,
        coachMessage: 'Perdeu a lombar no fundo! Segure o abdômen e não desça tanto.',
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
      {
        id: 'forward_lean',
        name: 'Inclinação Excessiva do Tronco',
        type: 'ANGLE_3D',
        joints: ['SHOULDER', 'HIP', 'ANKLE'],
        minSafeAngle: 45,
        coachMessage: 'Tronco inclinando demais! Peito para cima, olhe para frente.',
        affectedSegments: ['spine'],
      },
      {
        id: 'torso_collapse',
        name: 'Tronco Caindo',
        type: 'ANGLE_3D',
        joints: ['SHOULDER', 'HIP', 'KNEE'],
        minSafeAngle: 50,
        coachMessage: '🚨 Tronco caindo! Mantenha o peito alto e a coluna neutra.',
        affectedSegments: ['spine', 'hip'],
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

  PLANK_ISOMETRIC: {
    name: 'Prancha Isométrica',
    errors: [
      {
        id: 'plank_alignment',
        name: 'Desalinhamento de Prancha',
        type: 'ANGLE_3D',
        joints: ['SHOULDER', 'HIP', 'ANKLE'],
        minSafeAngle: 165,
        coachMessage: '🚨 Desalinhamento! Mantenha ombro, quadril e calcanhar em linha reta.',
        affectedSegments: ['spine', 'hip'],
      },
    ],
  },

  ROSCA_DIRETA: {
    name: 'Rosca Direta (Bicep Curl)',
    errors: [
      {
        id: 'elbow_alignment',
        name: 'Cotovelo Desalinhado do Tronco',
        type: 'X_AXIS_COMPARE',
        joints: ['ELBOW', 'SHOULDER'],
        coachMessage: '🚨 Trave o cotovelo no corpo! Não balance.',
        affectedSegments: ['left_arm', 'right_arm'],
      },
      {
        id: 'elbow_drift_forward',
        name: 'Cotovelo Avançando',
        type: 'Z_X_OSCILLATION',
        joints: ['ELBOW', 'HIP'],
        maxOscillationPercent: 12,
        coachMessage: '🚨 Cotovelo avançando (Roubo de Ombro)! Mantenha-o colado ao tronco.',
        affectedSegments: ['left_arm', 'right_arm'],
      },
      {
        id: 'body_swing',
        name: 'Balanço do Tronco',
        type: 'Z_X_OSCILLATION',
        joints: ['SHOULDER', 'HIP'],
        maxOscillationPercent: 10,
        coachMessage: '🚨 Balanço do tronco! Estabilize o core e evite usar impulso.',
        affectedSegments: ['spine'],
      },
    ],
  },

  TRICEPS_PUSHDOWN: {
    name: 'Tríceps na Polia / Corda',
    errors: [
      {
        id: 'elbow_unstable',
        name: 'Cotovelo Instável',
        type: 'Z_X_OSCILLATION',
        joints: ['ELBOW', 'HIP'],
        maxOscillationPercent: 10,
        coachMessage: '🚨 Movimentando o cotovelo! Pino-o ao lado do corpo.',
        affectedSegments: ['left_arm', 'right_arm'],
      },
      {
        id: 'scapular_shrug',
        name: 'Elevação Escapular',
        type: 'Y_AXIS_COMPARE',
        joints: ['SHOULDER', 'EAR'],
        threshold: 'SHOULDER_APPROACHING_EAR',
        coachMessage: '🚨 Elevando as escápulas (Tensão no Trapézio)! Ombros para baixo.',
        affectedSegments: ['left_arm', 'right_arm', 'spine'],
      },
    ],
  },

  OVERHEAD_PRESS: {
    name: 'Desenvolvimento (Overhead Press)',
    errors: [
      {
        id: 'lumbar_hyperextension',
        name: 'Hiperextensão Lombar',
        type: 'ANGLE_3D',
        joints: ['EAR', 'SHOULDER', 'HIP'],
        minSafeAngle: 160,
        coachMessage: '🚨 Hiperextensão Lombar! Contraia o abdômen e mantenha o tronco neutro.',
        affectedSegments: ['spine'],
      },
      {
        id: 'pushing_forward',
        name: 'Empurrando para Frente',
        type: 'Z_X_OSCILLATION',
        joints: ['WRIST', 'SHOULDER'],
        maxOscillationPercent: 15,
        coachMessage: '🚨 Empurrando para frente! Suba a carga na vertical, alinhada ao ombro.',
        affectedSegments: ['left_arm', 'right_arm'],
      },
    ],
  },

  PISTOL_SQUAT: {
    name: 'Agachamento Unipodal (Pistol/Búlgaro)',
    errors: [
      {
        id: 'active_knee_valgus',
        name: 'Valgo no Joelho Ativo',
        type: 'Z_X_OSCILLATION',
        joints: ['KNEE', 'ANKLE'],
        maxOscillationPercent: 8,
        coachMessage: '🚨 Valgo no Joelho Ativo! Force o joelho para fora, alinhado ao pé.',
        affectedSegments: ['left_leg', 'right_leg'],
      },
      {
        id: 'balance_instability',
        name: 'Instabilidade',
        type: 'Z_X_OSCILLATION',
        joints: ['ANKLE', 'HIP'],
        maxOscillationPercent: 12,
        coachMessage: '🚨 Instabilidade! Fixe o pé de apoio e controle a descida.',
        affectedSegments: ['left_leg', 'right_leg', 'hip'],
      },
      {
        id: 'pistol_torso_collapse',
        name: 'Tronco Caindo',
        type: 'ANGLE_3D',
        joints: ['SHOULDER', 'HIP', 'KNEE'],
        minSafeAngle: 45,
        coachMessage: '🚨 Tronco caindo! Mantenha o peito alto durante a descida.',
        affectedSegments: ['spine'],
      },
    ],
  },

  DEADLIFT: {
    name: 'Levantamento Terra (Deadlift)',
    errors: [
      {
        id: 'rounded_back_dl',
        name: 'Costas Arredondadas',
        type: 'ANGLE_3D',
        joints: ['SHOULDER', 'HIP', 'KNEE'],
        minSafeAngle: 150,
        coachMessage: '🚨 Costas arredondando! Peito para fora e lombar neutra.',
        affectedSegments: ['spine'],
      },
      {
        id: 'hips_rise_early',
        name: 'Quadril Subindo Antes',
        type: 'ANGLE_3D',
        joints: ['SHOULDER', 'HIP', 'ANKLE'],
        minSafeAngle: 30,
        coachMessage: '🚨 Quadril subindo antes! Suba ombros e quadril juntos.',
        affectedSegments: ['spine', 'hip'],
      },
      {
        id: 'knee_lockout_dl',
        name: 'Joelho Hiperestendido',
        type: 'ANGLE_3D',
        joints: ['HIP', 'KNEE', 'ANKLE'],
        maxSafeAngle: 178,
        coachMessage: '🚨 Travando o joelho! Mantenha uma leve flexão no topo.',
        affectedSegments: ['left_leg', 'right_leg'],
      },
      {
        id: 'bar_drift_dl',
        name: 'Barra Afastada do Corpo',
        type: 'X_AXIS_COMPARE',
        joints: ['WRIST', 'SHOULDER'],
        threshold: 'WRIST_FORWARD_OF_SHOULDER',
        coachMessage: '🚨 Barra se afastando! Mantenha-a rente às canelas e coxas.',
        affectedSegments: ['left_arm', 'right_arm'],
      },
    ],
  },

  STIFF_DEADLIFT: {
    name: 'Stiff (Stiff-Leg Deadlift)',
    errors: [
      {
        id: 'bending_knees_stiff',
        name: 'Dobrando o Joelho',
        type: 'ANGLE_3D',
        joints: ['HIP', 'KNEE', 'ANKLE'],
        minSafeAngle: 140,
        coachMessage: '🚨 Dobrando muito o joelho (Virou Terra)! Mantenha leve flexão fixa.',
        affectedSegments: ['left_leg', 'right_leg'],
      },
      {
        id: 'rounded_back_stiff',
        name: 'Cifose Lombar',
        type: 'ANGLE_3D',
        joints: ['SHOULDER', 'HIP', 'KNEE'],
        minSafeAngle: 55,
        coachMessage: '🚨 Lombar arredondando! Peito para fora, escápulas retraídas.',
        affectedSegments: ['spine'],
      },
      {
        id: 'bar_drift_stiff',
        name: 'Barra Afastada do Corpo',
        type: 'X_AXIS_COMPARE',
        joints: ['WRIST', 'SHOULDER'],
        threshold: 'WRIST_FORWARD_OF_SHOULDER',
        coachMessage: '🚨 Barra se afastando! Deslize-a rente às coxas.',
        affectedSegments: ['left_arm', 'right_arm'],
      },
    ],
  },

  LUNGE: {
    name: 'Afundo (Lunge)',
    errors: [
      {
        id: 'lunge_form',
        name: 'Forma do Afundo',
        type: 'ANGLE_3D',
        joints: ['HIP', 'KNEE', 'ANKLE'],
        minSafeAngle: 60,
        maxSafeAngle: 120,
        coachMessage: '🚨 Ajuste a forma do afundo: tronco, joelho e tornozelo a 90°.',
        affectedSegments: ['left_leg', 'right_leg', 'spine'],
      },
    ],
  },
};
