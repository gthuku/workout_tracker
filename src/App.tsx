import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProfileSelector } from './components/ProfileSelector';
import { Dashboard } from './pages/Dashboard';
import { ActiveWorkout } from './pages/ActiveWorkout';
import { LogPastWorkout } from './pages/LogPastWorkout';
import { ExerciseLibrary } from './pages/ExerciseLibrary';
import { ExerciseHistoryPage } from './pages/ExerciseHistory';
import { Stats } from './pages/Stats';
import { WorkoutHistory } from './pages/WorkoutHistory';
import { WorkoutDetail } from './pages/WorkoutDetail';
import { Profile } from './pages/Profile';

function App() {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(() => {
    return localStorage.getItem('selectedProfileId');
  });

  const handleProfileSelected = (profileId: string) => {
    setSelectedProfileId(profileId);
  };

  const handleSwitchProfile = () => {
    localStorage.removeItem('selectedProfileId');
    setSelectedProfileId(null);
  };

  if (!selectedProfileId) {
    return <ProfileSelector onProfileSelected={handleProfileSelected} />;
  }

  return (
    <BrowserRouter>
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
