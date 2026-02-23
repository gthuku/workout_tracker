import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProfileSelector } from './components/ProfileSelector';
import { authApi } from './api/client';

// Lazy load route components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const ActiveWorkout = lazy(() => import('./pages/ActiveWorkout').then(m => ({ default: m.ActiveWorkout })));
const LogPastWorkout = lazy(() => import('./pages/LogPastWorkout').then(m => ({ default: m.LogPastWorkout })));
const ExerciseLibrary = lazy(() => import('./pages/ExerciseLibrary').then(m => ({ default: m.ExerciseLibrary })));
const ExerciseHistoryPage = lazy(() => import('./pages/ExerciseHistory').then(m => ({ default: m.ExerciseHistoryPage })));
const Stats = lazy(() => import('./pages/Stats').then(m => ({ default: m.Stats })));
const WorkoutHistory = lazy(() => import('./pages/WorkoutHistory').then(m => ({ default: m.WorkoutHistory })));
const WorkoutDetail = lazy(() => import('./pages/WorkoutDetail').then(m => ({ default: m.WorkoutDetail })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const RecentPRs = lazy(() => import('./pages/RecentPRs').then(m => ({ default: m.RecentPRs })));
const ProgressTracker = lazy(() => import('./pages/ProgressTracker').then(m => ({ default: m.ProgressTracker })));
const Squad = lazy(() => import('./pages/Squad').then(m => ({ default: m.Squad })));
const SquadWorkoutDetail = lazy(() => import('./pages/SquadWorkoutDetail').then(m => ({ default: m.SquadWorkoutDetail })));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    // Allow password reset links to work even if a profile is already selected in localStorage.
    if (params.get('resetToken') || params.get('token')) {
      return null;
    }
    return localStorage.getItem('selectedProfileId');
  });
  const [verifyingAuth, setVerifyingAuth] = useState(true);

  // Verify auth on app load to catch stale/invalid tokens
  useEffect(() => {
    const verifyAuth = async () => {
      const profileId = localStorage.getItem('selectedProfileId');
      const token = localStorage.getItem('authToken');

      // No stored auth, nothing to verify
      if (!profileId || !token) {
        setVerifyingAuth(false);
        return;
      }

      try {
        // Verify the token is still valid
        await authApi.verify();
        setVerifyingAuth(false);
      } catch {
        // Token is invalid - clear auth and redirect to login
        localStorage.removeItem('selectedProfileId');
        localStorage.removeItem('authToken');
        setSelectedProfileId(null);
        setVerifyingAuth(false);
      }
    };

    verifyAuth();
  }, []);

  const handleProfileSelected = (profileId: string) => {
    setSelectedProfileId(profileId);
  };

  const handleSwitchProfile = () => {
    localStorage.removeItem('selectedProfileId');
    localStorage.removeItem('authToken');
    setSelectedProfileId(null);
  };

  // Show loading while verifying auth
  if (verifyingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!selectedProfileId) {
    return <ProfileSelector onProfileSelected={handleProfileSelected} />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout onSwitchProfile={handleSwitchProfile} />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workout" element={<ActiveWorkout />} />
            <Route path="/log-past" element={<LogPastWorkout />} />
            <Route path="/exercises" element={<ExerciseLibrary />} />
            <Route path="/exercises/:exerciseId" element={<ExerciseHistoryPage />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/history" element={<WorkoutHistory />} />
            <Route path="/history/:workoutId" element={<WorkoutDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/recent-prs" element={<RecentPRs />} />
            <Route path="/progress-tracker" element={<ProgressTracker />} />
            <Route path="/squad" element={<Squad />} />
            <Route path="/squad/workout/:workoutId" element={<SquadWorkoutDetail />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
