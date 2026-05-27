/**
 * Root application component.
 * Defines all client-side routes and manages modal visibility state
 * (register, login, video) for the landing page. The landing page ("/')
 * is assembled from section components; other routes render full pages.
 */

import { lazy, Suspense, useState } from "react";
import { Routes, Route } from "react-router-dom";
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
import { Loader2 } from "lucide-react";

// Lazy-loaded pages — only downloaded when the route is visited
const TeacherDetail = lazy(() => import("./pages/TeacherDetail"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const AllCourses = lazy(() => import("./pages/AllCourses"));
const LearningPath = lazy(() => import("./pages/LearningPath"));
const LessonPlayer = lazy(() => import("./pages/LessonPlayer"));
const Podcast = lazy(() => import("./pages/Podcast"));
const PodcastEpisode = lazy(() => import("./pages/PodcastEpisode"));
const Community = lazy(() => import("./pages/Community"));
const Pricing = lazy(() => import("./pages/Pricing"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const News = lazy(() => import("./pages/News"));
const NewsArticle = lazy(() => import("./pages/NewsArticle"));
const Admin = lazy(() => import("./pages/Admin"));
const Terms = lazy(() => import("./pages/Terms"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

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

  return (
    <>
      {/* Scrolls to top on every route change so users don't land mid-page */}
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </>
  );
}

export default App;
