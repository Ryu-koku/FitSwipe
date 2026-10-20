package dev.local.fitlogsolo.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class WorkoutPreferences(context: Context) {
    private val preferences = context.getSharedPreferences("workout_preferences", Context.MODE_PRIVATE)

    private val _routineExerciseIds = MutableStateFlow(readRoutineExerciseIds())
    val routineExerciseIds: StateFlow<List<Long>> = _routineExerciseIds.asStateFlow()

    private val _flatModeEnabled = MutableStateFlow(preferences.getBoolean(KEY_FLAT_MODE, true))
    val flatModeEnabled: StateFlow<Boolean> = _flatModeEnabled.asStateFlow()

    private val _displayName = MutableStateFlow(preferences.getString(KEY_DISPLAY_NAME, null) ?: "あなた")
    val displayName: StateFlow<String> = _displayName.asStateFlow()

    private val _gymPresetExerciseIds = MutableStateFlow(readIds(KEY_GYM_PRESET))
    val gymPresetExerciseIds: StateFlow<List<Long>> = _gymPresetExerciseIds.asStateFlow()

    private val _homePresetExerciseIds = MutableStateFlow(readIds(KEY_HOME_PRESET))
    val homePresetExerciseIds: StateFlow<List<Long>> = _homePresetExerciseIds.asStateFlow()
    val defaultPresetsInitialized: Boolean get() = preferences.getBoolean(KEY_DEFAULT_PRESETS_INITIALIZED, false)

    fun toggleRoutineExercise(exerciseId: Long) {
        val updated = _routineExerciseIds.value.toMutableList().apply {
            if (!remove(exerciseId)) add(exerciseId)
        }
        preferences.edit().putString(KEY_ROUTINE_EXERCISES, updated.joinToString(",")).apply()
        _routineExerciseIds.value = updated
    }

    fun setFlatModeEnabled(enabled: Boolean) {
        preferences.edit().putBoolean(KEY_FLAT_MODE, enabled).apply()
        _flatModeEnabled.value = enabled
    }

    fun setDisplayName(name: String) {
        val updated = name.trim().ifEmpty { "あなた" }.take(24)
        preferences.edit().putString(KEY_DISPLAY_NAME, updated).apply()
        _displayName.value = updated
    }

    fun togglePresetExercise(gym: Boolean, exerciseId: Long) {
        val key = if (gym) KEY_GYM_PRESET else KEY_HOME_PRESET
        val state = if (gym) _gymPresetExerciseIds else _homePresetExerciseIds
        val updated = state.value.toMutableList().apply { if (!remove(exerciseId)) add(exerciseId) }
        preferences.edit().putString(key, updated.joinToString(",")).apply()
        state.value = updated
    }

    fun setPresetExerciseIds(gym: Boolean, exerciseIds: List<Long>) {
        val key = if (gym) KEY_GYM_PRESET else KEY_HOME_PRESET
        val state = if (gym) _gymPresetExerciseIds else _homePresetExerciseIds
        val updated = exerciseIds.distinct()
        preferences.edit().putString(key, updated.joinToString(",")).apply()
        state.value = updated
    }

    fun markDefaultPresetsInitialized() {
        preferences.edit().putBoolean(KEY_DEFAULT_PRESETS_INITIALIZED, true).apply()
    }

    private fun readRoutineExerciseIds(): List<Long> = preferences.getString(KEY_ROUTINE_EXERCISES, null)
        ?.split(',')
        ?.mapNotNull(String::toLongOrNull)
        .orEmpty()

    private fun readIds(key: String): List<Long> = preferences.getString(key, null)
        ?.split(',')
        ?.mapNotNull(String::toLongOrNull)
        .orEmpty()

    private companion object {
        const val KEY_ROUTINE_EXERCISES = "routine_exercise_ids"
        const val KEY_FLAT_MODE = "flat_mode_enabled"
        const val KEY_DISPLAY_NAME = "display_name"
        const val KEY_GYM_PRESET = "gym_preset_exercise_ids"
        const val KEY_HOME_PRESET = "home_preset_exercise_ids"
        const val KEY_DEFAULT_PRESETS_INITIALIZED = "default_presets_initialized"
    }
}
