package dev.local.fitlogsolo.data

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import java.time.Instant

class FitLogRepository(private val database: AppDatabase) {
    private val exercises = database.exerciseDao()
    private val sessions = database.sessionDao()
    private val sets = database.workoutSetDao()

    fun observeExercises(): Flow<List<ExerciseEntity>> = exercises.observeActive()
    fun observeAllExercises(): Flow<List<ExerciseEntity>> = exercises.observeAll()
    fun observeInProgressSession(): Flow<WorkoutSessionEntity?> = sessions.observeInProgress()
    fun observeCompletedSessions(): Flow<List<WorkoutSessionEntity>> = sessions.observeCompleted()
    fun observeSession(id: Long): Flow<WorkoutSessionEntity?> = sessions.observeById(id)
    fun observeSets(sessionId: Long): Flow<List<WorkoutSetEntity>> = sets.observeForSession(sessionId)
    fun observeExerciseSets(sessionId: Long, exerciseId: Long): Flow<List<WorkoutSetEntity>> =
        sets.observeForExercise(sessionId, exerciseId)

    suspend fun addExercise(name: String, mode: ExerciseMode) {
        val cleaned = name.trim()
        require(cleaned.isNotEmpty()) { "種目名を入力してください" }
        val order = exercises.observeAll().first().maxOfOrNull { it.sortOrder }?.plus(1) ?: 0
        exercises.insert(ExerciseEntity(name = cleaned, mode = mode, sortOrder = order))
    }

    suspend fun renameExercise(exercise: ExerciseEntity, name: String) {
        val cleaned = name.trim()
        require(cleaned.isNotEmpty()) { "種目名を入力してください" }
        exercises.update(exercise.copy(name = cleaned))
    }

    suspend fun archiveExercise(exercise: ExerciseEntity) {
        exercises.update(exercise.copy(archived = true))
    }

    suspend fun startOrResumeSession(): Long {
        val current = sessions.observeInProgress().first()
        return current?.id ?: sessions.insert(WorkoutSessionEntity(startedAt = Instant.now()))
    }

    suspend fun startPresetSession(exerciseNames: List<String>): Pair<Long, List<Long>> {
        val sessionId = startOrResumeSession()
        val activeExercises = exercises.observeActive().first().toMutableList()
        val existingSetExerciseIds = sets.findForSession(sessionId).mapTo(mutableSetOf()) { it.exerciseId }
        val presetExercises = exerciseNames.map { name ->
            activeExercises.firstOrNull { it.name.equals(name, ignoreCase = true) }
                ?: run {
                    val order = activeExercises.maxOfOrNull { it.sortOrder }?.plus(1) ?: 0
                    val exercise = ExerciseEntity(name = name, sortOrder = order)
                    val id = exercises.insert(exercise)
                    exercise.copy(id = id).also(activeExercises::add)
                }
        }
        presetExercises.forEach { exercise ->
            if (exercise.id !in existingSetExerciseIds) addSet(sessionId, exercise)
        }
        return sessionId to presetExercises.map { it.id }
    }

    suspend fun ensurePresetExercises(exerciseNames: List<String>): List<Long> {
        val activeExercises = exercises.observeActive().first().toMutableList()
        return exerciseNames.map { name ->
            activeExercises.firstOrNull { it.name.equals(name, ignoreCase = true) }
                ?: run {
                    val order = activeExercises.maxOfOrNull { it.sortOrder }?.plus(1) ?: 0
                    val exercise = ExerciseEntity(name = name, sortOrder = order)
                    val id = exercises.insert(exercise)
                    exercise.copy(id = id).also(activeExercises::add)
                }
        }.map { it.id }
    }

    suspend fun startPresetSessionByIds(exerciseIds: List<Long>): Pair<Long, List<Long>> {
        val activeExercises = exercises.observeActive().first().associateBy { it.id }
        val presetExercises = exerciseIds.mapNotNull(activeExercises::get)
        require(presetExercises.isNotEmpty()) { "プリセットに種目を設定してください" }
        val sessionId = startOrResumeSession()
        val existingSetExerciseIds = sets.findForSession(sessionId).mapTo(mutableSetOf()) { it.exerciseId }
        presetExercises.forEach { exercise ->
            if (exercise.id !in existingSetExerciseIds) addSet(sessionId, exercise)
        }
        return sessionId to presetExercises.map { it.id }
    }

