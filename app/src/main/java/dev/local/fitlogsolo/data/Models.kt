package dev.local.fitlogsolo.data

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.ColumnInfo
import androidx.room.PrimaryKey
import java.time.Instant

enum class ExerciseMode { NORMAL, BILATERAL }
enum class SessionStatus { IN_PROGRESS, COMPLETED }

@Entity(tableName = "exercises")
data class ExerciseEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val mode: ExerciseMode = ExerciseMode.NORMAL,
    val sortOrder: Int = 0,
    val archived: Boolean = false,
    val createdAt: Instant = Instant.now(),
)

@Entity(tableName = "workout_sessions")
data class WorkoutSessionEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val startedAt: Instant,
    val endedAt: Instant? = null,
    val status: SessionStatus = SessionStatus.IN_PROGRESS,
    val presetId: String? = null,
)

@Entity(
    tableName = "workout_sets",
    foreignKeys = [
        ForeignKey(
            entity = WorkoutSessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["sessionId"],
            onDelete = ForeignKey.CASCADE,
        ),
        ForeignKey(
            entity = ExerciseEntity::class,
            parentColumns = ["id"],
            childColumns = ["exerciseId"],
            onDelete = ForeignKey.RESTRICT,
        ),
    ],
    indices = [Index("sessionId"), Index("exerciseId")],
)
data class WorkoutSetEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: Long,
    val exerciseId: Long,
    val setOrder: Int,
    val normalWeightKg: Double? = null,
    val normalReps: Int? = null,
    val leftWeightKg: Double? = null,
    val leftReps: Int? = null,
    val rightWeightKg: Double? = null,
    val rightReps: Int? = null,
    @ColumnInfo(defaultValue = "0") val leftCompleted: Boolean = false,
    @ColumnInfo(defaultValue = "0") val rightCompleted: Boolean = false,
    val isCompleted: Boolean = false,
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now(),
)

data class WorkoutPoint(val date: String, val value: Double)
data class BilateralWorkoutPoints(
    val left: List<WorkoutPoint>,
    val right: List<WorkoutPoint>,
)
