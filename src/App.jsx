import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import MainLayout from './components/layout/MainLayout';

// Public Pages
import Home from './pages/Home';
import PreRoll from './pages/PreRoll';
import VideoWatch from './pages/VideoWatch';
import SearchResults from './pages/SearchResults';
import SubmitInfo from './pages/SubmitInfo';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import PrivacyPolicy from './pages/PrivacyPolicy';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUpload from './pages/admin/AdminUpload';
import AdminVideos from './pages/admin/AdminVideos';
import AdminSubmissions from './pages/admin/AdminSubmissions';
import AdminReports from './pages/admin/AdminReports';

import ConsentOverlay from './components/common/ConsentOverlay';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user || !isAdmin) return <Navigate to="/" />;

  return children;
};

function App() {
  // Initialize state from localStorage immediately to avoid flickering
  const [adultAccepted, setAdultAccepted] = useState(() => {
    const saved = localStorage.getItem('adultAccepted');
    console.log('[Consent] Initial adultAccepted:', saved);
    return saved === 'true';
  });

  const [privacyAccepted, setPrivacyAccepted] = useState(() => {
    const saved = localStorage.getItem('privacyAccepted');
    console.log('[Consent] Initial privacyAccepted:', saved);
    return saved === 'true';
  });

  // Track if consent is fully completed
  const [isConsentComplete, setIsConsentComplete] = useState(adultAccepted && privacyAccepted);

  useEffect(() => {
    console.log('[Consent] State check - Adult:', adultAccepted, 'Privacy:', privacyAccepted);
    const complete = adultAccepted && privacyAccepted;
    setIsConsentComplete(complete);
    console.log('[Consent] Is complete:', complete);
  }, [adultAccepted, privacyAccepted]);

  const handleAdultAccept = () => {
    console.log('[Consent] Action: Accepting adult content');
    localStorage.setItem('adultAccepted', 'true');
    setAdultAccepted(true);
  };

  const handlePrivacyAccept = () => {
    console.log('[Consent] Action: Accepting privacy policy');
    localStorage.setItem('privacyAccepted', 'true');
    setPrivacyAccepted(true);
  };

  return (
    <Router>
      <AuthProvider>
        <UIProvider>
          {!isConsentComplete ? (
            <Routes>
              {/* Allow viewing privacy policy even before consent */}
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="*" element={
                <ConsentOverlay 
                  adultAccepted={adultAccepted}
                  privacyAccepted={privacyAccepted}
                  onAdultAccept={handleAdultAccept}
                  onPrivacyAccept={handlePrivacyAccept}
                />
              } />
            </Routes>
          ) : (
            <Routes>
              {/* User Routes (Wrapped in MainLayout) */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/preroll/:id" element={<PreRoll />} />
                <Route path="/video/:id" element={<VideoWatch />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/submit" element={<SubmitInfo />} />
                <Route path="/about-us" element={<AboutUs />} />
                <Route path="/contact-us" element={<ContactUs />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              </Route>

              {/* Admin Routes (No Sidebar) */}
              <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/videos" element={<ProtectedRoute><AdminVideos /></ProtectedRoute>} />
              <Route path="/admin/upload" element={<ProtectedRoute><AdminUpload /></ProtectedRoute>} />
              <Route path="/admin/submissions" element={<ProtectedRoute><AdminSubmissions /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute><AdminReports /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          )}
        </UIProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

