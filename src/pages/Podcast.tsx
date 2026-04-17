/**
 * Podcast.tsx — Podcast episodes listing page.
 *
 * Fetches real episode data from the Buzzsprout RSS feed via a
 * Supabase Edge Function and renders a grid of episode cards
 * with inline audio playback.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, Clock, Mic, Loader2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuthModals } from "../hooks/useAuthModals";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";

// Shape of a single podcast episode returned by the edge function
interface Episode {
  title: string;
  description: string;
  guest: string;
  date: string;
  duration: number; // seconds
  image: string;
  audioUrl: string;
  episodeNumber: number | null;
}

// Supabase project URL for calling edge functions
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function Podcast() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { isRegisterOpen, isLoginOpen, openRegister, closeRegister, openLogin, closeLogin } = useAuthModals();

  // Episode data fetched from the edge function
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Audio playback state: which episode index is playing, current time, and total duration
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Fetch episodes from the Supabase edge function on mount
  useEffect(() => {
    async function fetchEpisodes() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/fetch-podcast-feed`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        setEpisodes(data.episodes ?? []);
      } catch (err) {
        console.error("Failed to fetch podcast episodes:", err);
        setError(t.podcastPage.errorLoading);
      } finally {
        setLoading(false);
      }
    }

    fetchEpisodes();
  }, []);

  // Continuously sync currentTime from the audio element via requestAnimationFrame
  const startTimeTracking = useCallback(() => {
    const tick = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  // Stop the animation frame loop
  const stopTimeTracking = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  /**
   * Toggle play/pause for a given episode.
   * Stops the current episode if a different one is selected.
   */
  const togglePlay = (index: number, audioUrl: string) => {
    // If already playing this episode, pause it
    if (playingIndex === index && audioRef.current) {
      audioRef.current.pause();
      stopTimeTracking();
      setPlayingIndex(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      stopTimeTracking();
    }

    // Create a new audio element and play
    const audio = new Audio(audioUrl);
    audio.onloadedmetadata = () => setAudioDuration(audio.duration);
    audio.onended = () => {
      stopTimeTracking();
      setPlayingIndex(null);
      setCurrentTime(0);
    };
    audio.play();
    audioRef.current = audio;
    setPlayingIndex(index);
    startTimeTracking();
  };

  // Seek to a specific position when the user clicks/drags the timeline
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Clean up audio and animation frame on unmount
  useEffect(() => {
    return () => {
      stopTimeTracking();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [stopTimeTracking]);

  // Format ISO date string to locale-aware long date (e.g. "1. december 2025")
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "da" ? "da-DK" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format duration from seconds to "Xh Ym" or "Xm" string (for episode cards)
  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}${t.podcastPage.minutes}`;
    }
    return `${mins} ${t.podcastPage.minutes}`;
  };

  // Format seconds to "mm:ss" or "h:mm:ss" for the playback timeline
  const formatTime = (secs: number) => {
    const totalSec = Math.floor(secs);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  };

  // Rotating gradient backgrounds applied to episode cards by index
  const gradients = [
    "from-primary/20 via-accent/15 to-primary/10",
    "from-accent/20 via-primary/15 to-accent/10",
    "from-primary/25 via-accent/20 to-primary/15",
    "from-accent/25 via-primary/20 to-accent/15",
    "from-primary/20 via-accent/20 to-primary/15",
    "from-accent/20 via-primary/20 to-accent/15",
  ];

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />

      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t.auth.goBack}</span>
          </button>

          {/* Page Header */}
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
              {t.podcastPage.pageTitle}
            </h1>
            <p className="text-lg text-gray-400 mb-4">
              {t.podcastPage.pageSubtitle}
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-gray-400">{t.podcastPage.loading}</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-24">
              <p className="text-red-400 text-lg">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && episodes.length === 0 && (
            <div className="text-center py-24">
              <p className="text-gray-400 text-lg">{t.podcastPage.noEpisodes}</p>
            </div>
          )}

          {/* Episode Grid */}
          {!loading && !error && episodes.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {episodes.map((episode, idx) => {
                const gradient = gradients[idx % gradients.length];
                const isPlaying = playingIndex === idx;

                return (
                  <div
                    key={episode.audioUrl || idx}
                    className="rounded-2xl border border-white/20 hover:border-primary/60 transition-all duration-500 group overflow-hidden hover:shadow-2xl hover:shadow-primary/50 hover:-translate-y-2 relative"
                  >
                    {/* Colorful gradient background */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`}
                    ></div>

                    {/* Animated glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -skew-x-12 group-hover:translate-x-full"></div>

                    <div className="relative flex flex-col sm:flex-row">
                      {/* Thumbnail */}
                      <div className="sm:w-48 sm:flex-shrink-0 aspect-video sm:aspect-square overflow-hidden relative">
                        <img
                          src={episode.image}
                          alt={episode.title}
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 sm:w-48 bg-gradient-to-r from-transparent to-black/40"></div>

                        {/* Episode number badge */}
                        {episode.episodeNumber !== null && (
                          <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full border border-white/20">
                            #{String(episode.episodeNumber).padStart(2, "0")}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="relative p-6 flex flex-col flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/15 px-3 py-1 rounded-full border border-primary/30">
                            <Clock className="w-3 h-3" />
                            {formatDuration(episode.duration)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(episode.date)}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors leading-tight">
                          {episode.title}
                        </h3>

                        <p className="text-sm text-white/70 mb-2 flex items-center gap-1.5">
                          <Mic className="w-3.5 h-3.5 text-accent" />
                          {t.podcastPage.with}{" "}
                          <span className="font-semibold text-white/90">
                            {episode.guest}
                          </span>
                        </p>

                        <p className="text-sm text-gray-400 mb-4 line-clamp-2 flex-1">
                          {episode.description}
                        </p>

                        {/* Player: button + seekable timeline */}
                        <div className="flex flex-col gap-2 w-full">
                          <button
                            onClick={() => togglePlay(idx, episode.audioUrl)}
                            className={`flex items-center gap-2 text-sm font-semibold transition-colors self-start px-4 py-2 rounded-full border ${
                              isPlaying
                                ? "text-white bg-primary/40 border-primary/60"
                                : "text-primary hover:text-white bg-primary/10 hover:bg-primary/30 border-primary/30"
                            }`}
                          >
                            {isPlaying ? (
                              <>
                                <Pause className="w-4 h-4 fill-current" />
                                {t.podcastPage.pause}
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 fill-current" />
                                {t.podcastPage.listen}
                              </>
                            )}
                          </button>

                          {/* Timeline — only visible for the active episode */}
                          {isPlaying && (
                            <div className="flex items-center gap-3 w-full mt-1">
                              <span className="text-xs text-gray-400 tabular-nums w-12 text-right shrink-0">
                                {formatTime(currentTime)}
                              </span>
                              <input
                                type="range"
                                min={0}
                                max={audioDuration || episode.duration}
                                step={1}
                                value={currentTime}
                                onChange={handleSeek}
                                className="flex-1 h-1.5 appearance-none rounded-full bg-white/15 cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(var(--color-primary),0.5)]"
                              />
                              <span className="text-xs text-gray-400 tabular-nums w-12 shrink-0">
                                {formatTime(audioDuration || episode.duration)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
      <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />
    </div>
  );
}
