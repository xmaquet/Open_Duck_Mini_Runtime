import { Video, VideoOff } from 'lucide-react';
import { useState } from 'react';

interface VideoFeedProps {
  isConnected: boolean;
}

export function VideoFeed({ isConnected }: VideoFeedProps) {
  const [hasVideo, setHasVideo] = useState(false);

  return (
    <div className="relative w-full h-full bg-gray-950 border-2 border-gray-700 rounded-lg overflow-hidden">
      {/* Video placeholder - Will show actual video stream when implemented */}
      {isConnected && hasVideo ? (
        <video
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        >
          {/* Video stream will be connected here via WebRTC or other method */}
        </video>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          {isConnected ? (
            <>
              <Video className="w-12 h-12 text-gray-600" />
              <p className="text-sm text-gray-500">En attente du flux vidéo...</p>
              <p className="text-xs text-gray-600">La caméra embarquée apparaîtra ici</p>
            </>
          ) : (
            <>
              <VideoOff className="w-12 h-12 text-gray-700" />
              <p className="text-sm text-gray-600">Caméra non disponible</p>
              <p className="text-xs text-gray-700">Connectez-vous au robot</p>
            </>
          )}
        </div>
      )}
      
      {/* Video overlay indicators */}
      {isConnected && (
        <>
          <div className="absolute top-2 left-2 flex items-center gap-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-white">CAM</span>
          </div>
          
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md">
            <span className="text-xs text-white font-mono">00:00</span>
          </div>
        </>
      )}
    </div>
  );
}