    suspend fun startPresetSession(preset: WorkoutPreset): Pair<Long, List<Long>> {
        val activeExercises = exercises.observeActive().first().associateBy { it.id }
        val selected = preset.exercises.mapNotNull { config -> activeExercises[config.exerciseId]?.let { config to it } }
        require(selected.isNotEmpty()) { "プリセットに種目を設定してください" }
        val sessionId = startOrResumeSession()
        selected.forEach { (config, exercise) ->
            val desiredCount = config.sets.toIntOrNull()?.coerceIn(1, 30) ?: 3
            var currentSets = sets.findForSession(sessionId).filter { it.exerciseId == exercise.id }.sortedBy { it.setOrder }
            val createdSetIds = mutableSetOf<Long>()
            while (currentSets.size < desiredCount) {
                createdSetIds += addSet(sessionId, exercise)
                currentSets = sets.findForSession(sessionId).filter { it.exerciseId == exercise.id }.sortedBy { it.setOrder }
            }
            val weight = config.weightKg.toDoubleOrNull()?.takeIf { it >= 0.0 }
            val reps = config.reps.toIntOrNull()?.takeIf { it >= 0 }
            currentSets.forEach { set ->
                if (set.id in createdSetIds) {
                    updateSet(
                        when (exercise.mode) {
                            ExerciseMode.NORMAL -> set.copy(normalWeightKg = weight, normalReps = reps)
                            ExerciseMode.BILATERAL -> set.copy(
                                leftWeightKg = weight,
                                leftReps = reps,
                                rightWeightKg = weight,
                                rightReps = reps,
                            )
                        },
                    )
                }
            }
        }
        return sessionId to selected.map { (_, exercise) -> exercise.id }
    }

    suspend fun addSet(sessionId: Long, exercise: ExerciseEntity): Long {
        val previous = sets.findCompletedForExercise(exercise.id).firstOrNull()
        val count = sets.findForSession(sessionId).count { it.exerciseId == exercise.id }
        val now = Instant.now()
        val candidate = if (previous == null) {
            WorkoutSetEntity(sessionId = sessionId, exerciseId = exercise.id, setOrder = count, createdAt = now, updatedAt = now)
        } else {
            WorkoutSetEntity(
                sessionId = sessionId,
                exerciseId = exercise.id,
                setOrder = count,
                normalWeightKg = previous.normalWeightKg,
                normalReps = previous.normalReps,
                leftWeightKg = previous.leftWeightKg,
                leftReps = previous.leftReps,
                rightWeightKg = previous.rightWeightKg,
                rightReps = previous.rightReps,
                createdAt = now,
                updatedAt = now,
            )
        }
        return sets.insert(candidate)
    }

    suspend fun ensureSet(sessionId: Long, exercise: ExerciseEntity): Long =
        sets.findForSession(sessionId).firstOrNull { it.exerciseId == exercise.id }?.id
            ?: addSet(sessionId, exercise)

    suspend fun duplicateSet(sessionId: Long, exerciseId: Long): Long {
        val previous = sets.findForSession(sessionId).filter { it.exerciseId == exerciseId }.maxByOrNull { it.setOrder }
            ?: return addSet(sessionId, exercises.findById(exerciseId) ?: error("種目が見つかりません"))
        val now = Instant.now()
        return sets.insert(previous.copy(id = 0, setOrder = previous.setOrder + 1, isCompleted = false, createdAt = now, updatedAt = now))
    }

    suspend fun updateSet(set: WorkoutSetEntity) = sets.update(set.copy(updatedAt = Instant.now()))

    suspend fun finishSession(sessionId: Long) {
        sessions.findById(sessionId)?.let {
            sessions.update(it.copy(status = SessionStatus.COMPLETED, endedAt = Instant.now()))
        }
    }

}
