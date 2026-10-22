package dev.local.fitlogsolo.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class PresetExerciseConfig(
    val exerciseId: Long,
    val weightKg: String = "",
    val leftWeightKg: String = "",
    val rightWeightKg: String = "",
    val reps: String = "",
    val sets: String = "3",
)

data class WorkoutPreset(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val exercises: List<PresetExerciseConfig> = emptyList(),
)

class WorkoutPreferences(context: Context) {
    private val preferences = context.getSharedPreferences("workout_preferences", Context.MODE_PRIVATE)

    private val _weekStartsMonday = MutableStateFlow(
        preferences.getBoolean(KEY_WEEK_STARTS_MONDAY, false),
    )
    val weekStartsMonday: StateFlow<Boolean> = _weekStartsMonday.asStateFlow()

    private val _weightStepKg = MutableStateFlow(
        preferences.getString(KEY_WEIGHT_STEP_KG, null)?.toDoubleOrNull()
            ?.takeIf { it.isFinite() && it in MIN_WEIGHT_STEP_KG..MAX_WEIGHT_STEP_KG }
            ?: DEFAULT_WEIGHT_STEP_KG,
    )
    val weightStepKg: StateFlow<Double> = _weightStepKg.asStateFlow()

    private val _exerciseWeightSteps = MutableStateFlow(readExerciseWeightSteps())
    val exerciseWeightSteps: StateFlow<Map<Long, Double>> = _exerciseWeightSteps.asStateFlow()

    private val _restDurationSeconds = MutableStateFlow(
        preferences.getInt(KEY_REST_DURATION_SECONDS, DEFAULT_REST_DURATION_SECONDS.toInt())
            .toLong().coerceIn(0L, MAX_REST_DURATION_SECONDS),
    )
    val restDurationSeconds: StateFlow<Long> = _restDurationSeconds.asStateFlow()

    private val _exerciseRestDurations = MutableStateFlow(readExerciseRestDurations())
    val exerciseRestDurations: StateFlow<Map<Long, Long>> = _exerciseRestDurations.asStateFlow()

    private val _sideSwitchRestExerciseIds = MutableStateFlow(readIds(KEY_SIDE_SWITCH_REST_EXERCISES).toSet())
    val sideSwitchRestExerciseIds: StateFlow<Set<Long>> = _sideSwitchRestExerciseIds.asStateFlow()

    private val _leftFirstExerciseIds = MutableStateFlow(readIds(KEY_LEFT_FIRST_EXERCISES).toSet())
    val leftFirstExerciseIds: StateFlow<Set<Long>> = _leftFirstExerciseIds.asStateFlow()

    private val _gymPresetExerciseIds = MutableStateFlow(readIds(KEY_GYM_PRESET))
    val gymPresetExerciseIds: StateFlow<List<Long>> = _gymPresetExerciseIds.asStateFlow()

    private val _homePresetExerciseIds = MutableStateFlow(readIds(KEY_HOME_PRESET))
    val homePresetExerciseIds: StateFlow<List<Long>> = _homePresetExerciseIds.asStateFlow()
    val defaultPresetsInitialized: Boolean get() = preferences.getBoolean(KEY_DEFAULT_PRESETS_INITIALIZED, false)

    private val _presets = MutableStateFlow(readPresets())
    val presets: StateFlow<List<WorkoutPreset>> = _presets.asStateFlow()

    private val _selectedPresetId = MutableStateFlow(preferences.getString("selected_preset_id", null))
    val selectedPresetId: StateFlow<String?> = _selectedPresetId.asStateFlow()

    fun selectPreset(id: String?) {
        preferences.edit().putString("selected_preset_id", id).apply()
        _selectedPresetId.value = id
    }

    fun setWeekStartsMonday(weekStartsMonday: Boolean) {
        preferences.edit().putBoolean(KEY_WEEK_STARTS_MONDAY, weekStartsMonday).apply()
        _weekStartsMonday.value = weekStartsMonday
    }

    fun setWeightStepKg(weightStepKg: Double) {
        if (!weightStepKg.isFinite() || weightStepKg !in MIN_WEIGHT_STEP_KG..MAX_WEIGHT_STEP_KG) return
        val updated = (kotlin.math.round(weightStepKg * 100.0) / 100.0).coerceAtLeast(MIN_WEIGHT_STEP_KG)
        preferences.edit().putString(KEY_WEIGHT_STEP_KG, updated.toString()).apply()
        _weightStepKg.value = updated
    }

    fun setExerciseWeightStepKg(exerciseId: Long, weightStepKg: Double) {
        if (!weightStepKg.isFinite() || weightStepKg !in MIN_WEIGHT_STEP_KG..MAX_WEIGHT_STEP_KG) return
        val updated = (kotlin.math.round(weightStepKg * 100.0) / 100.0).coerceAtLeast(MIN_WEIGHT_STEP_KG)
        val steps = _exerciseWeightSteps.value + (exerciseId to updated)
        preferences.edit().putString(KEY_EXERCISE_WEIGHT_STEPS, encodeExerciseWeightSteps(steps)).apply()
        _exerciseWeightSteps.value = steps
    }

