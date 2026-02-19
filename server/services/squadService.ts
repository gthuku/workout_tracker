import { v4 as uuidv4 } from 'uuid';
import { db } from '../database.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import type { CreateSquadInput, CreateChallengeInput } from '../schemas/index.js';

interface DbSquad {
  id: string;
  name: string;
  created_by: string;
  invite_code: string;
  created_at: string;
}

interface DbSquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

interface DbSquadInvite {
  id: string;
  squad_id: string;
  invited_by: string;
  invited_user_id: string;
  status: string;
  created_at: string;
}

interface DbMemberWithWorkout {
  user_id: string;
  display_name: string;
  avatar: string | null;
  workout_id: string | null;
  workout_name: string | null;
  is_complete: number | null;
  duration: number | null;
  photos: string | null;
  workout_created_at: string | null;
}

interface DbReactionCount {
  workout_id: string;
  reaction_type: string;
  count: number;
}

interface DbUserReaction {
  workout_id: string;
  reaction_type: string;
}

interface DbMemeReaction {
  workout_id: string;
  meme_url: string;
  reactor_name: string;
  reactor_avatar: string | null;
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

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const squadService = {
  async listUserSquads(userId: string) {
    const squads = await db.query<DbSquad & { role: string; member_count: number }>(
      `SELECT s.*, sm.role,
        (SELECT COUNT(*) FROM squad_members WHERE squad_id = s.id) as member_count
       FROM squads s
       JOIN squad_members sm ON s.id = sm.squad_id AND sm.user_id = $1
       ORDER BY sm.joined_at DESC`,
      [userId]
    );
    return squads.map(s => ({
      id: s.id,
      name: s.name,
      createdBy: s.created_by,
      inviteCode: s.invite_code,
      role: s.role,
      memberCount: s.member_count,
      createdAt: s.created_at,
    }));
  },

  async getSquadDashboard(userId: string, squadId: string, timezone?: string, period: 'today' | 'week' = 'today', date?: string) {
    // Verify user is a member
    const membership = await db.queryOne<DbSquadMember>(
      'SELECT * FROM squad_members WHERE squad_id = $1 AND user_id = $2',
      [squadId, userId]
    );
    if (!membership) {
      throw new ForbiddenError('You are not a member of this squad');
    }

    const squad = await db.queryOne<DbSquad>('SELECT * FROM squads WHERE id = $1', [squadId]);
    if (!squad) throw new NotFoundError('Squad not found');

    // Use provided date or calculate from timezone
    const targetDate = date || getDateInTimezone(timezone);

    // Compute start date for period
    let startDate: string;
    if (period === 'week') {
      // Get Monday of current week
      const d = new Date(targetDate + 'T00:00:00');
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d);
      monday.setDate(diff);
      startDate = monday.toISOString().split('T')[0];
    } else {
      startDate = targetDate;
    }

    if (period === 'week') {
      // Weekly view: show workout count + total volume per member
      const members = await db.query<{
        user_id: string; display_name: string; avatar: string | null;
        workout_count: number; total_volume: number; has_completed: number;
      }>(
        `SELECT
          u.id as user_id,
          COALESCE(u.display_name, u.username) as display_name,
          u.avatar,
          COUNT(DISTINCT CASE WHEN w.is_complete = 1 THEN w.id END) as workout_count,
          COALESCE(SUM(CASE WHEN w.is_complete = 1 THEN ws.reps * ws.weight ELSE 0 END), 0) as total_volume,
          CASE WHEN COUNT(DISTINCT CASE WHEN w.is_complete = 1 THEN w.id END) > 0 THEN 1 ELSE 0 END as has_completed
         FROM squad_members sm
         JOIN users u ON sm.user_id = u.id
         LEFT JOIN workouts w ON u.id = w.user_id AND DATE(w.date) >= DATE($1) AND DATE(w.date) <= DATE($2)
         LEFT JOIN workout_sets ws ON w.id = ws.workout_id
         WHERE sm.squad_id = $3
         GROUP BY u.id, u.display_name, u.username, u.avatar
         ORDER BY workout_count DESC, total_volume DESC`,
        [startDate, targetDate, squadId]
      );

      const completedCount = members.filter(m => m.has_completed === 1).length;
      const totalCount = members.length;

      const feed = members.map(m => ({
        userId: m.user_id,
        displayName: m.display_name,
        avatar: m.avatar,
        status: (m.workout_count > 0 ? 'done' : 'not_started') as 'done' | 'in_progress' | 'not_started',
        activity: m.workout_count > 0
          ? `${m.workout_count} workout${m.workout_count !== 1 ? 's' : ''} · ${Math.round(m.total_volume).toLocaleString()} lbs`
          : 'No workouts this week',
        workoutId: null,
        workoutCount: m.workout_count,
        totalVolume: Math.round(m.total_volume),
        photos: [] as string[],
        reactions: { fire: 0, clap: 0, eyes: 0 },
        hasUserReacted: { fire: false, clap: false, eyes: false },
        memeReactions: [] as { memeUrl: string; reactorName: string; reactorAvatar: string | null }[],
        timestamp: '',
      }));

      // Get challenges
      const challenges = await this.getSquadChallenges(userId, squadId, timezone);

      return {
        squad: {
          id: squad.id,
          name: squad.name,
          inviteCode: squad.invite_code,
          createdBy: squad.created_by,
        },
        dailyProgress: {
          completed: completedCount,
          total: totalCount,
          percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
        },
        feed,
        challenges,
      };
    }

    // Daily view (existing logic)
    const members = await db.query<DbMemberWithWorkout>(
      `SELECT
        u.id as user_id,
        COALESCE(u.display_name, u.username) as display_name,
        u.avatar,
        latest_w.id as workout_id,
        latest_w.name as workout_name,
        latest_w.is_complete,
        latest_w.duration,
        latest_w.photos,
        latest_w.created_at as workout_created_at
       FROM squad_members sm
       JOIN users u ON sm.user_id = u.id
       LEFT JOIN (
         SELECT ranked.*
         FROM (
           SELECT
             w.*,
             ROW_NUMBER() OVER (
               PARTITION BY w.user_id
               ORDER BY
                 CASE WHEN w.is_complete = 1 THEN 1 ELSE 0 END DESC,
                 datetime(w.created_at) DESC,
                 w.id DESC
             ) as rn
           FROM workouts w
           WHERE DATE(w.date) = DATE($1)
         ) ranked
         WHERE ranked.rn = 1
       ) latest_w ON u.id = latest_w.user_id
       WHERE sm.squad_id = $2
       ORDER BY
         CASE
           WHEN latest_w.is_complete = 1 THEN 0
           WHEN latest_w.id IS NOT NULL AND latest_w.is_complete = 0 THEN 1
           ELSE 2
         END,
         latest_w.created_at DESC`,
      [targetDate, squadId]
    );

    // Get reaction counts for today's workouts
    const workoutIds = members
      .filter(m => m.workout_id)
      .map(m => m.workout_id as string);

    let reactionCounts: DbReactionCount[] = [];
    let userReactions: DbUserReaction[] = [];
    let memeReactions: DbMemeReaction[] = [];

    if (workoutIds.length > 0) {
      const placeholders = workoutIds.map(() => '?').join(',');
      reactionCounts = await db.query<DbReactionCount>(
        `SELECT workout_id, reaction_type, COUNT(*) as count
         FROM squad_reactions
         WHERE workout_id IN (${placeholders}) AND reaction_type != 'meme'
         GROUP BY workout_id, reaction_type`,
        workoutIds
      );

      userReactions = await db.query<DbUserReaction>(
        `SELECT workout_id, reaction_type
         FROM squad_reactions
         WHERE workout_id IN (${placeholders}) AND reactor_user_id = ? AND reaction_type != 'meme'`,
        [...workoutIds, userId]
      );

      // Get meme reactions with reactor info
      memeReactions = await db.query<DbMemeReaction>(
        `SELECT sr.workout_id, sr.meme_url, COALESCE(u.display_name, u.username) as reactor_name, u.avatar as reactor_avatar
         FROM squad_reactions sr
         JOIN users u ON sr.reactor_user_id = u.id
         WHERE sr.workout_id IN (${placeholders}) AND sr.reaction_type = 'meme' AND sr.meme_url IS NOT NULL`,
        workoutIds
      );
    }

    // Build reaction lookup maps
    const reactionMap = new Map<string, { fire: number; clap: number; eyes: number }>();
    for (const rc of reactionCounts) {
      const key = rc.workout_id;
      if (!reactionMap.has(key)) reactionMap.set(key, { fire: 0, clap: 0, eyes: 0 });
      const entry = reactionMap.get(key)!;
      entry[rc.reaction_type as 'fire' | 'clap' | 'eyes'] = rc.count;
    }

    const userReactionMap = new Map<string, { fire: boolean; clap: boolean; eyes: boolean }>();
    for (const ur of userReactions) {
      const key = ur.workout_id;
      if (!userReactionMap.has(key)) userReactionMap.set(key, { fire: false, clap: false, eyes: false });
      userReactionMap.get(key)![ur.reaction_type as 'fire' | 'clap' | 'eyes'] = true;
    }

    // Build meme reactions lookup map
    const memeReactionMap = new Map<string, { memeUrl: string; reactorName: string; reactorAvatar: string | null }[]>();
    for (const mr of memeReactions) {
      if (!memeReactionMap.has(mr.workout_id)) memeReactionMap.set(mr.workout_id, []);
      memeReactionMap.get(mr.workout_id)!.push({
        memeUrl: mr.meme_url,
        reactorName: mr.reactor_name,
        reactorAvatar: mr.reactor_avatar,
      });
    }

    const completedCount = members.filter(m => m.is_complete === 1).length;
    const totalCount = members.length;

    // Check if viewing a past day
    const todayDate = getDateInTimezone(timezone);
    const isPastDay = targetDate < todayDate;

    const feed = members.map(m => {
      let status: 'done' | 'in_progress' | 'not_started';
      let activity: string;

      if (m.is_complete === 1) {
        status = 'done';
        const durationStr = m.duration ? ` (${m.duration}min)` : '';
        activity = `Finished: ${m.workout_name || 'Workout'}${durationStr}`;
      } else if (m.workout_id && m.is_complete === 0) {
        status = 'in_progress';
        activity = isPastDay ? 'Workout not completed' : `Currently: ${m.workout_name || 'Working out'}`;
      } else {
        status = 'not_started';
        activity = isPastDay ? 'No activity reported' : "Hasn't started yet";
      }

      const defaultReactions = { fire: 0, clap: 0, eyes: 0 };
      const defaultUserReacted = { fire: false, clap: false, eyes: false };

      // Parse photos JSON
      let photos: string[] = [];
      if (m.photos) {
        try {
          photos = JSON.parse(m.photos);
        } catch {
          photos = [];
        }
      }

      return {
        userId: m.user_id,
        displayName: m.display_name,
        avatar: m.avatar,
        status,
        activity,
        workoutId: m.workout_id,
        photos,
        reactions: m.workout_id ? (reactionMap.get(m.workout_id) || defaultReactions) : defaultReactions,
        hasUserReacted: m.workout_id ? (userReactionMap.get(m.workout_id) || defaultUserReacted) : defaultUserReacted,
        memeReactions: m.workout_id ? (memeReactionMap.get(m.workout_id) || []) : [],
        timestamp: m.workout_created_at || '',
      };
    });

    // Get challenges
    const challenges = await this.getSquadChallenges(userId, squadId, timezone);

    return {
      squad: {
        id: squad.id,
        name: squad.name,
        inviteCode: squad.invite_code,
        createdBy: squad.created_by,
      },
      dailyProgress: {
        completed: completedCount,
        total: totalCount,
        percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      },
      feed,
      challenges,
    };
  },

