import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Activity input is required'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  const objectIdPattern = /^[a-f\d]{24}$/i;
  if (
    typeof userId !== 'string' || !objectIdPattern.test(userId) ||
    typeof teamId !== 'string' || !objectIdPattern.test(teamId) ||
    typeof type !== 'string' || !type.trim() ||
    typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0
  ) {
    throw Object.assign(new Error('Activity input is invalid'), { status: 400 });
  }

  const [user, team] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 404 });
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Team input is required'), { status: 400 });
  }

  const { name, mascot, members } = input as Record<string, unknown>;
  const objectIdPattern = /^[a-f\d]{24}$/i;
  if (typeof name !== 'string' || !name.trim()) {
    throw Object.assign(new Error('Team name is required'), { status: 400 });
  }
  if (typeof mascot !== 'string' || !mascot.trim()) {
    throw Object.assign(new Error('Team mascot is required'), { status: 400 });
  }
  if (members !== undefined && (!Array.isArray(members) || !members.every((member) => typeof member === 'string' && objectIdPattern.test(member)))) {
    throw Object.assign(new Error('Team members must be valid user IDs'), { status: 400 });
  }

  const memberIds = (members ?? []) as string[];
  const existingMembers = await User.countDocuments({ _id: { $in: memberIds } });
  if (existingMembers !== new Set(memberIds).size) {
    throw Object.assign(new Error('One or more team members were not found'), { status: 400 });
  }

  return Team.create({ name, mascot, members: memberIds });
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map((total) => [String(total._id), total.totalPoints]));

  return teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: pointsByTeam.get(String(team._id)) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User was not found'), { status: 404 });
  }

  const [recentActivity, workouts] = await Promise.all([
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
    Workout.find().lean(),
  ]);
  const goal = user.fitnessGoal?.trim().toLowerCase() ?? '';
  const activityType = recentActivity?.type.trim().toLowerCase() ?? '';

  return workouts
    .map((workout, index) => {
      const matchesGoal = workout.focus.trim().toLowerCase() === goal;
      const matchesActivity = workout.focus.trim().toLowerCase() === activityType;
      return { workout, index, matchesGoal, matchesActivity };
    })
    .sort((left, right) => Number(right.matchesGoal) - Number(left.matchesGoal)
      || Number(right.matchesActivity) - Number(left.matchesActivity)
      || left.index - right.index)
    .map(({ workout, matchesGoal, matchesActivity }) => ({
      ...workout,
      reason: matchesGoal
        ? `Matches your ${user.fitnessGoal} fitness goal.`
        : matchesActivity && recentActivity
          ? `Builds on your recent ${recentActivity.type} activity.`
          : `Recommended to support your ${user.fitnessGoal} fitness goal.`,
    }));
}

export { User };
