import { X } from 'lucide-react';

interface Props {
  videoUrl: string;
  onClose: () => void;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function VideoModal({ videoUrl, onClose }: Props) {
  const videoId = extractYouTubeId(videoUrl);
  if (!videoId) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          className="w-full aspect-video border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Execução do exercício"
        />
      </div>
    </div>
  );
}
