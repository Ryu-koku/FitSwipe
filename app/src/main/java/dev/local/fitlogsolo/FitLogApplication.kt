package dev.local.fitlogsolo

import android.app.Application
import android.app.Activity
import android.os.Bundle
import dev.local.fitlogsolo.data.RoomsRepository
import dev.local.fitlogsolo.data.AppDatabase
import dev.local.fitlogsolo.data.FitLogRepository
import dev.local.fitlogsolo.data.WorkoutPreferences

class FitLogApplication : Application(), Application.ActivityLifecycleCallbacks {
    @Volatile
    var isAppInForeground: Boolean = false
        private set

    private var startedActivityCount = 0

    override fun onCreate() {
        super.onCreate()
        registerActivityLifecycleCallbacks(this)
    }

    override fun onActivityStarted(activity: Activity) {
        startedActivityCount += 1
        isAppInForeground = startedActivityCount > 0
    }

    override fun onActivityStopped(activity: Activity) {
        startedActivityCount = (startedActivityCount - 1).coerceAtLeast(0)
        isAppInForeground = startedActivityCount > 0
    }

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) = Unit
    override fun onActivityResumed(activity: Activity) = Unit
    override fun onActivityPaused(activity: Activity) = Unit
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit
    override fun onActivityDestroyed(activity: Activity) = Unit

    val rooms by lazy { RoomsRepository(this) }
    val database by lazy { AppDatabase.create(this) }
    val repository by lazy { FitLogRepository(database) }
    val workoutPreferences by lazy { WorkoutPreferences(this) }
}
