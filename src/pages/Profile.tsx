import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronLeft, Save, User as UserIcon, Target, Ruler, Scale, Calendar, LogOut } from 'lucide-react';
import { userApi } from '../api/client';
import type { ExperienceLevel, WeightUnit, Gender } from '../types';

interface LayoutContext {
  onSwitchProfile?: () => void;
}

const FITNESS_GOALS = [
  'Build Muscle',
  'Lose Weight',
  'Gain Strength',
  'Improve Endurance',
  'Stay Active',
  'Athletic Performance',
  'General Fitness',
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: 'beginner', label: 'Beginner', description: 'Less than 1 year of training' },
  { value: 'intermediate', label: 'Intermediate', description: '1-3 years of training' },
  { value: 'advanced', label: 'Advanced', description: '3+ years of training' },
];

export function Profile() {
  const navigate = useNavigate();
  const { onSwitchProfile } = useOutletContext<LayoutContext>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [heightFeet, setHeightFeet] = useState<number | ''>('');
  const [heightInches, setHeightInches] = useState<number | ''>('');
  const [bodyWeight, setBodyWeight] = useState<number | ''>('');
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | ''>('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [bio, setBio] = useState('');
  const [preferredUnit, setPreferredUnit] = useState<WeightUnit>('lbs');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await userApi.get();
      setDisplayName(userData.displayName || '');
      setAge(userData.age || '');
      setHeightFeet(userData.heightFeet || '');
      setHeightInches(userData.heightInches || '');
      setBodyWeight(userData.bodyWeight || '');
      setFitnessGoal(userData.fitnessGoal || '');
      setExperienceLevel(userData.experienceLevel || '');
      setGender(userData.gender || '');
      setBio(userData.bio || '');
      setPreferredUnit(userData.preferredUnit || 'lbs');
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await userApi.updateProfile({
        displayName: displayName || undefined,
        age: age ? Number(age) : undefined,
        heightFeet: heightFeet ? Number(heightFeet) : undefined,
        heightInches: heightInches ? Number(heightInches) : undefined,
        bodyWeight: bodyWeight ? Number(bodyWeight) : undefined,
        fitnessGoal: fitnessGoal || undefined,
        experienceLevel: experienceLevel || undefined,
        gender: gender || undefined,
        bio: bio || undefined,
        preferredUnit,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => navigate('/')} className="p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Profile</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`btn py-2 px-4 ${saved ? 'btn-success' : 'btn-primary'}`}
          >
            <Save size={18} />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Profile Picture Placeholder */}
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center mb-3">
            <UserIcon size={48} className="text-slate-400" />
          </div>
          <p className="text-lg font-semibold">{displayName || 'Your Name'}</p>
          {experienceLevel && (
            <span className="text-sm text-blue-400 capitalize">{experienceLevel} Lifter</span>
          )}
        </div>

        {/* Basic Info */}
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <UserIcon size={18} className="text-slate-400" />
            Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">
                <Calendar size={14} className="inline mr-1" />
                Age
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                placeholder="Enter your age"
                className="input w-full"
                min={13}
                max={120}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Gender</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setGender('male')}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    gender === 'male'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  Male
                </button>
                <button
                  onClick={() => setGender('female')}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    gender === 'female'
                      ? 'bg-pink-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  Female
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="input w-full h-20 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Body Measurements */}
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Ruler size={18} className="text-slate-400" />
            Body Measurements
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Height</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={heightFeet}
                      onChange={(e) => setHeightFeet(e.target.value ? Number(e.target.value) : '')}
                      placeholder="5"
                      className="input w-full"
                      min={3}
                      max={8}
                    />
                    <span className="text-slate-400">ft</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={heightInches}
                      onChange={(e) => setHeightInches(e.target.value ? Number(e.target.value) : '')}
                      placeholder="10"
                      className="input w-full"
                      min={0}
                      max={11}
                    />
                    <span className="text-slate-400">in</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">
                <Scale size={14} className="inline mr-1" />
                Body Weight
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={bodyWeight}
                  onChange={(e) => setBodyWeight(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Enter weight"
                  className="input flex-1"
                  min={50}
                  max={500}
                />
                <span className="text-slate-400">{preferredUnit}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Preferred Unit</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreferredUnit('lbs')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    preferredUnit === 'lbs'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  Pounds (lbs)
                </button>
                <button
                  onClick={() => setPreferredUnit('kg')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    preferredUnit === 'kg'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  Kilograms (kg)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Fitness Goals */}
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Target size={18} className="text-slate-400" />
            Fitness Goals
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Primary Goal</label>
              <div className="flex flex-wrap gap-2">
                {FITNESS_GOALS.map((goal) => (
                  <button
                    key={goal}
                    onClick={() => setFitnessGoal(goal)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      fitnessGoal === goal
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Experience Level</label>
              <div className="space-y-2">
                {EXPERIENCE_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setExperienceLevel(level.value)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      experienceLevel === level.value
                        ? 'bg-blue-600/20 border-2 border-blue-500'
                        : 'bg-slate-700 border-2 border-transparent hover:bg-slate-600'
                    }`}
                  >
                    <p className="font-medium">{level.label}</p>
                    <p className="text-sm text-slate-400">{level.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Switch Profile Button */}
        <button
          onClick={onSwitchProfile}
          className="btn btn-secondary w-full py-4"
        >
          <LogOut size={20} />
          Switch Profile
        </button>
      </div>
    </div>
  );
}
