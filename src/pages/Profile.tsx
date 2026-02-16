import { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronLeft, Save, User as UserIcon, Target, Ruler, Scale, Calendar, LogOut, Camera, Mail, Lock, AtSign } from 'lucide-react';
import { authApi, userApi } from '../api/client';
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
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [initialUsername, setInitialUsername] = useState('');
  const [initialEmail, setInitialEmail] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [heightFeet, setHeightFeet] = useState<number | ''>('');
  const [heightInches, setHeightInches] = useState<number | ''>('');
  const [bodyWeight, setBodyWeight] = useState<number | ''>('');
  const [fitnessGoal, setFitnessGoal] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | ''>('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [bio, setBio] = useState('');
  const [preferredUnit, setPreferredUnit] = useState<WeightUnit>('lbs');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await userApi.get();
      setUsername(userData.username || '');
      setEmail(userData.email || '');
      setInitialUsername(userData.username || '');
      setInitialEmail(userData.email || '');
      setDisplayName(userData.displayName || '');
      setAge(userData.age || '');
      setHeightFeet(userData.heightFeet || '');
      setHeightInches(userData.heightInches || '');
      setBodyWeight(userData.bodyWeight || '');
      setFitnessGoal(userData.fitnessGoal || []);
      setExperienceLevel(userData.experienceLevel || '');
      setGender(userData.gender || '');
      setBio(userData.bio || '');
      setPreferredUnit(userData.preferredUnit || 'lbs');
      setAvatar(userData.avatar || null);
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
        avatar: avatar || undefined,
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 100KB for base64 storage)
    if (file.size > 100 * 1024) {
      alert('Image must be less than 100KB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAccountSave = async () => {
    setAccountSaving(true);
    setAccountMessage(null);
    setAccountError(null);

    try {
      const trimmedUsername = username.trim();
      const trimmedEmail = email.trim();
      const normalizedInitialEmail = initialEmail.trim();

      if (trimmedUsername.length < 2) {
        throw new Error('Username must be at least 2 characters');
      }

      const targetEmail = trimmedEmail.length > 0 ? trimmedEmail : null;
      const currentEmail = normalizedInitialEmail.length > 0 ? normalizedInitialEmail : null;

      let hasChanges = false;

      if (trimmedUsername !== initialUsername) {
        await authApi.updateUsername(trimmedUsername);
        setInitialUsername(trimmedUsername);
        hasChanges = true;
      }

      if (targetEmail !== currentEmail) {
        await authApi.updateEmail(targetEmail);
        setInitialEmail(targetEmail || '');
        hasChanges = true;
      }

      if (!hasChanges) {
        setAccountMessage('No account changes to save.');
        return;
      }

      setUsername(trimmedUsername);
      setEmail(targetEmail || '');
      setAccountMessage('Account settings updated.');
    } catch (error) {
      setAccountError((error as Error).message);
    } finally {
      setAccountSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordSaving(true);
    setPasswordMessage(null);
    setPasswordError(null);

    try {
      if (!currentPassword.trim()) {
        throw new Error('Current password is required');
      }
      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters');
      }
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Password updated successfully.');
    } catch (error) {
      setPasswordError((error as Error).message);
    } finally {
      setPasswordSaving(false);
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
        {/* Profile Picture */}
        <div className="flex flex-col items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden mb-3 group"
          >
            {avatar ? (
              <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                <UserIcon size={48} className="text-slate-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </div>
          </button>
          <p className="text-xs text-slate-500 mb-2">Tap to change photo</p>
          <p className="text-lg font-semibold">{displayName || 'Your Name'}</p>
          {experienceLevel && (
            <span className="text-sm text-blue-400 capitalize">{experienceLevel} Lifter</span>
          )}
        </div>

        {/* Account */}
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <AtSign size={18} className="text-slate-400" />
            Account
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1 flex items-center gap-1">
                <Mail size={14} />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="input w-full"
              />
            </div>

            {accountMessage && <p className="text-sm text-green-400">{accountMessage}</p>}
            {accountError && <p className="text-sm text-red-400">{accountError}</p>}

            <button
              type="button"
              onClick={handleAccountSave}
              disabled={accountSaving}
              className="btn btn-secondary w-full"
            >
              {accountSaving ? 'Saving account...' : 'Save Account'}
            </button>
          </div>
        </div>

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
              <label className="block text-sm text-slate-400 mb-2">Fitness Goals</label>
              <div className="flex flex-wrap gap-2">
                {FITNESS_GOALS.map((goal) => (
                  <button
                    key={goal}
                     onClick={() => {
                       setFitnessGoal(prev =>
                         prev.includes(goal)
                           ? prev.filter(g => g !== goal)
                           : [...prev, goal]
                       );
                     }}
                     className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                       fitnessGoal.includes(goal)
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

        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Lock size={18} className="text-slate-400" />
            Password
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="input w-full"
              />
            </div>

            {passwordMessage && <p className="text-sm text-green-400">{passwordMessage}</p>}
            {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}

            <button
              type="button"
              onClick={handlePasswordChange}
              disabled={passwordSaving}
              className="btn btn-secondary w-full"
            >
              {passwordSaving ? 'Updating password...' : 'Update Password'}
            </button>
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
