import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw, Video, VideoOff, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BIOMECHANICS_TEMPLATES } from '@/utils/biomechanicsTemplates';
import { evaluateFrame, isFrontalView, type FrameWarning } from '@/utils/biomechanicsMath';
import { createRepTracker, type RepTrackerState } from '@/utils/repTracker';

const LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

const SKELETON_CONNECTIONS: [number, number][] = [
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER],
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW],
  [LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST],
  [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW],
  [LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST],
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP],
  [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP],
  [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP],
  [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE],
  [LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE],
  [LANDMARKS.LEFT_ANKLE, LANDMARKS.LEFT_HEEL],
  [LANDMARKS.LEFT_ANKLE, LANDMARKS.LEFT_FOOT_INDEX],
  [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE],
  [LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE],
  [LANDMARKS.RIGHT_ANKLE, LANDMARKS.RIGHT_HEEL],
  [LANDMARKS.RIGHT_ANKLE, LANDMARKS.RIGHT_FOOT_INDEX],
];

const MOCK_MAX_KNEE_FLEXION = 90;
const MOCK_VALGO_ALERT = true;

type FacingMode = 'user' | 'environment';
type PoseStatus = 'good' | 'warning' | 'loading';
type AiState = 'loading' | 'ready' | 'fallback' | 'error' | 'off';

interface LandmarkResult {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

declare global {
  interface Window {
    Pose: any;
  }
}

function calculateAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

interface BiofeedbackCameraProps {
  movementPattern?: string;
  selectedErrors?: string[];
  exerciseName?: string;
}

export function BiofeedbackCamera({ movementPattern, selectedErrors, exerciseName }: BiofeedbackCameraProps) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const aiTimeoutRef = useRef<number | null>(null);
  const fallbackIntervalRef = useRef<number | null>(null);
  const bootedRef = useRef(false);
  const aiReadyRef = useRef(false);
  const simulationModeRef = useRef(false);
  const fallbackBlinkRef = useRef(false);
  const plankCoachMessageRef = useRef<string | null>(null);
  const curlCoachMessageRef = useRef<string | null>(null);
  // Single source of truth for the Biceps/Triceps 2D Stability Zone — set every
  // frame by analyzeAndDraw and consumed by the HUD branch below so the banner
  // and the red skeleton segment are guaranteed to stay in sync.
  const curlIsMisalignedRef = useRef(false);
  // Single source of truth for the Plank 2D alignment zone — set every frame
  // by analyzeAndDraw and consumed by the HUD branch so the banner and the red
  // skeleton segments stay in perfect sync. Tolerance: 160°–200° at the hip.
  const plankIsMisalignedRef = useRef(false);

  // Generic rep tracker — kept for rep counting only. Cadence/eccentric-speed
  // warnings were intentionally removed (Phase 28.5) so the Biceps/Triceps HUD
  // is driven strictly by the 15° stability zone.
  const repTrackerRef = useRef<RepTrackerState>(
    createRepTracker({ topAngle: 60, bottomAngle: 150 }),
  );

  // Resolve the active biomechanics template, filtering to only trainer-selected errors
  const activeTemplate = useMemo(() => {
    if (!movementPattern) return null;
    const template = BIOMECHANICS_TEMPLATES[movementPattern];
    if (!template) return null;
    if (!selectedErrors || selectedErrors.length === 0) return template;
    return {
      ...template,
      errors: template.errors.filter((e) => selectedErrors.includes(e.id)),
    };
  }, [movementPattern, selectedErrors]);

