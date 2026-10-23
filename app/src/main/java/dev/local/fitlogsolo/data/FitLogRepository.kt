package dev.local.fitlogsolo.data

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import androidx.room.withTransaction
import java.time.Instant

class FitLogRepository(private val database: AppDatabase) {
    private val exercises = database.exerciseDao()
    private val sessions = database.sessionDao()
    private val sets = database.workoutSetDao()

    fun observeExercises(): Flow<List<ExerciseEntity>> = exercises.observeActive()
    fun observeAllExercises(): Flow<List<ExerciseEntity>> = exercises.observeAll()
    fun observeInProgressSession(): Flow<WorkoutSessionEntity?> = sessions.observeInProgress()
    fun observeCompletedSessions(): Flow<List<WorkoutSessionEntity>> = sessions.observeCompleted()
    fun observeCompletedTrainingSets(): Flow<List<CompletedTrainingSet>> = sets.observeCompletedTrainingSets()
    fun observeSession(id: Long): Flow<WorkoutSessionEntity?> = sessions.observeById(id)
    fun observeSets(sessionId: Long): Flow<List<WorkoutSetEntity>> = sets.observeForSession(sessionId)
    fun observeExerciseSets(sessionId: Long, exerciseId: Long): Flow<List<WorkoutSetEntity>> =
        sets.observeForExercise(sessionId, exerciseId)
    fun observePreviousWorkoutSets(sessionId: Long, exerciseId: Long): Flow<List<WorkoutSetEntity>> =
        sets.observePreviousWorkoutSets(sessionId, exerciseId)
    fun observeWorkoutHistory(sessionId: Long, exerciseId: Long): Flow<List<WorkoutHistoryEntry>> =
        sets.observeWorkoutHistory(sessionId, exerciseId)

    suspend fun addExercise(name: String, mode: ExerciseMode): ExerciseEntity {
        val cleaned = name.trim()
        require(cleaned.isNotEmpty()) { "種目名を入力してください" }
        val order = exercises.findAll().maxOfOrNull { it.sortOrder }?.plus(1) ?: 0
        val exercise = ExerciseEntity(name = cleaned, mode = mode, sortOrder = order)
        return exercise.copy(id = exercises.insert(exercise))
    }

    suspend fun addExerciseToSession(sessionId: Long, name: String, mode: ExerciseMode): ExerciseEntity =
        database.withTransaction {
            addExercise(name, mode).also { exercise -> addSet(sessionId, exercise) }
        }

    suspend fun removeExerciseFromSession(sessionId: Long, exerciseId: Long) {
        database.withTransaction { sets.deleteForSessionExercise(sessionId, exerciseId) }
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
        val current = sessions.findInProgress()
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

    suspend fun startPresetSession(preset: WorkoutPreset): Pair<Long, List<Long>> = database.withTransaction {
        // Resume the existing session without adding another preset's sets to it.
        sessions.findInProgress()?.let { active ->
            val existing = sets.findForSession(active.id)
            if (existing.isNotEmpty()) {
                return@withTransaction active.id to existing.sortedBy { it.createdAt }.map { it.exerciseId }.distinct()
            }
        }
        val activeExercises = exercises.findActive().associateBy { it.id }
        val selected = preset.exercises.mapNotNull { config -> activeExercises[config.exerciseId]?.let { config to it } }
        require(selected.isNotEmpty()) { "プリセットに種目を設定してください" }
        val sessionId = startOrResumeSession()
        sessions.findById(sessionId)?.let { session ->
            if (session.presetId != preset.id) sessions.update(session.copy(presetId = preset.id))
        }
        selected.forEach { (config, exercise) ->
            val desiredCount = config.sets.toIntOrNull()?.coerceIn(1, 30) ?: 3
            var currentSets = sets.findForSession(sessionId).filter { it.exerciseId == exercise.id }.sortedBy { it.setOrder }
            val createdSetIds = mutableSetOf<Long>()
            while (currentSets.size < desiredCount) {
                createdSetIds += addSet(sessionId, exercise)
                currentSets = sets.findForSession(sessionId).filter { it.exerciseId == exercise.id }.sortedBy { it.setOrder }
            }
            val weight = config.weightKg.toDoubleOrNull()?.takeIf { it >= 0.0 }
            val leftWeight = config.leftWeightKg.toDoubleOrNull()?.takeIf { it >= 0.0 } ?: weight
            val rightWeight = config.rightWeightKg.toDoubleOrNull()?.takeIf { it >= 0.0 } ?: weight
            val reps = config.reps.toIntOrNull()?.takeIf { it >= 0 }
            currentSets.forEach { set ->
                if (set.id in createdSetIds) {
                    updateSet(set.id) { latest ->
                        when (exercise.mode) {
                            ExerciseMode.NORMAL -> latest.copy(normalWeightKg = weight, normalReps = reps)
                            ExerciseMode.BILATERAL -> latest.copy(
                                leftWeightKg = leftWeight,
                                leftReps = reps,
                                rightWeightKg = rightWeight,
                                rightReps = reps,
                            )
                        }
                    }
                }
            }
        }
        sessionId to selected.map { (_, exercise) -> exercise.id }
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
        return sets.insert(
            previous.copy(
                id = 0,
                setOrder = previous.setOrder + 1,
                leftCompleted = false,
                rightCompleted = false,
                isCompleted = false,
                createdAt = now,
                updatedAt = now,
            ),
        )
    }

    suspend fun updateSet(setId: Long, transform: (WorkoutSetEntity) -> WorkoutSetEntity) =
        database.withTransaction {
            val previous = sets.findById(setId) ?: return@withTransaction
            val set = transform(previous)
            val updatedAt = Instant.now()
            sets.update(set.copy(updatedAt = updatedAt))

            val carryNormalWeight = set.normalWeightKg != previous.normalWeightKg && set.normalWeightKg != null
            val carryLeftWeight = set.leftWeightKg != previous.leftWeightKg && set.leftWeightKg != null
            val carryRightWeight = set.rightWeightKg != previous.rightWeightKg && set.rightWeightKg != null
            if (!carryNormalWeight && !carryLeftWeight && !carryRightWeight) return@withTransaction

            sets.findIncompleteAfter(set.sessionId, set.exerciseId, set.setOrder).forEach { nextSet ->
                sets.update(
                    nextSet.copy(
                        normalWeightKg = if (carryNormalWeight) set.normalWeightKg else nextSet.normalWeightKg,
                        leftWeightKg = if (carryLeftWeight) set.leftWeightKg else nextSet.leftWeightKg,
                        rightWeightKg = if (carryRightWeight) set.rightWeightKg else nextSet.rightWeightKg,
                        updatedAt = updatedAt,
                    ),
                )
            }
        }

    suspend fun finishSession(sessionId: Long) {
        sessions.findById(sessionId)?.let {
            sessions.update(it.copy(status = SessionStatus.COMPLETED, endedAt = Instant.now()))
        }
    }

}
