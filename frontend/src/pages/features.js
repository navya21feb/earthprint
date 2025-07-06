import React from 'react';
const Features = () => {
  return (
    <div id="Features" className="font-sans min-h-screen bg-white">
    
      {/* Page Heading */}
      <section className="text-center py-12 px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-green-700 mb-4">Our Features</h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Discover the smart, sustainable features that make Earthprint your go-to CO₂ tracker.
        </p>
      </section>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-6 max-w-6xl mx-auto pb-20">
        {/* Feature 1 */}
        <div className="bg-gray-50 p-6 rounded-lg shadow hover:shadow-lg transition">
          <h3 className="text-xl font-semibold text-green-700 mb-2">🎙️ Voice-Based CO₂ Input</h3>
          <p className="text-gray-700">Speak your daily activities and let our AI calculate your carbon footprint instantly.</p>
        </div>

        {/* Feature 2 */}
        <div className="bg-gray-50 p-6 rounded-lg shadow hover:shadow-lg transition">
          <h3 className="text-xl font-semibold text-green-700 mb-2">📊 Real-Time Tracking</h3>
          <p className="text-gray-700">Get instant feedback on your activities and track CO₂ reduction over time.</p>
        </div>

        {/* Feature 3 */}
        <div className="bg-gray-50 p-6 rounded-lg shadow hover:shadow-lg transition">
          <h3 className="text-xl font-semibold text-green-700 mb-2">🏅 Eco-Badge Rewards</h3>
          <p className="text-gray-700">Unlock badges and coins for completing green challenges and milestones.</p>
        </div>

        {/* Feature 4 */}
        <div className="bg-gray-50 p-6 rounded-lg shadow hover:shadow-lg transition">
          <h3 className="text-xl font-semibold text-green-700 mb-2">🏢 Business Tracking</h3>
          <p className="text-gray-700">Track and improve the carbon footprint of your office, startup, or enterprise.</p>
        </div>

        {/* Feature 5 */}
        <div className="bg-gray-50 p-6 rounded-lg shadow hover:shadow-lg transition">
          <h3 className="text-xl font-semibold text-green-700 mb-2">📈 Weekly Reports</h3>
          <p className="text-gray-700">Receive weekly summaries with personalized tips and statistics.</p>
        </div>

        {/* Feature 6 */}
        <div className="bg-gray-50 p-6 rounded-lg shadow hover:shadow-lg transition">
          <h3 className="text-xl font-semibold text-green-700 mb-2">🔗 Integration Ready</h3>
          <p className="text-gray-700">Connect with your fitness apps, Google Maps, or wearables for automatic tracking.</p>
        </div>
      </section>
    </div>
  );
};

export default Features;
