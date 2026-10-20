package dev.local.fitlogsolo

import android.app.Application
import dev.local.fitlogsolo.data.AppDatabase
import dev.local.fitlogsolo.data.FitLogRepository

class FitLogApplication : Application() {
    val database by lazy { AppDatabase.create(this) }
    val repository by lazy { FitLogRepository(database) }
}
