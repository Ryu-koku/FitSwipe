package dev.local.fitlogsolo.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Divider
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.tooling.preview.Preview
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.local.fitlogsolo.FitLogViewModel
import dev.local.fitlogsolo.data.BilateralWorkoutPoints
import dev.local.fitlogsolo.data.ExerciseEntity
import dev.local.fitlogsolo.data.ExerciseMode
import dev.local.fitlogsolo.data.GraphAggregator
import dev.local.fitlogsolo.data.SessionStatus
import dev.local.fitlogsolo.data.WorkoutPoint
import dev.local.fitlogsolo.data.WorkoutSetEntity
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private enum class Tab { RECORD, HISTORY, CHARTS }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FitLogApp(
    viewModel: FitLogViewModel,
    onExport: () -> Unit,
) {
    var tab by rememberSaveable { mutableStateOf(Tab.RECORD) }
    var settings by rememberSaveable { mutableStateOf(false) }
    var selectedExerciseId by rememberSaveable { mutableStateOf<Long?>(null) }
    var selectedHistoryId by rememberSaveable { mutableStateOf<Long?>(null) }
    var showAddExercise by rememberSaveable { mutableStateOf(false) }
    val exercises by viewModel.exercises.collectAsStateWithLifecycle()
    val activeSession by viewModel.activeSession.collectAsStateWithLifecycle()
    val sessions by viewModel.completedSessions.collectAsStateWithLifecycle()
    val message by viewModel.message.collectAsStateWithLifecycle()
    val snackbar = SnackbarHostState()

    LaunchedEffect(message) {
        if (message != null) {
            snackbar.showSnackbar(message!!)
            viewModel.clearMessage()
        }
    }

    val selectedExercise = exercises.firstOrNull { it.id == selectedExerciseId }
    Scaffold(
        modifier = Modifier.safeDrawingPadding(),
        topBar = {
            TopAppBar(
                title = { Text(if (settings) "設定" else "FitLog Solo") },
                navigationIcon = { if (settings) IconButton(onClick = { settings = false }) { Icon(Icons.Default.ArrowBack, "戻る") } },
                actions = { if (!settings) IconButton(onClick = { settings = true }) { Icon(Icons.Default.Settings, "設定") } },
            )
        },
        bottomBar = {
            if (!settings) {
                NavigationBar(modifier = Modifier.windowInsetsPadding(WindowInsets.navigationBars)) {
                    NavigationBarItem(
                        selected = tab == Tab.RECORD,
                        onClick = { tab = Tab.RECORD; selectedExerciseId = null },
                        icon = { Icon(Icons.Default.FitnessCenter, "記録") },
                        label = { Text("記録") },
                    )
                    NavigationBarItem(
                        selected = tab == Tab.HISTORY,
                        onClick = { tab = Tab.HISTORY },
                        icon = { Icon(Icons.Default.History, "履歴") },
                        label = { Text("履歴") },
                    )
                    NavigationBarItem(
                        selected = tab == Tab.CHARTS,
                        onClick = { tab = Tab.CHARTS },
                        icon = { Icon(Icons.Default.BarChart, "グラフ") },
                        label = { Text("グラフ") },
                    )
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Surface(Modifier.fillMaxSize().padding(padding)) {
            if (settings) {
                SettingsScreen(
                    viewModel = viewModel,
                    exercises = exercises,
                    onAddExercise = { showAddExercise = true },
                    onExport = onExport,
                )
            } else {
                when (tab) {
                    Tab.RECORD -> RecordScreen(
                        viewModel = viewModel,
                        exercises = exercises,
                        activeSessionId = activeSession?.id,
                        selectedExercise = selectedExercise,
                        onSelectExercise = { exercise ->
                            viewModel.startSession { selectedExerciseId = exercise.id }
                        },
                        onBack = { selectedExerciseId = null },
                        onAddExercise = { showAddExercise = true },
                    )
                    Tab.HISTORY -> HistoryScreen(
                        viewModel = viewModel,
                        sessions = sessions,
                        exercises = exercises,
                        selectedSessionId = selectedHistoryId,
                        onSelect = { selectedHistoryId = it },
                        onClose = { selectedHistoryId = null },
                        onEdit = { id ->
                            viewModel.reopenSession(id) { tab = Tab.RECORD; selectedHistoryId = null }
                        },
                    )
                    Tab.CHARTS -> WorkoutChartScreen(viewModel, exercises)
                }
            }
        }
    }

    if (showAddExercise) {
        AddExerciseDialog(
            onDismiss = { showAddExercise = false },
            onSave = { name, mode -> viewModel.addExercise(name, mode); showAddExercise = false },
        )
    }
}

@Composable
private fun RecordScreen(
    viewModel: FitLogViewModel,
    exercises: List<ExerciseEntity>,
    activeSessionId: Long?,
    selectedExercise: ExerciseEntity?,
    onSelectExercise: (ExerciseEntity) -> Unit,
    onBack: () -> Unit,
    onAddExercise: () -> Unit,
) {
    if (selectedExercise != null && activeSessionId != null) {
        ExerciseEditor(viewModel, activeSessionId, selectedExercise, onBack)
        return
    }
    val sessionSets by (activeSessionId?.let(viewModel::sessionSets) ?: kotlinx.coroutines.flow.flowOf(emptyList()))
        .collectAsStateWithLifecycle(emptyList())
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text(
            text = "${java.time.LocalDate.now()} のトレーニング",
            style = MaterialTheme.typography.titleLarge,
        )
        Spacer(Modifier.height(8.dp))
        if (activeSessionId == null) {
            Text("種目を選ぶと、今日の下書きセッションを開始します。")
        } else {
            Text("記録中: ${sessionSets.map { it.exerciseId }.distinct().size}種目 / ${sessionSets.size}セット")
        }
        Spacer(Modifier.height(16.dp))
        if (exercises.isEmpty()) {
            EmptyState("よく使う種目がまだありません", "種目を追加して記録を始めましょう。", onAddExercise)
        } else {
            LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(exercises, key = { it.id }) { exercise ->
                    ExerciseCard(exercise, onClick = { onSelectExercise(exercise) })
                }
                item { OutlinedButton(onClick = onAddExercise, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.Add, null); Text("種目を追加") } }
            }
        }
        if (activeSessionId != null) {
            Button(
                onClick = { viewModel.finishSession(activeSessionId) },
                modifier = Modifier.fillMaxWidth().height(56.dp),
            ) { Icon(Icons.Default.Check, null); Spacer(Modifier.size(8.dp)); Text("終了して保存") }
        }
    }
}

