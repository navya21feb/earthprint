import { Link } from "react-router-dom";
import logo from "../assets/logo.png"; // ✅ replace with your actual logo path

export default function Navbar() {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white shadow-lg rounded-b-xl sticky top-0 z-50">
      {/* Logo or Brand Name */}
      <div className="flex items-center space-x-2">
        <img src={logo} alt="Earthprint Logo" className="h-14 w-18 rounded-full " />
         
      </div>

      {/* Navigation Links */}
      <nav className="hidden md:flex space-x-10 text-gray-800 font-medium">
        <Link to="/" className="hover:text-green-600 transition">Home</Link>
        <Link to="/Features" className="hover:text-green-600 transition">Features</Link>
        <Link to="/About" className="hover:text-green-600 transition">About</Link>
      </nav>

      {/* Auth Button */}
      <button
        onClick={() => window.dispatchEvent(new Event("open-auth-modal"))}
        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-md transition"
      >
        Login / Sign Up
      </button>
    </header>
  );
}
