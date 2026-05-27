/**
 * PodcastEpisode.tsx — Individual podcast episode detail page.
 *
 * Fetches all episodes from the edge function, finds the one matching
 * the URL slug, and renders a full-width player with artwork, description,
 * and a seekable audio timeline. Shareable via /podcast/:episodeSlug.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Play, Pause, Clock, Mic, Loader2, Share2, Check } from "lucide-react";
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
  slug: string;
}

// Supabase project URL for calling edge functions
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function PodcastEpisode() {
  const { episodeSlug } = useParams<{ episodeSlug: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { isRegisterOpen, isLoginOpen, openRegister, closeRegister, openLogin, closeLogin } = useAuthModals();

  // Episode data
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Share button feedback
  const [copied, setCopied] = useState(false);

  // Fetch episodes and find the matching one by slug
  useEffect(() => {
    async function fetchEpisode() {
      try {
        setLoading(true);
        setNotFound(false);

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
        const episodes: Episode[] = data.episodes ?? [];
        setAllEpisodes(episodes);

        const found = episodes.find((ep: Episode) => ep.slug === episodeSlug);
        if (found) {
          setEpisode(found);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error("Failed to fetch podcast episode:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchEpisode();
  }, [episodeSlug]);

  // Continuously sync currentTime from the audio element
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

  // Toggle play/pause — resumes from paused position
  const togglePlay = () => {
    if (!episode) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      stopTimeTracking();
      setIsPlaying(false);
      return;
    }

    // Resume existing audio
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      startTimeTracking();
      return;
    }

    // First play — create audio element
    const audio = new Audio(episode.audioUrl);
    audio.onloadedmetadata = () => setAudioDuration(audio.duration);
    audio.onended = () => {
      stopTimeTracking();
      setIsPlaying(false);
      setCurrentTime(0);
    };
    audio.play();
    audioRef.current = audio;
    setIsPlaying(true);
    startTimeTracking();
  };

  // Seek to a specific position when the user drags the timeline
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Copy the current page URL to clipboard
  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopTimeTracking();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [stopTimeTracking]);

  // Format ISO date string to locale-aware long date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "da" ? "da-DK" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format seconds to "mm:ss" or "h:mm:ss"
  const formatTime = (secs: number) => {
    const totalSec = Math.floor(secs);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  };

  // Format duration from seconds to "Xh Ym" or "Xm" string
  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}${t.podcastPage.minutes}`;
    }
    return `${mins} ${t.podcastPage.minutes}`;
  };

  // Find other episodes from the same guest for "more episodes" section
  const relatedEpisodes = episode
    ? allEpisodes.filter((ep) => ep.slug !== episode.slug).slice(0, 4)
    : [];

  // Rotating gradients for related episode cards
  const gradients = [
    "from-primary/20 via-accent/15 to-primary/10",
    "from-accent/20 via-primary/15 to-accent/10",
    "from-primary/25 via-accent/20 to-primary/15",
    "from-accent/25 via-primary/20 to-accent/15",
  ];

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />

      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back to all episodes */}
          <button
            onClick={() => navigate("/podcast")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t.auth.goBack}</span>
          </button>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-gray-400">{t.podcastPage.loading}</p>
            </div>
          )}

          {/* Not Found State */}
          {notFound && !loading && (
            <div className="text-center py-24">
              <p className="text-gray-400 text-lg mb-4">{t.podcastPage.noEpisodes}</p>
              <Link
                to="/podcast"
                className="text-primary hover:text-white transition-colors underline"
              >
                {t.auth.goBack}
              </Link>
            </div>
          )}

          {/* Episode Detail */}
          {episode && !loading && (
            <>
              {/* Hero section with artwork and info */}
              <div className="flex flex-col md:flex-row gap-8 mb-10">
                {/* Artwork */}
                <div className="md:w-72 md:flex-shrink-0">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 border border-white/10">
                    <img loading="lazy"
                      src={episode.image}
                      alt={episode.title}
                      className="w-full aspect-square object-cover"
                    />
                    {/* Episode number badge */}
                    {episode.episodeNumber !== null && (
                      <span className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white text-sm font-bold px-3 py-1.5 rounded-full border border-white/20">
                        {t.podcastPage.episode} #{String(episode.episodeNumber).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-col justify-center flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/15 px-3 py-1 rounded-full border border-primary/30">
                      <Clock className="w-3 h-3" />
                      {formatDuration(episode.duration)}
                    </span>
                    <span className="text-sm text-gray-400">
                      {formatDate(episode.date)}
                    </span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
                    {episode.title}
                  </h1>

                  <p className="text-base text-white/70 mb-3 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-accent" />
                    {t.podcastPage.with}{" "}
                    <span className="font-semibold text-white/90">
                      {episode.guest}
                    </span>
                  </p>

                  {/* Share button */}
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors self-start mt-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">
                          {language === "da" ? "Link kopieret!" : "Link copied!"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>{language === "da" ? "Del episode" : "Share episode"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Audio Player */}
              <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm p-6 mb-10">
                {/* Play button + title row */}
                <div className="flex items-center gap-4 mb-5">
                  <button
                    onClick={togglePlay}
                    className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isPlaying
                        ? "bg-primary text-white shadow-lg shadow-primary/40"
                        : "bg-primary/20 text-primary hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/40"
                    }`}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    )}
                  </button>
                  <div>
                    <p className="text-white font-semibold">
                      {isPlaying
                        ? t.podcastPage.pause
                        : t.podcastPage.listen}
                    </p>
                    <p className="text-sm text-gray-400">
                      {formatDuration(episode.duration)}
                    </p>
                  </div>
                </div>

                {/* Seekable timeline */}
                <div className="flex items-center gap-3 w-full">
                  <span className="text-xs text-gray-400 tabular-nums w-14 text-right shrink-0">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={audioDuration || episode.duration}
                    step={1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 h-2 appearance-none rounded-full bg-white/15 cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(var(--color-primary),0.5)]"
                  />
                  <span className="text-xs text-gray-400 tabular-nums w-14 shrink-0">
                    {formatTime(audioDuration || episode.duration)}
                  </span>
                </div>
              </div>

              {/* Description */}
              {episode.description && (
                <div className="mb-16">
                  <h2 className="text-xl font-bold text-white mb-4">
                    {language === "da" ? "Om denne episode" : "About this episode"}
                  </h2>
                  <p className="text-gray-300 leading-relaxed text-base">
                    {episode.description}
                  </p>
                </div>
              )}

              {/* More Episodes */}
              {relatedEpisodes.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-6">
                    {language === "da" ? "Flere episoder" : "More episodes"}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {relatedEpisodes.map((ep, idx) => {
                      const gradient = gradients[idx % gradients.length];
                      return (
                        <Link
                          to={`/podcast/${ep.slug}`}
                          key={ep.slug}
                          className="rounded-xl border border-white/15 hover:border-primary/50 transition-all duration-300 group overflow-hidden hover:shadow-lg hover:shadow-primary/30 relative block"
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`}></div>
                          <div className="relative flex items-center gap-4 p-4">
                            {/* Small thumbnail */}
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                              <img loading="lazy"
                                src={ep.image}
                                alt={ep.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                                {ep.title}
                              </h3>
                              <p className="text-xs text-gray-400 mt-1">
                                {ep.guest} · {formatDuration(ep.duration)}
                              </p>
                            </div>
                            <Play className="w-4 h-4 text-primary/60 group-hover:text-primary flex-shrink-0" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
      <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />
    </div>
  );
}
