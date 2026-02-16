import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, X, Copy, Check, UserPlus, Mail, LogOut, ChevronRight } from 'lucide-react';
import { squadApi } from '../api/client';
import type { Squad as SquadType, SquadDashboard, SquadInvite, SquadUserSearchResult, ReactionType } from '../types';

type View = 'loading' | 'empty' | 'dashboard';

export function Squad() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('loading');
  const [squads, setSquads] = useState<SquadType[]>([]);
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<SquadDashboard | null>(null);
  const [invites, setInvites] = useState<SquadInvite[]>([]);

  // Create squad form
  const [showCreate, setShowCreate] = useState(false);
  const [newSquadName, setNewSquadName] = useState('');
  const [creating, setCreating] = useState(false);

  // Join by code form
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<SquadUserSearchResult[]>([]);
  const [searchResults, setSearchResults] = useState<SquadUserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  // Copied invite code
  const [copiedCode, setCopiedCode] = useState(false);

  // Squad menu (create/join/leave from dashboard)
  const [showSquadMenu, setShowSquadMenu] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const loadSquads = useCallback(async () => {
    try {
      const [squadList, inviteList] = await Promise.all([
        squadApi.list(),
        squadApi.listInvites(),
      ]);
      setSquads(squadList);
      setInvites(inviteList);

      if (squadList.length > 0) {
        const id = selectedSquadId && squadList.find(s => s.id === selectedSquadId)
          ? selectedSquadId
          : squadList[0].id;
        setSelectedSquadId(id);
        const dash = await squadApi.getDashboard(id);
        setDashboard(dash);
        setView('dashboard');
      } else {
        setView('empty');
      }
    } catch (error) {
      console.error('Failed to load squads:', error);
      setView('empty');
    }
  }, [selectedSquadId]);

  useEffect(() => {
    loadSquads();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectSquad = async (id: string) => {
    setSelectedSquadId(id);
    try {
      const dash = await squadApi.getDashboard(id);
      setDashboard(dash);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  const handleCreate = async () => {
    if (!newSquadName.trim() || creating) return;
    setCreating(true);
    try {
      await squadApi.create(newSquadName.trim());
      setNewSquadName('');
      setShowCreate(false);
      await loadSquads();
    } catch (error) {
      console.error('Failed to create squad:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (joinCode.length !== 6 || joining) return;
    setJoining(true);
    try {
      await squadApi.joinByCode(joinCode.toUpperCase());
      setJoinCode('');
      setShowJoin(false);
      await loadSquads();
    } catch (error) {
      console.error('Failed to join squad:', error);
    } finally {
      setJoining(false);
    }
  };

  const handleRespondInvite = async (inviteId: string, accept: boolean) => {
    try {
      await squadApi.respondToInvite(inviteId, accept);
      await loadSquads();
    } catch (error) {
      console.error('Failed to respond to invite:', error);
    }
  };

  const loadAllUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const users = await squadApi.searchUsers('', selectedSquadId || undefined);
      setAllUsers(users);
      setSearchResults(users);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, [selectedSquadId]);

  const handleOpenInvite = () => {
    setShowInvite(true);
    setSearchQuery('');
    loadAllUsers();
  };

  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults(allUsers);
      return;
    }
    setSearching(true);
    try {
      const results = await squadApi.searchUsers(q, selectedSquadId || undefined);
      setSearchResults(results);
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleInviteUser = async (userId: string) => {
    if (!selectedSquadId || inviting) return;
    setInviting(userId);
    try {
      await squadApi.inviteUser(selectedSquadId, userId);
      setSearchResults(prev => prev.filter(u => u.id !== userId));
      setAllUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Failed to invite user:', error);
    } finally {
      setInviting(null);
    }
  };

  const handleLeaveSquad = async () => {
    if (!selectedSquadId || leaving) return;
    setLeaving(true);
    try {
      await squadApi.leave(selectedSquadId);
      setSelectedSquadId(null);
      setShowSquadMenu(false);
      await loadSquads();
    } catch (error) {
      console.error('Failed to leave squad:', error);
    } finally {
      setLeaving(false);
    }
  };

  const handleReaction = async (workoutId: string, type: ReactionType, hasReacted: boolean) => {
    try {
      if (hasReacted) {
        await squadApi.removeReaction(workoutId, type);
      } else {
        await squadApi.addReaction(workoutId, type);
      }
      // Refresh dashboard
      if (selectedSquadId) {
        const dash = await squadApi.getDashboard(selectedSquadId);
        setDashboard(dash);
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  const handleCopyCode = () => {
    if (dashboard?.squad.inviteCode) {
      navigator.clipboard.writeText(dashboard.squad.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Loading state
  if (view === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Empty state
  if (view === 'empty') {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-6 page-transition">
        <div className="pt-4">
          <p className="text-sm text-zinc-500 font-medium">Accountability</p>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Squad</span>
          </h1>
        </div>

        {/* Pending Invites */}
        {invites.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-400">Pending Invites</h2>
            {invites.map(inv => (
              <div key={inv.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium">{inv.squadName}</p>
                  <p className="text-xs text-zinc-500">from {inv.inviterName}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondInvite(inv.id, true)}
                    className="btn btn-primary text-sm px-3 py-1.5"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespondInvite(inv.id, false)}
                    className="btn btn-secondary text-sm px-3 py-1.5"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Squad Card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
              <Plus className="text-blue-500" size={24} />
            </div>
            <div>
              <h2 className="font-semibold">Create a Squad</h2>
              <p className="text-xs text-zinc-500">Start a new accountability group</p>
            </div>
          </div>
          {showCreate ? (
            <div className="space-y-3">
              <input
                type="text"
                value={newSquadName}
                onChange={e => setNewSquadName(e.target.value)}
                placeholder="Squad name"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                maxLength={50}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!newSquadName.trim() || creating}
                  className="btn btn-primary flex-1 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button onClick={() => setShowCreate(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCreate(true)} className="btn btn-primary w-full">
              Create Squad
            </button>
          )}
        </div>

        {/* Join Squad Card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl">
              <UserPlus className="text-green-500" size={24} />
            </div>
            <div>
              <h2 className="font-semibold">Join with Code</h2>
              <p className="text-xs text-zinc-500">Enter a 6-character invite code</p>
            </div>
          </div>
          {showJoin ? (
            <div className="space-y-3">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABCDEF"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-green-500 text-center text-2xl tracking-[0.3em] font-mono"
                maxLength={6}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleJoin}
                  disabled={joinCode.length !== 6 || joining}
                  className="btn btn-primary flex-1 disabled:opacity-50"
                >
                  {joining ? 'Joining...' : 'Join'}
                </button>
                <button onClick={() => setShowJoin(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowJoin(true)} className="btn btn-secondary w-full">
              Join Squad
            </button>
          )}
        </div>
      </div>
    );
  }

  // Dashboard view
  const progress = dashboard?.dailyProgress;
  const progressPercent = progress?.percentage || 0;
  const circumference = 2 * Math.PI * 54; // radius = 54
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6 page-transition">
      {/* Header */}
      <div className="pt-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500 font-medium">Accountability</p>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">{dashboard?.squad.name || 'Squad'}</span>
          </h1>
        </div>
        <button
          onClick={handleOpenInvite}
          className="btn btn-secondary flex items-center gap-2"
        >
          <UserPlus size={16} />
          Invite
        </button>
      </div>

      {/* Squad Selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {squads.map(s => (
          <button
            key={s.id}
            onClick={() => handleSelectSquad(s.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              s.id === selectedSquadId
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            {s.name}
          </button>
        ))}
        <button
          onClick={() => setShowSquadMenu(true)}
          className="px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Pending Invites Banner */}
      {invites.length > 0 && (
        <div className="card border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="text-amber-500" size={16} />
            <span className="text-sm font-medium text-amber-400">
              {invites.length} pending invite{invites.length > 1 ? 's' : ''}
            </span>
          </div>
          {invites.map(inv => (
            <div key={inv.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{inv.squadName}</p>
                <p className="text-xs text-zinc-500">from {inv.inviterName}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRespondInvite(inv.id, true)}
                  className="text-sm font-medium text-green-400 hover:text-green-300"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRespondInvite(inv.id, false)}
                  className="text-sm text-zinc-500 hover:text-zinc-400"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progress Ring */}
      <div className="card flex flex-col items-center py-8">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60" cy="60" r="54"
              stroke="#27272a"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="60" cy="60" r="54"
              stroke="url(#progressGradient)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700 ease-out"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{progress?.completed || 0}/{progress?.total || 0}</span>
            <span className="text-xs text-zinc-500 font-medium">Finished!</span>
          </div>
        </div>
      </div>

      {/* Invite Code */}
      <div className="card flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 font-medium">Invite Code</p>
          <p className="font-mono text-lg tracking-widest">{dashboard?.squad.inviteCode}</p>
        </div>
        <button
          onClick={handleCopyCode}
          className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors"
        >
          {copiedCode ? <Check size={18} className="text-green-400" /> : <Copy size={18} className="text-zinc-400" />}
        </button>
      </div>

      {/* Activity Feed */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Users className="text-zinc-400" size={18} />
          <h2 className="font-semibold">Today&apos;s Activity</h2>
        </div>
        <div className="space-y-1">
          {dashboard?.feed.map(member => (
            <div
              key={member.userId}
              onClick={() => member.workoutId && navigate(`/squad/workout/${member.workoutId}`)}
              className={`flex items-start gap-3 py-3 border-b border-zinc-800/50 last:border-0 ${
                member.workoutId ? 'cursor-pointer hover:bg-zinc-800/30 rounded-lg px-2 -mx-2 transition-colors' : ''
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-sm font-semibold">
                  {member.avatar ? (
                    <img src={member.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    member.displayName.slice(0, 2).toUpperCase()
                  )}
                </div>
                {/* Status dot */}
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#111111] ${
                    member.status === 'done'
                      ? 'bg-green-500'
                      : member.status === 'in_progress'
                      ? 'bg-yellow-500'
                      : 'bg-zinc-600'
                  }`}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{member.displayName}</p>
                  {member.workoutId && (
                    <ChevronRight size={16} className="text-zinc-600 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-zinc-500 truncate">{member.activity}</p>

                {/* Reactions */}
                {member.workoutId && (
                  <div className="flex gap-2 mt-2">
                    {(['fire', 'clap', 'eyes'] as ReactionType[]).map(type => {
                      const emoji = type === 'fire' ? '\uD83D\uDD25' : type === 'clap' ? '\uD83D\uDC4F' : '\uD83D\uDC40';
                      const count = member.reactions[type];
                      const reacted = member.hasUserReacted[type];
                      return (
                        <button
                          key={type}
                          onClick={(e) => { e.stopPropagation(); handleReaction(member.workoutId!, type, reacted); }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                            reacted
                              ? 'bg-blue-500/20 border border-blue-500/30'
                              : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <span>{emoji}</span>
                          {count > 0 && <span className="text-zinc-400">{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {dashboard?.feed.length === 0 && (
            <div className="text-center py-8">
              <p className="text-zinc-500 text-sm">No members yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Squad Menu Modal (create/join/leave) */}
      {showSquadMenu && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowSquadMenu(false); setShowCreate(false); setShowJoin(false); }} />
          <div className="relative w-full max-w-lg bg-[#111111] border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Manage Squads</h2>
              <button onClick={() => { setShowSquadMenu(false); setShowCreate(false); setShowJoin(false); }} className="p-1 text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Create */}
              {showCreate ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newSquadName}
                    onChange={e => setNewSquadName(e.target.value)}
                    placeholder="Squad name"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                    maxLength={50}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleCreate} disabled={!newSquadName.trim() || creating} className="btn btn-primary flex-1 disabled:opacity-50">
                      {creating ? 'Creating...' : 'Create'}
                    </button>
                    <button onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
                  </div>
                </div>
              ) : showJoin ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="ABCDEF"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-green-500 text-center text-2xl tracking-[0.3em] font-mono"
                    maxLength={6}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleJoin} disabled={joinCode.length !== 6 || joining} className="btn btn-primary flex-1 disabled:opacity-50">
                      {joining ? 'Joining...' : 'Join'}
                    </button>
                    <button onClick={() => setShowJoin(false)} className="btn btn-secondary">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors text-left"
                  >
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Plus className="text-blue-400" size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Create a Squad</p>
                      <p className="text-xs text-zinc-500">Start a new accountability group</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowJoin(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors text-left"
                  >
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <UserPlus className="text-green-400" size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Join with Code</p>
                      <p className="text-xs text-zinc-500">Enter a 6-character invite code</p>
                    </div>
                  </button>

                  <button
                    onClick={handleLeaveSquad}
                    disabled={leaving}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-red-500/20 hover:border-red-500/40 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <LogOut className="text-red-400" size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-400">
                        {leaving ? 'Leaving...' : `Leave ${dashboard?.squad.name}`}
                      </p>
                      <p className="text-xs text-zinc-500">Remove yourself from this squad</p>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowInvite(false)} />
          <div className="relative w-full max-w-lg bg-[#111111] border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Invite to {dashboard?.squad.name}</h2>
              <button onClick={() => setShowInvite(false)} className="p-1 text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearchUsers(e.target.value)}
                placeholder="Search by name or username..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-1">
              {(searching || loadingUsers) && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto" />
                </div>
              )}
              {!searching && !loadingUsers && searchResults.map(user => (
                <div key={user.id} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-zinc-900/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-xs font-semibold">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        user.displayName.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.displayName}</p>
                      <p className="text-xs text-zinc-500">@{user.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleInviteUser(user.id)}
                    disabled={inviting === user.id}
                    className="btn btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
                  >
                    {inviting === user.id ? '...' : 'Invite'}
                  </button>
                </div>
              ))}
              {!searching && !loadingUsers && searchResults.length === 0 && (
                <p className="text-center text-zinc-500 text-sm py-4">No users found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
