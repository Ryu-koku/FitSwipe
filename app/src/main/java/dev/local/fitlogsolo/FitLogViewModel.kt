package dev.local.fitlogsolo

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import dev.local.fitlogsolo.data.ExerciseEntity
import dev.local.fitlogsolo.data.CompletedTrainingSet
import dev.local.fitlogsolo.data.ExerciseMode
import dev.local.fitlogsolo.data.FitLogRepository
import dev.local.fitlogsolo.data.SessionStatus
import dev.local.fitlogsolo.data.RoomsRepository
import org.json.JSONArray
import org.json.JSONObject
import dev.local.fitlogsolo.data.WorkoutPreferences
import dev.local.fitlogsolo.data.WorkoutPreset
import dev.local.fitlogsolo.data.WorkoutSetEntity
import dev.local.fitlogsolo.data.exerciseTrainingDefault
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.withLock

enum class WorkoutPlace(val label: String, val presetExerciseNames: List<String>) {
    GYM("ジム", listOf("ベンチプレス", "ラットプルダウン", "レッグプレス")),
    HOME("家", listOf("スクワット", "腕立て伏せ", "プランク")),
}

class FitLogViewModel(
    private val repository: FitLogRepository,
    private val workoutPreferences: WorkoutPreferences,
    val rooms: RoomsRepository,
) : ViewModel() {
    val exercises = repository.observeExercises().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val allExercises = repository.observeAllExercises().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val activeSession = repository.observeInProgressSession().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)
    val completedSessions = repository.observeCompletedSessions().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val completedTrainingSets: StateFlow<List<CompletedTrainingSet>?> = repository.observeCompletedTrainingSets()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)
    val weekStartsMonday = workoutPreferences.weekStartsMonday
    val weightStepKg = workoutPreferences.weightStepKg
    val exerciseWeightSteps = workoutPreferences.exerciseWeightSteps
    val restDurationSeconds = workoutPreferences.restDurationSeconds
    val exerciseRestDurations = workoutPreferences.exerciseRestDurations
    val sideSwitchRestExerciseIds = workoutPreferences.sideSwitchRestExerciseIds
    val leftFirstExerciseIds = workoutPreferences.leftFirstExerciseIds
    val gymPresetExerciseIds = workoutPreferences.gymPresetExerciseIds
    val homePresetExerciseIds = workoutPreferences.homePresetExerciseIds
    val presets = workoutPreferences.presets
    val selectedPresetId = workoutPreferences.selectedPresetId
    fun selectPreset(id: String) = workoutPreferences.selectPreset(id)
    private val startMutex = kotlinx.coroutines.sync.Mutex()

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    fun sessionSets(sessionId: Long): StateFlow<List<WorkoutSetEntity>> =
        repository.observeSets(sessionId).stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    suspend fun historySets(sessionIds: List<Long>): List<WorkoutSetEntity> =
        sessionIds.flatMap { sessionId -> repository.observeSets(sessionId).first() }

    fun exerciseSets(sessionId: Long, exerciseId: Long): StateFlow<List<WorkoutSetEntity>> =
        repository.observeExerciseSets(sessionId, exerciseId).stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun previousWorkoutSets(sessionId: Long, exerciseId: Long): StateFlow<List<WorkoutSetEntity>> =
        repository.observePreviousWorkoutSets(sessionId, exerciseId)
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun startSession(onReady: (Long) -> Unit = {}) = viewModelScope.launch {
        onReady(repository.startOrResumeSession())
    }

    fun startExercise(exercise: ExerciseEntity, onReady: (Long) -> Unit = {}) = viewModelScope.launch {
        val sessionId = repository.startOrResumeSession()
        repository.ensureSet(sessionId, exercise)
        onReady(sessionId)
    }

    fun startPreset(
        preset: WorkoutPreset,
        onFailed: () -> Unit = {},
        onReady: (Long, List<Long>) -> Unit = { _, _ -> },
    ) = viewModelScope.launch {
        startMutex.withLock {
            runCatching {
                val (sessionId, exerciseIds) = repository.startPresetSession(preset)
                workoutPreferences.selectPreset(repository.observeSession(sessionId).first()?.presetId ?: preset.id)
                onReady(sessionId, exerciseIds)
            }.onFailure {
                if (it is kotlinx.coroutines.CancellationException) throw it
                _message.value = it.message ?: "開始できませんでした"
                onFailed()
            }
        }
    }

    fun resumeWorkout(onFailed: () -> Unit, onReady: (Long, List<Long>) -> Unit) = viewModelScope.launch {
        startMutex.withLock {
            runCatching {
                val session = repository.observeInProgressSession().first() ?: error("進行中のトレーニングがありません")
                val ids = repository.observeSets(session.id).first().sortedBy { it.createdAt }.map { it.exerciseId }.distinct()
                check(ids.isNotEmpty()) { "再開できる種目がありません" }
                session.presetId?.let(workoutPreferences::selectPreset)
                onReady(session.id, ids)
            }.onFailure {
                if (it is kotlinx.coroutines.CancellationException) throw it
                _message.value = it.message ?: "再開できませんでした"; onFailed()
            }
        }
    }

    fun initializeDefaultPresets() = viewModelScope.launch {
        var gymIds = gymPresetExerciseIds.value
        var homeIds = homePresetExerciseIds.value
        if (!workoutPreferences.defaultPresetsInitialized) {
            val ensuredGymIds = repository.ensurePresetExercises(WorkoutPlace.GYM.presetExerciseNames)
            val ensuredHomeIds = repository.ensurePresetExercises(WorkoutPlace.HOME.presetExerciseNames)
            if (gymIds.isEmpty()) gymIds = ensuredGymIds
            if (homeIds.isEmpty()) homeIds = ensuredHomeIds
            workoutPreferences.setPresetExerciseIds(true, gymIds)
            workoutPreferences.setPresetExerciseIds(false, homeIds)
            workoutPreferences.markDefaultPresetsInitialized()
        }
        workoutPreferences.initializePresetsIfMissing(gymIds, homeIds)
        val exerciseDefaults = repository.observeExercises().first().mapNotNull { exercise ->
            exerciseTrainingDefault(exercise.name)?.let { exercise.id to it }
        }.toMap()
        workoutPreferences.initializePresetTrainingDefaults(exerciseDefaults)
    }

    fun setPresets(presets: List<WorkoutPreset>) = workoutPreferences.setPresets(presets)

    fun addExercise(name: String, mode: ExerciseMode) = viewModelScope.launch {
        runCatching { repository.addExercise(name, mode) }.onFailure { _message.value = it.message }
    }

    fun renameExercise(exercise: ExerciseEntity, name: String) = viewModelScope.launch {
        runCatching { repository.renameExercise(exercise, name) }.onFailure { _message.value = it.message }
    }

    fun archiveExercise(exercise: ExerciseEntity) = viewModelScope.launch { repository.archiveExercise(exercise) }

    fun setWeekStartsMonday(weekStartsMonday: Boolean) =
        workoutPreferences.setWeekStartsMonday(weekStartsMonday)

    fun togglePresetExercise(gym: Boolean, exerciseId: Long) = workoutPreferences.togglePresetExercise(gym, exerciseId)

    fun setPresetExerciseIds(gym: Boolean, exerciseIds: List<Long>) = workoutPreferences.setPresetExerciseIds(gym, exerciseIds)

    fun setWeightStepKg(weightStepKg: Double) = workoutPreferences.setWeightStepKg(weightStepKg)

    fun setExerciseWeightStepKg(exerciseId: Long, weightStepKg: Double) =
        workoutPreferences.setExerciseWeightStepKg(exerciseId, weightStepKg)

    fun resetExerciseWeightStepKg(exerciseId: Long) = workoutPreferences.resetExerciseWeightStepKg(exerciseId)

    fun setRestDurationSeconds(seconds: Long) = workoutPreferences.setRestDurationSeconds(seconds)

    fun setExerciseRestDurationSeconds(exerciseId: Long, seconds: Long?) =
        workoutPreferences.setExerciseRestDurationSeconds(exerciseId, seconds)

    fun setExerciseSideSwitchRestEnabled(exerciseId: Long, enabled: Boolean) =
        workoutPreferences.setExerciseSideSwitchRestEnabled(exerciseId, enabled)

    fun setExerciseStartsLeft(exerciseId: Long, startsLeft: Boolean) =
        workoutPreferences.setExerciseStartsLeft(exerciseId, startsLeft)

    fun addSet(sessionId: Long, exercise: ExerciseEntity) = viewModelScope.launch {
        repository.addSet(sessionId, exercise)
    }

    fun duplicateSet(sessionId: Long, exerciseId: Long) = viewModelScope.launch {
        repository.duplicateSet(sessionId, exerciseId)
    }

    fun updateSet(setId: Long, transform: (WorkoutSetEntity) -> WorkoutSetEntity) =
        viewModelScope.launch { repository.updateSet(setId, transform) }

    fun finishSession(
        sessionId: Long,
        announce: Boolean = true,
        onFinished: () -> Unit = {},
    ) = viewModelScope.launch {
        repository.finishSession(sessionId)
        if (announce) _message.value = "トレーニングを保存しました"
        onFinished()
    }

    fun shareSession(roomId: String, sessionId: Long) = viewModelScope.launch {
        runCatching {
            val session = repository.observeSession(sessionId).first() ?: error("記録が見つかりません")
            check(session.status == SessionStatus.COMPLETED) { "完了したトレーニングだけを共有できます" }
            val exerciseNames = repository.observeAllExercises().first().associateBy { it.id }
            val recorded = repository.observeSets(sessionId).first().groupBy { it.exerciseId }
            val exercises = JSONArray()
            recorded.forEach { (id, rows) ->
                val exercise = exerciseNames[id] ?: return@forEach
                val sets = JSONArray()
                rows.sortedBy { it.setOrder }.forEach { set ->
                    fun add(side: String?, weight: Double?, reps: Int?) {
                        if (reps == null || reps <= 0) return
                        sets.put(JSONObject().put("order", set.setOrder + 1)
                            .put("side", side ?: JSONObject.NULL).put("weightKg", weight ?: JSONObject.NULL).put("reps", reps))
                    }
                    if (exercise.mode == ExerciseMode.NORMAL && set.isCompleted) add(null, set.normalWeightKg, set.normalReps)
                    if (exercise.mode == ExerciseMode.BILATERAL) {
                        if (set.leftCompleted) add("左", set.leftWeightKg, set.leftReps)
                        if (set.rightCompleted) add("右", set.rightWeightKg, set.rightReps)
                    }
                }
                if (sets.length() > 0) exercises.put(JSONObject().put("name", exercise.name).put("sets", sets))
            }
            check(exercises.length() > 0) { "共有できる完了セットがありません" }
            val title = presets.value.firstOrNull { it.id == session.presetId }?.name ?: "トレーニング"
            rooms.share(roomId, JSONObject().put("clientId", rooms.clientId(sessionId)).put("presetName", title)
                .put("startedAt", session.startedAt.toString()).put("endedAt", session.endedAt?.toString() ?: session.startedAt.toString())
                .put("exercises", exercises))
        }.onFailure {
            if (it is kotlinx.coroutines.CancellationException) throw it
            _message.value = it.message ?: "共有できませんでした"
        }
    }

    fun clearMessage() { _message.value = null }

    class Factory(
        private val repository: FitLogRepository,
        private val workoutPreferences: WorkoutPreferences,
        private val rooms: RoomsRepository,
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = FitLogViewModel(repository, workoutPreferences, rooms) as T
    }
}
