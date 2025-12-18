import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import VideoSection from './components/VideoSection';
import FeaturedSection from './components/FeaturedSection';
import SocialProof from './components/SocialProof';
import Footer from './components/Footer';
import RegisterModal from './components/RegisterModal';

function App() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const openRegister = () => setIsRegisterOpen(true);
  const closeRegister = () => setIsRegisterOpen(false);

  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary/30">
      <Navbar onOpenRegister={openRegister} />
      <Hero onOpenRegister={openRegister} />
      <VideoSection />
      <FeaturedSection />
      <SocialProof />
      <Footer />
      <RegisterModal isOpen={isRegisterOpen} onClose={closeRegister} />
    </div>
  )
}

export default App;
