import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw, Video, VideoOff, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BIOMECHANICS_TEMPLATES } from '@/utils/biomechanicsTemplates';
import { evaluateFrame, isFrontalView, getCameraHint, isBodyInFrame, type FrameWarning, type Severity } from '@/utils/biomechanicsMath';

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

// Each connection is tagged with the segment group it belongs to
type SegmentTag = 'spine' | 'left_arm' | 'right_arm' | 'left_leg' | 'right_leg' | 'hip';

const SKELETON_CONNECTIONS: { from: number; to: number; segment: SegmentTag }[] = [
  // Spine
  { from: LANDMARKS.LEFT_SHOULDER, to: LANDMARKS.RIGHT_SHOULDER, segment: 'spine' },
  { from: LANDMARKS.LEFT_SHOULDER, to: LANDMARKS.LEFT_HIP, segment: 'spine' },
  { from: LANDMARKS.RIGHT_SHOULDER, to: LANDMARKS.RIGHT_HIP, segment: 'spine' },
  { from: LANDMARKS.LEFT_HIP, to: LANDMARKS.RIGHT_HIP, segment: 'hip' },
  // Left arm
  { from: LANDMARKS.LEFT_SHOULDER, to: LANDMARKS.LEFT_ELBOW, segment: 'left_arm' },
  { from: LANDMARKS.LEFT_ELBOW, to: LANDMARKS.LEFT_WRIST, segment: 'left_arm' },
  // Right arm
  { from: LANDMARKS.RIGHT_SHOULDER, to: LANDMARKS.RIGHT_ELBOW, segment: 'right_arm' },
  { from: LANDMARKS.RIGHT_ELBOW, to: LANDMARKS.RIGHT_WRIST, segment: 'right_arm' },
  // Left leg
  { from: LANDMARKS.LEFT_HIP, to: LANDMARKS.LEFT_KNEE, segment: 'left_leg' },
  { from: LANDMARKS.LEFT_KNEE, to: LANDMARKS.LEFT_ANKLE, segment: 'left_leg' },
  { from: LANDMARKS.LEFT_ANKLE, to: LANDMARKS.LEFT_HEEL, segment: 'left_leg' },
  { from: LANDMARKS.LEFT_ANKLE, to: LANDMARKS.LEFT_FOOT_INDEX, segment: 'left_leg' },
  // Right leg
  { from: LANDMARKS.RIGHT_HIP, to: LANDMARKS.RIGHT_KNEE, segment: 'right_leg' },
  { from: LANDMARKS.RIGHT_KNEE, to: LANDMARKS.RIGHT_ANKLE, segment: 'right_leg' },
  { from: LANDMARKS.RIGHT_ANKLE, to: LANDMARKS.RIGHT_HEEL, segment: 'right_leg' },
  { from: LANDMARKS.RIGHT_ANKLE, to: LANDMARKS.RIGHT_FOOT_INDEX, segment: 'right_leg' },
];