@Composable
private fun ExerciseCard(exercise: ExerciseEntity, onClick: () -> Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(exercise.name, style = MaterialTheme.typography.titleMedium)
                Text(if (exercise.mode == ExerciseMode.NORMAL) "通常" else "左右別", style = MaterialTheme.typography.bodySmall)
            }
            Icon(Icons.Default.FitnessCenter, contentDescription = "記録する")
        }
    }
}

@Composable
private fun ExerciseEditor(
    viewModel: FitLogViewModel,
    sessionId: Long,
    exercise: ExerciseEntity,
    onBack: () -> Unit,
) {
    val sets by viewModel.exerciseSets(sessionId, exercise.id).collectAsStateWithLifecycle()
    LaunchedEffect(sessionId, exercise.id) {
        if (sets.isEmpty()) viewModel.addSet(sessionId, exercise)
    }
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "戻る") }
            Column {
                Text(exercise.name, style = MaterialTheme.typography.titleLarge)
                Text("前回の値を候補として表示しています", style = MaterialTheme.typography.bodySmall)
            }
        }
        LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(sets, key = { it.id }) { set ->
                SetEditorCard(exercise, set, viewModel::updateSet)
            }
            item {
                OutlinedButton(
                    onClick = { viewModel.duplicateSet(sessionId, exercise.id) },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                ) { Icon(Icons.Default.Add, null); Spacer(Modifier.size(8.dp)); Text("＋セット") }
            }
        }
    }
}

