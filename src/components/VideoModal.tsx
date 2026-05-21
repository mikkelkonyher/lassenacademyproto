/**
 * VideoModal — Fullscreen overlay that plays a Mux video.
 * Controlled externally via isOpen/onClose props. When open, it renders
 * a blurred backdrop and a centered Mux player that autoplays the given
 * playbackId. Clicking the backdrop or the X button closes the modal.
 */
import { X } from 'lucide-react';
import MuxPlayer from '@mux/mux-player-react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  playbackId: string;
}

export default function VideoModal({ isOpen, onClose, playbackId }: VideoModalProps) {
  // Early return — render nothing when the modal is closed
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop — clicking it dismisses the modal */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal content with glassmorphism styling and orange glow */}
      <div className="relative w-full max-w-5xl glass-strong border border-white/20 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(251,146,60,0.3)] animate-in fade-in zoom-in-95 duration-300">
        {/* Close button (top-right corner) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-white hover:text-primary transition-colors bg-black/40 rounded-full p-2 backdrop-blur-sm"
        >
          <X className="w-6 h-6" />
          <span className="sr-only">Close</span>
        </button>

        {/* 16:9 responsive Mux player. autoPlay matches the previous
            YouTube behaviour so opening the modal starts playback. */}
        <div className="relative w-full aspect-video">
          <MuxPlayer
            playbackId={playbackId}
            streamType="on-demand"
            accentColor="#fb923c"
            autoPlay
            metadata={{ video_title: 'Trailer' }}
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
