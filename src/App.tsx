import Navbar from './components/Navbar';
import Hero from './components/Hero';
import VideoSection from './components/VideoSection';
import FeaturedSection from './components/FeaturedSection';
import SocialProof from './components/SocialProof';
import Footer from './components/Footer';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <VideoSection />
        <FeaturedSection />
        <SocialProof />
        {/* Placeholder for other sections */}
        <section className="py-20 text-center text-gray-400">
           {/* Additional sections will go here */}
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default App
