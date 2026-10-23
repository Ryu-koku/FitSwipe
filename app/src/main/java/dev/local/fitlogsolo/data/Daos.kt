package dev.local.fitlogsolo.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface ExerciseDao {
    @Query("SELECT * FROM exercises WHERE archived = 0 ORDER BY sortOrder, name")
    fun observeActive(): Flow<List<ExerciseEntity>>

    @Query("SELECT * FROM exercises WHERE archived = 0 ORDER BY sortOrder, name")
    suspend fun findActive(): List<ExerciseEntity>

    @Query("SELECT * FROM exercises ORDER BY sortOrder, name")
    fun observeAll(): Flow<List<ExerciseEntity>>

    @Query("SELECT * FROM exercises ORDER BY sortOrder, name")
    suspend fun findAll(): List<ExerciseEntity>

    @Query("SELECT * FROM exercises WHERE id = :id")
    suspend fun findById(id: Long): ExerciseEntity?

    @Query("SELECT COUNT(*) FROM workout_sets WHERE exerciseId = :exerciseId")
    suspend fun countSets(exerciseId: Long): Int

    @Insert
    suspend fun insert(exercise: ExerciseEntity): Long

    @Update
    suspend fun update(exercise: ExerciseEntity)
}

@Dao
interface SessionDao {
    @Query("SELECT * FROM workout_sessions WHERE status = 'IN_PROGRESS' ORDER BY startedAt DESC LIMIT 1")
    fun observeInProgress(): Flow<WorkoutSessionEntity?>

    @Query("SELECT * FROM workout_sessions WHERE status = 'IN_PROGRESS' ORDER BY startedAt DESC LIMIT 1")
    suspend fun findInProgress(): WorkoutSessionEntity?

    @Query("SELECT * FROM workout_sessions WHERE status = 'COMPLETED' ORDER BY startedAt DESC")
    fun observeCompleted(): Flow<List<WorkoutSessionEntity>>

    @Query("SELECT * FROM workout_sessions WHERE id = :id")
    fun observeById(id: Long): Flow<WorkoutSessionEntity?>

    @Query("SELECT * FROM workout_sessions WHERE id = :id")
    suspend fun findById(id: Long): WorkoutSessionEntity?

    @Insert
    suspend fun insert(session: WorkoutSessionEntity): Long

    @Update
    suspend fun update(session: WorkoutSessionEntity)

    @Delete
    suspend fun delete(session: WorkoutSessionEntity)
}

@Dao
interface WorkoutSetDao {
    @Query("""
        SELECT workout_sets.exerciseId, workout_sets.normalWeightKg, workout_sets.normalReps,
               workout_sessions.startedAt AS sessionStartedAt
        FROM workout_sets
        INNER JOIN workout_sessions ON workout_sessions.id = workout_sets.sessionId
        WHERE workout_sets.isCompleted = 1 AND workout_sessions.status = 'COMPLETED'
    """)
    fun observeCompletedTrainingSets(): Flow<List<CompletedTrainingSet>>

    @Query("SELECT * FROM workout_sets WHERE sessionId = :sessionId ORDER BY exerciseId, setOrder, id")
    fun observeForSession(sessionId: Long): Flow<List<WorkoutSetEntity>>

    @Query("SELECT * FROM workout_sets WHERE sessionId = :sessionId AND exerciseId = :exerciseId ORDER BY setOrder, id")
    fun observeForExercise(sessionId: Long, exerciseId: Long): Flow<List<WorkoutSetEntity>>

    @Query("SELECT * FROM workout_sets WHERE sessionId = :sessionId ORDER BY exerciseId, setOrder, id")
    suspend fun findForSession(sessionId: Long): List<WorkoutSetEntity>

    @Query("SELECT * FROM workout_sets WHERE id = :setId LIMIT 1")
    suspend fun findById(setId: Long): WorkoutSetEntity?

    @Query("SELECT * FROM workout_sets WHERE sessionId = :sessionId AND exerciseId = :exerciseId AND setOrder > :setOrder AND isCompleted = 0 ORDER BY setOrder, id")
    suspend fun findIncompleteAfter(sessionId: Long, exerciseId: Long, setOrder: Int): List<WorkoutSetEntity>

    @Query("SELECT * FROM workout_sets WHERE exerciseId = :exerciseId AND isCompleted = 1 ORDER BY updatedAt DESC")
    suspend fun findCompletedForExercise(exerciseId: Long): List<WorkoutSetEntity>

    @Query("""
        SELECT workout_sessions.id AS sessionId,
               workout_sessions.startedAt AS startedAt,
               workout_sets.setOrder AS setOrder,
               workout_sets.normalWeightKg AS normalWeightKg,
               workout_sets.normalReps AS normalReps,
               workout_sets.leftWeightKg AS leftWeightKg,
               workout_sets.leftReps AS leftReps,
               workout_sets.rightWeightKg AS rightWeightKg,
               workout_sets.rightReps AS rightReps
        FROM workout_sets
        INNER JOIN workout_sessions ON workout_sessions.id = workout_sets.sessionId
        WHERE workout_sets.exerciseId = :exerciseId
          AND workout_sets.sessionId != :currentSessionId
          AND workout_sets.isCompleted = 1
          AND workout_sessions.status = 'COMPLETED'
        ORDER BY COALESCE(workout_sessions.endedAt, workout_sessions.startedAt) DESC,
                 workout_sessions.id DESC, workout_sets.setOrder, workout_sets.id
    """)
    fun observeWorkoutHistory(currentSessionId: Long, exerciseId: Long): Flow<List<WorkoutHistoryEntry>>

    @Query("DELETE FROM workout_sets WHERE sessionId = :sessionId AND exerciseId = :exerciseId")
    suspend fun deleteForSessionExercise(sessionId: Long, exerciseId: Long)

    @Query("""
        SELECT current_set.* FROM workout_sets AS current_set
        INNER JOIN workout_sessions AS current_session ON current_session.id = current_set.sessionId
        WHERE current_set.exerciseId = :exerciseId
          AND current_set.sessionId = (
              SELECT previous_set.sessionId FROM workout_sets AS previous_set
              INNER JOIN workout_sessions AS previous_session ON previous_session.id = previous_set.sessionId
              WHERE previous_set.exerciseId = :exerciseId
                AND previous_set.isCompleted = 1
                AND previous_set.sessionId != :currentSessionId
                AND previous_session.status = 'COMPLETED'
              ORDER BY COALESCE(previous_session.endedAt, previous_session.startedAt) DESC,
                       previous_session.id DESC
              LIMIT 1
          )
          AND current_set.isCompleted = 1
          AND current_session.status = 'COMPLETED'
        ORDER BY current_set.setOrder, current_set.id
    """)
    fun observePreviousWorkoutSets(currentSessionId: Long, exerciseId: Long): Flow<List<WorkoutSetEntity>>

    @Insert
    suspend fun insert(set: WorkoutSetEntity): Long

    @Update
    suspend fun update(set: WorkoutSetEntity)
}
