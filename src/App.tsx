/**
 * Root application component.
 * Defines all client-side routes and manages modal visibility state
 * (register, login, video) for the landing page. The landing page ("/')
 * is assembled from section components; other routes render full pages.
 */

import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import * as Sentry from "@sentry/react"; // TEMP: for the Sentry test button below
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import VideoSection from "./components/VideoSection";
import FeaturedSection from "./components/FeaturedSection";
import LearningPaths from "./components/LearningPaths";
import SocialProof from "./components/SocialProof";
import Footer from "./components/Footer";
import RegisterModal from "./components/RegisterModal";
import LoginModal from "./components/LoginModal";
import VideoModal from "./components/VideoModal";
import ScrollToTop from "./components/ScrollToTop";
import TeacherDetail from "./pages/TeacherDetail";
import MyProfile from "./pages/MyProfile";
import AllCourses from "./pages/AllCourses";
import LearningPath from "./pages/LearningPath";
import LessonPlayer from "./pages/LessonPlayer";
import Podcast from "./pages/Podcast";
import PodcastEpisode from "./pages/PodcastEpisode";
import Community from "./pages/Community";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Contact from "./pages/Contact";
import PublicProfile from "./pages/PublicProfile";
import ResetPassword from "./pages/ResetPassword";
import News from "./pages/News";
import NewsArticle from "./pages/NewsArticle";
import Admin from "./pages/Admin";
import Terms from "./pages/Terms";

function App() {
  // Modal visibility flags — only one auth modal can be open at a time
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  // Switching between login/register closes the other to prevent stacking
  const openRegister = () => {
    setIsLoginOpen(false);
    setIsRegisterOpen(true);
  };
  const closeRegister = () => setIsRegisterOpen(false);
  const openLogin = () => {
    setIsRegisterOpen(false);
    setIsLoginOpen(true);
  };
  const closeLogin = () => setIsLoginOpen(false);
  const openVideo = () => setIsVideoOpen(true);
  const closeVideo = () => setIsVideoOpen(false);

  // The site-wide Footer ("Start Her") lives on every route and can't easily
  // receive a callback prop, so it asks for the register modal via a global
  // window event. We listen here so the root-level modal opens on any page.
  useEffect(() => {
    const handleOpenRegister = () => openRegister();
    window.addEventListener("open-register", handleOpenRegister);
    return () => window.removeEventListener("open-register", handleOpenRegister);
  }, []);

  return (
    <>
      {/* TEMP — Sentry verification button. Sends a log, then throws an error so we can
          confirm both Issues and Logs arrive in the Sentry dashboard. REMOVE after testing. */}
      <button
        onClick={() => {
          Sentry.logger.info("User triggered test error", {
            action: "test_error_button_click",
          });
          throw new Error("This is your first error!");
        }}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 9999,
          padding: "10px 14px",
          background: "#e11d48",
          color: "#fff",
          borderRadius: 8,
          fontSize: 14,
        }}
      >
        Break the world
      </button>

      {/* Scrolls to top on every route change so users don't land mid-page */}
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <div className="min-h-screen bg-background text-white selection:bg-primary/30">
              <Navbar onOpenRegister={openRegister} onOpenLogin={openLogin} />
              <Hero onOpenRegister={openRegister} onOpenVideo={openVideo} />
              <FeaturedSection />
              <LearningPaths />
              <VideoSection />
              <SocialProof />
              <Footer />
              <VideoModal
                isOpen={isVideoOpen}
                onClose={closeVideo}
                playbackId="UGkXjsu00JyT02ffcmqF9n00dc8SCSk3M7g2rg8oe5EOEA"
              />
            </div>
          }
        />
        <Route path="/teacher/:teacherSlug" element={<TeacherDetail />} />
        <Route path="/courses" element={<AllCourses />} />
        <Route path="/courses/:slug" element={<LessonPlayer />} />
        <Route path="/courses/:slug/:lessonSlug" element={<LessonPlayer />} />
        <Route path="/learning-paths/:tier" element={<LearningPath />} />
        <Route path="/podcast" element={<Podcast />} />
        <Route path="/podcast/:episodeSlug" element={<PodcastEpisode />} />
        <Route path="/community" element={<Community />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/profile/:userId" element={<PublicProfile />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/nyheder" element={<News />} />
        <Route path="/nyheder/:newsId" element={<NewsArticle />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/terms" element={<Terms />} />
      </Routes>

      {/* Root-level auth modals — available on every route (e.g. opened by the
          site-wide Footer's "Start Her" link via the open-register event). */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={closeRegister}
        onSwitchToLogin={openLogin}
      />
      <LoginModal
        isOpen={isLoginOpen}
        onClose={closeLogin}
        onSwitchToRegister={openRegister}
      />
    </>
  );
}

export default App;
