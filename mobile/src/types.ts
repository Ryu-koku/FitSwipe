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
  custom?: boolean;
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
  finalSkippedSide?: 'normal' | 'left' | 'right';
  skippedInputs?: Partial<Record<'normal' | 'left' | 'right', { weightKg?: number; reps?: number }>>;
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
  color?: string;
  exercises: PresetExerciseConfig[];
};

export type RoomIdentity = { id: string; name: string; avatar?: string | null; token: string };
export type Room = {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  memberCount: number;
  competitive?: boolean; // Older servers and saved rooms default to competitive.
  sharingSince?: string | null;
  memberNames?: string[];
  memberProfiles?: { name: string; avatar?: string | null }[];
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
  members: { id: string; name: string; avatar?: string | null }[];
  posts: RoomPost[];
  nextCursor?: string | null;
};
export type PendingPost = { roomId: string; workout: SharedWorkout };
export type RoomComparison = {
  month: string;
  memberId?: string | null;
  fetchedAt?: string;
  rankings: { id: string; name: string; avatar?: string | null; sets: number; rank: number }[];
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
  exerciseCatalogVersion?: number;
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
  homeProgress?: import('./home-progress').ProgressPreferences;
  homeDisplay?: import('./home-display').HomeDisplay;
  themeMode: ThemeMode;
  weekStartsMonday: boolean;
  weightUnit: "kg" | "lb";
  weightStepKg: number;
  restDurationSeconds: number;
  visibleAchievementMetrics: string[];
  exerciseWeightSteps: Record<number, number>;
  exerciseRestDurations: Record<number, number>;
  /** Disable rest timers for every exercise; defaults to false. */
  restTimerDisabled: boolean;
  sideSwitchRestExerciseIds: number[];
  leftFirstExerciseIds: number[];
  workout?: WorkoutProgress;
  installationId: string;
  pendingPosts: PendingPost[];
  roomDetails: Record<string, RoomDetail>;
  roomIdentity?: RoomIdentity;
  rooms: Room[];
  activeRoomId?: string;
  automaticRoomStatus?: Record<string, { accountId: string; checkedAt: string; used?: number; limit?: number; issues: { clientId?: string; label: string; message: string; retryable: boolean }[] }>;
  automaticRoomReceipts?: Record<string, Record<string, string>>;
};

export type AchievementSummary = {
  big3: number | undefined;
  streakWeeks: number;
  longestStreakWeeks: number;
  trainingDays: number;
  completedSets: number;
  recordHistoryDays: number;
  liftedWeightKg: number;
  totalRepetitions: number;
  personalBestUpdates: number;
  big3Lifts: { bench: number; squat: number; deadlift: number };
  recordHistoryLabel: string;
};
