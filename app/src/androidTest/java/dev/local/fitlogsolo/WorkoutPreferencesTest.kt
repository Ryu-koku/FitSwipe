package dev.local.fitlogsolo

import android.content.Context
import android.content.ContextWrapper
import android.content.SharedPreferences
import androidx.test.core.app.ApplicationProvider
import dev.local.fitlogsolo.data.WorkoutPreferences
import dev.local.fitlogsolo.data.WorkoutPreset
import org.junit.Assert.assertEquals
import org.junit.Test
import java.util.UUID

class WorkoutPreferencesTest {
    @Test fun selectionSurvivesRestartAndFallsBackWhenDeleted() {
        val base = ApplicationProvider.getApplicationContext<Context>()
        val namespace = UUID.randomUUID().toString()
        val isolated = object : ContextWrapper(base) {
            override fun getSharedPreferences(name: String, mode: Int): SharedPreferences = base.getSharedPreferences("$namespace-$name", mode)
        }
        try {
            val first = WorkoutPreset(id = "first", name = "ジム")
            val second = WorkoutPreset(id = "second", name = "家")
            WorkoutPreferences(isolated).apply { setPresets(listOf(first, second)); selectPreset(second.id) }
            val restored = WorkoutPreferences(isolated)
            assertEquals(second.id, restored.selectedPresetId.value)
            restored.setPresets(listOf(first, second.copy(name = "家の日")))
            assertEquals(second.id, restored.selectedPresetId.value)
            restored.setPresets(listOf(first))
            assertEquals(first.id, restored.selectedPresetId.value)
            restored.setPresets(emptyList())
            assertEquals(null, WorkoutPreferences(isolated).selectedPresetId.value)
        } finally { base.deleteSharedPreferences("$namespace-workout_preferences") }
    }
}
