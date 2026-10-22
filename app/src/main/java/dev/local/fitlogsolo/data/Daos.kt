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

    @Query("SELECT * FROM exercises ORDER BY sortOrder, name")
    fun observeAll(): Flow<List<ExerciseEntity>>

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

    @Insert
    suspend fun insert(set: WorkoutSetEntity): Long

    @Update
    suspend fun update(set: WorkoutSetEntity)
}