  async create(userId: string, input: CreateSquadInput) {
    const id = uuidv4();
    const inviteCode = generateInviteCode();
    const memberId = uuidv4();

    await db.execute(
      'INSERT INTO squads (id, name, created_by, invite_code) VALUES ($1, $2, $3, $4)',
      [id, input.name, userId, inviteCode]
    );

    await db.execute(
      'INSERT INTO squad_members (id, squad_id, user_id, role) VALUES ($1, $2, $3, $4)',
      [memberId, id, userId, 'owner']
    );

    logger.info({ squadId: id, userId }, 'Squad created');
    return { id, name: input.name, inviteCode, createdBy: userId, role: 'owner', memberCount: 1 };
  },

  async searchUsers(query: string, excludeSquadId?: string) {
    let sql = `SELECT id, username, COALESCE(display_name, username) as display_name, avatar
               FROM users`;
    const params: string[] = [];

    if (query) {
      sql += ` WHERE (display_name LIKE $1 OR username LIKE $1)`;
      params.push(`%${query}%`);
    } else {
      sql += ` WHERE 1=1`;
    }

    if (excludeSquadId) {
      const paramIdx = params.length + 1;
      sql += ` AND id NOT IN (SELECT user_id FROM squad_members WHERE squad_id = $${paramIdx})`;
      params.push(excludeSquadId);
    }

    sql += ' ORDER BY display_name ASC LIMIT 50';

    const users = await db.query<{ id: string; username: string; display_name: string; avatar: string | null }>(sql, params);
    return users.map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      avatar: u.avatar,
    }));
  },

  async inviteUser(inviterId: string, squadId: string, invitedUserId: string) {
    // Verify inviter is a member
    const membership = await db.queryOne<DbSquadMember>(
      'SELECT * FROM squad_members WHERE squad_id = $1 AND user_id = $2',
      [squadId, inviterId]
    );
    if (!membership) throw new ForbiddenError('You are not a member of this squad');

    // Check if user is already a member
    const existingMember = await db.queryOne<DbSquadMember>(
      'SELECT * FROM squad_members WHERE squad_id = $1 AND user_id = $2',
      [squadId, invitedUserId]
    );
    if (existingMember) throw new ConflictError('User is already a member');

    // Check for existing pending invite
    const existingInvite = await db.queryOne<DbSquadInvite>(
      "SELECT * FROM squad_invites WHERE squad_id = $1 AND invited_user_id = $2 AND status = 'pending'",
      [squadId, invitedUserId]
    );
    if (existingInvite) throw new ConflictError('Invite already sent');

    const id = uuidv4();
    await db.execute(
      'INSERT INTO squad_invites (id, squad_id, invited_by, invited_user_id) VALUES ($1, $2, $3, $4)',
      [id, squadId, inviterId, invitedUserId]
    );

    logger.info({ inviteId: id, squadId, invitedUserId }, 'Squad invite sent');
    return { id, squadId, invitedUserId, status: 'pending' };
  },

  async listInvites(userId: string) {
    const invites = await db.query<DbSquadInvite & { squad_name: string; inviter_name: string }>(
      `SELECT si.*, s.name as squad_name,
        COALESCE(u.display_name, u.username) as inviter_name
       FROM squad_invites si
       JOIN squads s ON si.squad_id = s.id
       JOIN users u ON si.invited_by = u.id
       WHERE si.invited_user_id = $1 AND si.status = 'pending'
       ORDER BY si.created_at DESC`,
      [userId]
    );
    return invites.map(i => ({
      id: i.id,
      squadId: i.squad_id,
      squadName: i.squad_name,
      invitedBy: i.invited_by,
      inviterName: i.inviter_name,
      status: i.status,
      createdAt: i.created_at,
    }));
  },

  async respondToInvite(userId: string, inviteId: string, accept: boolean) {
    const invite = await db.queryOne<DbSquadInvite>(
      "SELECT * FROM squad_invites WHERE id = $1 AND invited_user_id = $2 AND status = 'pending'",
      [inviteId, userId]
    );
    if (!invite) throw new NotFoundError('Invite not found');

    const newStatus = accept ? 'accepted' : 'declined';
    await db.execute('UPDATE squad_invites SET status = $1 WHERE id = $2', [newStatus, inviteId]);

    if (accept) {
      const memberId = uuidv4();
      await db.execute(
        'INSERT INTO squad_members (id, squad_id, user_id, role) VALUES ($1, $2, $3, $4)',
        [memberId, invite.squad_id, userId, 'member']
      );
      logger.info({ inviteId, squadId: invite.squad_id, userId }, 'Squad invite accepted');
    } else {
      logger.info({ inviteId, userId }, 'Squad invite declined');
    }

    return { success: true, accepted: accept };
  },

  async joinByCode(userId: string, code: string) {
    const squad = await db.queryOne<DbSquad>(
      'SELECT * FROM squads WHERE invite_code = $1',
      [code.toUpperCase()]
    );
    if (!squad) throw new NotFoundError('Invalid invite code');

    const existingMember = await db.queryOne<DbSquadMember>(
      'SELECT * FROM squad_members WHERE squad_id = $1 AND user_id = $2',
      [squad.id, userId]
    );
    if (existingMember) throw new ConflictError('Already a member of this squad');

    const memberId = uuidv4();
    await db.execute(
      'INSERT INTO squad_members (id, squad_id, user_id, role) VALUES ($1, $2, $3, $4)',
      [memberId, squad.id, userId, 'member']
    );

    logger.info({ squadId: squad.id, userId }, 'Joined squad via code');
    return { id: squad.id, name: squad.name, inviteCode: squad.invite_code };
  },

  async getSquadWorkout(userId: string, workoutId: string) {
    // Check if the requesting user shares a squad with the workout owner
    const workout = await db.queryOne<{ id: string; user_id: string; name: string; date: string; duration: number | null; notes: string | null; is_complete: number; created_at: string }>(
      'SELECT * FROM workouts WHERE id = $1',
      [workoutId]
    );
    if (!workout) throw new NotFoundError('Workout not found');

    // Check if requesting user shares a squad with the workout owner
    const sharedSquad = await db.queryOne(
      `SELECT 1 FROM squad_members sm1
       JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id
       WHERE sm1.user_id = $1 AND sm2.user_id = $2`,
      [userId, workout.user_id]
    );
    if (!sharedSquad && workout.user_id !== userId) {
      throw new ForbiddenError('You are not in a squad with this user');
    }

    // Get workout owner info
    const owner = await db.queryOne<{ display_name: string; username: string }>(
      'SELECT COALESCE(display_name, username) as display_name, username FROM users WHERE id = $1',
      [workout.user_id]
    );

    // Get sets with exercise data
    const sets = await db.query<{
      id: string; workout_id: string; exercise_id: string; set_number: number;
      reps: number | null; weight: number | null; duration: number | null;
      created_at: string; name: string; primary_muscles: string; equipment: string;
    }>(
      `SELECT ws.*, e.name, e.primary_muscles, e.equipment
       FROM workout_sets ws
       JOIN exercises e ON ws.exercise_id = e.id
       WHERE ws.workout_id = $1
       ORDER BY ws.set_number`,
      [workoutId]
    );

    return {
      id: workout.id,
      userId: workout.user_id,
      ownerName: owner?.display_name || 'Unknown',
      name: workout.name,
      date: workout.date,
      duration: workout.duration,
      notes: workout.notes,
      isComplete: workout.is_complete === 1,
      createdAt: workout.created_at,
      sets: sets.map(s => ({
        id: s.id,
        workoutId: s.workout_id,
        exerciseId: s.exercise_id,
        setNumber: s.set_number,
        reps: s.reps,
        weight: s.weight,
        duration: s.duration,
        createdAt: s.created_at,
        exerciseName: s.name,
        primaryMuscles: JSON.parse(s.primary_muscles || '[]'),
        equipment: s.equipment,
      })),
    };
  },

  async addReaction(userId: string, workoutId: string, reactionType: string, memeUrl?: string) {
    if (reactionType === 'meme' && memeUrl) {
      // For meme reactions, check if this exact meme URL already exists from this user
      const existing = await db.queryOne(
        'SELECT id FROM squad_reactions WHERE workout_id = $1 AND reactor_user_id = $2 AND reaction_type = $3 AND meme_url = $4',
        [workoutId, userId, reactionType, memeUrl]
      );
      if (existing) return { success: true };

      const id = uuidv4();
      await db.execute(
        'INSERT INTO squad_reactions (id, workout_id, reactor_user_id, reaction_type, meme_url) VALUES ($1, $2, $3, $4, $5)',
        [id, workoutId, userId, reactionType, memeUrl]
      );
    } else {
      // Standard emoji reactions
      const existing = await db.queryOne(
        'SELECT id FROM squad_reactions WHERE workout_id = $1 AND reactor_user_id = $2 AND reaction_type = $3',
        [workoutId, userId, reactionType]
      );
      if (existing) return { success: true };

      const id = uuidv4();
      await db.execute(
        'INSERT INTO squad_reactions (id, workout_id, reactor_user_id, reaction_type) VALUES ($1, $2, $3, $4)',
        [id, workoutId, userId, reactionType]
      );
    }
    return { success: true };
  },

  async removeReaction(userId: string, workoutId: string, reactionType: string, memeUrl?: string) {
    if (reactionType === 'meme' && memeUrl) {
      await db.execute(
        'DELETE FROM squad_reactions WHERE workout_id = $1 AND reactor_user_id = $2 AND reaction_type = $3 AND meme_url = $4',
        [workoutId, userId, reactionType, memeUrl]
      );
    } else {
      await db.execute(
        'DELETE FROM squad_reactions WHERE workout_id = $1 AND reactor_user_id = $2 AND reaction_type = $3',
        [workoutId, userId, reactionType]
      );
    }
    return { success: true };
  },

  async createChallenge(userId: string, squadId: string, input: CreateChallengeInput) {
    const membership = await db.queryOne<DbSquadMember>(
      'SELECT * FROM squad_members WHERE squad_id = $1 AND user_id = $2',
      [squadId, userId]
    );
    if (!membership) throw new ForbiddenError('You are not a member of this squad');

    const id = uuidv4();
    await db.execute(
      `INSERT INTO squad_challenges (id, squad_id, created_by, exercise_id, target_sets, target_reps, target_weight, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, squadId, userId, input.exerciseId, input.targetSets, input.targetReps, input.targetWeight ?? null, input.deadline]
    );

    logger.info({ challengeId: id, squadId, userId }, 'Challenge created');
    return { id };
  },

  async completeChallenge(userId: string, challengeId: string) {
    const challenge = await db.queryOne<{ id: string; squad_id: string; created_by: string; status: string; deadline: string }>(
      'SELECT id, squad_id, created_by, status, deadline FROM squad_challenges WHERE id = $1',
      [challengeId]
    );
    if (!challenge) throw new NotFoundError('Challenge not found');

    // Challenge creator cannot complete their own challenge
    if (challenge.created_by === userId) {
      throw new ForbiddenError('You cannot complete your own challenge');
    }

    // Verify membership
    const membership = await db.queryOne<DbSquadMember>(
      'SELECT * FROM squad_members WHERE squad_id = $1 AND user_id = $2',
      [challenge.squad_id, userId]
    );
    if (!membership) throw new ForbiddenError('You are not a member of this squad');

    if (challenge.status === 'expired') throw new ConflictError('Challenge has expired');

    // Check deadline
    const today = new Date().toISOString().split('T')[0];
    if (challenge.deadline < today) {
      await db.execute("UPDATE squad_challenges SET status = 'expired' WHERE id = $1", [challengeId]);
      throw new ConflictError('Challenge has expired');
    }

    const id = uuidv4();
    try {
      await db.execute(
        'INSERT INTO squad_challenge_completions (id, challenge_id, user_id) VALUES ($1, $2, $3)',
        [id, challengeId, userId]
      );
    } catch {
      throw new ConflictError('Already completed this challenge');
    }

    logger.info({ challengeId, userId }, 'Challenge completed');
    return { success: true };
  },

  async deleteChallenge(userId: string, challengeId: string) {
    const challenge = await db.queryOne<{ id: string; squad_id: string; created_by: string }>(
      'SELECT id, squad_id, created_by FROM squad_challenges WHERE id = $1',
      [challengeId]
    );
    if (!challenge) throw new NotFoundError('Challenge not found');

    // Only the creator can delete
    if (challenge.created_by !== userId) {
      throw new ForbiddenError('Only the challenge creator can delete it');
    }

    await db.execute('DELETE FROM squad_challenges WHERE id = $1', [challengeId]);
    logger.info({ challengeId, userId }, 'Challenge deleted');
    return { success: true };
  },

  async getSquadChallenges(userId: string, squadId: string, timezone?: string) {
    const today = getDateInTimezone(timezone);

    // Auto-expire past-deadline challenges
    await db.execute(
      "UPDATE squad_challenges SET status = 'expired' WHERE squad_id = $1 AND status = 'active' AND deadline < $2",
      [squadId, today]
    );

    // Get active + recently expired (last 7 days)
    const sevenDaysAgo = new Date(new Date(today).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const challenges = await db.query<{
      id: string; squad_id: string; created_by: string; exercise_id: string;
      target_sets: number; target_reps: number; target_weight: number | null;
      deadline: string; status: string; created_at: string;
      creator_name: string; exercise_name: string;
    }>(
      `SELECT sc.*,
        COALESCE(u.display_name, u.username) as creator_name,
        e.name as exercise_name
       FROM squad_challenges sc
       JOIN users u ON sc.created_by = u.id
       JOIN exercises e ON sc.exercise_id = e.id
       WHERE sc.squad_id = $1 AND (sc.status = 'active' OR (sc.status = 'expired' AND sc.deadline >= $2))
       ORDER BY sc.status ASC, sc.deadline ASC`,
      [squadId, sevenDaysAgo]
    );

    // Get completions for these challenges
    const challengeIds = challenges.map(c => c.id);
    let completions: { challenge_id: string; user_id: string; display_name: string; avatar: string | null; completed_at: string }[] = [];

    if (challengeIds.length > 0) {
      const placeholders = challengeIds.map(() => '?').join(',');
      completions = await db.query<{ challenge_id: string; user_id: string; display_name: string; avatar: string | null; completed_at: string }>(
        `SELECT scc.challenge_id, scc.user_id, COALESCE(u.display_name, u.username) as display_name, u.avatar, scc.completed_at
         FROM squad_challenge_completions scc
         JOIN users u ON scc.user_id = u.id
         WHERE scc.challenge_id IN (${placeholders})`,
        challengeIds
      );
    }

    // Get total member count (excluding challenge creator for each challenge)
    const memberCount = await db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM squad_members WHERE squad_id = $1',
      [squadId]
    );
    const totalMembersBase = memberCount?.count || 0;

    const completionMap = new Map<string, { userId: string; displayName: string; avatar: string | null; completedAt: string }[]>();
    for (const c of completions) {
      if (!completionMap.has(c.challenge_id)) completionMap.set(c.challenge_id, []);
      completionMap.get(c.challenge_id)!.push({
        userId: c.user_id,
        displayName: c.display_name,
        avatar: c.avatar,
        completedAt: c.completed_at,
      });
    }

    return challenges.map(c => ({
      id: c.id,
      squadId: c.squad_id,
      createdBy: c.created_by,
      creatorName: c.creator_name,
      exerciseId: c.exercise_id,
      exerciseName: c.exercise_name,
      targetSets: c.target_sets,
      targetReps: c.target_reps,
      targetWeight: c.target_weight,
      deadline: c.deadline,
      status: c.status as 'active' | 'expired',
      completions: completionMap.get(c.id) || [],
      hasUserCompleted: (completionMap.get(c.id) || []).some(comp => comp.userId === userId),
      // Exclude challenge creator from challengees count
      totalMembers: Math.max(0, totalMembersBase - 1),
      createdAt: c.created_at,
    }));
  },

  async leaveSquad(userId: string, squadId: string) {
    const membership = await db.queryOne<DbSquadMember>(
      'SELECT * FROM squad_members WHERE squad_id = $1 AND user_id = $2',
      [squadId, userId]
    );
    if (!membership) throw new NotFoundError('You are not a member of this squad');

    // If owner, check if there are other members to transfer ownership
    if (membership.role === 'owner') {
      const otherMembers = await db.query<DbSquadMember>(
        'SELECT * FROM squad_members WHERE squad_id = $1 AND user_id != $2 ORDER BY joined_at ASC LIMIT 1',
        [squadId, userId]
      );
      if (otherMembers.length > 0) {
        // Transfer ownership to the earliest member
        await db.execute(
          'UPDATE squad_members SET role = $1 WHERE id = $2',
          ['owner', otherMembers[0].id]
        );
      } else {
        // Last member — delete the squad entirely
        await db.execute('DELETE FROM squads WHERE id = $1', [squadId]);
        logger.info({ squadId, userId }, 'Squad deleted (last member left)');
        return { success: true, deleted: true };
      }
    }

    await db.execute(
      'DELETE FROM squad_members WHERE squad_id = $1 AND user_id = $2',
      [squadId, userId]
    );
    logger.info({ squadId, userId }, 'Left squad');
    return { success: true, deleted: false };
  },
};
