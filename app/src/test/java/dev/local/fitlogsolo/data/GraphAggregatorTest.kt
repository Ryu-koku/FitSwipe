package dev.local.fitlogsolo.data

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.Instant
import java.time.ZoneOffset

class GraphAggregatorTest {
    private val zone = ZoneOffset.UTC

    @Test
    fun normalUsesDailyMaximumAndIgnoresIncompleteOrNullSets() {
        val sets = listOf(
            WorkoutSetEntity(1, 1, 1, 0, normalWeightKg = 40.0, normalReps = 10, isCompleted = true, updatedAt = Instant.parse("2026-10-18T08:00:00Z")),
            WorkoutSetEntity(2, 1, 1, 1, normalWeightKg = 45.0, normalReps = 8, isCompleted = true, updatedAt = Instant.parse("2026-10-18T09:00:00Z")),
            WorkoutSetEntity(3, 1, 1, 2, normalWeightKg = 60.0, normalReps = 8, isCompleted = false, updatedAt = Instant.parse("2026-10-18T10:00:00Z")),
            WorkoutSetEntity(4, 1, 1, 3, normalWeightKg = null, normalReps = 8, isCompleted = true, updatedAt = Instant.parse("2026-10-19T10:00:00Z")),
        )
        assertEquals(listOf(WorkoutPoint("2026-10-18", 45.0)), GraphAggregator.normal(sets, zone))
    }

    @Test
    fun bilateralKeepsLeftAndRightIndependent() {
        val sets = listOf(
            WorkoutSetEntity(1, 1, 1, 0, leftWeightKg = 8.0, rightWeightKg = 10.0, isCompleted = true, updatedAt = Instant.parse("2026-10-18T08:00:00Z")),
            WorkoutSetEntity(2, 1, 1, 1, leftWeightKg = 9.0, rightWeightKg = 10.0, isCompleted = true, updatedAt = Instant.parse("2026-10-18T09:00:00Z")),
        )
        val result = GraphAggregator.bilateral(sets, zone)
        assertEquals(listOf(WorkoutPoint("2026-10-18", 9.0)), result.left)
        assertEquals(listOf(WorkoutPoint("2026-10-18", 10.0)), result.right)
    }

    @Test
    fun lastWeightMeasurementPerDayUsesLatestTimestamp() {
        val measurements = listOf(
            WeightMeasurement("a", Instant.parse("2026-10-18T07:00:00Z"), 70.0),
            WeightMeasurement("b", Instant.parse("2026-10-18T20:00:00Z"), 69.5),
            WeightMeasurement("c", Instant.parse("2026-10-19T08:00:00Z"), 69.0),
        )
        assertEquals(listOf(measurements[1], measurements[2]), GraphAggregator.lastMeasurementPerDay(measurements, zone))
    }
}