    fun resetExerciseWeightStepKg(exerciseId: Long) {
        val steps = _exerciseWeightSteps.value - exerciseId
        preferences.edit().putString(KEY_EXERCISE_WEIGHT_STEPS, encodeExerciseWeightSteps(steps)).apply()
        _exerciseWeightSteps.value = steps
    }

    fun setRestDurationSeconds(seconds: Long) {
        if (seconds !in 0L..MAX_REST_DURATION_SECONDS) return
        preferences.edit().putInt(KEY_REST_DURATION_SECONDS, seconds.toInt()).apply()
        _restDurationSeconds.value = seconds
    }

    fun setExerciseRestDurationSeconds(exerciseId: Long, seconds: Long?) {
        if (seconds != null && seconds !in 0L..MAX_REST_DURATION_SECONDS) return
        val durations = if (seconds == null) {
            _exerciseRestDurations.value - exerciseId
        } else {
            _exerciseRestDurations.value + (exerciseId to seconds)
        }
        preferences.edit().putString(KEY_EXERCISE_REST_DURATIONS, encodeExerciseRestDurations(durations)).apply()
        _exerciseRestDurations.value = durations
    }

    fun setExerciseSideSwitchRestEnabled(exerciseId: Long, enabled: Boolean) {
        val ids = if (enabled) _sideSwitchRestExerciseIds.value + exerciseId
        else _sideSwitchRestExerciseIds.value - exerciseId
        preferences.edit().putString(KEY_SIDE_SWITCH_REST_EXERCISES, ids.joinToString(",")).apply()
        _sideSwitchRestExerciseIds.value = ids
    }

