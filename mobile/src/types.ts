export type ExerciseMode = 'NORMAL' | 'BILATERAL';
export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED';
export type ThemeMode = 'system' | 'light' | 'dark';

export type Exercise = {
  id: number;
  name: string;
  mode: ExerciseMode;
  sortOrder: number;
  archived: boolean;
  muscleGroup?: string;
};

export type BodyMeasurement = { id: string; measuredAt: string; weightKg?: number; bodyFatPercent?: number; heightCm?: number };

export type WorkoutSession = {
  id: number;
  startedAt: string;
  endedAt?: string;
  status: SessionStatus;
  presetId?: string;
};

export type WorkoutSet = {
  id: number;
  sessionId: number;
  exerciseId: number;
  setOrder: number;
  normalWeightKg?: number;
  normalReps?: number;
  leftWeightKg?: number;
  leftReps?: number;
  rightWeightKg?: number;
  rightReps?: number;
  leftCompleted: boolean;
  rightCompleted: boolean;
  isCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PresetExerciseConfig = {
  exerciseId: number;
  weightKg?: number;
  leftWeightKg?: number;
  rightWeightKg?: number;
  reps?: number;
  sets: number;
};

export type WorkoutPreset = {
  id: string;
  name: string;
  exercises: PresetExerciseConfig[];
};

export type RoomIdentity = { id: string; name: string; token: string };
export type Room = {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  memberCount: number;
  sharingSince?: string | null;
  memberNames?: string[];
};
export type SharedWorkout = {
  clientId: string;
  legacyClientId?: string;
  presetName: string;
  startedAt: string;
  endedAt: string;
  durationMinutes?: number;
  exercises: {
    name: string;
    sets: { weightKg?: number; reps: number; order: number; side?: string }[];
  }[];
};
export type RoomPost = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  workout: SharedWorkout;
  automatic?: boolean;
};
export type RoomDetail = {
  members: { id: string; name: string }[];
  posts: RoomPost[];
  nextCursor?: string | null;
};
export type PendingPost = { roomId: string; workout: SharedWorkout };
export type RoomComparison = {
  month: string;
  rankings: { id: string; name: string; sets: number; rank: number }[];
  posts: RoomPost[];
  nextCursor?: string | null;
};
export type WorkoutCard = { setId: number; side?: 'left' | 'right' };
export type WorkoutProgress = {
  sessionId: number;
  exerciseOrder: number[];
  card?: WorkoutCard;
  history: { card: WorkoutCard; set: WorkoutSet }[];
  restStartedAt?: number;
  restEndsAt?: number;
};

export type AppState = {
  cloud?: import('./sync').CloudState;
  loginPromptDismissed?: boolean;
  nextId: number;
  exercises: Exercise[];
  bodyMeasurements?: BodyMeasurement[];
  heightCm?: number;
  sessions: WorkoutSession[];
  sets: WorkoutSet[];
  presets: WorkoutPreset[];
  selectedPresetId?: string;
  homeGrowthExerciseId?: number;
  themeMode: ThemeMode;
  weekStartsMonday: boolean;
  weightStepKg: number;
  restDurationSeconds: number;
  visibleAchievementMetrics: string[];
  exerciseWeightSteps: Record<number, number>;
  exerciseRestDurations: Record<number, number>;
  sideSwitchRestExerciseIds: number[];
  leftFirstExerciseIds: number[];
  workout?: WorkoutProgress;
  installationId: string;
  pendingPosts: PendingPost[];
  roomDetails: Record<string, RoomDetail>;
  roomIdentity?: RoomIdentity;
  rooms: Room[];
  activeRoomId?: string;
  automaticRoomReceipts?: Record<string, Record<string, string>>;
};

export type AchievementSummary = {
  big3: number | undefined;
  streakWeeks: number;
  trainingDays: number;
  completedSets: number;
  recordHistoryDays: number;
  liftedWeightKg: number;
  totalRepetitions: number;
  personalBestUpdates: number;
  big3Lifts: { bench: number; squat: number; deadlift: number };
  recordHistoryLabel: string;
};
