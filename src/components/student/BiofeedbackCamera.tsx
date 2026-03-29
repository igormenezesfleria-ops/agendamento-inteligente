import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Video, VideoOff, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// MediaPipe Pose landmark indices
const LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
};

// Skeleton connections for drawing
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

// Landmarks involved in knee alignment check
const KNEE_LANDMARKS = new Set([
  LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_KNEE,
  LANDMARKS.LEFT_ANKLE, LANDMARKS.RIGHT_ANKLE,
  LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP,
]);

interface LandmarkResult {
  x: number; y: number; z: number; visibility: number;
}

type PoseStatus = 'good' | 'warning' | 'loading';

declare global {
  interface Window {
    Pose: any;
  }
}

export function BiofeedbackCamera() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<any>(null);
  const rafRef = useRef<number>(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PoseStatus>('loading');
  const [statusText, setStatusText] = useState('Inicializando IA...');
  const [confidence, setConfidence] = useState(0);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [valgoDetected, setValgoDetected] = useState(false);

  // Load MediaPipe scripts from CDN
  useEffect(() => {
    const scripts = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js',
    ];

    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded === scripts.length) setScriptsLoaded(true);
    };

    scripts.forEach((src) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        loaded++;
        if (loaded === scripts.length) setScriptsLoaded(true);
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.crossOrigin = 'anonymous';
      s.onload = onLoad;
      s.onerror = onLoad; // still count to avoid blocking
      document.head.appendChild(s);
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Check for knee valgus (dynamic valgus test)
  const checkKneeValgus = useCallback((landmarks: LandmarkResult[]) => {
    const lKnee = landmarks[LANDMARKS.LEFT_KNEE];
    const lAnkle = landmarks[LANDMARKS.LEFT_ANKLE];
    const rKnee = landmarks[LANDMARKS.RIGHT_KNEE];
    const rAnkle = landmarks[LANDMARKS.RIGHT_ANKLE];

    const tolerance = 0.02; // ~2% of frame width
    // Left knee caves inward if knee x > ankle x (in mirrored view)
    const leftValgo = lKnee.visibility > 0.5 && lAnkle.visibility > 0.5 && (lKnee.x - lAnkle.x) > tolerance;
    // Right knee caves inward if knee x < ankle x
    const rightValgo = rKnee.visibility > 0.5 && rAnkle.visibility > 0.5 && (rAnkle.x - rKnee.x) > tolerance;

    return leftValgo || rightValgo;
  }, []);

  // Get color for a landmark/connection based on valgus state
  const getColor = useCallback((idx: number, hasValgus: boolean) => {
    if (!hasValgus) return '#22c55e'; // green
    if (KNEE_LANDMARKS.has(idx)) return '#ef4444'; // red
    return '#22c55e';
  }, []);

  // Draw skeleton overlay
  const drawSkeleton = useCallback((ctx: CanvasRenderingContext2D, landmarks: LandmarkResult[], w: number, h: number, hasValgus: boolean) => {
    ctx.clearRect(0, 0, w, h);

    // Draw connections
    SKELETON_CONNECTIONS.forEach(([a, b]) => {
      const la = landmarks[a];
      const lb = landmarks[b];
      if (la.visibility < 0.5 || lb.visibility < 0.5) return;

      const isKneeConnection = KNEE_LANDMARKS.has(a) && KNEE_LANDMARKS.has(b);
      const color = hasValgus && isKneeConnection ? '#ef4444' : '#22c55e';

      ctx.beginPath();
      ctx.moveTo(la.x * w, la.y * h);
      ctx.lineTo(lb.x * w, lb.y * h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Draw landmark dots
    const jointIndices = [
      LANDMARKS.NOSE,
      LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER,
      LANDMARKS.LEFT_ELBOW, LANDMARKS.RIGHT_ELBOW,
      LANDMARKS.LEFT_WRIST, LANDMARKS.RIGHT_WRIST,
      LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP,
      LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_KNEE,
      LANDMARKS.LEFT_ANKLE, LANDMARKS.RIGHT_ANKLE,
      LANDMARKS.LEFT_HEEL, LANDMARKS.RIGHT_HEEL,
    ];

    jointIndices.forEach((idx) => {
      const l = landmarks[idx];
      if (l.visibility < 0.5) return;
      const color = getColor(idx, hasValgus);

      ctx.beginPath();
      ctx.arc(l.x * w, l.y * h, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      // white inner dot
      ctx.beginPath();
      ctx.arc(l.x * w, l.y * h, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });
  }, [getColor]);

  // Initialize Pose model and start camera
  const startCamera = useCallback(async () => {
    if (!scriptsLoaded || !videoRef.current || !canvasRef.current) return;
    setLoading(true);

    try {
      // Stop existing stream
      streamRef.current?.getTracks().forEach((t) => t.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      // Initialize MediaPipe Pose
      const pose = new window.Pose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results: any) => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (results.poseLandmarks && results.poseLandmarks.length > 0) {
          const landmarks: LandmarkResult[] = results.poseLandmarks;

          // Calculate average visibility as confidence
          const avgVis = landmarks.reduce((s, l) => s + l.visibility, 0) / landmarks.length;
          setConfidence(Math.round(avgVis * 100));

          const hasValgus = checkKneeValgus(landmarks);
          setValgoDetected(hasValgus);

          if (hasValgus) {
            setStatus('warning');
            setStatusText('⚠️ Valgo Dinâmico Detectado! Alinhe o joelho.');
          } else {
            setStatus('good');
            setStatusText('✅ Forma: Excelente (AI Validated)');
          }

          drawSkeleton(ctx, landmarks, canvas.width, canvas.height, hasValgus);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setStatus('loading');
          setStatusText('Posicione-se na câmera...');
          setConfidence(0);
        }
      });

      poseRef.current = pose;

      // Frame processing loop
      const processFrame = async () => {
        if (video.readyState >= 2) {
          await pose.send({ image: video });
        }
        rafRef.current = requestAnimationFrame(processFrame);
      };

      setLoading(false);
      setCameraActive(true);
      processFrame();
    } catch (err) {
      console.error('Camera error:', err);
      setLoading(false);
      setStatusText('Erro ao acessar a câmera.');
    }
  }, [scriptsLoaded, facingMode, checkKneeValgus, drawSkeleton]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setCameraActive(false);
    setStatus('loading');
    setStatusText('Câmera desligada');
    setConfidence(0);
  }, []);

  const toggleFacing = useCallback(() => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    if (cameraActive) {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      // Will restart with new facing mode
      setTimeout(() => startCamera(), 200);
    }
  }, [facingMode, cameraActive, startCamera]);

  return (
    <div className="fixed inset-0 bg-black z-[110] flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <button onClick={() => { stopCamera(); navigate(-1); }} className="text-white p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="text-white font-bold text-sm tracking-wide">BIOFEEDBACK AI</span>
        <button onClick={toggleFacing} className="text-white p-2">
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Status banner */}
      <div className={`absolute top-16 left-4 right-4 z-20 rounded-xl px-4 py-3 backdrop-blur-md transition-all ${
        status === 'good' ? 'bg-emerald-500/20 border border-emerald-400/40' :
        status === 'warning' ? 'bg-red-500/20 border border-red-400/40' :
        'bg-white/10 border border-white/20'
      }`}>
        <p className={`text-sm font-bold text-center ${
          status === 'good' ? 'text-emerald-300' :
          status === 'warning' ? 'text-red-300' :
          'text-white/70'
        }`}>
          {statusText}
        </p>
        {confidence > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  status === 'warning' ? 'bg-red-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className="text-[11px] text-white/60 font-mono tabular-nums">{confidence}% Precisão</span>
          </div>
        )}
      </div>

      {/* Camera feed + skeleton overlay */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />

        {/* Idle state */}
        {!cameraActive && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 gap-4">
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
              <Video className="w-10 h-10 text-accent" />
            </div>
            <p className="text-white/80 text-center text-sm px-8">
              Posicione o celular para filmar seu corpo inteiro durante o exercício
            </p>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-white/70 text-sm">Carregando modelo de IA...</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-safe bg-gradient-to-t from-black/80 to-transparent pt-8 px-6 pb-8">
        <div className="flex items-center justify-center gap-6">
          {!cameraActive ? (
            <button
              onClick={startCamera}
              disabled={!scriptsLoaded || loading}
              className="w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-[0_0_20px_hsl(var(--accent)/0.5)] disabled:opacity-50 transition-all hover:scale-105"
            >
              <Video className="w-7 h-7 text-accent-foreground" />
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all hover:scale-105"
            >
              <VideoOff className="w-7 h-7 text-white" />
            </button>
          )}
        </div>
        <p className="text-center text-white/40 text-xs mt-3">
          {cameraActive ? 'Toque para parar a análise' : 'Toque para iniciar análise biomecânica'}
        </p>
      </div>
    </div>
  );
}