  const activeWarningsRef = useRef<FrameWarning[]>([]);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [status, setStatus] = useState<PoseStatus>('loading');
  const [statusText, setStatusText] = useState('Abrindo câmera...');
  const [confidence, setConfidence] = useState(0);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const [leftKneeAngle, setLeftKneeAngle] = useState<number | null>(null);
  const [rightKneeAngle, setRightKneeAngle] = useState<number | null>(null);
  const [aiState, setAiState] = useState<AiState>('loading');
  const [aiBadgeText, setAiBadgeText] = useState('Carregando IA...');
  const [activeWarnings, setActiveWarnings] = useState<FrameWarning[]>([]);
  const [sideProfileWarning, setSideProfileWarning] = useState(false);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const syncCanvasSize = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    return canvas.getContext('2d');
  }, []);

  const drawFallbackSkeleton = useCallback((showWarning: boolean) => {
    const ctx = syncCanvasSize();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    const neutralColor = '#ffffff';
    const safeColor = '#22c55e';
    const alertColor = '#ef4444';
    const kneeColor = showWarning ? alertColor : safeColor;

    const points = {
      head: { x: width * 0.5, y: height * 0.16 },
      neck: { x: width * 0.5, y: height * 0.26 },
      leftShoulder: { x: width * 0.42, y: height * 0.3 },
      rightShoulder: { x: width * 0.58, y: height * 0.3 },
      leftElbow: { x: width * 0.37, y: height * 0.42 },
      rightElbow: { x: width * 0.63, y: height * 0.42 },
      leftWrist: { x: width * 0.34, y: height * 0.54 },
      rightWrist: { x: width * 0.66, y: height * 0.54 },
      hipCenter: { x: width * 0.5, y: height * 0.5 },
      leftHip: { x: width * 0.45, y: height * 0.5 },
      rightHip: { x: width * 0.55, y: height * 0.5 },
      leftKnee: { x: width * 0.43, y: height * 0.67 },
      rightKnee: { x: width * 0.57, y: height * 0.67 },
      leftAnkle: { x: width * 0.4, y: height * 0.85 },
      rightAnkle: { x: width * 0.6, y: height * 0.85 },
    };

    const connections: Array<[keyof typeof points, keyof typeof points, string]> = [
      ['head', 'neck', neutralColor],
      ['neck', 'leftShoulder', neutralColor],
      ['neck', 'rightShoulder', neutralColor],
      ['leftShoulder', 'leftElbow', neutralColor],
      ['leftElbow', 'leftWrist', neutralColor],
      ['rightShoulder', 'rightElbow', neutralColor],
      ['rightElbow', 'rightWrist', neutralColor],
      ['neck', 'hipCenter', neutralColor],
      ['hipCenter', 'leftHip', neutralColor],
      ['hipCenter', 'rightHip', neutralColor],
      ['leftHip', 'leftKnee', kneeColor],
      ['leftKnee', 'leftAnkle', kneeColor],
      ['rightHip', 'rightKnee', kneeColor],
      ['rightKnee', 'rightAnkle', kneeColor],
    ];

    ctx.clearRect(0, 0, width, height);

    connections.forEach(([from, to, color]) => {
      ctx.beginPath();
      ctx.moveTo(points[from].x, points[from].y);
      ctx.lineTo(points[to].x, points[to].y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    Object.entries(points).forEach(([key, point]) => {
      const isKneeLine = key.includes('Knee') || key.includes('Hip') || key.includes('Ankle');
      const color = isKneeLine ? kneeColor : neutralColor;

      ctx.beginPath();
      ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });

    const label = showWarning ? '85°' : '96°';
    ctx.font = 'bold 14px monospace';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.72)';
    ctx.fillStyle = kneeColor;
    // Un-flip text so it's readable on the mirrored canvas
    const drawMirroredText = (text: string, tx: number, ty: number) => {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(-1, 1);
      ctx.strokeText(text, 0, 0);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };
    drawMirroredText(label, points.leftKnee.x + 18, points.leftKnee.y - 10);
    drawMirroredText(label, points.rightKnee.x + 18, points.rightKnee.y - 10);
  }, [syncCanvasSize]);

  const paintSimulationFrame = useCallback((showWarning: boolean) => {
    drawFallbackSkeleton(showWarning);
    setStatus(showWarning ? 'warning' : 'good');
    setStatusText(
      showWarning
        ? '⚠️ Atenção: Valgo Dinâmico Detectado! Alinhe o joelho.'
        : '✅ Forma: Excelente (AI Validated)',
    );
    setLeftKneeAngle(showWarning ? 85 : 96);
    setRightKneeAngle(showWarning ? 87 : 97);
    setConfidence(92);
  }, [drawFallbackSkeleton]);

  const activateFallback = useCallback(() => {
    if (simulationModeRef.current) return;

    simulationModeRef.current = true;
    aiReadyRef.current = false;
    if (aiTimeoutRef.current) window.clearTimeout(aiTimeoutRef.current);
    cancelAnimationFrame(rafRef.current);

    setAiState('fallback');
    setAiBadgeText('Modo Simulação (Sandbox)');
    fallbackBlinkRef.current = true;
    paintSimulationFrame(true);

    if (fallbackIntervalRef.current) window.clearInterval(fallbackIntervalRef.current);
    fallbackIntervalRef.current = window.setInterval(() => {
      fallbackBlinkRef.current = !fallbackBlinkRef.current;
      paintSimulationFrame(fallbackBlinkRef.current);
    }, 3000);
  }, [paintSimulationFrame]);

  const startFallbackTimeout = useCallback(() => {
    if (aiTimeoutRef.current) window.clearTimeout(aiTimeoutRef.current);
    aiTimeoutRef.current = window.setTimeout(() => {
      if (!aiReadyRef.current) {
        activateFallback();
      }
    }, 4000);
  }, [activateFallback]);

  const analyzeAndDraw = useCallback(
    (ctx: CanvasRenderingContext2D, landmarks: LandmarkResult[], width: number, height: number, frameWarnings: FrameWarning[] = []) => {
      ctx.clearRect(0, 0, width, height);

      const isVisible = (index: number) => landmarks[index]?.visibility > 0.5;

      let leftAngle: number | null = null;
      let rightAngle: number | null = null;
      let leftFlexionViolation = false;
      let rightFlexionViolation = false;
      let leftValgoViolation = false;
      let rightValgoViolation = false;
      let leftVaroViolation = false;
      let rightVaroViolation = false;

      // ── Bicep Curl 2D angular pendulum analysis ──
      // ── SCOPED REFACTOR (Phase 28): Biceps/Triceps 2D Stability Zone ──
      // Angle between Torso (Shoulder→Hip) and Upper Arm (Shoulder→Elbow).
      // Tolerance: 15°. Above that → violation. Only the Shoulder-Elbow segment
      // turns red; the rest of the skeleton remains green.
      const isCurlTemplate =
        activeTemplate?.errors.some(e => e.id === 'elbow_alignment') ||
        activeTemplate?.errors.some(e => e.id === 'elbow_drift_forward') ||
        activeTemplate?.errors.some(e => e.id === 'elbow_unstable');
      let curlViolation = false;
      let curlActiveSide: 'left' | 'right' | null = null;
      let curlBadConnection: [number, number] | null = null;
      let curlCoachMessage: string | null = null;
      let curlArmAngle: number | null = null;

      if (isCurlTemplate) {
        // Default: assume aligned this frame. Will flip to true only if the
        // stability angle exceeds 15°.
        curlIsMisalignedRef.current = false;
        // Step 1: Determine active side by visibility (shoulder + hip + elbow + wrist)
        const leftVis =
          (landmarks[LANDMARKS.LEFT_SHOULDER]?.visibility ?? 0) +
          (landmarks[LANDMARKS.LEFT_HIP]?.visibility ?? 0) +
          (landmarks[LANDMARKS.LEFT_ELBOW]?.visibility ?? 0) +
          (landmarks[LANDMARKS.LEFT_WRIST]?.visibility ?? 0);
        const rightVis =
          (landmarks[LANDMARKS.RIGHT_SHOULDER]?.visibility ?? 0) +
          (landmarks[LANDMARKS.RIGHT_HIP]?.visibility ?? 0) +
          (landmarks[LANDMARKS.RIGHT_ELBOW]?.visibility ?? 0) +
          (landmarks[LANDMARKS.RIGHT_WRIST]?.visibility ?? 0);

        const useLeft = leftVis >= rightVis;
        const shoulderIdx = useLeft ? LANDMARKS.LEFT_SHOULDER : LANDMARKS.RIGHT_SHOULDER;
        const elbowIdx = useLeft ? LANDMARKS.LEFT_ELBOW : LANDMARKS.RIGHT_ELBOW;
        const hipIdx = useLeft ? LANDMARKS.LEFT_HIP : LANDMARKS.RIGHT_HIP;
        const wristIdx = useLeft ? LANDMARKS.LEFT_WRIST : LANDMARKS.RIGHT_WRIST;
        curlActiveSide = useLeft ? 'left' : 'right';

        // Step 2: Extract 2D coords (ignore Z) for Shoulder, Hip and Elbow on active side.
        // Use a permissive visibility gate (0.3) — front-facing torso often has
        // lower hip visibility and we still want the stability zone to evaluate.
        const visOk = (i: number) => (landmarks[i]?.visibility ?? 0) > 0.3;
        if (visOk(shoulderIdx) && visOk(elbowIdx) && visOk(hipIdx)) {
          const s = landmarks[shoulderIdx];
          const h = landmarks[hipIdx];
          const e = landmarks[elbowIdx];

          // Step 3: 2D STABILITY ZONE — angle between Torso (S→H) and Upper Arm (S→E)
          const tx = h.x - s.x;
          const ty = h.y - s.y;
          const ax = e.x - s.x;
          const ay = e.y - s.y;
          const dot = tx * ax + ty * ay;
          const magT = Math.hypot(tx, ty);
          const magA = Math.hypot(ax, ay);
          const stabilityAngle = magT && magA
            ? (Math.acos(Math.max(-1, Math.min(1, dot / (magT * magA)))) * 180) / Math.PI
            : 0;
          curlArmAngle = stabilityAngle;

          // Step 4: Trigger if Torso↔UpperArm angle exceeds 15° tolerance
          if (stabilityAngle > 15) {
            curlViolation = true;
            curlIsMisalignedRef.current = true;
            curlCoachMessage = '⚠️ Alinhe o cotovelo ao tronco';

            // Mark ONLY the Shoulder-Elbow CONNECTION of active side
            if (useLeft) {
              curlBadConnection = [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW];
            } else {
              curlBadConnection = [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW];
            }
          }

          // Step 5: Drive the generic Rep & Cadence tracker (forearm angle = S-E-W).
          // Only count this rep as valid if the stability zone was maintained.
          if (visOk(wristIdx)) {
            const w = landmarks[wristIdx];
            const v1x = s.x - e.x, v1y = s.y - e.y;
            const v2x = w.x - e.x, v2y = w.y - e.y;
            const d2 = v1x * v2x + v1y * v2y;
            const m1 = Math.hypot(v1x, v1y);
            const m2 = Math.hypot(v2x, v2y);
            const forearmAngle = m1 && m2
              ? (Math.acos(Math.max(-1, Math.min(1, d2 / (m1 * m2)))) * 180) / Math.PI
              : 180;
            repTrackerRef.current.update(forearmAngle, performance.now(), {
              stable: !curlViolation,
            });
          }
        }
      }

      // ── Plank 2D analysis (strict side isolation) ──
      const isPlankTemplate = activeTemplate?.errors.some(e => e.id === 'plank_alignment') ||
        activeTemplate?.errors.some(e => e.id === 'hip_sag') ||
        activeTemplate?.errors.some(e => e.id === 'hip_pike');
      let plankViolation = false;
      let plankHipAngle: number | null = null;
      let plankActiveSide: 'left' | 'right' | null = null;
      let plankCoachMessage: string | null = null;
      const plankBadLandmarks = new Set<number>();

      if (isPlankTemplate) {
        // Reset every frame — default to aligned unless angle falls outside the
        // generous 160°–200° tolerance window.
        plankIsMisalignedRef.current = false;
        // Determine active side by visibility score
        const leftVis =
          (landmarks[LANDMARKS.LEFT_SHOULDER]?.visibility ?? 0) +
          (landmarks[LANDMARKS.LEFT_HIP]?.visibility ?? 0) +
          (landmarks[LANDMARKS.LEFT_ANKLE]?.visibility ?? 0);
        const rightVis =
          (landmarks[LANDMARKS.RIGHT_SHOULDER]?.visibility ?? 0) +
          (landmarks[LANDMARKS.RIGHT_HIP]?.visibility ?? 0) +
          (landmarks[LANDMARKS.RIGHT_ANKLE]?.visibility ?? 0);

        const useLeft = leftVis >= rightVis;
        const shoulderIdx = useLeft ? LANDMARKS.LEFT_SHOULDER : LANDMARKS.RIGHT_SHOULDER;
        const hipIdx = useLeft ? LANDMARKS.LEFT_HIP : LANDMARKS.RIGHT_HIP;
        const ankleIdx = useLeft ? LANDMARKS.LEFT_ANKLE : LANDMARKS.RIGHT_ANKLE;

        if (isVisible(shoulderIdx) && isVisible(hipIdx) && isVisible(ankleIdx)) {
          const shoulder = landmarks[shoulderIdx];
          const hip = landmarks[hipIdx];
          const ankle = landmarks[ankleIdx];

          // Strict 2D angle (ignore Z), hip as vertex
          const angle1 = Math.atan2(shoulder.y - hip.y, shoulder.x - hip.x);
          const angle2 = Math.atan2(ankle.y - hip.y, ankle.x - hip.x);
          let hipAngle = Math.abs((angle1 - angle2) * (180 / Math.PI));
          if (hipAngle > 180) hipAngle = 360 - hipAngle;

          plankHipAngle = hipAngle;
          plankActiveSide = useLeft ? 'left' : 'right';

          // Phase 28.6 — Single boolean tolerance zone (~20° on each side of
          // anatomical 180°). Only trigger outside 160°–200°.
          if (hipAngle < 160 || hipAngle > 200) {
            plankViolation = true;
            plankIsMisalignedRef.current = true;
          }

          // Determine directional message based on hip position
          if (plankViolation) {
            const midY = (shoulder.y + ankle.y) / 2;
            if (hip.y < midY) {
              // HIP PIKING (Too High) - lower y value means higher on screen
              plankCoachMessage = '🚨 Quadril muito alto! Alinhe mais o quadril com o corpo.';
            } else {
              // HIP SAGGING (Too Low)
              plankCoachMessage = '🚨 Quadril caindo! Contraia o glúteo e o abdômen.';
            }

            // Mark Shoulder→Hip and Hip→Ankle/Knee segments red on the active side
            if (useLeft) {
              [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE, LANDMARKS.LEFT_HEEL, LANDMARKS.LEFT_FOOT_INDEX].forEach(i => plankBadLandmarks.add(i));
            } else {
              [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE, LANDMARKS.RIGHT_HEEL, LANDMARKS.RIGHT_FOOT_INDEX].forEach(i => plankBadLandmarks.add(i));
            }
          }
        }
      }

      // Store plank message in ref for access in onResults callback
      plankCoachMessageRef.current = plankCoachMessage;
      curlCoachMessageRef.current = curlCoachMessage;

      // Valgus & Varus detection (independent, both can fire simultaneously)
      // Skip valgus/varus for plank templates
      if (MOCK_VALGO_ALERT && !isPlankTemplate && !isCurlTemplate) {
        const tolerance = 0.02;

        // Visual LEFT leg = MediaPipe RIGHT landmarks (mirrored canvas)
        if (isVisible(LANDMARKS.RIGHT_KNEE) && isVisible(LANDMARKS.RIGHT_ANKLE)) {
          const kneeX = landmarks[LANDMARKS.RIGHT_KNEE].x;
          const ankleX = landmarks[LANDMARKS.RIGHT_ANKLE].x;
          leftValgoViolation = kneeX > ankleX + tolerance;
          leftVaroViolation = kneeX < ankleX - tolerance;
        }

        // Visual RIGHT leg = MediaPipe LEFT landmarks (mirrored canvas)
        if (isVisible(LANDMARKS.LEFT_KNEE) && isVisible(LANDMARKS.LEFT_ANKLE)) {
          const kneeX = landmarks[LANDMARKS.LEFT_KNEE].x;
          const ankleX = landmarks[LANDMARKS.LEFT_ANKLE].x;
          rightValgoViolation = kneeX < ankleX - tolerance;
          rightVaroViolation = kneeX > ankleX + tolerance;
        }
      }

      // Map affectedSegments from warnings to landmark indices
      const SEGMENT_TO_LANDMARKS: Record<string, number[]> = {
        left_leg: [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE, LANDMARKS.LEFT_HEEL, LANDMARKS.LEFT_FOOT_INDEX],
        right_leg: [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE, LANDMARKS.RIGHT_HEEL, LANDMARKS.RIGHT_FOOT_INDEX],
        left_upper_leg: [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE],
        left_lower_leg: [LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE, LANDMARKS.LEFT_HEEL, LANDMARKS.LEFT_FOOT_INDEX],
        right_upper_leg: [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE],
        right_lower_leg: [LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE, LANDMARKS.RIGHT_HEEL, LANDMARKS.RIGHT_FOOT_INDEX],
        left_trunk: [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP],
        right_trunk: [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP],
        spine: [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP],
        hip: [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP],
        left_arm: [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST],
        right_arm: [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST],
        left_upper_arm: [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW],
        right_upper_arm: [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW],
      };

      const badLandmarks = new Set<number>();

      // For plank, use ONLY the plank-specific bad landmarks
      if (isPlankTemplate) {
        plankBadLandmarks.forEach(i => badLandmarks.add(i));
      } else if (isCurlTemplate) {
        // Curl uses connection-based coloring, not landmark-based — skip badLandmarks
      } else {
        // Populate from frameWarnings' affectedSegments (non-plank/curl templates)
        for (const w of frameWarnings) {
          for (const seg of w.affectedSegments) {
            const indices = SEGMENT_TO_LANDMARKS[seg];
            if (indices) indices.forEach(i => badLandmarks.add(i));
          }
        }

        // Visual left leg errors → paint MediaPipe RIGHT landmarks red (mirrored)
        if (leftFlexionViolation || leftValgoViolation || leftVaroViolation) {
          [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE, LANDMARKS.RIGHT_HEEL, LANDMARKS.RIGHT_FOOT_INDEX].forEach(i => badLandmarks.add(i));
        }
        // Visual right leg errors → paint MediaPipe LEFT landmarks red (mirrored)
        if (rightFlexionViolation || rightValgoViolation || rightVaroViolation) {
          [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE, LANDMARKS.LEFT_HEEL, LANDMARKS.LEFT_FOOT_INDEX].forEach(i => badLandmarks.add(i));
        }
      }

      // Determine line color
      const getLineColor = (start: number, end: number) => {
        // For curl: ONLY the exact upper arm connection of the active side turns red
        if (isCurlTemplate) {
          if (curlBadConnection) {
            const isExactMatch =
              (start === curlBadConnection[0] && end === curlBadConnection[1]) ||
              (start === curlBadConnection[1] && end === curlBadConnection[0]);
            if (isExactMatch) return '#ef4444';
          }
          return '#22c55e'; // Everything else stays green for curl
        }
        const isBad = badLandmarks.has(start) && badLandmarks.has(end);
        if (!isBad) return '#22c55e';
        return '#ef4444';
      };

      SKELETON_CONNECTIONS.forEach(([start, end]) => {
        const from = landmarks[start];
        const to = landmarks[end];
        if (!from || !to || from.visibility < 0.5 || to.visibility < 0.5) return;

        const color = getLineColor(start, end);
        ctx.beginPath();
        ctx.moveTo(from.x * width, from.y * height);
        ctx.lineTo(to.x * width, to.y * height);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      const jointIndices = [
        LANDMARKS.NOSE,
        LANDMARKS.LEFT_SHOULDER,
        LANDMARKS.RIGHT_SHOULDER,
        LANDMARKS.LEFT_ELBOW,
        LANDMARKS.RIGHT_ELBOW,
        LANDMARKS.LEFT_WRIST,
        LANDMARKS.RIGHT_WRIST,
        LANDMARKS.LEFT_HIP,
        LANDMARKS.RIGHT_HIP,
        LANDMARKS.LEFT_KNEE,
        LANDMARKS.RIGHT_KNEE,
        LANDMARKS.LEFT_ANKLE,
        LANDMARKS.RIGHT_ANKLE,
        LANDMARKS.LEFT_HEEL,
        LANDMARKS.RIGHT_HEEL,
      ];

      jointIndices.forEach((index) => {
        const point = landmarks[index];
        if (!point || point.visibility < 0.5) return;

        let isBad = badLandmarks.has(index);
        // For curl: only shoulder & elbow of the active upper arm turn red
        if (isCurlTemplate) {
          isBad = curlBadConnection
            ? (index === curlBadConnection[0] || index === curlBadConnection[1])
            : false;
        }
        const color = isBad ? '#ef4444' : '#22c55e';
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, 6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      const drawAngleLabel = (index: number, angle: number | null, violation: boolean, warningLevel: boolean = false) => {
        if (angle === null) return;
        const point = landmarks[index];
        if (!point || point.visibility < 0.5) return;

        const text = `${Math.round(angle)}°`;
        const x = point.x * width + 16;
        const y = point.y * height - 8;

        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = violation ? (warningLevel ? '#f59e0b' : '#ef4444') : '#22c55e';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 3;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(-1, 1);
        ctx.strokeText(text, 0, 0);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      };

      // Plank hip angle label on the active side
      if (isPlankTemplate && plankHipAngle !== null && plankActiveSide) {
        const hipIdx = plankActiveSide === 'left' ? LANDMARKS.LEFT_HIP : LANDMARKS.RIGHT_HIP;
        drawAngleLabel(hipIdx, plankHipAngle, plankViolation);
      }

      // Curl arm angle label on the active side
      if (isCurlTemplate && curlActiveSide && curlArmAngle !== null) {
        const elbowIdx = curlActiveSide === 'left' ? LANDMARKS.LEFT_ELBOW : LANDMARKS.RIGHT_ELBOW;
        const point = landmarks[elbowIdx];
        if (point && point.visibility > 0.5) {
          const text = `${Math.round(curlArmAngle)}°`;
          const x = point.x * width + 16;
          const y = point.y * height - 8;
          ctx.font = 'bold 14px monospace';
          ctx.fillStyle = curlViolation ? '#ef4444' : '#22c55e';
          ctx.strokeStyle = 'rgba(0,0,0,0.7)';
          ctx.lineWidth = 3;
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(-1, 1);
          ctx.strokeText(text, 0, 0);
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      }

      // Knee angle labels (non-plank, non-curl)
      if (!isPlankTemplate && !isCurlTemplate) {
        drawAngleLabel(LANDMARKS.LEFT_KNEE, leftAngle, leftFlexionViolation || leftValgoViolation || leftVaroViolation);
        drawAngleLabel(LANDMARKS.RIGHT_KNEE, rightAngle, rightFlexionViolation || rightValgoViolation || rightVaroViolation);
      }

      setLeftKneeAngle(isPlankTemplate ? plankHipAngle : (isCurlTemplate ? null : leftAngle));
      setRightKneeAngle(isPlankTemplate || isCurlTemplate ? null : rightAngle);

      return curlViolation || plankViolation || leftFlexionViolation || rightFlexionViolation || leftValgoViolation || rightValgoViolation || leftVaroViolation || rightVaroViolation;
    },
    [activeTemplate],
  );

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (aiTimeoutRef.current) window.clearTimeout(aiTimeoutRef.current);
    if (fallbackIntervalRef.current) window.clearInterval(fallbackIntervalRef.current);
    aiReadyRef.current = false;
    simulationModeRef.current = false;
    fallbackBlinkRef.current = false;
    poseRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    clearCanvas();

    setCameraStarting(false);
    setCameraActive(false);
    setAiState('off');
    setAiBadgeText('IA desligada');
    setStatus('loading');
    setStatusText('Câmera desligada');
    setConfidence(0);
    setLeftKneeAngle(null);
    setRightKneeAngle(null);
  }, [clearCanvas]);

  const startVideoFeed = useCallback(async (requestedFacingMode: FacingMode = facingMode) => {
    setCameraStarting(true);
    cancelAnimationFrame(rafRef.current);
    if (aiTimeoutRef.current) window.clearTimeout(aiTimeoutRef.current);
    if (fallbackIntervalRef.current) window.clearInterval(fallbackIntervalRef.current);

    aiReadyRef.current = false;
    simulationModeRef.current = false;
    fallbackBlinkRef.current = false;
    poseRef.current = null;

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: requestedFacingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      const video = videoRef.current;
      if (!video) return;

      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      syncCanvasSize();
      clearCanvas();
      setCameraActive(true);
      setCameraStarting(false);
      setStatus('loading');
      setStatusText('Posicione-se na câmera...');
      setAiState('loading');
      setAiBadgeText('Carregando IA...');
      setConfidence(0);
      setLeftKneeAngle(null);
      setRightKneeAngle(null);
      startFallbackTimeout();
    } catch (error) {
      console.error('Camera error:', error);
      setCameraStarting(false);
      setCameraActive(false);
      setAiState('error');
      setAiBadgeText('Câmera indisponível');
      setStatus('loading');
      setStatusText('Erro ao acessar a câmera.');
    }
  }, [clearCanvas, facingMode, startFallbackTimeout, syncCanvasSize]);

  const startPoseProcessing = useCallback(() => {
    if (!scriptsLoaded || !window.Pose || !videoRef.current || !canvasRef.current || !cameraActive || simulationModeRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const pose = new window.Pose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 0,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results: { poseLandmarks?: LandmarkResult[] }) => {
        if (simulationModeRef.current) return;

        if (!aiReadyRef.current) {
          aiReadyRef.current = true;
          if (aiTimeoutRef.current) window.clearTimeout(aiTimeoutRef.current);
          setAiState('ready');
          setAiBadgeText('IA online');
        }

        syncCanvasSize();

        if (results.poseLandmarks && results.poseLandmarks.length > 0) {
          const landmarks = results.poseLandmarks;
          const averageVisibility = landmarks.reduce((sum, landmark) => sum + landmark.visibility, 0) / landmarks.length;

          setConfidence(Math.round(averageVisibility * 100));

          // Detect curl/triceps templates — their HUD is driven exclusively by the
          // 2D Stability Zone (in analyzeAndDraw), NOT by evaluateFrame, because the
          // generic Z_X_OSCILLATION rules in the template produce false positives
          // (elbow vs hip absolute distance is always large).
          const isCurlOrTriceps =
            !!activeTemplate?.errors.some(
              (e) =>
                e.id === 'elbow_alignment' ||
                e.id === 'elbow_drift_forward' ||
                e.id === 'elbow_unstable',
            );

          // Plank HUD is also driven exclusively by the local 2D alignment
          // boolean (`plankIsMisalignedRef`) so the banner stays in lock-step
          // with the red skeleton segments. Skip evaluateFrame for plank too.
          const isPlankActive = !!activeTemplate?.errors.some(
            (e) => e.id === 'plank_alignment' || e.id === 'hip_sag' || e.id === 'hip_pike',
          );

          // Run the biomechanics engine if a template is active (skipped for curl/triceps and plank)
          const warnings = (isCurlOrTriceps || isPlankActive) ? [] : evaluateFrame(landmarks, activeTemplate);
          activeWarningsRef.current = warnings;
          setActiveWarnings(warnings);

          // Detect side-profile when valgus is being monitored
          const monitorsValgus = activeTemplate?.errors.some(e => e.id === 'valgus');
          if (monitorsValgus) {
            const lk = landmarks[LANDMARKS.LEFT_KNEE];
            const rk = landmarks[LANDMARKS.RIGHT_KNEE];
            if (lk && rk) {
              setSideProfileWarning(!isFrontalView(lk, rk));
            }
          } else {
            setSideProfileWarning(false);
          }

          const hasViolation = analyzeAndDraw(ctx, landmarks, canvas.width, canvas.height, warnings);
          const hasTemplateWarning = warnings.length > 0;

          if (isCurlOrTriceps) {
            // Curl/Triceps: HUD is STRICTLY mirrored from the per-frame
            // `isMisaligned` boolean computed by analyzeAndDraw. Same condition
            // also drives the red Shoulder→Elbow skeleton segment.
            if (curlIsMisalignedRef.current) {
              setStatus('warning');
              setStatusText('⚠️ Alinhe o cotovelo ao tronco');
            } else {
              setStatus('good');
              setStatusText(exerciseName ? `✅ ${exerciseName}: Forma Excelente` : '✅ Forma: Excelente');
            }
          } else if (isPlankActive) {
            // Plank: HUD is STRICTLY mirrored from `plankIsMisalignedRef`.
            // Same boolean drives the red Shoulder→Hip and Hip→Ankle segments.
            if (plankIsMisalignedRef.current) {
              setStatus('warning');
              setStatusText(
                plankCoachMessageRef.current
                  ? `⚠️ ${plankCoachMessageRef.current}`
                  : '⚠️ Alinhe ombro-quadril-tornozelo',
              );
            } else {
              setStatus('good');
              setStatusText(exerciseName ? `✅ ${exerciseName}: Forma Excelente` : '✅ Forma: Excelente');
            }
          } else if (hasTemplateWarning) {
            const firstWarning = warnings[0];
            setStatus('warning');
            setStatusText(`⚠️ ${firstWarning.coachMessage}`);
          } else if (hasViolation) {
            setStatus('warning');
            // Use directional plank message if available, otherwise generic
            if (plankCoachMessageRef.current) {
              setStatusText(`⚠️ ${plankCoachMessageRef.current}`);
            } else if (curlCoachMessageRef.current) {
              setStatusText(`⚠️ ${curlCoachMessageRef.current}`);
            } else {
              setStatusText('⚠️ Atenção: Correção necessária!');
            }
          } else {
            setStatus('good');
            setStatusText(exerciseName ? `✅ ${exerciseName}: Forma Excelente` : '✅ Forma: Excelente');
            plankCoachMessageRef.current = null;
            curlCoachMessageRef.current = null;
          }
        } else {
          clearCanvas();
          setStatus('loading');
          setStatusText('Posicione-se na câmera...');
          setConfidence(0);
          setLeftKneeAngle(null);
          setRightKneeAngle(null);
        }
      });

      poseRef.current = pose;

      const processFrame = async () => {
        if (simulationModeRef.current || !poseRef.current || !videoRef.current) return;

        try {
          if (video.readyState >= 2) {
            await poseRef.current.send({ image: video });
          }
        } catch (error) {
          console.error('Pose processing error:', error);
          if (!aiReadyRef.current) {
            activateFallback();
            return;
          }
        }

        if (!simulationModeRef.current) {
          rafRef.current = requestAnimationFrame(processFrame);
        }
      };

      processFrame();
    } catch (error) {
      console.error('Pose init error:', error);
      activateFallback();
    }
  }, [activateFallback, activeTemplate, analyzeAndDraw, cameraActive, clearCanvas, exerciseName, scriptsLoaded, syncCanvasSize]);

  const toggleFacing = useCallback(() => {
    const nextFacingMode: FacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacingMode);

    if (cameraActive || cameraStarting) {
      startVideoFeed(nextFacingMode);
    }
  }, [cameraActive, cameraStarting, facingMode, startVideoFeed]);

  useEffect(() => {
    const scripts = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js',
    ];

    let loaded = 0;
    const markLoaded = () => {
      loaded += 1;
      if (loaded === scripts.length) {
        setScriptsLoaded(true);
      }
    };

    scripts.forEach((src) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        markLoaded();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.onload = markLoaded;
      script.onerror = markLoaded;
      document.head.appendChild(script);
    });
  }, []);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    startVideoFeed();

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cameraActive && scriptsLoaded && !simulationModeRef.current && !aiReadyRef.current) {
      startPoseProcessing();
    }
  }, [cameraActive, scriptsLoaded, startPoseProcessing]);

  const aiBadgeClasses =
    aiState === 'ready'
      ? 'border-success/30 bg-success/10 text-success'
      : aiState === 'fallback'
        ? 'border-warning/30 bg-warning/10 text-warning'
        : aiState === 'error'
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-border bg-background/75 text-foreground';

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-black">
      {/* Minimal top controls */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-3 py-3">
        <button
          onClick={() => {
            stopCamera();
            navigate(-1);
          }}
          className="rounded-full bg-black/40 p-2 text-white backdrop-blur-md transition-colors hover:bg-black/60"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          onClick={toggleFacing}
          className="rounded-full bg-black/40 p-2 text-white backdrop-blur-md transition-colors hover:bg-black/60"
          aria-label="Inverter câmera"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      {cameraActive && (
        <>
          {/* Premium exercise title pill — primary identity */}
          {exerciseName && (
            <div className="absolute left-0 right-0 top-3 z-20 flex flex-col items-center gap-1.5 px-16">
              <span className="max-w-full truncate rounded-full bg-black/55 px-4 py-1.5 text-sm font-semibold text-white shadow-lg backdrop-blur-md">
                {exerciseName}
              </span>
              {/* Discrete status dots */}
              <div className="flex items-center gap-2 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-md">
                <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-white/85">
                  <Zap className="h-2.5 w-2.5 text-primary" /> Lite
                </span>
                <span className="h-2.5 w-px bg-white/25" />
                <span className={`flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider ${
                  aiState === 'ready' ? 'text-success' :
                  aiState === 'fallback' ? 'text-warning' :
                  aiState === 'error' ? 'text-destructive' : 'text-white/85'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    aiState === 'ready' ? 'bg-success animate-pulse' :
                    aiState === 'fallback' ? 'bg-warning' :
                    aiState === 'error' ? 'bg-destructive' : 'bg-white/60'
                  }`} />
                  {aiBadgeText}
                </span>
              </div>
            </div>
          )}

          {/* Unified priority feedback pill — single banner, no stacking */}
          {(() => {
            // Priority: 1) active error warning  2) side profile warning  3) status (good/warning/idle)
            const topWarning = activeWarnings[0];
            const hasError = !!topWarning;
            const hasSideWarn = !hasError && sideProfileWarning;
            const message = hasError
              ? topWarning.coachMessage
              : hasSideWarn
                ? '⚠️ Valgo é melhor analisado de frente'
                : statusText;

            const tone = hasError || status === 'warning'
              ? 'bg-red-500/85 text-white'
              : hasSideWarn
                ? 'bg-amber-500/85 text-white'
                : status === 'good'
                  ? 'bg-emerald-500/85 text-white'
                  : 'bg-black/55 text-white/90';

            return (
              <div className={`absolute left-1/2 z-20 -translate-x-1/2 ${exerciseName ? 'top-[88px]' : 'top-16'} max-w-[88%]`}>
                <div className={`flex items-center gap-2 rounded-full px-4 py-2 shadow-lg backdrop-blur-md transition-all ${tone}`}>
                  <p className="truncate text-sm font-semibold">{message}</p>
                  {confidence > 0 && !hasError && !hasSideWarn && (
                    <span className="ml-1 font-mono text-[10px] tabular-nums opacity-75">
                      {confidence}%
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* Tiny knee angle telemetry — bottom corner, only when active */}
      {cameraActive && (leftKneeAngle !== null || rightKneeAngle !== null) && (
        <div className="absolute bottom-28 left-1/2 z-20 -translate-x-1/2 flex items-center gap-3 rounded-full bg-black/40 px-3 py-1 text-[10px] font-mono backdrop-blur-md">
          {leftKneeAngle !== null && (
            <span className={leftKneeAngle < MOCK_MAX_KNEE_FLEXION ? 'text-red-400' : 'text-emerald-400'}>
              E: {Math.round(leftKneeAngle)}°
            </span>
          )}
          {rightKneeAngle !== null && (
            <span className={rightKneeAngle < MOCK_MAX_KNEE_FLEXION ? 'text-red-400' : 'text-emerald-400'}>
              D: {Math.round(rightKneeAngle)}°
            </span>
          )}
          <span className="text-white/45">/{MOCK_MAX_KNEE_FLEXION}°</span>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />

        {!cameraActive && !cameraStarting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/75">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/20">
              <Video className="h-10 w-10 text-accent" />
            </div>
            <p className="px-8 text-center text-sm text-white/80">
              Posicione o celular para filmar seu corpo inteiro durante o exercício
            </p>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-6 pb-8 pt-8 pb-safe">
        <div className="flex items-center justify-center gap-6">
          {!cameraActive ? (
            <button
              onClick={() => startVideoFeed()}
              disabled={cameraStarting}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-accent shadow-[0_0_20px_hsl(var(--accent)/0.5)] transition-all hover:scale-105 disabled:opacity-50"
            >
              <Video className="h-7 w-7 text-accent-foreground" />
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive shadow-[0_0_20px_hsl(var(--destructive)/0.45)] transition-all hover:scale-105"
            >
              <VideoOff className="h-7 w-7 text-destructive-foreground" />
            </button>
          )}
        </div>

        <p className="mt-3 text-center text-xs text-white/45">
          {cameraActive
            ? 'Toque para parar a análise'
            : cameraStarting
              ? 'Abrindo câmera...'
              : 'Toque para iniciar análise biomecânica'}
        </p>
      </div>
    </div>
  );
}
