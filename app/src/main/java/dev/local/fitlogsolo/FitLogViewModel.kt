package dev.local.fitlogsolo

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import dev.local.fitlogsolo.data.ExerciseEntity
import dev.local.fitlogsolo.data.ExerciseMode
import dev.local.fitlogsolo.data.FitLogRepository
import dev.local.fitlogsolo.data.GraphAggregator
import dev.local.fitlogsolo.data.SessionStatus
import dev.local.fitlogsolo.data.WeightMeasurement
import dev.local.fitlogsolo.data.WorkoutSetEntity
import dev.local.fitlogsolo.export.JsonExporter
import dev.local.fitlogsolo.health.HealthConnectGateway
import dev.local.fitlogsolo.health.HealthReadResult
import dev.local.fitlogsolo.health.WeightDataSource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.ZoneId

data class HealthUiState(
    val loading: Boolean = false,
    val hasPermission: Boolean = false,
    val measurements: List<WeightMeasurement> = emptyList(),
    val message: String? = null,
)

class FitLogViewModel(
    private val repository: FitLogRepository,
    private val healthConnect: WeightDataSource,
) : ViewModel() {
    val exercises = repository.observeExercises().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val allExercises = repository.observeAllExercises().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val activeSession = repository.observeInProgressSession().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)
    val completedSessions = repository.observeCompletedSessions().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private val _health = MutableStateFlow(HealthUiState())
    val health: StateFlow<HealthUiState> = _health.asStateFlow()
    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    fun sessionSets(sessionId: Long): StateFlow<List<WorkoutSetEntity>> =
        repository.observeSets(sessionId).stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun exerciseSets(sessionId: Long, exerciseId: Long): StateFlow<List<WorkoutSetEntity>> =
        repository.observeExerciseSets(sessionId, exerciseId).stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun startSession(onReady: (Long) -> Unit = {}) = viewModelScope.launch {
        onReady(repository.startOrResumeSession())
    }

    fun addExercise(name: String, mode: ExerciseMode) = viewModelScope.launch {
        runCatching { repository.addExercise(name, mode) }.onFailure { _message.value = it.message }
    }

    fun renameExercise(exercise: ExerciseEntity, name: String) = viewModelScope.launch {
        runCatching { repository.renameExercise(exercise, name) }.onFailure { _message.value = it.message }
    }

    fun archiveExercise(exercise: ExerciseEntity) = viewModelScope.launch { repository.archiveExercise(exercise) }

    fun addSet(sessionId: Long, exercise: ExerciseEntity) = viewModelScope.launch {
        repository.addSet(sessionId, exercise)
    }

    fun duplicateSet(sessionId: Long, exerciseId: Long) = viewModelScope.launch {
        repository.duplicateSet(sessionId, exerciseId)
    }

    fun updateSet(set: WorkoutSetEntity) = viewModelScope.launch { repository.updateSet(set) }

    fun finishSession(sessionId: Long) = viewModelScope.launch {
        repository.finishSession(sessionId)
        _message.value = "トレーニングを保存しました"
    }

    fun deleteSession(sessionId: Long) = viewModelScope.launch {
        repository.deleteSession(sessionId)
        _message.value = "履歴を削除しました"
    }

    fun reopenSession(sessionId: Long, onReady: (Long) -> Unit = {}) = viewModelScope.launch {
        runCatching { repository.reopenSession(sessionId) }
            .onSuccess(onReady)
            .onFailure { _message.value = it.message }
    }

    fun clearMessage() { _message.value = null }

    fun refreshHealth(hasPermission: Boolean) = viewModelScope.launch {
        _health.value = _health.value.copy(loading = true, hasPermission = hasPermission, message = null)
        _health.value = when (val result = healthConnect.readRecentWeights(hasPermission)) {
            is HealthReadResult.Success -> HealthUiState(measurements = result.measurements, hasPermission = true)
            HealthReadResult.PermissionDenied -> HealthUiState(hasPermission = false, message = "体重の読み取り権限がありません")
            is HealthReadResult.Unavailable -> HealthUiState(message = when (result.availability) {
                dev.local.fitlogsolo.health.HealthAvailability.NOT_INSTALLED -> "Health Connectが利用できません。Android 13以下ではアプリをインストールしてください"
                dev.local.fitlogsolo.health.HealthAvailability.UPDATE_REQUIRED -> "Health Connectを更新してください"
                dev.local.fitlogsolo.health.HealthAvailability.AVAILABLE -> ""
            })
            is HealthReadResult.Failed -> HealthUiState(hasPermission = hasPermission, message = result.message)
        }
    }

    suspend fun pointsFor(exercise: ExerciseEntity) = repository.allSetsForExercise(exercise.id).let {
        if (exercise.mode == ExerciseMode.NORMAL) GraphAggregator.normal(it, ZoneId.systemDefault())
        else GraphAggregator.bilateral(it, ZoneId.systemDefault())
    }

    fun export(uri: Uri, writer: (Uri, String) -> Unit) = viewModelScope.launch {
        writer(uri, JsonExporter.toJson(repository.snapshot()))
        _message.value = "JSONを書き出しました"
    }

    class Factory(
        private val repository: FitLogRepository,
        private val healthConnect: WeightDataSource,
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = FitLogViewModel(repository, healthConnect) as T
    }
}
