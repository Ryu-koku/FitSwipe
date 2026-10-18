package dev.local.fitlogsolo

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import dev.local.fitlogsolo.data.AppDatabase
import dev.local.fitlogsolo.data.ExerciseEntity
import dev.local.fitlogsolo.data.ExerciseMode
import dev.local.fitlogsolo.data.WorkoutSessionEntity
import dev.local.fitlogsolo.data.WorkoutSetEntity
import kotlinx.coroutines.test.runTest
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
}