@Composable
private fun SetEditorCard(
    exercise: ExerciseEntity,
    set: WorkoutSetEntity,
    onUpdate: (WorkoutSetEntity) -> Unit,
) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("セット ${set.setOrder + 1}", style = MaterialTheme.typography.titleSmall)
            if (exercise.mode == ExerciseMode.NORMAL) {
                NumberRow(
                    label = "重量kg",
                    value = set.normalWeightKg?.toInput() ?: "",
                    keyboard = KeyboardType.Decimal,
                    onChange = { onUpdate(set.copy(normalWeightKg = it.toDoubleOrNull()?.takeIf { value -> value.isFinite() && value >= 0 })) },
                )
                NumberRow(
                    label = "回数",
                    value = set.normalReps?.toString() ?: "",
                    keyboard = KeyboardType.Number,
                    onChange = { onUpdate(set.copy(normalReps = it.toIntOrNull()?.takeIf { value -> value >= 0 })) },
                )
            } else {
                Text("左", style = MaterialTheme.typography.labelLarge)
                NumberRow("重量kg", set.leftWeightKg?.toInput() ?: "", KeyboardType.Decimal) {
                    onUpdate(set.copy(leftWeightKg = it.toDoubleOrNull()?.takeIf { value -> value.isFinite() && value >= 0 }))
                }
                NumberRow("回数", set.leftReps?.toString() ?: "", KeyboardType.Number) {
                    onUpdate(set.copy(leftReps = it.toIntOrNull()?.takeIf { value -> value >= 0 }))
                }
                Text("右", style = MaterialTheme.typography.labelLarge)
                NumberRow("重量kg", set.rightWeightKg?.toInput() ?: "", KeyboardType.Decimal) {
                    onUpdate(set.copy(rightWeightKg = it.toDoubleOrNull()?.takeIf { value -> value.isFinite() && value >= 0 }))
                }
                NumberRow("回数", set.rightReps?.toString() ?: "", KeyboardType.Number) {
                    onUpdate(set.copy(rightReps = it.toIntOrNull()?.takeIf { value -> value >= 0 }))
                }
                if (set.leftWeightKg == null || set.leftReps == null || set.rightWeightKg == null || set.rightReps == null) {
                    Text("未入力側があります", color = MaterialTheme.colorScheme.error)
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = set.isCompleted, onCheckedChange = { onUpdate(set.copy(isCompleted = it)) })
                Text("完了")
            }
        }
    }
}

@Composable
private fun NumberRow(label: String, value: String, keyboard: KeyboardType, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = keyboard),
        modifier = Modifier.fillMaxWidth(),
    )
}

private fun Double.toInput(): String = String.format(Locale.US, "%.2f", this).trimEnd('0').trimEnd('.')

