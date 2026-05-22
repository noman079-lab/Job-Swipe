import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "../hooks/useAuth";

// Pages
import Landing from "../pages/Landing";
import Dashboard from "../pages/Dashboard";
import EmployerDashboard from "../pages/EmployerDashboard";
import SwipeJobs from "../pages/SwipeJobs";
import SwipeCandidates from "../pages/SwipeCandidates";
import Messages from "../pages/Messages";
import Profile from "../pages/Profile";
import Onboarding from "../pages/Onboarding";
import Marketplace from "../pages/Marketplace";
import ShiftManagement from "../pages/ShiftManagement";
import AdminPanel from "../pages/AdminPanel";
import CreateJob from "../pages/CreateJob";
import Pricing from "../pages/Pricing";
import Settings from "../pages/Settings";
import Applications from "../pages/Applications";
import SavedCandidates from "../pages/SavedCandidates";
import JobDetail from "../pages/JobDetail";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import CompanyProfileEdit from "../pages/CompanyProfileEdit";
import JobApplicants from "../pages/JobApplicants";
import PublicCompanyProfile from "../pages/PublicCompanyProfile";
import TeamManagement from "../pages/TeamManagement";
import VerificationPending from "../pages/VerificationPending";

// Components
import Navbar from "../components/Navbar";
import MobileBottomNav from "../components/MobileBottomNav";

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  
  // Role Check
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'employer' ? "/employer" : "/dashboard"} replace />;
  }

  // Onboarding Check
  if (!user.onboarding_completed && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Verification Check
  if (!user.is_verified && !['/verify-email', '/onboarding', '/profile'].includes(window.location.pathname)) {
    return <Navigate to="/verify-email" replace />;
  }
  
  return <>{children}</>;
};

function AppContent() {
  const { user, loading } = useAuth();
  const [isEmployer, setIsEmployer] = useState(false);

  useEffect(() => {
    if (user) {
      setIsEmployer(user.role === 'employer');
    } else {
      setIsEmployer(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" theme="dark" richColors />
      <div className="min-h-screen bg-bg-dark flex flex-col">
        {/* Centered floating navigation container */}
        <div className="w-full max-w-7xl mx-auto px-4 pt-4 z-[60]">
          <Navbar />
        </div>
        
        <main className="flex-1 w-full pb-20 md:pb-6">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['worker']}><Dashboard /></ProtectedRoute>} />
            <Route path="/employer" element={<ProtectedRoute allowedRoles={['employer']}><EmployerDashboard /></ProtectedRoute>} />
            <Route path="/employer/profile/edit" element={<ProtectedRoute allowedRoles={['employer']}><CompanyProfileEdit /></ProtectedRoute>} />
            <Route path="/employer/team" element={<ProtectedRoute allowedRoles={['employer']}><TeamManagement /></ProtectedRoute>} />
            <Route path="/employer/jobs/:jobId/applicants" element={<ProtectedRoute allowedRoles={['employer']}><JobApplicants /></ProtectedRoute>} />
            <Route path="/company/:id" element={<PublicCompanyProfile />} />
            <Route path="/verify-email" element={<ProtectedRoute><VerificationPending /></ProtectedRoute>} />
            <Route path="/swipe" element={<ProtectedRoute allowedRoles={['worker']}><SwipeJobs /></ProtectedRoute>} />
            <Route path="/candidates" element={<ProtectedRoute allowedRoles={['employer']}><SwipeCandidates /></ProtectedRoute>} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/find-work" element={<Navigate to="/marketplace?tab=jobs" replace />} />
            <Route path="/find-talent" element={<Navigate to="/marketplace?tab=workers" replace />} />
            <Route path="/tuition" element={<Navigate to="/marketplace?category=Tuition" replace />} />
            <Route path="/saved-jobs" element={<ProtectedRoute allowedRoles={['worker']}><Profile /></ProtectedRoute>} />
            <Route path="/saved-candidates" element={<ProtectedRoute allowedRoles={['employer']}><SavedCandidates /></ProtectedRoute>} />
            <Route path="/applications" element={<ProtectedRoute allowedRoles={['worker']}><Applications /></ProtectedRoute>} />
            <Route path="/earnings" element={<ProtectedRoute allowedRoles={['worker']}><ShiftManagement /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
            <Route path="/create-job" element={<ProtectedRoute allowedRoles={['employer', 'admin']}><CreateJob /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/messages/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/jobs/:id" element={<JobDetail />} />
          </Routes>
        </main>

        <MobileBottomNav isEmployer={isEmployer} />
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

