/**
 * About.tsx — About page for Lassen Music Academy.
 *
 * Sections: hero tagline, origin story, key stats (students, courses, etc.),
 * core values grid, team member cards, and a closing mission banner.
 * All text content is sourced from i18n translations; team and stats data
 * are hardcoded arrays populated with translated strings.
 */

import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Music,
  Target,
  Heart,
  Users,
  GraduationCap,
  Award,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuthModals } from "../hooks/useAuthModals";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RegisterModal from "../components/RegisterModal";
import LoginModal from "../components/LoginModal";
import ludwigPortrait from "../assets/Ludwig Forside2.webp";
import kristianPortrait from "../assets/KristianLassen.webp";

export default function About() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isRegisterOpen, isLoginOpen, openRegister, closeRegister, openLogin, closeLogin } = useAuthModals();

  const at = t.aboutPage; // shorthand alias for about page translations

  // Core values displayed in a 2-column grid
  const values = [
    { icon: <Heart className="w-6 h-6" />, title: at.values.passion.title, description: at.values.passion.description },
    { icon: <Users className="w-6 h-6" />, title: at.values.community.title, description: at.values.community.description },
    { icon: <Target className="w-6 h-6" />, title: at.values.quality.title, description: at.values.quality.description },
    { icon: <GraduationCap className="w-6 h-6" />, title: at.values.growth.title, description: at.values.growth.description },
  ];

  // Highlight metrics shown in a 4-column stat bar
  const stats = [
    { value: "500+", label: at.stats.students },
    { value: "50+", label: at.stats.courses },
    { value: "6+", label: at.stats.instructors },
    { value: "2024", label: at.stats.founded },
  ];

  // Team member cards — image URLs are Unsplash placeholders; initials kept for potential avatar fallback
  const team = [
    {
      name: "Kristian Lassen",
      role: at.team.kristian.role,
      bio: at.team.kristian.bio,
      image: kristianPortrait,
      initials: "KL",
    },
    {
      name: "Ludwig Hamilton-Wittendorff",
      role: at.team.ludwig.role,
      bio: at.team.ludwig.bio,
      image: ludwigPortrait,
      initials: "LH",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />

      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t.auth.goBack}</span>
          </button>

          {/* Hero Section */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Music className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                {at.tagline}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              {at.pageTitle}
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed max-w-2xl">
              {at.pageSubtitle}
            </p>
          </div>

          {/* Story Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-4">
              {at.storyTitle}
            </h2>
            <div className="space-y-4 text-gray-400 leading-relaxed">
              <p>{at.storyP1}</p>
              <p>{at.storyP2}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center"
              >
                <div className="text-3xl font-bold text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Values */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-8">
              {at.valuesTitle}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-white/20 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                    {value.icon}
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">
                    {value.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Team */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-8">
              {at.teamTitle}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {team.map((member) => (
                <div
                  key={member.name}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-white/20 transition-all group"
                >
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-bold text-white mb-0.5">
                      {member.name}
                    </h3>
                    <p className="text-xs font-medium text-primary mb-3">
                      {member.role}
                    </p>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {member.bio}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mission Banner */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 p-8 text-center">
            <Award className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {at.missionTitle}
            </h3>
            <p className="text-gray-400 max-w-xl mx-auto leading-relaxed">
              {at.missionText}
            </p>
          </div>
        </div>
      </div>

      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} onSwitchToLogin={openLogin} />
      <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openRegister} />
    </div>
  );
}
