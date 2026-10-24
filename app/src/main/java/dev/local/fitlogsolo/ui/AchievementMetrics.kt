package dev.local.fitlogsolo.ui

import androidx.compose.animation.Crossfade
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.local.fitlogsolo.data.AchievementMetric
import dev.local.fitlogsolo.data.TrainingAchievements
import java.text.NumberFormat
import java.time.LocalDate
import java.time.Period
import java.time.temporal.ChronoUnit
import java.util.Locale

@Composable
internal fun AchievementMetricsGrid(
    summary: TrainingAchievements?,
    selected: Set<AchievementMetric>,
    today: LocalDate,
    onDetails: (String) -> Unit,
) {
    val metrics = AchievementMetric.entries.filter {
        it in selected && it != AchievementMetric.BIG_THREE && it != AchievementMetric.WEEK_STREAK
    }
    Column(Modifier.fillMaxWidth().animateContentSize(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        metrics.chunked(2).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { metric ->
                    Card(
                        onClick = hapticClick { onDetails(metric.key) },
                        modifier = Modifier.weight(1f),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                    ) {
                        Column(
                            Modifier.fillMaxWidth().heightIn(min = 140.dp).padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(metric.label, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                            Crossfade(summary, label = "achievement ${metric.key}") { value ->
                                val display = metricDisplay(metric, value, today)
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Text(display.value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold,
                                            color = MaterialTheme.colorScheme.primary)
                                        if (display.unit.isNotEmpty()) Text(display.unit, Modifier.padding(bottom = 3.dp), style = MaterialTheme.typography.labelSmall)
                                    }
                                    Text(display.caption, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
internal fun AchievementDisplayEditor(
    selected: Set<AchievementMetric>,
    onSave: (Set<AchievementMetric>) -> Unit,
    onDismiss: () -> Unit,
) {
    var draft by remember(selected) { mutableStateOf(selected) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("表示する項目") },
        text = {
            Column(Modifier.fillMaxWidth().heightIn(max = 440.dp).verticalScroll(rememberScrollState())) {
                Row {
                    TextButton(onClick = hapticClick { draft = AchievementMetric.entries.toSet() }) { Text("すべて表示") }
                    TextButton(onClick = hapticClick { draft = emptySet() }) { Text("すべて非表示") }
                }
                AchievementMetric.entries.forEach { metric ->
                    val toggle = hapticClick { draft = if (metric in draft) draft - metric else draft + metric }
                    Row(
                        Modifier.fillMaxWidth().toggleable(metric in draft, role = Role.Checkbox, onValueChange = { toggle() })
                            .padding(vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Checkbox(checked = metric in draft, onCheckedChange = null)
                        Column(Modifier.weight(1f).padding(start = 10.dp)) {
                            Text(metric.label, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                            Text(metric.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = hapticClick { onSave(draft); onDismiss() }) { Text("保存") } },
        dismissButton = { TextButton(onClick = hapticClick(onDismiss)) { Text("キャンセル") } },
    )
}

private data class MetricDisplay(val value: String, val unit: String, val caption: String)

private fun metricDisplay(metric: AchievementMetric, summary: TrainingAchievements?, today: LocalDate): MetricDisplay {
    if (summary == null) return MetricDisplay("—", "", "読み込み中")
    fun count(value: Number) = NumberFormat.getIntegerInstance(Locale.JAPAN).format(value)
    return when (metric) {
        AchievementMetric.TRAINING_DAYS -> MetricDisplay(count(summary.trainingDays), "日", "積み重ねた日数")
        AchievementMetric.COMPLETED_SETS -> MetricDisplay(count(summary.completedSets), "セット", "これまでの完了セット")
        AchievementMetric.REPETITIONS -> MetricDisplay(count(summary.totalRepetitions), "回", "左右の回数も合算")
        AchievementMetric.PERSONAL_BESTS -> MetricDisplay(count(summary.personalBestUpdates), "回", "自己ベストを更新")
        AchievementMetric.LIFTED_WEIGHT -> {
            val tonnes = summary.liftedWeightKg >= 1_000.0
            MetricDisplay(String.format(Locale.JAPAN, "%,.1f", if (tonnes) summary.liftedWeightKg / 1_000.0 else summary.liftedWeightKg),
                if (tonnes) "トン" else "kg", "重量 × 回数の合計")
        }
        AchievementMetric.RECORD_HISTORY -> {
            val first = summary.firstTrainingDate ?: return MetricDisplay("—", "", "まだ記録がありません")
            val period = Period.between(first, today)
            val (value, unit) = when {
                period.years > 0 -> (if (period.months > 0) "${period.years}年${period.months}" else "${period.years}") to
                    (if (period.months > 0) "か月" else "年")
                period.months > 0 -> period.months.toString() to "か月"
                else -> (ChronoUnit.DAYS.between(first, today) + 1).toString() to "日"
            }
            MetricDisplay(value, unit, "${first.year}/${first.monthValue}/${first.dayOfMonth} から")
        }
        else -> MetricDisplay("—", "", "")
    }
}

internal fun achievementMetricExplanation(metric: AchievementMetric): String = when (metric) {
    AchievementMetric.TRAINING_DAYS -> "1セット以上完了して終了したトレーニングの日数です。同じ日に複数回行っても1日として数えます。"
    AchievementMetric.COMPLETED_SETS -> "終了したトレーニングの完了セット数を合計します。スキップしたセットは含めず、左右別種目は左右を終えて1セットと数えます。"
    AchievementMetric.RECORD_HISTORY -> "最初に記録したトレーニングの日から今日までの期間です。記録していない期間も含み、アプリを使う前の筋トレ歴は含みません。"
    AchievementMetric.LIFTED_WEIGHT -> "完了セットの重量 × 回数を合計します。左右別種目は左右それぞれの重量 × 回数を加算します。重量や回数が未入力の部分は加算しません。1,000kg以上はトンで表示します。"
    AchievementMetric.REPETITIONS -> "完了セットの回数を合計します。左右別種目は左右それぞれの回数を加算し、未入力やスキップしたセットは含めません。"
    AchievementMetric.PERSONAL_BESTS -> "種目ごとの最高重量、または同じ重量での最高回数を更新した回数です。初回の記録は基準として数えません。\n\n1回のトレーニングにつき種目ごとに最大1回、左右別種目は左右ごとに最大1回として数えます。重量・回数がそろった完了記録が対象です。"
    else -> metric.description
}
