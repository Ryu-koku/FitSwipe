package dev.local.fitlogsolo.ui

import androidx.compose.animation.Crossfade
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.repeatOnLifecycle
import dev.local.fitlogsolo.FitLogViewModel
import dev.local.fitlogsolo.data.BigThreeLift
import dev.local.fitlogsolo.data.AchievementMetric
import dev.local.fitlogsolo.data.ExerciseEntity
import dev.local.fitlogsolo.data.TrainingAchievements
import dev.local.fitlogsolo.data.TrainingAchievementsAggregator
import java.time.LocalDate
import java.util.Locale
import kotlinx.coroutines.delay
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withContext

@Composable
internal fun HomeAchievements(
    viewModel: FitLogViewModel,
    exercises: List<ExerciseEntity>,
    weekStartsMonday: Boolean,
) {
    val records by viewModel.completedTrainingSets.collectAsStateWithLifecycle()
    val visibleMetrics by viewModel.visibleAchievementMetrics.collectAsStateWithLifecycle()
    var editing by remember { mutableStateOf(false) }
    var today by remember { mutableStateOf(LocalDate.now()) }
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(lifecycle) {
        lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            while (isActive) {
                today = LocalDate.now()
                delay(60_000)
            }
        }
    }
    val achievements by produceState<TrainingAchievements?>(null, records, exercises, weekStartsMonday, today) {
        value = withContext(Dispatchers.Default) {
            records?.let { TrainingAchievementsAggregator.aggregate(it, exercises, weekStartsMonday, today) }
        }
    }
    var details by remember { mutableStateOf<String?>(null) }

    Column(Modifier.fillMaxWidth().animateContentSize(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                "これまでの頑張り",
                Modifier.weight(1f).padding(top = 10.dp, bottom = 2.dp),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            TextButton(onClick = hapticClick { editing = true }) { Text("編集") }
        }
        AchievementMetricsGrid(achievements, visibleMetrics, today) { details = it }
        if (visibleMetrics.isEmpty()) {
            Text("編集から表示する項目を選べます", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (AchievementMetric.BIG_THREE in visibleMetrics) Card(
            onClick = hapticClick { details = "big3" },
            modifier = Modifier.fillMaxWidth().animateContentSize(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        ) {
            Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text("BIG3トータル", Modifier.weight(1f), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Text("推定1RM", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                }
                Crossfade(achievements, animationSpec = tween(250), label = "big three total") { summary ->
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(
                                summary?.bigThreeTotalKg?.let(::achievementWeight) ?: "—",
                                style = MaterialTheme.typography.headlineLarge,
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.primary,
                            )
                            Text("kg", Modifier.padding(bottom = 5.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.weight(1f))
                            Text(
                                when {
                                    summary == null -> "読み込み中"
                                    summary.bigThreeTotalKg == null -> "${summary.bestEstimatedKg.size}/3種目を記録"
                                    else -> "自己ベストの合計"
                                },
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            BigThreeLift.entries.forEach { lift ->
                                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(
                                        if (lift == BigThreeLift.BENCH) "ベンチ" else lift.label,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Text(
                                        summary?.bestEstimatedKg?.get(lift)?.let { "${achievementWeight(it)} kg" }
                                            ?: if (summary == null) "—" else "未記録",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
        if (AchievementMetric.WEEK_STREAK in visibleMetrics) Card(
            onClick = hapticClick { details = "streak" },
            modifier = Modifier.fillMaxWidth().animateContentSize(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        ) {
            Column(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 22.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text("ストリーク", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Crossfade(achievements?.consecutiveWeeks, animationSpec = tween(250), label = "weekly streak") { weeks ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(
                            imageVector = Icons.Default.LocalFireDepartment,
                            contentDescription = "ストリーク",
                            modifier = Modifier.size(96.dp),
                            tint = MaterialTheme.colorScheme.primary,
                        )
                        Text(
                            weeks?.toString() ?: "—",
                            style = MaterialTheme.typography.displayMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
                Text(
                    "週",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text(
                    streakMessage(achievements),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }

    if (editing) AchievementDisplayEditor(visibleMetrics, viewModel::setVisibleAchievementMetrics) { editing = false }
    details?.let { selection ->
        val metric = AchievementMetric.entries.firstOrNull { it.key == selection }
        AlertDialog(
            onDismissRequest = { details = null },
            title = { Text("${metric?.label ?: "記録"}について") },
            text = {
                Text(
                    if (selection == "big3") {
                        "ベンチプレス・スクワット・デッドリフトの最高推定1RMの合計です。\n\n" +
                            "終了したトレーニングの、1〜10回・重量ありの完了セットが対象です。" +
                            "1回の記録は実際の重量、2〜10回はEpley式（重量 × (1 + 回数 ÷ 30)）で推定します。" +
                            "3種目すべてが記録されると合計を表示します。\n\n" +
                            "日本語・英語の基本種目名とバーベル種目名に対応しています。" +
                            "マシンやダンベルなどの別種目は合算しません。"
                    } else if (selection == "streak") {
                        "週に1回以上、1セット以上完了して終了したトレーニングがあると達成です。" +
                            "カレンダーの設定に合わせて、週は${if (weekStartsMonday) "月曜" else "日曜"}から数えます。\n\n" +
                            "今週がまだ未達成でも、先週までの継続週数は保持します。" +
                            "1週間まるごと記録がなければ、継続週数はリセットされます。"
                    } else metric?.let(::achievementMetricExplanation).orEmpty(),
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                )
            },
            confirmButton = { TextButton(onClick = hapticClick { details = null }) { Text("閉じる") } },
        )
    }
}

private fun achievementWeight(value: Double): String = String.format(Locale.JAPAN, "%.1f", value)

private fun streakMessage(summary: TrainingAchievements?): String = when {
    summary == null -> "記録を読み込み中"
    summary.recentWeekStarts.last() in summary.trainedWeeks -> "今週も達成！"
    summary.consecutiveWeeks > 0 -> "今週の記録で継続しよう"
    else -> "今週から積み重ねよう"
}
