export type ExerciseMode = 'NORMAL' | 'BILATERAL';
export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED';
export type ThemeMode = 'system' | 'light' | 'dark';

export type Exercise = {
  id: number;
  name: string;
  mode: ExerciseMode;
  sortOrder: number;
  archived: boolean;
};

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
export type Room = { id: string; name: string; code: string; memberCount?: number };
export type RoomPost = {
  id: string;
  authorName: string;
  createdAt: string;
  presetName?: string;
  exercises: Array<{ name: string; sets: Array<{ weightKg?: number; reps?: number; order: number; side?: string }> }>;
};

export type AppState = {
  nextId: number;
  exercises: Exercise[];
  sessions: WorkoutSession[];
  sets: WorkoutSet[];
  presets: WorkoutPreset[];
  selectedPresetId?: string;
  themeMode: ThemeMode;
  weekStartsMonday: boolean;
  weightStepKg: number;
  restDurationSeconds: number;
  visibleAchievementMetrics: string[];
  roomIdentity?: RoomIdentity;
  rooms: Room[];
  activeRoomId?: string;
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
};
