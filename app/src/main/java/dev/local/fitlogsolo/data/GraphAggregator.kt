package dev.local.fitlogsolo.data

import java.time.ZoneId
import java.time.format.DateTimeFormatter

object GraphAggregator {
    private val dateFormatter = DateTimeFormatter.ISO_LOCAL_DATE

    fun normal(
        sets: Iterable<WorkoutSetEntity>,
        zone: ZoneId = ZoneId.systemDefault(),
    ): List<WorkoutPoint> = sets.asSequence()
        .filter { it.isCompleted && it.normalWeightKg != null && it.normalWeightKg.isFinite() && it.normalWeightKg >= 0 }
        .groupBy { it.updatedAt.atZone(zone).toLocalDate() }
        .map { (date, values) -> WorkoutPoint(date.format(dateFormatter), values.maxOf { it.normalWeightKg!! }) }
        .sortedBy { it.date }

    fun bilateral(
        sets: Iterable<WorkoutSetEntity>,
        zone: ZoneId = ZoneId.systemDefault(),
    ): BilateralWorkoutPoints {
        val completed = sets.asSequence().filter { it.isCompleted }
        val left = completed.filter { it.leftWeightKg != null && it.leftWeightKg.isFinite() && it.leftWeightKg >= 0 }
            .groupBy { it.updatedAt.atZone(zone).toLocalDate() }
            .map { (date, values) -> WorkoutPoint(date.format(dateFormatter), values.maxOf { it.leftWeightKg!! }) }
            .sortedBy { it.date }
        val right = completed.filter { it.rightWeightKg != null && it.rightWeightKg.isFinite() && it.rightWeightKg >= 0 }
            .groupBy { it.updatedAt.atZone(zone).toLocalDate() }
            .map { (date, values) -> WorkoutPoint(date.format(dateFormatter), values.maxOf { it.rightWeightKg!! }) }
            .sortedBy { it.date }
        return BilateralWorkoutPoints(left, right)
    }

    fun lastMeasurementPerDay(
        measurements: Iterable<WeightMeasurement>,
        zone: ZoneId = ZoneId.systemDefault(),
    ): List<WeightMeasurement> = measurements.asSequence()
        .filter { it.kilograms.isFinite() && it.kilograms >= 0 }
        .groupBy { it.measuredAt.atZone(zone).toLocalDate() }
        .map { (_, values) -> values.maxBy { it.measuredAt } }
        .sortedBy { it.measuredAt }
}
