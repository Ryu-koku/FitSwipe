package dev.local.fitlogsolo.data

import androidx.room.TypeConverter
import java.time.Instant

class RoomConverters {
    @TypeConverter fun fromInstant(value: Instant?): Long? = value?.toEpochMilli()
    @TypeConverter fun toInstant(value: Long?): Instant? = value?.let(Instant::ofEpochMilli)
    @TypeConverter fun fromExerciseMode(value: ExerciseMode): String = value.name
    @TypeConverter fun toExerciseMode(value: String): ExerciseMode = ExerciseMode.valueOf(value)
    @TypeConverter fun fromSessionStatus(value: SessionStatus): String = value.name
    @TypeConverter fun toSessionStatus(value: String): SessionStatus = SessionStatus.valueOf(value)
}
