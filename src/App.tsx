/**
 * Root application component.
 * Defines all client-side routes and manages modal visibility state
 * (register, login, video) for the landing page. The landing page ("/')
 * is assembled from section components; other routes render full pages.
 */

import { useState } from "react";
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
import TeacherDetail from "./pages/TeacherDetail";
import MyProfile from "./pages/MyProfile";
import AllCourses from "./pages/AllCourses";
import Podcast from "./pages/Podcast";
import Community from "./pages/Community";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Contact from "./pages/Contact";
import PublicProfile from "./pages/PublicProfile";
import ResetPassword from "./pages/ResetPassword";
import News from "./pages/News";
import Admin from "./pages/Admin";

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
                videoId="Y-x0efG1seA"
              />
            </div>
          }
        />
        <Route path="/teacher/:teacherSlug" element={<TeacherDetail />} />
        <Route path="/courses" element={<AllCourses />} />
        <Route path="/podcast" element={<Podcast />} />
        <Route path="/community" element={<Community />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/profile/:userId" element={<PublicProfile />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/nyheder" element={<News />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </>
  );
}

export default App;
