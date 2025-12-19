import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import VideoSection from './components/VideoSection';
import FeaturedSection from './components/FeaturedSection';
import LearningPaths from './components/LearningPaths';
import SocialProof from './components/SocialProof';
import Footer from './components/Footer';
import RegisterModal from './components/RegisterModal';
import VideoModal from './components/VideoModal';
import ScrollToTop from './components/ScrollToTop';
import TeacherDetail from './pages/TeacherDetail';

function App() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const openRegister = () => setIsRegisterOpen(true);
  const closeRegister = () => setIsRegisterOpen(false);
  const openVideo = () => setIsVideoOpen(true);
  const closeVideo = () => setIsVideoOpen(false);

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <div className="min-h-screen bg-background text-white selection:bg-primary/30">
              <Navbar onOpenRegister={openRegister} />
              <Hero onOpenRegister={openRegister} onOpenVideo={openVideo} />
              <FeaturedSection />
              <LearningPaths />
              <VideoSection />
              <SocialProof />
              <Footer />
              <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} />
              <VideoModal isOpen={isVideoOpen} onClose={closeVideo} videoId="Y-x0efG1seA" />
            </div>
          }
        />
        <Route path="/teacher/:teacherSlug" element={<TeacherDetail />} />
      </Routes>
    </>
  )
}

export default App;
