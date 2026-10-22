package dev.local.fitlogsolo

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import dev.local.fitlogsolo.data.AppDatabase
import dev.local.fitlogsolo.data.ExerciseEntity
import dev.local.fitlogsolo.data.ExerciseMode
import dev.local.fitlogsolo.data.FitLogRepository
import dev.local.fitlogsolo.data.WorkoutPreset
import dev.local.fitlogsolo.data.PresetExerciseConfig
import dev.local.fitlogsolo.data.WorkoutSessionEntity
import dev.local.fitlogsolo.data.WorkoutSetEntity
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Instant

@RunWith(AndroidJUnit4::class)
class RoomDaoTest {
    private lateinit var database: AppDatabase

    @Before
    fun setUp() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        database = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java).build()
    }

    @After
    fun tearDown() = database.close()

    @Test
    fun bilateralValuesSurviveRoundTripAndSessionCascadeWorks() = runTest {
        val exerciseId = database.exerciseDao().insert(ExerciseEntity(name = "カール", mode = ExerciseMode.BILATERAL))
        val sessionId = database.sessionDao().insert(WorkoutSessionEntity(startedAt = Instant.now()))
        database.workoutSetDao().insert(
            WorkoutSetEntity(
                sessionId = sessionId,
                exerciseId = exerciseId,
                setOrder = 0,
                leftWeightKg = 8.0,
                leftReps = 10,
                rightWeightKg = 10.0,
                rightReps = 9,
                isCompleted = true,
            ),
        )
        val saved = database.workoutSetDao().findForSession(sessionId).single()
        assertEquals(8.0, saved.leftWeightKg!!, 0.0)
        assertEquals(10.0, saved.rightWeightKg!!, 0.0)
        assertNotNull(database.exerciseDao().findById(exerciseId))
        database.sessionDao().delete(database.sessionDao().findById(sessionId)!!)
        assertEquals(emptyList<WorkoutSetEntity>(), database.workoutSetDao().findForSession(sessionId))
    }

    @Test
    fun startingAnotherPresetResumesWithoutMergingOrResettingExistingSets() = runTest {
        val first = database.exerciseDao().insert(ExerciseEntity(name = "ベンチプレス"))
        val second = database.exerciseDao().insert(ExerciseEntity(name = "スクワット"))
        val repository = FitLogRepository(database)
        val gym = WorkoutPreset(id = "gym", name = "ジム", exercises = listOf(PresetExerciseConfig(first, weightKg = "60", reps = "10")))
        val home = WorkoutPreset(id = "home", name = "家", exercises = listOf(PresetExerciseConfig(second, weightKg = "20", reps = "12")))
        val started = repository.startPresetSession(gym)
        val set = database.workoutSetDao().findForSession(started.first).first()
        repository.updateSet(set.id) { it.copy(normalWeightKg = 65.0, normalReps = 9, isCompleted = true) }
        val resumed = repository.startPresetSession(home)
        assertEquals(started, resumed)
        assertEquals("gym", database.sessionDao().findById(started.first)!!.presetId)
        val rows = database.workoutSetDao().findForSession(started.first)
        assertEquals(3, rows.size)
        assertEquals(setOf(first), rows.map { it.exerciseId }.toSet())
        assertEquals(65.0, rows.first { it.id == set.id }.normalWeightKg!!, 0.0)
        assertEquals(true, rows.first { it.id == set.id }.isCompleted)
        repository.finishSession(started.first)
        val next = repository.startPresetSession(home)
        assertEquals(listOf(second), next.second)
        assertEquals("home", database.sessionDao().findById(next.first)!!.presetId)
    }

    @Test
    fun simultaneousStartsCreateOnlyOneSessionAndOneSetList() = runTest {
        val exercise = database.exerciseDao().insert(ExerciseEntity(name = "スクワット"))
        val repository = FitLogRepository(database)
        val preset = WorkoutPreset(name = "家", exercises = listOf(PresetExerciseConfig(exercise)))
        val results = coroutineScope {
            val first = async { repository.startPresetSession(preset) }
            val second = async { repository.startPresetSession(preset) }
            listOf(first.await(), second.await())
        }
        assertEquals(results[0], results[1])
        assertEquals(3, database.workoutSetDao().findForSession(results[0].first).size)
    }
}
