package dev.local.fitlogsolo

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import dev.local.fitlogsolo.data.ExerciseEntity
import dev.local.fitlogsolo.data.ExerciseMode
import dev.local.fitlogsolo.data.FitLogRepository
import dev.local.fitlogsolo.data.SessionStatus
import dev.local.fitlogsolo.data.WorkoutPreferences
import dev.local.fitlogsolo.data.WorkoutPreset
import dev.local.fitlogsolo.data.WorkoutSetEntity
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

enum class WorkoutPlace(val label: String, val presetExerciseNames: List<String>) {
    GYM("ジム", listOf("ベンチプレス", "ラットプルダウン", "レッグプレス")),
    HOME("家", listOf("スクワット", "腕立て伏せ", "プランク")),
}

class FitLogViewModel(
    private val repository: FitLogRepository,
    private val workoutPreferences: WorkoutPreferences,
) : ViewModel() {
    val exercises = repository.observeExercises().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val allExercises = repository.observeAllExercises().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val activeSession = repository.observeInProgressSession().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)
    val completedSessions = repository.observeCompletedSessions().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val routineExerciseIds = workoutPreferences.routineExerciseIds
    val flatModeEnabled = workoutPreferences.flatModeEnabled
    val displayName = workoutPreferences.displayName
    val weightStepKg = workoutPreferences.weightStepKg
    val exerciseWeightSteps = workoutPreferences.exerciseWeightSteps
    val gymPresetExerciseIds = workoutPreferences.gymPresetExerciseIds
    val homePresetExerciseIds = workoutPreferences.homePresetExerciseIds
    val presets = workoutPreferences.presets

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    fun sessionSets(sessionId: Long): StateFlow<List<WorkoutSetEntity>> =
        repository.observeSets(sessionId).stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    suspend fun historySets(sessionIds: List<Long>): List<WorkoutSetEntity> =
        sessionIds.flatMap { sessionId -> repository.observeSets(sessionId).first() }

    fun exerciseSets(sessionId: Long, exerciseId: Long): StateFlow<List<WorkoutSetEntity>> =
        repository.observeExerciseSets(sessionId, exerciseId).stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun startSession(onReady: (Long) -> Unit = {}) = viewModelScope.launch {
        onReady(repository.startOrResumeSession())
    }

    fun startExercise(exercise: ExerciseEntity, onReady: (Long) -> Unit = {}) = viewModelScope.launch {
        val sessionId = repository.startOrResumeSession()
        repository.ensureSet(sessionId, exercise)
        onReady(sessionId)
    }

    fun startPreset(preset: WorkoutPreset, onReady: (Long, List<Long>) -> Unit = { _, _ -> }) = viewModelScope.launch {
        val (sessionId, exerciseIds) = repository.startPresetSession(preset)
        onReady(sessionId, exerciseIds)
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
    }

    fun setPresets(presets: List<WorkoutPreset>) = workoutPreferences.setPresets(presets)

    fun addExercise(name: String, mode: ExerciseMode) = viewModelScope.launch {
        runCatching { repository.addExercise(name, mode) }.onFailure { _message.value = it.message }
    }

    fun renameExercise(exercise: ExerciseEntity, name: String) = viewModelScope.launch {
        runCatching { repository.renameExercise(exercise, name) }.onFailure { _message.value = it.message }
    }

    fun archiveExercise(exercise: ExerciseEntity) = viewModelScope.launch { repository.archiveExercise(exercise) }

    fun toggleRoutineExercise(exerciseId: Long) = workoutPreferences.toggleRoutineExercise(exerciseId)

    fun togglePresetExercise(gym: Boolean, exerciseId: Long) = workoutPreferences.togglePresetExercise(gym, exerciseId)

    fun setPresetExerciseIds(gym: Boolean, exerciseIds: List<Long>) = workoutPreferences.setPresetExerciseIds(gym, exerciseIds)

    fun setFlatModeEnabled(enabled: Boolean) = workoutPreferences.setFlatModeEnabled(enabled)

    fun setDisplayName(name: String) = workoutPreferences.setDisplayName(name)

    fun setWeightStepKg(weightStepKg: Double) = workoutPreferences.setWeightStepKg(weightStepKg)

    fun setExerciseWeightStepKg(exerciseId: Long, weightStepKg: Double) =
        workoutPreferences.setExerciseWeightStepKg(exerciseId, weightStepKg)

    fun resetExerciseWeightStepKg(exerciseId: Long) = workoutPreferences.resetExerciseWeightStepKg(exerciseId)

    fun addSet(sessionId: Long, exercise: ExerciseEntity) = viewModelScope.launch {
        repository.addSet(sessionId, exercise)
    }

    fun duplicateSet(sessionId: Long, exerciseId: Long) = viewModelScope.launch {
        repository.duplicateSet(sessionId, exerciseId)
    }

    fun updateSet(set: WorkoutSetEntity) = viewModelScope.launch { repository.updateSet(set) }

    fun finishSession(
        sessionId: Long,
        announce: Boolean = true,
        onFinished: () -> Unit = {},
    ) = viewModelScope.launch {
        repository.finishSession(sessionId)
        if (announce) _message.value = "トレーニングを保存しました"
        onFinished()
    }

    fun clearMessage() { _message.value = null }

    class Factory(
        private val repository: FitLogRepository,
        private val workoutPreferences: WorkoutPreferences,
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = FitLogViewModel(repository, workoutPreferences) as T
    }
}
