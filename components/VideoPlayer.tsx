import React, { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  embedUrl: string; // Can be a URL string or a full HTML string
  poster?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ embedUrl, poster }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!embedUrl) {
    return (
      <div className="aspect-video bg-gray-900 flex items-center justify-center text-gray-500 rounded-lg border border-gray-800">
        <p>Video kaynağı bulunamadı.</p>
      </div>
    );
  }

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  // Check if the source is a raw HTML string (contains <iframe tag)
  const isRawHTML = /<iframe/i.test(embedUrl);

  // If provided a poster and not yet playing, show the custom cover UI
  if (!isPlaying && poster) {
    return (
      <div 
        className="relative w-full pt-[56.25%] bg-black rounded-xl overflow-hidden shadow-2xl group cursor-pointer border border-gray-800 transition-transform hover:scale-[1.01] duration-300"
        onClick={handlePlay}
      >
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 bg-black">
            <img 
              src={poster} 
              alt="Video Poster" 
              className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
            />
        </div>
        
        {/* Centered Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 bg-amber-500/90 hover:bg-amber-500 rounded-full flex items-center justify-center pl-2 shadow-[0_0_30px_rgba(245,158,11,0.6)] transform group-hover:scale-110 transition-transform duration-300 backdrop-blur-sm ring-4 ring-amber-500/20">
             <Play fill="black" className="w-10 h-10 text-black" />
          </div>
        </div>

        {/* Bottom Badge */}
        <div className="absolute bottom-6 left-6">
             <span className="text-white text-xs font-bold uppercase tracking-widest bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg group-hover:bg-amber-500 group-hover:text-black transition-colors">
                Şimdi İzle
             </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full pt-[56.25%] bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
        {isLoading && !isRawHTML && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-0">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
            </div>
        )}
        
        {isRawHTML ? (
            /* Render raw HTML embed (e.g. from uqload, sibnet with specific attributes) */
            <div 
                className="absolute top-0 left-0 w-full h-full z-10 [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
                dangerouslySetInnerHTML={{ __html: embedUrl }}
            />
        ) : (
            /* Render standard URL via iframe */
            <iframe
                className="absolute top-0 left-0 w-full h-full z-10"
                src={embedUrl}
                title="Video Player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                onLoad={handleIframeLoad}
            ></iframe>
        )}
    </div>
  );
};

export default VideoPlayer;