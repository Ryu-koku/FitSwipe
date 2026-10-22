package dev.local.fitlogsolo.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [ExerciseEntity::class, WorkoutSessionEntity::class, WorkoutSetEntity::class],
    version = 3,
    exportSchema = false,
)
@TypeConverters(RoomConverters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun exerciseDao(): ExerciseDao
    abstract fun sessionDao(): SessionDao
    abstract fun workoutSetDao(): WorkoutSetDao

    companion object {
        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE workout_sets ADD COLUMN leftCompleted INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE workout_sets ADD COLUMN rightCompleted INTEGER NOT NULL DEFAULT 0")
            }
        }

        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE workout_sessions ADD COLUMN presetId TEXT")
            }
        }

        fun create(context: Context): AppDatabase = Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "fitlog_solo.db",
        ).addMigrations(MIGRATION_1_2, MIGRATION_2_3).build()
    }
}
