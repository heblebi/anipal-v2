import React, { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';

interface VideoPlayerProps {
  embedUrl: string;
  poster?: string;
  onPlay?: () => void;
}

// If the input is raw <iframe> HTML, extract the src attribute value unchanged.
// Otherwise convert known watch-page URLs to their embeddable equivalents.
const extractSrc = (input: string): string => {
  if (!input) return input;

  // Raw <iframe> HTML → pull out src, upgrade http→https on HTTPS pages
  const iframeMatch = input.match(/<iframe[^>]+\bsrc=["']?([^"'\s>]+)["']?/i);
  if (iframeMatch) {
    const s = iframeMatch[1];
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    return isHttps ? s.replace(/^http:\/\//i, 'https://') : s;
  }

  // ok.ru watch → videoembed
  const ok = input.match(/ok\.ru\/video\/(\d+)/);
  if (ok) return `https://ok.ru/videoembed/${ok[1]}`;

  // YouTube watch → embed
  const yt = input.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`;

  // Sibnet video page → shell
  const sib = input.match(/video\.sibnet\.ru\/video(\d+)/);
  if (sib) return `https://video.sibnet.ru/shell.php?videoid=${sib[1]}`;

  // Dailymotion watch → embed
  const dm = input.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if (dm) return `https://www.dailymotion.com/embed/video/${dm[1]}`;

  // Vimeo watch → player
  const vimeo = input.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  // Already an embed URL or unknown — use as-is
  return input;
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ embedUrl: raw, poster, onPlay }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const src = extractSrc(raw);

  if (!src) {
    return (
      <div className="aspect-video bg-gray-900 flex items-center justify-center text-gray-500 rounded-lg border border-gray-800">
        <p>Video kaynağı bulunamadı.</p>
      </div>
    );
  }

  const handlePlay = () => {
    setIsPlaying(true);
    onPlay?.();
  };

  if (!isPlaying && poster) {
    return (
      <div
        className="relative w-full pt-[56.25%] bg-black rounded-xl overflow-hidden shadow-2xl group cursor-pointer border border-gray-800 transition-transform hover:scale-[1.01] duration-300"
        onClick={handlePlay}
      >
        <div className="absolute inset-0 bg-black">
          <img
            src={poster}
            alt="Video Poster"
            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 bg-amber-500/90 hover:bg-amber-500 rounded-full flex items-center justify-center pl-2 shadow-[0_0_30px_rgba(245,158,11,0.6)] transform group-hover:scale-110 transition-transform duration-300 backdrop-blur-sm ring-4 ring-amber-500/20">
            <Play fill="black" className="w-10 h-10 text-black" />
          </div>
        </div>
        <div className="absolute bottom-6 left-6">
          <span className="text-white text-xs font-bold uppercase tracking-widest bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg group-hover:bg-amber-500 group-hover:text-black transition-colors">
            Şimdi İzle
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative w-full pt-[56.25%] bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
        <iframe
          className="absolute top-0 left-0 w-full h-full border-0"
          src={src}
          title="Video Player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          scrolling="no"
        />
      </div>
      <div className="flex justify-end">
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-400 transition-colors"
        >
          <ExternalLink size={12} />
          Videoyu yeni sekmede aç
        </a>
      </div>
    </div>
  );
};

export default VideoPlayer;
