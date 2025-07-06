// src/pages/about.js

import React from "react";
 

const About = () => {
  return (
    <div className="font-sans min-h-screen bg-white">
 
      <section className="text-center py-12 px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-green-700 mb-6">About Earthprint</h1>
        <p className="text-gray-700 max-w-3xl mx-auto text-lg">
          Earthprint is an AI-powered platform designed to help individuals and businesses
          track, reduce, and reward sustainable practices. Whether you're a student, traveler,
          entrepreneur, or eco-conscious citizen, we empower you with insights and tools to make
          better choices for the planet.
        </p>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-gray-100 p-6 rounded-lg shadow">
            <h3 className="text-2xl font-semibold text-green-700 mb-2">🌱 Our Mission</h3>
            <p className="text-gray-600">
              To make sustainability easy, engaging, and impactful using modern technology like AI and gamification.
            </p>
          </div>
          <div className="bg-gray-100 p-6 rounded-lg shadow">
            <h3 className="text-2xl font-semibold text-green-700 mb-2">👩‍💻 Built by Developers</h3>
            <p className="text-gray-600">
              Designed by a passionate team of developers, environmentalists, and data enthusiasts.
            </p>
          </div>
        </div>
      </section>
       
    </div>
  );
};

export default About;
