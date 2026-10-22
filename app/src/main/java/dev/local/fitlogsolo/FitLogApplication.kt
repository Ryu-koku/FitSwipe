package dev.local.fitlogsolo

import android.app.Application
import dev.local.fitlogsolo.data.RoomsRepository
import dev.local.fitlogsolo.data.AppDatabase
import dev.local.fitlogsolo.data.FitLogRepository
import dev.local.fitlogsolo.data.WorkoutPreferences

class FitLogApplication : Application() {
    val rooms by lazy { RoomsRepository(this) }
    val database by lazy { AppDatabase.create(this) }
    val repository by lazy { FitLogRepository(database) }
    val workoutPreferences by lazy { WorkoutPreferences(this) }
}
