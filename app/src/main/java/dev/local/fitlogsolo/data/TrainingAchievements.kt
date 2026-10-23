package dev.local.fitlogsolo.data

import java.text.Normalizer
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters
import java.util.Locale

data class CompletedTrainingSet(
    val exerciseId: Long,
    val normalWeightKg: Double?,
    val normalReps: Int?,
    val sessionStartedAt: Instant,
)

enum class BigThreeLift(val label: String, private vararg val names: String) {
    BENCH("ベンチプレス", "ベンチプレス", "バーベルベンチプレス", "benchpress", "barbellbenchpress"),
    SQUAT("スクワット", "スクワット", "バーベルスクワット", "バックスクワット", "squat", "barbellsquat", "backsquat"),
    DEADLIFT("デッドリフト", "デッドリフト", "バーベルデッドリフト", "deadlift", "barbelldeadlift");

    fun matches(name: String): Boolean {
        val normalized = Normalizer.normalize(name, Normalizer.Form.NFKC)
            .lowercase(Locale.ROOT).filterNot(Char::isWhitespace)
        return normalized in names
    }
}

data class TrainingAchievements(
    val bestEstimatedKg: Map<BigThreeLift, Double>,
    val consecutiveWeeks: Int,
    val recentWeekStarts: List<LocalDate>,
    val trainedWeeks: Set<LocalDate>,
) {
    val bigThreeTotalKg: Double?
        get() = if (BigThreeLift.entries.all { it in bestEstimatedKg }) bestEstimatedKg.values.sum() else null
}

object TrainingAchievementsAggregator {
    fun aggregate(
        records: List<CompletedTrainingSet>,
        exercises: List<ExerciseEntity>,
        weekStartsMonday: Boolean,
        today: LocalDate = LocalDate.now(),
        zone: ZoneId = ZoneId.systemDefault(),
    ): TrainingAchievements {
        val firstDay = if (weekStartsMonday) DayOfWeek.MONDAY else DayOfWeek.SUNDAY
        fun weekOf(date: LocalDate) = date.with(TemporalAdjusters.previousOrSame(firstDay))
        val datedRecords = records.map { it to it.sessionStartedAt.atZone(zone).toLocalDate() }
            .filter { (_, date) -> date <= today }
        val trainedWeeks = datedRecords.mapTo(mutableSetOf()) { (_, date) -> weekOf(date) }
        val currentWeek = weekOf(today)
        // A new week is still in progress: keep last week's streak until this week ends.
        var cursor = if (currentWeek in trainedWeeks) currentWeek else currentWeek.minusWeeks(1)
        var consecutiveWeeks = 0
        while (cursor in trainedWeeks) {
            consecutiveWeeks++
            cursor = cursor.minusWeeks(1)
        }

        val liftByExerciseId = exercises.filter { it.mode == ExerciseMode.NORMAL }.mapNotNull { exercise ->
            BigThreeLift.entries.firstOrNull { it.matches(exercise.name) }?.let { exercise.id to it }
        }.toMap()
        val best = mutableMapOf<BigThreeLift, Double>()
        datedRecords.forEach { (record, _) ->
            val lift = liftByExerciseId[record.exerciseId] ?: return@forEach
            val weight = record.normalWeightKg?.takeIf { it.isFinite() && it > 0.0 } ?: return@forEach
            val reps = record.normalReps?.takeIf { it in 1..10 } ?: return@forEach
            // Epley estimate; a recorded single uses the weight actually lifted.
            val estimate = if (reps == 1) weight else weight * (1.0 + reps / 30.0)
            if (estimate.isFinite() && estimate > (best[lift] ?: 0.0)) best[lift] = estimate
        }
        return TrainingAchievements(
            bestEstimatedKg = best,
            consecutiveWeeks = consecutiveWeeks,
            recentWeekStarts = (6 downTo 0).map { currentWeek.minusWeeks(it.toLong()) },
            trainedWeeks = trainedWeeks,
        )
    }
}