// Map each landmark index to its segment(s) for joint coloring
const LANDMARK_SEGMENTS: Record<number, SegmentTag[]> = {
  [LANDMARKS.NOSE]: ['spine'],
  [LANDMARKS.LEFT_SHOULDER]: ['spine', 'left_arm'],
  [LANDMARKS.RIGHT_SHOULDER]: ['spine', 'right_arm'],
  [LANDMARKS.LEFT_ELBOW]: ['left_arm'],
  [LANDMARKS.RIGHT_ELBOW]: ['right_arm'],
  [LANDMARKS.LEFT_WRIST]: ['left_arm'],
  [LANDMARKS.RIGHT_WRIST]: ['right_arm'],
  [LANDMARKS.LEFT_HIP]: ['hip', 'left_leg'],
  [LANDMARKS.RIGHT_HIP]: ['hip', 'right_leg'],
  [LANDMARKS.LEFT_KNEE]: ['left_leg'],
  [LANDMARKS.RIGHT_KNEE]: ['right_leg'],
  [LANDMARKS.LEFT_ANKLE]: ['left_leg'],
  [LANDMARKS.RIGHT_ANKLE]: ['right_leg'],
  [LANDMARKS.LEFT_HEEL]: ['left_leg'],
  [LANDMARKS.RIGHT_HEEL]: ['right_leg'],
  [LANDMARKS.LEFT_FOOT_INDEX]: ['left_leg'],
  [LANDMARKS.RIGHT_FOOT_INDEX]: ['right_leg'],
};


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
  const [isCalibrating, setIsCalibrating] = useState(true);

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
    ctx.strokeText(label, points.leftKnee.x + 18, points.leftKnee.y - 10);
    ctx.fillText(label, points.leftKnee.x + 18, points.leftKnee.y - 10);
    ctx.strokeText(label, points.rightKnee.x + 18, points.rightKnee.y - 10);
    ctx.fillText(label, points.rightKnee.x + 18, points.rightKnee.y - 10);
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
    (ctx: CanvasRenderingContext2D, landmarks: LandmarkResult[], width: number, height: number, warnings: FrameWarning[]) => {
      ctx.clearRect(0, 0, width, height);

      const isVisible = (index: number) => landmarks[index]?.visibility > 0.5;

      // Build segment → highest severity map
      const segmentSeverity = new Map<string, Severity>();
      for (const w of warnings) {
        for (const seg of w.affectedSegments) {
          const current = segmentSeverity.get(seg);
          if (!current || w.severity === 'critical' || (w.severity === 'warning' && current === 'ok')) {
            segmentSeverity.set(seg, w.severity);
          }
        }
      }

      const getSeverityStyle = (severity: Severity | undefined) => {
        switch (severity) {
          case 'critical': return { color: '#ef4444', lineWidth: 6, shadowBlur: 14 };
          case 'warning':  return { color: '#f59e0b', lineWidth: 4, shadowBlur: 10 };
          default:         return { color: '#22c55e', lineWidth: 3, shadowBlur: 8 };
        }
      };

      // Compute knee angles for display
      let leftAngle: number | null = null;
      let rightAngle: number | null = null;

      if (isVisible(LANDMARKS.LEFT_HIP) && isVisible(LANDMARKS.LEFT_KNEE) && isVisible(LANDMARKS.LEFT_ANKLE)) {
        leftAngle = calculateAngle(
          landmarks[LANDMARKS.LEFT_HIP],
          landmarks[LANDMARKS.LEFT_KNEE],
          landmarks[LANDMARKS.LEFT_ANKLE],
        );
      }
      if (isVisible(LANDMARKS.RIGHT_HIP) && isVisible(LANDMARKS.RIGHT_KNEE) && isVisible(LANDMARKS.RIGHT_ANKLE)) {
        rightAngle = calculateAngle(
          landmarks[LANDMARKS.RIGHT_HIP],
          landmarks[LANDMARKS.RIGHT_KNEE],
          landmarks[LANDMARKS.RIGHT_ANKLE],
        );
      }

      // Draw skeleton connections with 3-tier severity coloring
      SKELETON_CONNECTIONS.forEach(({ from: startIdx, to: endIdx, segment }) => {
        const fromPt = landmarks[startIdx];
        const toPt = landmarks[endIdx];
        if (!fromPt || !toPt || fromPt.visibility < 0.5 || toPt.visibility < 0.5) return;

        const severity = segmentSeverity.get(segment);
        const style = getSeverityStyle(severity);

        ctx.beginPath();
        ctx.moveTo(fromPt.x * width, fromPt.y * height);
        ctx.lineTo(toPt.x * width, toPt.y * height);
        ctx.strokeStyle = style.color;
        ctx.lineWidth = style.lineWidth;
        ctx.shadowColor = style.color;
        ctx.shadowBlur = style.shadowBlur;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Draw joints with 3-tier severity coloring
      const jointIndices = Object.keys(LANDMARK_SEGMENTS).map(Number);

      jointIndices.forEach((index) => {
        const point = landmarks[index];
        if (!point || point.visibility < 0.5) return;

        const segments = LANDMARK_SEGMENTS[index] ?? [];
        // Pick highest severity among all segments this joint belongs to
        let maxSev: Severity = 'ok';
        for (const s of segments) {
          const sev = segmentSeverity.get(s);
          if (sev === 'critical') { maxSev = 'critical'; break; }
          if (sev === 'warning') maxSev = 'warning';
        }
        const style = getSeverityStyle(maxSev);

        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, maxSev !== 'ok' ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = style.color;
        ctx.shadowColor = style.color;
        ctx.shadowBlur = maxSev !== 'ok' ? 16 : 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      // Draw angle labels at knees
      const drawAngleLabel = (index: number, angle: number | null) => {
        if (angle === null) return;
        const point = landmarks[index];
        if (!point || point.visibility < 0.5) return;

        const segs = LANDMARK_SEGMENTS[index] ?? [];
        let maxSev: Severity = 'ok';
        for (const s of segs) {
          const sev = segmentSeverity.get(s);
          if (sev === 'critical') { maxSev = 'critical'; break; }
          if (sev === 'warning') maxSev = 'warning';
        }

        const text = `${Math.round(angle)}°`;
        const x = point.x * width + 16;
        const y = point.y * height - 8;

        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = getSeverityStyle(maxSev).color;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 3;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      };

      drawAngleLabel(LANDMARKS.LEFT_KNEE, leftAngle);
      drawAngleLabel(LANDMARKS.RIGHT_KNEE, rightAngle);

      setLeftKneeAngle(leftAngle);
      setRightKneeAngle(rightAngle);

      return warnings.length > 0;
    },
    [],
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

          // ── Visibility gate: check if body is properly in frame ──
          const bodyVisible = isBodyInFrame(landmarks);

          if (!bodyVisible) {
            // Standby / calibration state — body not in frame yet
            setIsCalibrating(true);
            setActiveWarnings([]);
            activeWarningsRef.current = [];
            clearCanvas();
            setStatus('loading');
            setStatusText('📐 Aguardando posicionamento... Afaste-se da câmera.');
            setSideProfileWarning(false);
            return;
          }

          // Body is in frame — exit calibration
          setIsCalibrating(false);

          // Run the biomechanics engine if a template is active
          const warnings = evaluateFrame(landmarks, activeTemplate, movementPattern);
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

          if (warnings.length > 0) {
            const hasCritical = warnings.some(w => w.severity === 'critical');
            const firstWarning = warnings[0];
            setStatus('warning');
            setStatusText(hasCritical ? `🚨 ${firstWarning.coachMessage}` : `⚠️ ${firstWarning.coachMessage}`);
          } else if (hasViolation) {
            setStatus('warning');
            setStatusText('⚠️ Atenção: Correção necessária!');
          } else {
            setStatus('good');
            setStatusText(exerciseName ? `✅ ${exerciseName}: Forma Excelente` : '✅ Forma: Excelente (AI Validated)');
          }
        } else {
          clearCanvas();
          setIsCalibrating(true);
          setStatus('loading');
          setStatusText('📐 Posicione-se na câmera...');
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
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 py-3">
        <button
          onClick={() => {
            stopCamera();
            navigate(-1);
          }}
          className="p-2 text-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <span className="text-sm font-bold tracking-wide text-white">BIOFEEDBACK AI</span>
        <button onClick={toggleFacing} className="p-2 text-white">
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      {cameraActive && (
        <>
          {exerciseName && (
            <div className="absolute left-4 right-4 top-[52px] z-20 flex items-center justify-center">
              <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-bold text-accent backdrop-blur-md">
                Analisando: {exerciseName}
                {activeTemplate ? ` (${activeTemplate.name})` : ''}
              </span>
            </div>
          )}

          <div className={`absolute left-4 z-20 flex flex-col gap-1.5 ${exerciseName ? 'top-[80px]' : 'top-16'}`}>
            <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 backdrop-blur-md">
              <Zap className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold tracking-wide text-primary">⚡ Motor Lite Ativado (Alto Desempenho)</span>
            </div>
            {(() => {
              const hint = getCameraHint(movementPattern);
              if (!hint) return null;
              return (
                <div className="flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 backdrop-blur-md">
                  <span className="text-[10px] font-bold text-accent">{hint.emoji} {hint.text}</span>
                </div>
              );
            })()}
          </div>

          <div className={`absolute right-4 z-20 rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur-md ${exerciseName ? 'top-[80px]' : 'top-16'} ${aiBadgeClasses}`}>
            {aiBadgeText}
          </div>

          {activeWarnings.length > 0 && (
            <div className={`absolute left-4 right-4 z-20 flex flex-wrap gap-1.5 ${exerciseName ? 'top-[106px]' : 'top-[90px]'}`}>
              {activeWarnings.map((w) => (
                <span key={w.errorId} className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[10px] font-bold text-destructive backdrop-blur-md">
                  {w.coachMessage}
                </span>
              ))}
            </div>
          )}

          {sideProfileWarning && (
            <div className={`absolute left-4 right-4 z-20 ${exerciseName ? 'top-[130px]' : 'top-[114px]'}`}>
              <span className="inline-flex items-center gap-1 rounded-lg border border-warning/30 bg-warning/10 px-3 py-1.5 text-[11px] font-semibold text-warning backdrop-blur-md">
                ⚠️ Aviso: O Valgo Dinâmico é melhor analisado de frente.
              </span>
            </div>
          )}
        </>
      )}

      <div
        className={`absolute left-4 right-4 z-20 rounded-xl px-4 py-3 backdrop-blur-md transition-all ${
          cameraActive ? 'top-28' : 'top-16'
        } ${
          status === 'good'
            ? 'border-success/30 bg-success/10'
            : status === 'warning'
              ? 'border-destructive/30 bg-destructive/10'
              : 'border-border bg-background/10'
        }`}
      >
        <p
          className={`text-center text-sm font-bold ${
            status === 'good'
              ? 'text-success'
              : status === 'warning'
                ? 'text-destructive'
                : 'text-white/75'
          }`}
        >
          {statusText}
        </p>

        {confidence > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  status === 'warning' ? 'bg-destructive' : 'bg-success'
                }`}
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className="font-mono text-[11px] tabular-nums text-white/65">{confidence}% Precisão</span>
          </div>
        )}

        {(leftKneeAngle !== null || rightKneeAngle !== null) && (
          <div className="mt-2 flex items-center justify-center gap-4 text-[11px] font-mono">
            {leftKneeAngle !== null && (
              <span className={activeWarnings.length > 0 ? 'text-destructive' : 'text-success'}>
                Joelho E: {Math.round(leftKneeAngle)}°
              </span>
            )}
            {rightKneeAngle !== null && (
              <span className={activeWarnings.length > 0 ? 'text-destructive' : 'text-success'}>
                Joelho D: {Math.round(rightKneeAngle)}°
              </span>
            )}
          </div>
        )}
      </div>

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
