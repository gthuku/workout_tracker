import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, Lock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { progressApi } from '../api/client';
import type { ProgressCheckin } from '../types';

const MAX_CHECKIN_PHOTOS = 3;
const MAX_CHECKIN_IMAGE_BYTES = 900 * 1024;

function sortCheckinsDesc(a: ProgressCheckin, b: ProgressCheckin): number {
  if (a.checkinDate !== b.checkinDate) {
    return b.checkinDate.localeCompare(a.checkinDate);
  }
  return b.createdAt.localeCompare(a.createdAt);
}

function getCurrentWeekStartLocal(): string {
  const today = new Date();
  const weekday = today.getDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(today);
  monday.setDate(today.getDate() + delta);
  monday.setHours(0, 0, 0, 0);
  return format(monday, 'yyyy-MM-dd');
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to read image file'));
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

function formatDelta(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}`;
}

export function ProgressTracker() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [progressCheckins, setProgressCheckins] = useState<ProgressCheckin[]>([]);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [submittingCheckin, setSubmittingCheckin] = useState(false);
  const [checkinWeight, setCheckinWeight] = useState('');
  const [checkinWaist, setCheckinWaist] = useState('');
  const [checkinNote, setCheckinNote] = useState('');
  const [checkinPhotos, setCheckinPhotos] = useState<string[]>([]);
  const [compareLeftId, setCompareLeftId] = useState('');
  const [compareRightId, setCompareRightId] = useState('');
  const [compareMode, setCompareMode] = useState<'slider' | 'toggle'>('slider');
  const [compareSlider, setCompareSlider] = useState(50);
  const [showFirstImage, setShowFirstImage] = useState(true);

  useEffect(() => {
    async function loadCheckins() {
      try {
        const checkins = await progressApi.list();
        setProgressCheckins(checkins.sort(sortCheckinsDesc));
      } catch (error) {
        console.error('Failed to load progress check-ins:', error);
        setProgressError((error as Error).message);
      } finally {
        setLoading(false);
      }
    }
    loadCheckins();
  }, []);

  const checkinsAsc = useMemo(
    () =>
      [...progressCheckins].sort((a, b) => {
        if (a.checkinDate !== b.checkinDate) {
          return a.checkinDate.localeCompare(b.checkinDate);
        }
        return a.createdAt.localeCompare(b.createdAt);
      }),
    [progressCheckins]
  );

  const baselineWeight = checkinsAsc.length > 0 ? checkinsAsc[0].weight : null;
  const currentWeekStart = getCurrentWeekStartLocal();
  const hasCurrentWeekCheckin = progressCheckins.some((checkin) => checkin.weekStartDate === currentWeekStart);

  const trendData = useMemo(() => {
    if (checkinsAsc.length === 0) return [] as { date: string; weight: number | null; avg7: number | null }[];

    const pointsByDate = new Map<string, number>();
    const parsed = checkinsAsc.map((checkin) => ({
      date: parseISO(checkin.checkinDate),
      weight: checkin.weight,
    }));

    for (const checkin of checkinsAsc) {
      pointsByDate.set(checkin.checkinDate, checkin.weight);
    }

    const startDate = parseISO(checkinsAsc[0].checkinDate);
    const endDate = parseISO(checkinsAsc[checkinsAsc.length - 1].checkinDate);
    const days = differenceInCalendarDays(endDate, startDate);
    const rows: { date: string; weight: number | null; avg7: number | null }[] = [];

    for (let i = 0; i <= days; i++) {
      const day = addDays(startDate, i);
      const date = format(day, 'yyyy-MM-dd');
      const weight = pointsByDate.get(date) ?? null;
      const windowStart = addDays(day, -6);
      const windowValues = parsed
        .filter((entry) => entry.date >= windowStart && entry.date <= day)
        .map((entry) => entry.weight);
      const avg7 = windowValues.length > 0
        ? Number((windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length).toFixed(2))
        : null;
      rows.push({ date, weight, avg7 });
    }

    return rows;
  }, [checkinsAsc]);

  const compareLeft = useMemo(
    () => progressCheckins.find((checkin) => checkin.id === compareLeftId) ?? progressCheckins[0] ?? null,
    [progressCheckins, compareLeftId]
  );
  const compareRight = useMemo(() => {
    const selected = progressCheckins.find((checkin) => checkin.id === compareRightId) ?? null;
    if (selected && compareLeft && selected.id !== compareLeft.id) return selected;
    if (compareLeft) {
      return progressCheckins.find((checkin) => checkin.id !== compareLeft.id) ?? compareLeft;
    }
    return progressCheckins[0] ?? null;
  }, [progressCheckins, compareRightId, compareLeft]);

  const compareWeightDelta = compareLeft && compareRight ? compareRight.weight - compareLeft.weight : null;
  const compareImageA = compareLeft?.photos[0] ?? null;
  const compareImageB = compareRight?.photos[0] ?? null;
  const canCompareImages = Boolean(compareImageA && compareImageB);

  const handleCheckinPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    if (files.length + checkinPhotos.length > MAX_CHECKIN_PHOTOS) {
      setProgressError(`You can upload up to ${MAX_CHECKIN_PHOTOS} photos per check-in.`);
      event.target.value = '';
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setProgressError('Only image files are allowed.');
        event.target.value = '';
        return;
      }
      if (file.size > MAX_CHECKIN_IMAGE_BYTES) {
        setProgressError(`Each photo must be under ${Math.round(MAX_CHECKIN_IMAGE_BYTES / 1024)}KB.`);
        event.target.value = '';
        return;
      }
    }

    try {
      const encoded = await Promise.all(files.map((file) => fileToDataUrl(file)));
      setCheckinPhotos((previous) => [...previous, ...encoded].slice(0, MAX_CHECKIN_PHOTOS));
      setProgressError(null);
    } catch (imageError) {
      setProgressError((imageError as Error).message);
    } finally {
      event.target.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setCheckinPhotos((previous) => previous.filter((_, photoIndex) => photoIndex !== index));
  };

  const handleSubmitCheckin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProgressError(null);

    if (hasCurrentWeekCheckin) {
      setProgressError('This week already has a check-in.');
      return;
    }
    if (checkinPhotos.length === 0) {
      setProgressError('Add at least one photo.');
      return;
    }

    const weight = Number.parseFloat(checkinWeight);
    if (!Number.isFinite(weight) || weight <= 0) {
      setProgressError('Enter a valid weight.');
      return;
    }

    const waist = checkinWaist.trim() ? Number.parseFloat(checkinWaist) : undefined;
    if (waist !== undefined && (!Number.isFinite(waist) || waist <= 0)) {
      setProgressError('Enter a valid waist measurement or leave it blank.');
      return;
    }

    setSubmittingCheckin(true);
    try {
      const created = await progressApi.create({
        photos: checkinPhotos,
        weight,
        waist,
        note: checkinNote.trim() || undefined,
      });
      setProgressCheckins((previous) => [...previous, created].sort(sortCheckinsDesc));
      setCheckinWeight('');
      setCheckinWaist('');
      setCheckinNote('');
      setCheckinPhotos([]);
    } catch (submitError) {
      setProgressError((submitError as Error).message);
    } finally {
      setSubmittingCheckin(false);
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
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 z-10">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate('/')} className="p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Progress Tracker</h1>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Weekly Progress Check-In</h2>
              <p className="text-xs text-zinc-500">1-3 photos, weight, optional waist + note</p>
            </div>
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Lock size={14} />
              Private
            </span>
          </div>

          {hasCurrentWeekCheckin && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-200">
              This week already has a check-in.
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmitCheckin}>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs text-zinc-400">Weight (lbs)</span>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={checkinWeight}
                  onChange={(event) => setCheckinWeight(event.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                  placeholder="190.5"
                  disabled={hasCurrentWeekCheckin || submittingCheckin}
                  required
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-400">Waist (optional)</span>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={checkinWaist}
                  onChange={(event) => setCheckinWaist(event.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                  placeholder="34"
                  disabled={hasCurrentWeekCheckin || submittingCheckin}
                />
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-xs text-zinc-400">Weekly note (optional)</span>
              <textarea
                value={checkinNote}
                onChange={(event) => setCheckinNote(event.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm min-h-20"
                maxLength={1000}
                placeholder="Energy, sleep, stress, wins..."
                disabled={hasCurrentWeekCheckin || submittingCheckin}
              />
            </label>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400 block">Photos ({checkinPhotos.length}/{MAX_CHECKIN_PHOTOS})</label>
              <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-600 bg-zinc-900/50 px-3 py-4 text-sm cursor-pointer">
                <Camera size={16} className="text-zinc-400" />
                <span className="text-zinc-300">Upload check-in photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleCheckinPhotoChange}
                  className="hidden"
                  disabled={hasCurrentWeekCheckin || submittingCheckin || checkinPhotos.length >= MAX_CHECKIN_PHOTOS}
                />
              </label>
              {checkinPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {checkinPhotos.map((photo, index) => (
                    <div key={`${photo.slice(0, 32)}-${index}`} className="relative">
                      <img src={photo} alt={`Check-in ${index + 1}`} className="w-full h-24 rounded-lg object-cover" />
                      <button
                        type="button"
                        className="absolute top-1 right-1 rounded-full bg-black/70 text-white text-xs px-1.5 py-0.5"
                        onClick={() => handleRemovePhoto(index)}
                        disabled={hasCurrentWeekCheckin || submittingCheckin}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {progressError && (
              <p className="text-sm text-red-400">{progressError}</p>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={hasCurrentWeekCheckin || submittingCheckin}
            >
              {submittingCheckin ? 'Saving check-in...' : 'Save Weekly Check-In'}
            </button>
          </form>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-lg">Progress Timeline</h2>
          {progressCheckins.length === 0 ? (
            <p className="text-sm text-zinc-500">No check-ins yet. Add your first one above.</p>
          ) : (
            <div className="space-y-3">
              {progressCheckins.map((checkin) => {
                const deltaFromBaseline = baselineWeight === null ? 0 : checkin.weight - baselineWeight;
                const deltaClass = deltaFromBaseline < 0 ? 'text-emerald-400' : deltaFromBaseline > 0 ? 'text-rose-400' : 'text-zinc-400';
                return (
                  <div key={checkin.id} className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{format(parseISO(checkin.checkinDate), 'MMM d, yyyy')}</p>
                        <p className="text-sm text-zinc-400">
                          {checkin.weight.toFixed(1)} lbs
                          {checkin.waist ? ` • Waist ${checkin.waist.toFixed(1)}"` : ''}
                        </p>
                        <p className={`text-xs mt-1 ${deltaClass}`}>
                          Delta from baseline: {formatDelta(deltaFromBaseline)} lbs
                        </p>
                      </div>
                      {checkin.photos[0] && (
                        <img
                          src={checkin.photos[0]}
                          alt={`Check-in from ${checkin.checkinDate}`}
                          className="w-20 h-20 rounded-lg object-cover border border-zinc-700"
                        />
                      )}
                    </div>
                    {checkin.note && <p className="text-sm text-zinc-300 mt-3">{checkin.note}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-lg">Compare View</h2>
            <div className="inline-flex rounded-lg border border-zinc-700 p-1">
              <button
                type="button"
                className={`px-2.5 py-1 text-xs rounded-md ${compareMode === 'slider' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                onClick={() => setCompareMode('slider')}
              >
                Slider
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 text-xs rounded-md ${compareMode === 'toggle' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                onClick={() => setCompareMode('toggle')}
              >
                Toggle
              </button>
            </div>
          </div>

          {progressCheckins.length < 2 ? (
            <p className="text-sm text-zinc-500">Add at least two check-ins to compare.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs text-zinc-400">Check-in A</span>
                  <select
                    value={compareLeft?.id ?? ''}
                    onChange={(event) => setCompareLeftId(event.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                  >
                    {progressCheckins.map((checkin) => (
                      <option key={checkin.id} value={checkin.id}>
                        {format(parseISO(checkin.checkinDate), 'MMM d, yyyy')} ({checkin.weight.toFixed(1)} lbs)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-zinc-400">Check-in B</span>
                  <select
                    value={compareRight?.id ?? ''}
                    onChange={(event) => setCompareRightId(event.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                  >
                    {progressCheckins.map((checkin) => (
                      <option key={checkin.id} value={checkin.id}>
                        {format(parseISO(checkin.checkinDate), 'MMM d, yyyy')} ({checkin.weight.toFixed(1)} lbs)
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {compareLeft && compareRight && (
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-zinc-400">A: {format(parseISO(compareLeft.checkinDate), 'MMM d, yyyy')}</p>
                      <p>{compareLeft.weight.toFixed(1)} lbs</p>
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-400">B: {format(parseISO(compareRight.checkinDate), 'MMM d, yyyy')}</p>
                      <p>{compareRight.weight.toFixed(1)} lbs</p>
                    </div>
                  </div>
                  <div className="text-sm">
                    Weight change:
                    <span className={`ml-1 font-medium ${compareWeightDelta !== null && compareWeightDelta <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {compareWeightDelta !== null ? `${formatDelta(compareWeightDelta)} lbs` : 'N/A'}
                    </span>
                  </div>

                  {canCompareImages ? (
                    <>
                      <div className="relative h-56 rounded-xl overflow-hidden border border-zinc-700">
                        {compareMode === 'slider' ? (
                          <>
                            <img src={compareImageB || undefined} alt="Check-in B" className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${compareSlider}%` }}>
                              <img src={compareImageA || undefined} alt="Check-in A" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute top-0 bottom-0 w-0.5 bg-white/70" style={{ left: `${compareSlider}%` }} />
                          </>
                        ) : (
                          <img
                            src={showFirstImage ? compareImageA || undefined : compareImageB || undefined}
                            alt={showFirstImage ? 'Check-in A' : 'Check-in B'}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      {compareMode === 'slider' ? (
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={compareSlider}
                          onChange={(event) => setCompareSlider(Number.parseInt(event.target.value, 10))}
                          className="w-full"
                        />
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary w-full"
                          onClick={() => setShowFirstImage((previous) => !previous)}
                        >
                          Show {showFirstImage ? 'Check-in B' : 'Check-in A'}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-zinc-500">One of these check-ins is missing a photo.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-lg">Weight Trend</h2>
          {trendData.length === 0 ? (
            <p className="text-sm text-zinc-500">Trend appears after your first check-in.</p>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(parseISO(value), 'MMM d')}
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    labelFormatter={(label) => format(parseISO(String(label)), 'MMM d, yyyy')}
                    formatter={(value, name) => {
                      const label = name === 'avg7' ? '7-day average' : 'Daily weight';
                      if (typeof value !== 'number') {
                        return ['No entry', label];
                      }
                      return [`${value.toFixed(1)} lbs`, label];
                    }}
                  />
                  <Legend
                    formatter={(value) => (value === 'avg7' ? '7-day average' : 'Daily weight')}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 1 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="avg7"
                    stroke="#fb923c"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