@Composable
private fun HistoryScreen(
    viewModel: FitLogViewModel,
    sessions: List<dev.local.fitlogsolo.data.WorkoutSessionEntity>,
    exercises: List<ExerciseEntity>,
    selectedSessionId: Long?,
    onSelect: (Long) -> Unit,
    onClose: () -> Unit,
    onEdit: (Long) -> Unit,
) {
    if (sessions.isEmpty()) {
        EmptyState("履歴はまだありません", "記録タブでトレーニングを保存すると、ここに表示されます。")
        return
    }
    val exerciseNames = exercises.associate { it.id to it.name }
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(sessions, key = { it.id }) { session ->
            val sets by viewModel.sessionSets(session.id).collectAsStateWithLifecycle()
            Card(Modifier.fillMaxWidth().clickable { onSelect(session.id) }) {
                Column(Modifier.padding(16.dp)) {
                    Text(formatInstant(session.startedAt), style = MaterialTheme.typography.titleMedium)
                    Text("${sets.map { it.exerciseId }.distinct().size}種目 / ${sets.size}セット")
                    Text(sets.mapNotNull { exerciseNames[it.exerciseId] }.distinct().joinToString("、"), style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
    if (selectedSessionId != null) {
        SessionDetailDialog(
            viewModel = viewModel,
            sessionId = selectedSessionId,
            exerciseNames = exerciseNames,
            onDismiss = onClose,
            onEdit = { onEdit(selectedSessionId) },
        )
    }
}

@Composable
private fun SessionDetailDialog(
    viewModel: FitLogViewModel,
    sessionId: Long,
    exerciseNames: Map<Long, String>,
    onDismiss: () -> Unit,
    onEdit: () -> Unit,
) {
    val sets by viewModel.sessionSets(sessionId).collectAsStateWithLifecycle()
    var confirmDelete by rememberSaveable(sessionId) { mutableStateOf(false) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("トレーニング詳細") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                sets.groupBy { it.exerciseId }.forEach { (exerciseId, exerciseSets) ->
                    Text(exerciseNames[exerciseId] ?: "種目", style = MaterialTheme.typography.titleSmall)
                    exerciseSets.forEach { set ->
                        val value = if (set.normalWeightKg != null || set.normalReps != null) {
                            "${set.normalWeightKg?.toInput() ?: "—"}kg × ${set.normalReps ?: "—"}回"
                        } else {
                            "左 ${set.leftWeightKg?.toInput() ?: "—"}kg × ${set.leftReps ?: "—"}回 / 右 ${set.rightWeightKg?.toInput() ?: "—"}kg × ${set.rightReps ?: "—"}回"
                        }
                        Text("セット ${set.setOrder + 1}: $value")
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
        },
        confirmButton = { TextButton(onClick = onEdit) { Icon(Icons.Default.Edit, null); Text("編集") } },
        dismissButton = {
            Row {
                TextButton(onClick = { confirmDelete = true }) { Icon(Icons.Default.Delete, null); Text("削除") }
                TextButton(onClick = onDismiss) { Text("閉じる") }
            }
        },
    )
    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("履歴を削除しますか？") },
            text = { Text("このセッションとセット記録を削除します。この操作は戻せません。") },
            confirmButton = {
                TextButton(onClick = { viewModel.deleteSession(sessionId); confirmDelete = false; onDismiss() }) { Text("削除") }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("キャンセル") } },
        )
    }
}

@Composable
private fun WorkoutChartScreen(
    viewModel: FitLogViewModel,
    exercises: List<ExerciseEntity>,
) {
    Column(Modifier.fillMaxSize().padding(16.dp)) { WorkoutChart(viewModel, exercises) }
}

@Composable
private fun WorkoutChart(viewModel: FitLogViewModel, exercises: List<ExerciseEntity>) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    var selectedId by rememberSaveable { mutableStateOf<Long?>(null) }
    val selected = exercises.firstOrNull { it.id == selectedId } ?: exercises.firstOrNull()
    val chartData by produceState<Pair<List<WorkoutPoint>, BilateralWorkoutPoints?>>(emptyList<WorkoutPoint>() to null, selected?.id) {
        value = if (selected == null) emptyList<WorkoutPoint>() to null else {
            when (val result = viewModel.pointsFor(selected)) {
                is List<*> -> @Suppress("UNCHECKED_CAST") (result as List<WorkoutPoint>) to null
                is BilateralWorkoutPoints -> emptyList<WorkoutPoint>() to result
                else -> emptyList<WorkoutPoint>() to null
            }
        }
    }
    if (selected == null) {
        EmptyState("グラフを表示できる種目がありません", "記録タブから種目を追加してください。")
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Box {
            OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) { Text(selected.name) }
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                exercises.forEach { exercise ->
                    DropdownMenuItem(text = { Text(exercise.name) }, onClick = { selectedId = exercise.id; expanded = false })
                }
            }
        }
        if (selected.mode == ExerciseMode.NORMAL) {
            if (chartData.first.isEmpty()) EmptyState("この種目の完了記録がありません", "セットを完了すると重量推移が表示されます。")
            else LineGraph(chartData.first, MaterialTheme.colorScheme.primary)
        } else {
            val data = chartData.second
            if (data == null || (data.left.isEmpty() && data.right.isEmpty())) EmptyState("この種目の完了記録がありません")
            else {
                if (data.left.isNotEmpty()) LineGraph(data.left, MaterialTheme.colorScheme.primary, "左")
                if (data.right.isNotEmpty()) LineGraph(data.right, MaterialTheme.colorScheme.tertiary, "右")
            }
        }
        Text("各トレーニング日の最大使用重量を表示しています。", style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun LineGraph(points: List<WorkoutPoint>, color: Color, label: String? = null) {
    Column {
        if (label != null) Text(label, color = color, style = MaterialTheme.typography.labelLarge)
        Canvas(Modifier.fillMaxWidth().height(220.dp).padding(8.dp)) {
            if (points.isEmpty()) return@Canvas
            val max = points.maxOf { it.value }.coerceAtLeast(1.0)
            val min = points.minOf { it.value }.coerceAtMost(0.0)
            val range = (max - min).coerceAtLeast(1.0)
            val xStep = if (points.size == 1) 0f else size.width / (points.size - 1)
            val path = Path()
            points.forEachIndexed { index, point ->
                val x = index * xStep
                val y = size.height - ((point.value - min) / range * size.height).toFloat()
                if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
                drawCircle(color, 5f, androidx.compose.ui.geometry.Offset(x, y))
            }
            drawPath(path, color, style = Stroke(width = 5f, cap = StrokeCap.Round))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(points.first().date, style = MaterialTheme.typography.labelSmall)
            Text("最大 ${points.maxOf { it.value }.toInput()} kg", style = MaterialTheme.typography.labelSmall)
            Text(points.last().date, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun SettingsScreen(
    viewModel: FitLogViewModel,
    exercises: List<ExerciseEntity>,
    onAddExercise: () -> Unit,
    onExport: () -> Unit,
) {
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("種目を管理", style = MaterialTheme.typography.titleLarge) }
        item { Button(onClick = onAddExercise, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.Add, null); Text("種目を追加") } }
        items(exercises, key = { it.id }) { exercise ->
            var editing by rememberSaveable(exercise.id) { mutableStateOf(false) }
            var name by rememberSaveable(exercise.id) { mutableStateOf(exercise.name) }
            Card(Modifier.fillMaxWidth()) {
                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (editing) {
                        OutlinedTextField(name, { name = it }, modifier = Modifier.weight(1f), singleLine = true)
                        IconButton(onClick = { viewModel.renameExercise(exercise, name); editing = false }) { Icon(Icons.Default.Check, "保存") }
                    } else {
                        Column(Modifier.weight(1f)) { Text(exercise.name); Text(if (exercise.mode == ExerciseMode.NORMAL) "通常" else "左右別", style = MaterialTheme.typography.bodySmall) }
                        IconButton(onClick = { editing = true }) { Icon(Icons.Default.Edit, "名前を変更") }
                        IconButton(onClick = { viewModel.archiveExercise(exercise) }) { Icon(Icons.Default.Delete, "非表示") }
                    }
                }
            }
        }
        item { Divider() }
        item { Divider() }
        item { Text("データ", style = MaterialTheme.typography.titleLarge) }
        item { Button(onClick = onExport, modifier = Modifier.fillMaxWidth()) { Text("データを書き出す（JSON）") } }
        item { Text("このアプリは筋トレ記録を端末内に保存し、外部へ送信しません。", style = MaterialTheme.typography.bodySmall) }
    }
}

@Composable
private fun AddExerciseDialog(onDismiss: () -> Unit, onSave: (String, ExerciseMode) -> Unit) {
    var name by rememberSaveable { mutableStateOf("") }
    var mode by rememberSaveable { mutableStateOf(ExerciseMode.NORMAL) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("種目を追加") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("種目名") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    SegmentedButton(mode == ExerciseMode.NORMAL, { mode = ExerciseMode.NORMAL }, SegmentedButtonDefaults.itemShape(0, 2)) { Text("通常") }
                    SegmentedButton(mode == ExerciseMode.BILATERAL, { mode = ExerciseMode.BILATERAL }, SegmentedButtonDefaults.itemShape(1, 2)) { Text("左右別") }
                }
            }
        },
        confirmButton = { TextButton(enabled = name.trim().isNotEmpty(), onClick = { onSave(name, mode) }) { Text("追加") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("キャンセル") } },
    )
}

@Composable
private fun EmptyState(title: String, message: String = "", action: (() -> Unit)? = null) {
    Column(Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text(title, style = MaterialTheme.typography.titleMedium)
        if (message.isNotEmpty()) Text(message, modifier = Modifier.padding(top = 8.dp))
        if (action != null) Button(onClick = action, modifier = Modifier.padding(top = 16.dp)) { Text("種目を追加") }
    }
}

private fun formatInstant(instant: java.time.Instant): String = instant.atZone(ZoneId.systemDefault())
    .format(DateTimeFormatter.ofPattern("yyyy年M月d日（E）", Locale.JAPAN))

@Preview(showBackground = true)
@Composable
private fun EmptyStatePreview() {
    MaterialTheme { EmptyState("よく使う種目がまだありません", "種目を追加して記録を始めましょう。") }
}

@Preview(showBackground = true)
@Composable
private fun ExerciseCardPreview() {
    MaterialTheme { ExerciseCard(ExerciseEntity(name = "ベンチプレス"), onClick = {}) }
}
