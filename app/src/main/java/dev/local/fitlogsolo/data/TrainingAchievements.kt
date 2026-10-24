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
    val sessionId: Long = 0,
    val setId: Long = 0,
    val leftWeightKg: Double? = null,
    val leftReps: Int? = null,
    val rightWeightKg: Double? = null,
    val rightReps: Int? = null,
    val exerciseMode: ExerciseMode = ExerciseMode.NORMAL,
)

enum class AchievementMetric(val key: String, val label: String, val description: String) {
    TRAINING_DAYS("days", "累計トレーニング日数", "同じ日に複数回行っても1日"),
    COMPLETED_SETS("sets", "累計完了セット数", "左右別種目は左右で1セット"),
    RECORD_HISTORY("history", "記録歴", "最初のトレーニング記録からの期間"),
    WEEK_STREAK("streak", "継続週数", "週に1回以上取り組めた連続週数"),
    LIFTED_WEIGHT("volume", "累計挙上重量", "重量×回数。左右別も合算"),
    REPETITIONS("reps", "累計回数", "完了セットの回数。左右別も合算"),
    PERSONAL_BESTS("bests", "自己ベスト更新回数", "初回を除く、最高重量・回数の更新"),
    BIG_THREE("big3", "BIG3トータル", "3種目の最高推定1RMの合計");
}

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
    val trainingDays: Int,
    val completedSets: Int,
    val firstTrainingDate: LocalDate?,
    val liftedWeightKg: Double,
    val totalRepetitions: Long,
    val personalBestUpdates: Int,
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
        var liftedWeightKg = 0.0
        var totalRepetitions = 0L
        // Each exercise/side has its own baseline; warm-up sets cannot inflate the count.
        val previousBests = mutableMapOf<Pair<Long, Int>, Pair<Double, Int>>()
        val performanceOrder = compareBy<Pair<Double, Int>> { it.first }.thenBy { it.second }
        var personalBestUpdates = 0
        val sessions = datedRecords.map { it.first }.groupBy { it.sessionId }.values
            .sortedWith(compareBy<List<CompletedTrainingSet>> { it.first().sessionStartedAt }.thenBy { it.first().sessionId })
        sessions.forEach { sessionRecords ->
            val sessionBests = mutableMapOf<Pair<Long, Int>, Pair<Double, Int>>()
            sessionRecords.forEach { record ->
                val sides = if (record.exerciseMode == ExerciseMode.BILATERAL) {
                    listOf(record.leftWeightKg to record.leftReps, record.rightWeightKg to record.rightReps)
                } else listOf(record.normalWeightKg to record.normalReps)
                sides.forEachIndexed { side, (weight, repetitions) ->
                    val reps = repetitions?.takeIf { it > 0 } ?: return@forEachIndexed
                    totalRepetitions += reps.toLong()
                    val kg = weight?.takeIf { it.isFinite() && it >= 0.0 } ?: return@forEachIndexed
                    val volume = kg * reps
                    if (volume.isFinite() && (liftedWeightKg + volume).isFinite()) liftedWeightKg += volume
                    val key = record.exerciseId to side
                    val performance = kg to reps
                    val currentBest = sessionBests[key]
                    if (currentBest == null || performanceOrder.compare(performance, currentBest) > 0) {
                        sessionBests[key] = performance
                    }
                }
            }
            sessionBests.forEach { (key, performance) ->
                val previous = previousBests[key]
                if (previous == null || performanceOrder.compare(performance, previous) > 0) {
                    if (previous != null) personalBestUpdates++
                    previousBests[key] = performance
                }
            }
        }
        return TrainingAchievements(
            bestEstimatedKg = best,
            consecutiveWeeks = consecutiveWeeks,
            recentWeekStarts = (6 downTo 0).map { currentWeek.minusWeeks(it.toLong()) },
            trainedWeeks = trainedWeeks,
            trainingDays = datedRecords.map { it.second }.toSet().size,
            completedSets = datedRecords.size,
            firstTrainingDate = datedRecords.minOfOrNull { it.second },
            liftedWeightKg = liftedWeightKg,
            totalRepetitions = totalRepetitions,
            personalBestUpdates = personalBestUpdates,
        )
    }
}
