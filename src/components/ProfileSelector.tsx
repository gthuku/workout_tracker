import { useState, useEffect } from 'react';
import { User, Plus, Trash2 } from 'lucide-react';
import { profileApi } from '../api/client';
import type { User as UserType } from '../types';

interface ProfileSelectorProps {
  onProfileSelected: (profileId: string) => void;
}

export function ProfileSelector({ onProfileSelected }: ProfileSelectorProps) {
  const [profiles, setProfiles] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const data = await profileApi.list();
      setProfiles(data);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = (profileId: string) => {
    localStorage.setItem('selectedProfileId', profileId);
    onProfileSelected(profileId);
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    setCreating(true);
    setError('');
    try {
      const newProfile = await profileApi.create(
        newUsername.trim(),
        newDisplayName.trim() || newUsername.trim()
      );
      setProfiles([...profiles, newProfile]);
      setShowCreateForm(false);
      setNewUsername('');
      setNewDisplayName('');
      handleSelectProfile(newProfile.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProfile = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this profile? All workout data will be lost.')) return;

    try {
      await profileApi.delete(profileId);
      setProfiles(profiles.filter(p => p.id !== profileId));
    } catch (err) {
      console.error('Failed to delete profile:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Workout Tracker</h1>
          <p className="text-slate-400">Select your profile to continue</p>
        </div>

        <div className="space-y-3 mb-6">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => handleSelectProfile(profile.id)}
              className="w-full card flex items-center justify-between hover:bg-slate-700 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <User className="text-blue-500" size={24} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-lg text-white">
                    {profile.displayName || profile.username}
                  </p>
                  <p className="text-sm text-slate-400">@{profile.username}</p>
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteProfile(e, profile.id)}
                className="p-2 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={18} />
              </button>
            </button>
          ))}

          {profiles.length === 0 && !showCreateForm && (
            <div className="text-center py-8 text-slate-400">
              <User className="mx-auto text-slate-600 mb-4" size={48} />
              <p>No profiles yet</p>
              <p className="text-sm mt-1">Create one to get started</p>
            </div>
          )}
        </div>

        {showCreateForm ? (
          <form onSubmit={handleCreateProfile} className="card space-y-4">
            <h2 className="font-semibold text-lg">Create New Profile</h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-slate-400 mb-1">Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g., john"
                className="input w-full"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Display Name (optional)</label>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="e.g., John Doe"
                className="input w-full"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newUsername.trim() || creating}
                className="btn btn-primary flex-1"
              >
                {creating ? 'Creating...' : 'Create Profile'}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary w-full py-4 text-lg"
          >
            <Plus size={24} />
            Create New Profile
          </button>
        )}
      </div>
    </div>
  );
}