    fun setExerciseStartsLeft(exerciseId: Long, startsLeft: Boolean) {
        val ids = if (startsLeft) _leftFirstExerciseIds.value + exerciseId
        else _leftFirstExerciseIds.value - exerciseId
        preferences.edit().putString(KEY_LEFT_FIRST_EXERCISES, ids.joinToString(",")).apply()
        _leftFirstExerciseIds.value = ids
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

    fun setPresets(presets: List<WorkoutPreset>) {
        val cleaned = presets.map { preset ->
            preset.copy(name = preset.name.trim().ifEmpty { "新しいプリセット" }.take(24), exercises = preset.exercises.distinctBy { it.exerciseId })
        }
        preferences.edit().putString(KEY_PRESETS, encodePresets(cleaned)).apply()
        _presets.value = cleaned
        if (cleaned.none { it.id == _selectedPresetId.value }) selectPreset(cleaned.firstOrNull()?.id)
    }

    fun initializePresetsIfMissing(gymIds: List<Long>, homeIds: List<Long>) {
        if (preferences.contains(KEY_PRESETS)) return
        setPresets(
            listOf(
                WorkoutPreset(id = "gym", name = "ジム", exercises = gymIds.map(::PresetExerciseConfig)),
                WorkoutPreset(id = "home", name = "家", exercises = homeIds.map(::PresetExerciseConfig)),
            ),
        )
    }

    fun initializePresetTrainingDefaults(defaultsByExerciseId: Map<Long, ExerciseTrainingDefault>) {
        if (preferences.getBoolean(KEY_PRESET_TRAINING_DEFAULTS_INITIALIZED, false)) return
        val updated = _presets.value.map { preset ->
            preset.copy(
                exercises = preset.exercises.map { config ->
                    val default = defaultsByExerciseId[config.exerciseId]
                    val defaultWeight = default?.tenRepWeightKg?.let(::formatWeightValue)
                        ?: config.weightKg.ifBlank { "0" }
                    config.copy(
                        weightKg = defaultWeight,
                        leftWeightKg = config.leftWeightKg.ifBlank { defaultWeight },
                        rightWeightKg = config.rightWeightKg.ifBlank { defaultWeight },
                        reps = "10",
                    )
                },
            )
        }
        if (updated != _presets.value) setPresets(updated)
        preferences.edit().putBoolean(KEY_PRESET_TRAINING_DEFAULTS_INITIALIZED, true).apply()
    }

    fun markDefaultPresetsInitialized() {
        preferences.edit().putBoolean(KEY_DEFAULT_PRESETS_INITIALIZED, true).apply()
    }

    private fun readIds(key: String): List<Long> = preferences.getString(key, null)
        ?.split(',')
        ?.mapNotNull(String::toLongOrNull)
        .orEmpty()

    private fun readExerciseWeightSteps(): Map<Long, Double> {
        val value = preferences.getString(KEY_EXERCISE_WEIGHT_STEPS, null) ?: return emptyMap()
        return runCatching {
            val json = JSONObject(value)
            json.keys().asSequence().mapNotNull { key ->
                val exerciseId = key.toLongOrNull() ?: return@mapNotNull null
                val step = json.optDouble(key, Double.NaN)
                if (step.isFinite() && step in MIN_WEIGHT_STEP_KG..MAX_WEIGHT_STEP_KG) exerciseId to step else null
            }.toMap()
        }.getOrDefault(emptyMap())
    }

    private fun encodeExerciseWeightSteps(steps: Map<Long, Double>): String = JSONObject().apply {
        steps.forEach { (exerciseId, step) -> put(exerciseId.toString(), step) }
    }.toString()

    private fun readExerciseRestDurations(): Map<Long, Long> {
        val value = preferences.getString(KEY_EXERCISE_REST_DURATIONS, null) ?: return emptyMap()
        return runCatching {
            val json = JSONObject(value)
            json.keys().asSequence().mapNotNull { key ->
                val exerciseId = key.toLongOrNull() ?: return@mapNotNull null
                val duration = json.optLong(key, -1L)
                if (duration in 0L..MAX_REST_DURATION_SECONDS) exerciseId to duration else null
            }.toMap()
        }.getOrDefault(emptyMap())
    }

    private fun encodeExerciseRestDurations(durations: Map<Long, Long>): String = JSONObject().apply {
        durations.forEach { (exerciseId, duration) -> put(exerciseId.toString(), duration) }
    }.toString()

    private fun formatWeightValue(weightKg: Double): String =
        java.math.BigDecimal.valueOf(weightKg).stripTrailingZeros().toPlainString()

    private fun readPresets(): List<WorkoutPreset> = runCatching {
        val json = preferences.getString(KEY_PRESETS, null) ?: return emptyList()
        val array = JSONArray(json)
        (0 until array.length()).map { index ->
            val item = array.getJSONObject(index)
            val exerciseArray = item.optJSONArray("exercises") ?: JSONArray()
            val configs = (0 until exerciseArray.length()).map { exerciseIndex ->
                val config = exerciseArray.getJSONObject(exerciseIndex)
                PresetExerciseConfig(
                    exerciseId = config.getLong("exerciseId"),
                    weightKg = config.optString("weightKg", ""),
                    leftWeightKg = config.optString("leftWeightKg", config.optString("weightKg", "")),
                    rightWeightKg = config.optString("rightWeightKg", config.optString("weightKg", "")),
                    reps = config.optString("reps", ""),
                    sets = config.optString("sets", "3"),
                )
            }
            WorkoutPreset(id = item.getString("id"), name = item.getString("name"), exercises = configs)
        }
    }.getOrDefault(emptyList())

    private fun encodePresets(presets: List<WorkoutPreset>): String = JSONArray().apply {
        presets.forEach { preset ->
            put(JSONObject().apply {
                put("id", preset.id)
                put("name", preset.name)
                put("exercises", JSONArray().apply {
                    preset.exercises.forEach { config ->
                        put(JSONObject().apply {
                            put("exerciseId", config.exerciseId)
                            put("weightKg", config.weightKg)
                            put("leftWeightKg", config.leftWeightKg)
                            put("rightWeightKg", config.rightWeightKg)
                            put("reps", config.reps)
                            put("sets", config.sets)
                        })
                    }
                })
            })
        }
    }.toString()

    private companion object {
        const val KEY_WEEK_STARTS_MONDAY = "week_starts_monday"
        const val KEY_WEIGHT_STEP_KG = "weight_step_kg"
        const val KEY_EXERCISE_WEIGHT_STEPS = "exercise_weight_steps"
        const val KEY_REST_DURATION_SECONDS = "rest_duration_seconds"
        const val KEY_EXERCISE_REST_DURATIONS = "exercise_rest_durations"
        const val KEY_SIDE_SWITCH_REST_EXERCISES = "side_switch_rest_exercises"
        const val KEY_LEFT_FIRST_EXERCISES = "left_first_exercises"
        const val KEY_PRESET_TRAINING_DEFAULTS_INITIALIZED = "preset_training_defaults_initialized"
        const val DEFAULT_WEIGHT_STEP_KG = 1.0
        const val MIN_WEIGHT_STEP_KG = 0.01
        const val MAX_WEIGHT_STEP_KG = 1000.0
        const val DEFAULT_REST_DURATION_SECONDS = 90L
        const val MAX_REST_DURATION_SECONDS = 7200L
        const val KEY_GYM_PRESET = "gym_preset_exercise_ids"
        const val KEY_HOME_PRESET = "home_preset_exercise_ids"
        const val KEY_DEFAULT_PRESETS_INITIALIZED = "default_presets_initialized"
        const val KEY_PRESETS = "workout_presets_json"
    }
}
