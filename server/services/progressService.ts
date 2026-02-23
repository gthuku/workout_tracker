import { v4 as uuidv4 } from 'uuid';
import { db } from '../database.js';
import { ConflictError } from '../middleware/errorHandler.js';

interface DbProgressCheckin {
  id: string;
  user_id: string;
  checkin_date: string;
  week_start_date: string;
  weight: number;
  waist: number | null;
  note: string | null;
  photos: string;
  is_private: number;
  created_at: string;
}

interface CreateProgressCheckinInput {
  photos: string[];
  weight: number;
  waist?: number;
  note?: string;
  timezone?: string;
}

function getDateInTimezone(timezone?: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return new Date().toISOString().split('T')[0];
  }

  return `${year}-${month}-${day}`;
}

function getWeekStartDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map((part) => Number.parseInt(part, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay(); // Sunday = 0
  const delta = weekday === 0 ? -6 : 1 - weekday; // Week starts Monday
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().split('T')[0];
}

function parsePhotos(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export const progressService = {
  async list(userId: string) {
    const rows = await db.query<DbProgressCheckin>(
      `SELECT *
       FROM progress_checkins
       WHERE user_id = $1
       ORDER BY checkin_date DESC, created_at DESC`,
      [userId]
    );

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      checkinDate: row.checkin_date,
      weekStartDate: row.week_start_date,
      weight: row.weight,
      waist: row.waist,
      note: row.note,
      photos: parsePhotos(row.photos),
      isPrivate: row.is_private === 1,
      createdAt: row.created_at,
    }));
  },

  async create(userId: string, input: CreateProgressCheckinInput) {
    const checkinDate = getDateInTimezone(input.timezone);
    const weekStartDate = getWeekStartDate(checkinDate);
    const createdAt = new Date().toISOString();

    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM progress_checkins WHERE user_id = $1 AND week_start_date = $2',
      [userId, weekStartDate]
    );
    if (existing) {
      throw new ConflictError('Weekly check-in already exists for this week');
    }

    const id = uuidv4();
    await db.execute(
      `INSERT INTO progress_checkins
        (id, user_id, checkin_date, week_start_date, weight, waist, note, photos, is_private)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)`,
      [
        id,
        userId,
        checkinDate,
        weekStartDate,
        input.weight,
        input.waist ?? null,
        input.note?.trim() || null,
        JSON.stringify(input.photos),
      ]
    );

    return {
      id,
      userId,
      checkinDate,
      weekStartDate,
      weight: input.weight,
      waist: input.waist ?? null,
      note: input.note?.trim() || null,
      photos: input.photos,
      isPrivate: true,
      createdAt,
    };
  },
};
