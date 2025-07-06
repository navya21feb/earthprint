// import React, { useState } from "react";
 
// function LoginSignup() {
//   const [showAuthModal, setShowAuthModal] = useState(false);
//   const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
//   const [signupType, setSignupType] = useState('individual'); // 'individual  
//   const [handleAuthSubmit, setHandleAuthSubmit] = useState(null);
//   const resetAuthModal = () => {
//     setAuthMode('login'); 
//     setSignupType('individual');
//     setHandleAuthSubmit(null);
//   };
//       {/* Auth Modal */}

//   return (
//     <>
//     {showAuthModal && (
//       <div id="LoginSignup" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//         <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
//           <div className="text-center mb-6">
//             <h2 className="text-2xl font-bold text-gray-900 mb-2">
//               {authMode === 'login' ? 'Login' : 'Sign Up'}
//             </h2>
//             <p className="text-gray-600">
//               {authMode === 'login' ? 'Welcome back!' : 'Join EcoTracker today'}
//             </p>
//           </div>

//           {authMode === 'login' ? (
//             <form onSubmit={handleAuthSubmit} className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Username
//                 </label>
//                 <input
//                   type="text"
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
//                   required
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Password
//                 </label>
//                 <input
//                   type="password"
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
//                   required
//                 />
//               </div>
//               <button
//                 type="submit"
//                 className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
//               >
//                 Login
//               </button>
//             </form>
//           ) : (
//             <div>
//               <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
//                 <button
//                   onClick={() => setSignupType('individual')}
//                   className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
//                     signupType === 'individual'
//                       ? 'bg-white text-gray-900 shadow-sm'
//                       : 'text-gray-600 hover:text-gray-900'
//                   }`}
//                 >
//                   Individual
//                 </button>
//                 <button
//                   onClick={() => setSignupType('business')}
//                   className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
//                     signupType === 'business'
//                       ? 'bg-white text-gray-900 shadow-sm'
//                       : 'text-gray-600 hover:text-gray-900'
//                   }`}
//                 >
//                   Business
//                 </button>
//               </div>

//               <form onSubmit={handleAuthSubmit} className="space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     {signupType === 'individual' ? 'Name' : 'Business Name'}
//                   </label>
//                   <input
//                     type="text"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
//                     required
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     {signupType === 'individual' ? 'Email' : 'Business Email'}
//                   </label>
//                   <input
//                     type="email"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
//                     required
//                   />
//                 </div>
//                 {signupType === 'business' && (
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Contact Person Name
//                     </label>
//                     <input
//                       type="text"
//                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
//                       required
//                     />
//                   </div>
//                 )}
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     Password
//                   </label>
//                   <input
//                     type="password"
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
//                     required
//                   />
//                 </div>
//                 <button
//                   type="submit"
//                   className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
//                 >
//                   Sign Up
//                 </button>
//               </form>
//             </div>
//           )}

//           <div className="mt-6 text-center">
//             <button
//               onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
//               className="text-green-600 hover:text-green-700 text-sm font-medium"
//             >
//               {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Login"}
//             </button>
//           </div>

//           <button
//             onClick={() => {
//               setShowAuthModal(false);
//               resetAuthModal();
//             }}
//             className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
//           >
//             <span className="sr-only">Close</span>
//             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>
//         </div>
//       </div>

//     )}

     
//   </>  
//   );
// }
// export default LoginSignup;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function LoginSignup({ show, onClose }) {
  const navigate = useNavigate(); // 👈 ADD THIS

  const [authMode, setAuthMode] = useState("login");
  const [signupType, setSignupType] = useState("individual");

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (authMode === "login") {
      // Simulate login success
      console.log("Logged in!");
      onClose();           // Close the modal
      navigate("/dashboard"); // ✅ Navigate to Dashboard
    } else {
      console.log("Signed up!");
      onClose();
      navigate("/dashboard"); // Optional: also redirect after signup
    }
  };


  return (
    <div
      id="LoginSignup"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {authMode === "login" ? "Login" : "Sign Up"}
          </h2>
          <p className="text-gray-600">
            {authMode === "login"
              ? "Welcome back!"
              : "Join Earthprint today 🌍"}
          </p>
        </div>

        {/* Toggle Signup Type */}
        {authMode === "signup" && (
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => setSignupType("individual")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                signupType === "individual"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Individual
            </button>
            <button
              onClick={() => setSignupType("business")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                signupType === "business"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Business
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === "signup" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {signupType === "individual" ? "Name" : "Business Name"}
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {signupType === "individual" ? "Email" : "Business Email"}
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              {signupType === "business" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              )}
            </>
          )}

          {authMode === "login" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username or Email
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            {authMode === "login" ? "Login" : "Sign Up"}
          </button>
        </form>

        {/* Toggle Login/Signup */}
        <div className="mt-6 text-center">
          <button
            onClick={() =>
              setAuthMode(authMode === "login" ? "signup" : "login")
            }
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            {authMode === "login"
              ? "Don't have an account? Sign Up"
              : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginSignup;
