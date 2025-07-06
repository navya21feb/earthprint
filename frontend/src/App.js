import React from "react";
import { Routes, Route, Router } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/footer";
import LoginSignup from "./pages/LoginSignup";
import Features from "./pages/features";
import About from "./pages/about";
import Dashboard from "./pages/dashboard";
import badges from "./assets/badges.jpg";
import business from "./assets/business.jpg";
import { Leaf, Activity } from "lucide-react"; // ✅ Import icons
import Robot from "./assets/Robot.jpg"; // ✅ Import robot icon
import { AuthProvider } from "./context/AuthContext"; // ✅ not ../
import "./App.css"; // ✅ Import your CSS file
function App() {
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  React.useEffect(() => {
    const handleOpen = () => setShowAuthModal(true);
    window.addEventListener("open-auth-modal", handleOpen);
    return () => window.removeEventListener("open-auth-modal", handleOpen);
  }, []);
  return (
    
    <div className="font-sans min-h-screen bg-white">
      {/* Navbar */}
      <Navbar />
       
      <Routes>
          <Route
            path="/"
            element={
              <>
                {/* Hero Section */}
      {/* Hero Section */}
      <section className="text-center px-4 py-12">
        <h1 className="text-3xl md:text-5xl font-bold leading-tight">
          Track your <span className="text-green-600">carbon</span> footprint.
          <br className="hidden md:block" />
          Live <span className="text-green-600">sustainably</span>
        </h1>
        <p className="mt-4 text-lg font-semibold text-gray-700">
          How it works:{" "}
          <span className="text-black">Input → Track → Improve</span>
        </p>

        {/* Cards */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
          <div className="bg-gray-100 p-4 rounded-lg shadow hover:shadow-md transition">
            <img
              src={Robot}
              alt="AI Voice CO2"
              className="mx-auto h-32"
            />
            <p className="mt-4 font-medium">AI for Voice only CO₂ Tracking</p>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg shadow hover:shadow-md transition">
            <img
              src={badges}
              alt="Badges"
              className="mx-auto h-32"
            />
            <p className="mt-4 font-medium">Earn Badges & Coins as prize</p>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg shadow hover:shadow-md transition">
            <img
              src={business}
              alt="Business CO2"
              className="mx-auto h-32"
            />
            <p className="mt-4 font-medium">
              Tracks Carbon footprint of businesses also
            </p>
          </div>
        </div>
        {/* Why Earthprint Section */}
        <section className="bg-green-50 py-12 pt-8 mt-10 px-6 text-center">
          <h2 className="text-3xl font-bold text-green-700 mb-4">
            Why Earthprint?
          </h2>
          <p className="max-w-3xl mx-auto text-gray-700 text-lg">
            We use cutting-edge AI to measure, reduce and reward sustainable
            behavior — whether you're a student, a traveler, or a business. Join
            the mission to go green!
          </p>
        </section>
      </section>
      {/* Testimonials Section */}
      <section className="py-12 bg-white px-6">
        <h2 className="text-3xl font-bold text-center text-green-700 mb-8">
          What Users Say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-gray-100 p-6 rounded-lg shadow">
            <p className="italic text-gray-700">
              "I had no idea how much CO₂ my daily commute caused — until
              Earthprint helped me track it!"
            </p>
            <p className="mt-4 font-bold text-green-800">
              — Priya, College Student
            </p>
          </div>
          <div className="bg-gray-100 p-6 rounded-lg shadow">
            <p className="italic text-gray-700">
              "We now proudly display our CO₂ scores and are improving every
              month. Great tool!"
            </p>
            <p className="mt-4 font-bold text-green-800">
              — Rahul, Business Owner
            </p>
          </div>
          <div className="bg-gray-100 p-6 rounded-lg shadow">
            <p className="italic text-gray-700">
              "Gamified tracking + rewards = motivation unlocked. Love the
              coins!"
            </p>
            <p className="mt-4 font-bold text-green-800">
              — Anjali, Eco-Influencer
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-600 py-12 text-center text-white px-4">
        <h2 className="text-3xl font-bold mb-4">
          Ready to start your green journey?
        </h2>
        <p className="mb-6 text-lg">
          Join Earthprint and take your first step toward sustainability.
        </p>
        <button className="bg-white text-green-600 font-semibold px-6 py-3 rounded hover:bg-gray-200">
          Get Started Now
        </button>
      </section>
            </>
            }
          />
        <Route path="/LoginSignup" element={<LoginSignup />} />
        <Route path="/Features" element={<Features />} />
        <Route path="/About" element={<About />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
      <LoginSignup show={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <Footer />
    </div>
     
  );
}

export default App;
