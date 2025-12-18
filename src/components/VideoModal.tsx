import { X } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
}

export default function VideoModal({ isOpen, onClose, videoId }: VideoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-5xl glass-strong border border-white/20 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(251,146,60,0.3)] animate-in fade-in zoom-in-95 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-white hover:text-primary transition-colors bg-black/50 rounded-full p-2 backdrop-blur-sm"
        >
          <X className="w-6 h-6" />
          <span className="sr-only">Close</span>
        </button>

        <div className="relative w-full aspect-video">
          <iframe 
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title="Trailer Video" 
            className="absolute top-0 left-0 w-full h-full"
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            referrerPolicy="strict-origin-when-cross-origin" 
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>
  );
}

