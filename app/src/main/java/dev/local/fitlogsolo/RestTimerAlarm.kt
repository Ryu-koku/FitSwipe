package dev.local.fitlogsolo

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator

private const val ACTION_REST_TIMER_FINISHED = "dev.local.fitlogsolo.REST_TIMER_FINISHED"
private const val EXTRA_END_TIME = "rest_end_time"
private const val PREFS_NAME = "rest_timer_alarm"
private const val KEY_SCHEDULED_END_TIME = "scheduled_end_time"

object RestTimerAlarm {

    fun canScheduleExactAlarms(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        return context.getSystemService(AlarmManager::class.java)?.canScheduleExactAlarms() == true
    }

    fun schedule(context: Context, endTimeMillis: Long): Boolean {
        val alarmManager = context.getSystemService(AlarmManager::class.java) ?: return false
        if (!canScheduleExactAlarms(context)) return false

        val pendingIntent = alarmPendingIntent(context, endTimeMillis)
        val showIntent = PendingIntent.getActivity(
            context,
            1,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_SCHEDULED_END_TIME, endTimeMillis)
            .apply()

        return runCatching {
            alarmManager.setAlarmClock(
                AlarmManager.AlarmClockInfo(endTimeMillis, showIntent),
                pendingIntent,
            )
            true
        }.getOrElse {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .remove(KEY_SCHEDULED_END_TIME)
                .apply()
            false
        }
    }

    fun cancel(context: Context) {
        context.getSystemService(AlarmManager::class.java)?.cancel(alarmPendingIntent(context, 0L))
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_SCHEDULED_END_TIME)
            .apply()
    }

    private fun alarmPendingIntent(context: Context, endTimeMillis: Long): PendingIntent {
        val intent = Intent(context, RestTimerAlarmReceiver::class.java)
            .setAction(ACTION_REST_TIMER_FINISHED)
            .putExtra(EXTRA_END_TIME, endTimeMillis)
        return PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

}

class RestTimerAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val requestedEndTime = intent.getLongExtra(EXTRA_END_TIME, 0L)
        val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (requestedEndTime == 0L ||
            preferences.getLong(KEY_SCHEDULED_END_TIME, 0L) != requestedEndTime
        ) {
            return
        }
        preferences.edit().remove(KEY_SCHEDULED_END_TIME).apply()

        val receiverResult = goAsync()
        val tone = runCatching { ToneGenerator(AudioManager.STREAM_ALARM, 90) }.getOrNull()
        val handler = Handler(Looper.getMainLooper())
        val toneStarted = runCatching {
            tone?.startTone(ToneGenerator.TONE_PROP_BEEP, 220) == true
        }.getOrDefault(false)
        runCatching {
            val vibrator = context.getSystemService(Vibrator::class.java)
            if (vibrator?.hasVibrator() == true) {
                vibrator.vibrate(VibrationEffect.createOneShot(240L, VibrationEffect.DEFAULT_AMPLITUDE))
            }
        }

        handler.postDelayed({
            runCatching { tone?.release() }
            receiverResult.finish()
        }, if (toneStarted) 260L else 50L)
    }
}
