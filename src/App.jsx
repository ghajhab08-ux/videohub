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
  const [loadingConsent, setLoadingConsent] = useState(true);
  const [adultAccepted, setAdultAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  useEffect(() => {
    // 1. Initial validation with debug logging for mobile stability
    const userAgent = navigator.userAgent;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    console.log('[Consent Debug] Initializing consent check...', {
      device: isMobileDevice ? 'Mobile' : 'Desktop',
      userAgent,
      time: new Date().toISOString()
    });
    
    const checkConsent = () => {
      try {
        const adult = localStorage.getItem('adultAccepted');
        const privacy = localStorage.getItem('privacyAccepted');
        
        console.log('[Consent Debug] localStorage values found:', { adult, privacy });
        
        setAdultAccepted(adult === 'true');
        setPrivacyAccepted(privacy === 'true');
        
        console.log('[Consent Debug] Decision:', { 
          showPopups: adult !== 'true' || privacy !== 'true',
          adultAccepted: adult === 'true', 
          privacyAccepted: privacy === 'true' 
        });
      } catch (e) {
        console.error('[Consent Debug] localStorage access error:', e);
        // Fallback for private mode / restricted environments
        setAdultAccepted(false);
        setPrivacyAccepted(false);
      } finally {
        // Ensure the loading screen stays visible long enough to prevent flickering
        // and allow the state to settle before rendering the app.
        setTimeout(() => {
          setLoadingConsent(false);
          console.log('[Consent Debug] Loading gate released');
        }, 100);
      }
    };

    checkConsent();
  }, []);

  const handleAdultAccept = () => {
    console.log('[Consent Action] User accepted adult content');
    localStorage.setItem('adultAccepted', 'true');
    setAdultAccepted(true);
  };

  const handlePrivacyAccept = () => {
    console.log('[Consent Action] User accepted privacy policy');
    localStorage.setItem('privacyAccepted', 'true');
    setPrivacyAccepted(true);
  };

  // The app only renders once loadingConsent is false
  if (loadingConsent) {
    return (
      <div style={{ 
        background: '#000', 
        height: '100vh', 
        width: '100vw', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid rgba(255,255,255,0.1)', 
          borderTop: '3px solid var(--accent-color, #ff0000)', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <p style={{ opacity: 0.6, fontSize: '14px', letterSpacing: '1px' }}>VERIFYING ACCESS...</p>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // Derived state to ensure consistency across renders
  const isConsentComplete = adultAccepted && privacyAccepted;

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

