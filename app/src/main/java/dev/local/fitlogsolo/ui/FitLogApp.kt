package dev.local.fitlogsolo.ui

import android.app.Activity
import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.SystemClock
import android.view.WindowManager
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Canvas
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
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
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Divider
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import dev.local.fitlogsolo.FitLogViewModel
import dev.local.fitlogsolo.WorkoutPlace
import dev.local.fitlogsolo.data.BilateralWorkoutPoints
import dev.local.fitlogsolo.data.ExerciseEntity
import dev.local.fitlogsolo.data.ExerciseMode
import dev.local.fitlogsolo.data.GraphAggregator
import dev.local.fitlogsolo.data.SessionStatus
import dev.local.fitlogsolo.data.WorkoutPoint
import dev.local.fitlogsolo.data.WorkoutSetEntity
import java.time.ZoneId
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.math.BigDecimal
import kotlin.math.abs
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private enum class Tab { RECORD, HISTORY, CHARTS }
private const val REST_SECONDS = 90L

private val FitLogRedColors = lightColorScheme(
    primary = Color(0xFFB3261E),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFFFDAD5),
    onPrimaryContainer = Color(0xFF410001),
    secondary = Color(0xFF8C1D18),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFFFDAD5),
    onSecondaryContainer = Color(0xFF410001),
    tertiary = Color(0xFF775652),
    background = Color(0xFFFFF8F7),
    surface = Color(0xFFFFF8F7),
    surfaceVariant = Color(0xFFF4DDDA),
    onSurface = Color(0xFF201A19),
    onSurfaceVariant = Color(0xFF534341),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FitLogApp(
    viewModel: FitLogViewModel,
    onExport: () -> Unit,
) {
    MaterialTheme(colorScheme = FitLogRedColors) {
        FitLogAppContent(viewModel, onExport)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FitLogAppContent(
    viewModel: FitLogViewModel,
    onExport: () -> Unit,
) {
    var tab by rememberSaveable { mutableStateOf(Tab.RECORD) }
    var settings by rememberSaveable { mutableStateOf(false) }
    var selectedExerciseId by rememberSaveable { mutableStateOf<Long?>(null) }
    var selectedHistoryId by rememberSaveable { mutableStateOf<Long?>(null) }
    var showAddExercise by rememberSaveable { mutableStateOf(false) }
    var restEndsAtMillis by rememberSaveable { mutableLongStateOf(0L) }
    var presetExerciseOrder by rememberSaveable { mutableStateOf("") }
    val exercises by viewModel.exercises.collectAsStateWithLifecycle()
    val activeSession by viewModel.activeSession.collectAsStateWithLifecycle()
    val sessions by viewModel.completedSessions.collectAsStateWithLifecycle()
    val routineExerciseIds by viewModel.routineExerciseIds.collectAsStateWithLifecycle()
    val flatModeEnabled by viewModel.flatModeEnabled.collectAsStateWithLifecycle()
    val displayName by viewModel.displayName.collectAsStateWithLifecycle()
    val message by viewModel.message.collectAsStateWithLifecycle()
    val snackbar = SnackbarHostState()
    val flatCandidate = rememberFlatDeviceCandidate(flatModeEnabled, activeSession != null)

    LaunchedEffect(Unit) { viewModel.initializeDefaultPresets() }

    LaunchedEffect(restEndsAtMillis) {
        if (restEndsAtMillis > 0L) {
            val remainingMillis = restEndsAtMillis - System.currentTimeMillis()
            if (remainingMillis > 0L) delay(remainingMillis)
            if (System.currentTimeMillis() >= restEndsAtMillis) restEndsAtMillis = 0L
        }
    }

    val context = LocalContext.current
    DisposableEffect(activeSession != null) {
        val window = (context as? Activity)?.window
        val keepAwake = activeSession != null
        if (keepAwake) window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose {
            if (keepAwake) window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    LaunchedEffect(message) {
        if (message != null) {
            snackbar.showSnackbar(message!!)
            viewModel.clearMessage()
        }
    }

    val selectedExercise = exercises.firstOrNull { it.id == selectedExerciseId }
    val workoutFullscreen = activeSession != null
    BackHandler(
        enabled = showAddExercise || settings || tab != Tab.RECORD || (activeSession != null && selectedExerciseId != null),
    ) {
        when {
            showAddExercise -> showAddExercise = false
            settings -> { settings = false; tab = Tab.RECORD }
            tab == Tab.HISTORY && selectedHistoryId != null -> selectedHistoryId = null
            tab != Tab.RECORD -> { settings = true; tab = Tab.RECORD }
            activeSession != null && selectedExerciseId != null -> selectedExerciseId = null
        }
    }
    Scaffold(
        modifier = Modifier.safeDrawingPadding(),
        topBar = {
            if (!workoutFullscreen && (settings || tab != Tab.RECORD)) {
                TopAppBar(
                    title = { Text(when { settings -> "設定"; tab == Tab.HISTORY -> "履歴"; else -> "グラフ" }) },
                    navigationIcon = {
                        if (settings || tab != Tab.RECORD) {
                            IconButton(onClick = {
                                if (settings) settings = false else settings = true
                                tab = Tab.RECORD
                            }) { Icon(Icons.Default.ArrowBack, "戻る") }
                        }
                    },
                )
            }
        },
        floatingActionButton = {
            if (!workoutFullscreen && !settings && tab == Tab.RECORD && !flatCandidate) {
                FloatingActionButton(onClick = { settings = true }) {
                    Icon(Icons.Default.Settings, contentDescription = "設定")
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Surface(Modifier.fillMaxSize().padding(padding)) {
            if (!settings && activeSession != null && flatCandidate) {
                WorkoutDock(displayName = displayName)
            } else if (settings) {
                SettingsScreen(
                    viewModel = viewModel,
                    exercises = exercises,
                    onAddExercise = { showAddExercise = true },
                    onExport = onExport,
                    flatModeEnabled = flatModeEnabled,
                    displayName = displayName,
                    onDisplayNameChange = viewModel::setDisplayName,
                    onFlatModeEnabledChange = viewModel::setFlatModeEnabled,
                    onShowHistory = { settings = false; tab = Tab.HISTORY },
                    onShowCharts = { settings = false; tab = Tab.CHARTS },
                )
            } else {
                when (tab) {
                    Tab.RECORD -> RecordScreen(
                        viewModel = viewModel,
                        exercises = exercises,
                        routineExerciseIds = routineExerciseIds,
                        activeSessionId = activeSession?.id,
                        completedSessions = sessions,
                        presetExerciseOrder = presetExerciseOrder.split(',').mapNotNull(String::toLongOrNull),
                        selectedExercise = selectedExercise,
                        restEndsAtMillis = restEndsAtMillis,
                        onStartPreset = { place ->
                            viewModel.startPreset(place) { _, exerciseIds ->
                                selectedExerciseId = exerciseIds.firstOrNull()
                                presetExerciseOrder = exerciseIds.joinToString(",")
                            }
                        },
                        onSelectExercise = { exercise ->
                            viewModel.startExercise(exercise) {
                                selectedExerciseId = exercise.id
                            }
                        },
                        onToggleRoutineExercise = viewModel::toggleRoutineExercise,
                        onSetCompleted = { restEndsAtMillis = System.currentTimeMillis() + REST_SECONDS * 1_000L },
                        onAddRestSeconds = { restEndsAtMillis = maxOf(restEndsAtMillis, System.currentTimeMillis()) + 15_000L },
                        onSkipRest = { restEndsAtMillis = 0L },
                        onFinishSession = {
                            activeSession?.id?.let(viewModel::finishSession)
                            selectedExerciseId = null
                            restEndsAtMillis = 0L
                            presetExerciseOrder = ""
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
    routineExerciseIds: List<Long>,
    activeSessionId: Long?,
    completedSessions: List<dev.local.fitlogsolo.data.WorkoutSessionEntity>,
    presetExerciseOrder: List<Long>,
    selectedExercise: ExerciseEntity?,
    restEndsAtMillis: Long,
    onStartPreset: (WorkoutPlace) -> Unit,
    onSelectExercise: (ExerciseEntity) -> Unit,
    onToggleRoutineExercise: (Long) -> Unit,
    onSetCompleted: () -> Unit,
    onAddRestSeconds: () -> Unit,
    onSkipRest: () -> Unit,
    onFinishSession: () -> Unit,
    onBack: () -> Unit,
    onAddExercise: () -> Unit,
) {
    val sessionSets by (activeSessionId?.let(viewModel::sessionSets) ?: kotlinx.coroutines.flow.flowOf(emptyList()))
        .collectAsStateWithLifecycle(emptyList())
    if (selectedExercise != null && activeSessionId != null) {
        ExerciseEditor(
            viewModel = viewModel,
            sessionId = activeSessionId,
            exercise = selectedExercise,
            allSessionSets = sessionSets,
            exerciseOrderIds = presetExerciseOrder,
            restEndsAtMillis = restEndsAtMillis,
            onSetCompleted = onSetCompleted,
            onAddRestSeconds = onAddRestSeconds,
            onSkipRest = onSkipRest,
            onBack = onBack,
            onNextExercise = { nextId -> exercises.firstOrNull { it.id == nextId }?.let(onSelectExercise) },
            onFinishSession = onFinishSession,
        )
        return
    }
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (activeSessionId == null) {
            item { WorkoutCalendar(completedSessions) }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    PresetChoiceCard(
                        label = "ジム",
                        onClick = { onStartPreset(WorkoutPlace.GYM) },
                        modifier = Modifier.weight(1f),
                    )
                    PresetChoiceCard(
                        label = "家",
                        onClick = { onStartPreset(WorkoutPlace.HOME) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        } else {
            val orderedIds = presetExerciseOrder.ifEmpty { sessionSets.map { it.exerciseId }.distinct() }
            items(orderedIds.mapNotNull { id -> exercises.firstOrNull { it.id == id } }, key = { "active-${it.id}" }) { exercise ->
                Card(Modifier.fillMaxWidth().clickable { onSelectExercise(exercise) }) {
                    Text(exercise.name, Modifier.padding(20.dp), style = MaterialTheme.typography.titleLarge)
                }
            }
            item { TextButton(onClick = onFinishSession) { Text("終了") } }
        }
    }
}

@Composable
private fun PresetChoiceCard(label: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Card(modifier = modifier.height(116.dp).clickable(onClick = onClick)) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(label, style = MaterialTheme.typography.headlineLarge)
        }
    }
}

@Composable
private fun WorkoutCalendar(sessions: List<dev.local.fitlogsolo.data.WorkoutSessionEntity>) {
    var month by rememberSaveable { mutableStateOf(YearMonth.now().toString()) }
    val yearMonth = YearMonth.parse(month)
    val workoutDays = sessions.mapNotNull { session ->
        runCatching { session.startedAt.atZone(ZoneId.systemDefault()).toLocalDate() }.getOrNull()
    }.filter { YearMonth.from(it) == yearMonth }.toSet()
    Card(
        Modifier.fillMaxWidth().pointerInput(yearMonth) {
            var horizontalDistance = 0f
            detectHorizontalDragGestures(
                onHorizontalDrag = { change, dragAmount -> change.consume(); horizontalDistance += dragAmount },
                onDragEnd = {
                    when {
                        horizontalDistance > 64f -> month = yearMonth.minusMonths(1).toString()
                        horizontalDistance < -64f -> month = yearMonth.plusMonths(1).toString()
                    }
                },
            )
        },
    ) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { month = yearMonth.minusMonths(1).toString() }) { Icon(Icons.Default.ChevronLeft, "前の月") }
                Text(yearMonth.format(DateTimeFormatter.ofPattern("yyyy年 M月", Locale.JAPAN)), style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                IconButton(onClick = { month = yearMonth.plusMonths(1).toString() }) { Icon(Icons.Default.ChevronRight, "次の月") }
            }
            Row(Modifier.fillMaxWidth()) {
                listOf("月", "火", "水", "木", "金", "土", "日").forEach { day ->
                    Text(day, modifier = Modifier.weight(1f), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            val leadingBlanks = (yearMonth.atDay(1).dayOfWeek.value - 1)
            val cells = ((leadingBlanks + yearMonth.lengthOfMonth() + 6) / 7) * 7
            repeat(cells / 7) { week ->
                Row(Modifier.fillMaxWidth()) {
                    repeat(7) { column ->
                        val dayNumber = week * 7 + column - leadingBlanks + 1
                        Box(Modifier.weight(1f).height(34.dp), contentAlignment = Alignment.Center) {
                            if (dayNumber in 1..yearMonth.lengthOfMonth()) {
                                val day = yearMonth.atDay(dayNumber)
                                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                                    Surface(
                                        modifier = Modifier.size(30.dp),
                                        shape = MaterialTheme.shapes.large,
                                        color = when {
                                            day == LocalDate.now() -> MaterialTheme.colorScheme.primary
                                            day in workoutDays -> MaterialTheme.colorScheme.secondaryContainer
                                            else -> Color.Transparent
                                        },
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(
                                                dayNumber.toString(),
                                                style = MaterialTheme.typography.bodySmall,
                                                color = when {
                                                    day == LocalDate.now() -> MaterialTheme.colorScheme.onPrimary
                                                    day in workoutDays -> MaterialTheme.colorScheme.onSecondaryContainer
                                                    else -> MaterialTheme.colorScheme.onSurface
                                                },
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Text("● 記録あり", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
        }
    }
}

@Composable
private fun ExerciseCard(
    exercise: ExerciseEntity,
    itIsRoutine: Boolean = false,
    onToggleRoutine: () -> Unit = {},
    onClick: () -> Unit,
) {
    Card(Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f).clickable(onClick = onClick)) {
                Text(exercise.name, style = MaterialTheme.typography.titleMedium)
                Text(if (exercise.mode == ExerciseMode.NORMAL) "通常" else "左右別", style = MaterialTheme.typography.bodySmall)
            }
            IconButton(onClick = onToggleRoutine) {
                Text(
                    text = if (itIsRoutine) "★" else "☆",
                    color = if (itIsRoutine) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                )
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
    allSessionSets: List<WorkoutSetEntity>,
    exerciseOrderIds: List<Long>,
    restEndsAtMillis: Long,
    onSetCompleted: () -> Unit,
    onAddRestSeconds: () -> Unit,
    onSkipRest: () -> Unit,
    onBack: () -> Unit,
    onNextExercise: (Long) -> Unit,
    onFinishSession: () -> Unit,
) {
    val sets by viewModel.exerciseSets(sessionId, exercise.id).collectAsStateWithLifecycle()
    // Keep the current card visible while this exercise-specific Room flow starts collecting.
    val exerciseSets = sets.ifEmpty { allSessionSets.filter { it.exerciseId == exercise.id } }
    var currentSetId by rememberSaveable(sessionId, exercise.id) { mutableLongStateOf(-1L) }
    LaunchedEffect(exerciseSets, currentSetId) {
        if (exerciseSets.isNotEmpty() && exerciseSets.none { it.id == currentSetId }) {
            currentSetId = exerciseSets.firstOrNull { !it.isCompleted }?.id ?: exerciseSets.last().id
        }
    }
    val currentSet = exerciseSets.firstOrNull { it.id == currentSetId } ?: exerciseSets.firstOrNull { !it.isCompleted }
    // Keep the outgoing card on screen while Compose/Room switches to the next exercise query.
    // The exercise-specific flow briefly emits an empty list during that handoff.
    var lastVisibleCard by androidx.compose.runtime.remember(sessionId) {
        androidx.compose.runtime.mutableStateOf<Pair<ExerciseEntity, WorkoutSetEntity>?>(null)
    }
    LaunchedEffect(exercise, currentSet) {
        if (currentSet != null) lastVisibleCard = exercise to currentSet
    }
    val displayedCard = currentSet?.let { exercise to it } ?: lastVisibleCard
    val orderedIds = exerciseOrderIds.ifEmpty { allSessionSets.map { it.exerciseId }.distinct() }
    val upcomingExerciseId = orderedIds.dropWhile { it != exercise.id }.drop(1)
        .firstOrNull { nextId -> allSessionSets.any { it.exerciseId == nextId && !it.isCompleted } }
    val hasUpcomingCard = currentSet != null && (
        exerciseSets.any { it.setOrder > currentSet.setOrder && !it.isCompleted } || upcomingExerciseId != null
    )

    fun proceedFrom(set: WorkoutSetEntity) {
        val nextSet = exerciseSets.firstOrNull { it.setOrder > set.setOrder && !it.isCompleted }
        if (nextSet != null) {
            currentSetId = nextSet.id
        } else {
            val nextExerciseId = orderedIds.dropWhile { it != exercise.id }.drop(1)
                .firstOrNull { nextId -> allSessionSets.any { it.exerciseId == nextId && !it.isCompleted } }
            if (nextExerciseId != null) onNextExercise(nextExerciseId) else onFinishSession()
        }
    }

    fun advance(set: WorkoutSetEntity) {
        viewModel.updateSet(set.copy(isCompleted = true))
        onSetCompleted()
        proceedFrom(set)
    }

    fun skip(set: WorkoutSetEntity) {
        viewModel.updateSet(
            set.copy(
                normalWeightKg = null,
                normalReps = null,
                leftWeightKg = null,
                leftReps = null,
                rightWeightKg = null,
                rightReps = null,
                isCompleted = true,
            ),
        )
        proceedFrom(set)
    }

    Column(Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 4.dp)) {
        Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
            if (displayedCard != null) {
                val (displayedExercise, displayedSet) = displayedCard
                Box(Modifier.fillMaxSize().padding(horizontal = 4.dp), contentAlignment = Alignment.Center) {
                    if (currentSet != null && hasUpcomingCard) {
                        Card(
                            Modifier.fillMaxSize().padding(horizontal = 22.dp, vertical = 18.dp).offset(y = 18.dp)
                                .graphicsLayer { scaleX = 0.91f; scaleY = 0.94f; rotationZ = 1.5f },
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                        ) {
                        }
                    }
                    SetEditorCard(
                        exercise = displayedExercise,
                        set = displayedSet,
                        enabled = currentSet != null,
                        onUpdate = viewModel::updateSet,
                        onAdjustWeight = { step ->
                            currentSet?.let { activeSet ->
                                val adjusted = when (displayedExercise.mode) {
                                    ExerciseMode.NORMAL -> activeSet.copy(
                                        normalWeightKg = adjustWeight(activeSet.normalWeightKg, step),
                                    )
                                    ExerciseMode.BILATERAL -> activeSet.copy(
                                        leftWeightKg = adjustWeight(activeSet.leftWeightKg, step),
                                        rightWeightKg = adjustWeight(activeSet.rightWeightKg, step),
                                    )
                                }
                                viewModel.updateSet(adjusted)
                            }
                        },
                        onAdvance = { currentSet?.let(::advance) },
                        onSkip = { currentSet?.let(::skip) },
                    )
                }
            }
        }
    }
}

@Composable
private fun SetEditorCard(
    exercise: ExerciseEntity,
    set: WorkoutSetEntity,
    enabled: Boolean,
    onUpdate: (WorkoutSetEntity) -> Unit,
    onAdjustWeight: (Int) -> Unit,
    onAdvance: () -> Unit,
    onSkip: () -> Unit,
) {
    var swipeOffsetX by androidx.compose.runtime.remember(set.id) { androidx.compose.runtime.mutableFloatStateOf(0f) }
    var swipeOffsetY by androidx.compose.runtime.remember(set.id) { androidx.compose.runtime.mutableFloatStateOf(0f) }
    LaunchedEffect(enabled, set.id) {
        if (!enabled) {
            swipeOffsetX = 0f
            swipeOffsetY = 0f
        }
    }
    val animationScope = rememberCoroutineScope()
    val swipeHintColor = MaterialTheme.colorScheme.primary
    Card(
        Modifier.fillMaxSize()
            .graphicsLayer {
                translationX = swipeOffsetX
                rotationZ = if (size.width > 0f) (swipeOffsetX / size.width * 8f).coerceIn(-8f, 8f) else 0f
            }
            .drawWithContent {
                drawContent()
                val drag = swipeOffsetY
                val progress = (abs(drag) / (size.height * 0.14f)).coerceIn(0f, 1f)
                if (progress > 0.12f) {
                    val centerX = size.width / 2f
                    val edge = 30.dp.toPx()
                    val stem = 48.dp.toPx()
                    val head = 15.dp.toPx()
                    val stroke = 5.dp.toPx()
                    val color = swipeHintColor.copy(alpha = progress * 0.9f)
                    if (drag < 0f) {
                        val tipY = edge
                        val stemY = tipY + stem
                        drawLine(color, androidx.compose.ui.geometry.Offset(centerX, stemY), androidx.compose.ui.geometry.Offset(centerX, tipY), stroke)
                        drawLine(color, androidx.compose.ui.geometry.Offset(centerX, tipY), androidx.compose.ui.geometry.Offset(centerX - head, tipY + head), stroke, cap = StrokeCap.Round)
                        drawLine(color, androidx.compose.ui.geometry.Offset(centerX, tipY), androidx.compose.ui.geometry.Offset(centerX + head, tipY + head), stroke, cap = StrokeCap.Round)
                    } else {
                        val tipY = size.height - edge
                        val stemY = tipY - stem
                        drawLine(color, androidx.compose.ui.geometry.Offset(centerX, stemY), androidx.compose.ui.geometry.Offset(centerX, tipY), stroke)
                        drawLine(color, androidx.compose.ui.geometry.Offset(centerX, tipY), androidx.compose.ui.geometry.Offset(centerX - head, tipY - head), stroke, cap = StrokeCap.Round)
                        drawLine(color, androidx.compose.ui.geometry.Offset(centerX, tipY), androidx.compose.ui.geometry.Offset(centerX + head, tipY - head), stroke, cap = StrokeCap.Round)
                    }
                }
            }
            .pointerInput(set.id, enabled) {
                var dragX = 0f
                var dragY = 0f
                var horizontalGesture: Boolean? = null
                detectDragGestures(
                    onDragStart = {
                        dragX = 0f
                        dragY = 0f
                        horizontalGesture = null
                    },
                    onDrag = { change, dragAmount ->
                        change.consume()
                        dragX += dragAmount.x
                        dragY += dragAmount.y
                        if (horizontalGesture == null) horizontalGesture = abs(dragX) >= abs(dragY)
                        if (horizontalGesture == true) {
                            swipeOffsetX = (swipeOffsetX + dragAmount.x).coerceIn(-size.width.toFloat(), size.width.toFloat())
                            swipeOffsetY = 0f
                        } else {
                            swipeOffsetX = 0f
                            swipeOffsetY = dragY.coerceIn(-size.height * 0.3f, size.height * 0.3f)
                        }
                    },
                    onDragEnd = {
                        if (!enabled) {
                            animationScope.launch {
                                Animatable(swipeOffsetX).animateTo(0f, spring()) { swipeOffsetX = value }
                                Animatable(swipeOffsetY).animateTo(0f, spring()) { swipeOffsetY = value }
                            }
                        } else if (horizontalGesture == true && dragX > size.width * 0.25f) {
                            animationScope.launch {
                                Animatable(swipeOffsetX).animateTo(size.width * 0.35f, tween(100)) { swipeOffsetX = value }
                                onAdvance()
                            }
                        } else if (horizontalGesture == true && dragX < -size.width * 0.25f) {
                            animationScope.launch {
                                Animatable(swipeOffsetX).animateTo(-size.width * 0.35f, tween(100)) { swipeOffsetX = value }
                                onSkip()
                            }
                        } else if (horizontalGesture == false && dragY < -size.height * 0.14f) {
                            animationScope.launch {
                                Animatable(swipeOffsetY).animateTo(-size.height * 0.12f, tween(80)) { swipeOffsetY = value }
                                onAdjustWeight(1)
                                Animatable(swipeOffsetY).animateTo(0f, spring()) { swipeOffsetY = value }
                            }
                        } else if (horizontalGesture == false && dragY > size.height * 0.14f) {
                            animationScope.launch {
                                Animatable(swipeOffsetY).animateTo(size.height * 0.12f, tween(80)) { swipeOffsetY = value }
                                onAdjustWeight(-1)
                                Animatable(swipeOffsetY).animateTo(0f, spring()) { swipeOffsetY = value }
                            }
                        } else {
                            animationScope.launch {
                                Animatable(swipeOffsetX).animateTo(0f, spring()) { swipeOffsetX = value }
                                Animatable(swipeOffsetY).animateTo(0f, spring()) { swipeOffsetY = value }
                            }
                        }
                    },
                    onDragCancel = {
                        animationScope.launch {
                            Animatable(swipeOffsetX).animateTo(0f, spring()) { swipeOffsetX = value }
                            Animatable(swipeOffsetY).animateTo(0f, spring()) { swipeOffsetY = value }
                        }
                    },
                )
            },
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        if (exercise.mode == ExerciseMode.NORMAL) {
            Column(
                Modifier.fillMaxSize().padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(exercise.name, style = MaterialTheme.typography.headlineSmall, maxLines = 2, modifier = Modifier.weight(1f))
                    Text("${set.setOrder + 1}", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
                }
                InvisibleTapZone(
                    description = "重量を2.5キログラム増やす",
                    enabled = enabled,
                    onClick = { onUpdate(set.copy(normalWeightKg = (set.normalWeightKg ?: 0.0) + 2.5)) },
                    modifier = Modifier.fillMaxWidth().weight(0.8f),
                )
                Row(Modifier.fillMaxWidth().weight(3.4f), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    InvisibleTapZone(
                        description = "回数を1回減らす",
                        enabled = enabled && (set.normalReps ?: 0) > 0,
                        onClick = { onUpdate(set.copy(normalReps = ((set.normalReps ?: 0) - 1).coerceAtLeast(0))) },
                        modifier = Modifier.weight(0.75f).fillMaxHeight(),
                    )
                    Surface(
                        Modifier.weight(2.5f).fillMaxHeight(),
                        shape = MaterialTheme.shapes.extraLarge,
                        color = MaterialTheme.colorScheme.surface,
                        tonalElevation = 0.dp,
                    ) {
                        Column(
                            Modifier.fillMaxSize().padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                        ) {
                            Text(set.normalWeightKg?.let(::formatWeight) ?: "—", style = MaterialTheme.typography.displayMedium, maxLines = 1)
                            Text("kg", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(18.dp))
                            Text(set.normalReps?.toString() ?: "—", style = MaterialTheme.typography.displayMedium, maxLines = 1)
                            Text("回", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    InvisibleTapZone(
                        description = "回数を1回増やす",
                        enabled = enabled,
                        onClick = { onUpdate(set.copy(normalReps = (set.normalReps ?: 0) + 1)) },
                        modifier = Modifier.weight(0.75f).fillMaxHeight(),
                    )
                }
                InvisibleTapZone(
                    description = "重量を2.5キログラム減らす",
                    enabled = enabled && (set.normalWeightKg ?: 0.0) >= 2.5,
                    onClick = { onUpdate(set.copy(normalWeightKg = ((set.normalWeightKg ?: 0.0) - 2.5).coerceAtLeast(0.0))) },
                    modifier = Modifier.fillMaxWidth().weight(0.8f),
                )
            }
        } else {
            Column(Modifier.fillMaxSize().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(exercise.name, style = MaterialTheme.typography.headlineSmall, maxLines = 2, modifier = Modifier.weight(1f))
                    Text("${set.setOrder + 1}", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
                }
                Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    BilateralTapControls("左", set.leftWeightKg, set.leftReps, enabled, Modifier.weight(1f)) { weight, reps ->
                        onUpdate(set.copy(leftWeightKg = weight, leftReps = reps))
                    }
                    BilateralTapControls("右", set.rightWeightKg, set.rightReps, enabled, Modifier.weight(1f)) { weight, reps ->
                        onUpdate(set.copy(rightWeightKg = weight, rightReps = reps))
                    }
                }
            }
        }
    }
}

private fun adjustWeight(weightKg: Double?, step: Int): Double? = when {
    step > 0 -> (weightKg ?: 0.0) + 2.5
    weightKg == null -> null
    else -> (weightKg - 2.5).coerceAtLeast(0.0)
}

@Composable
private fun InvisibleTapZone(
    description: String,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier.clickable(
            enabled = enabled,
            interactionSource = androidx.compose.runtime.remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
            indication = null,
            onClick = onClick,
        ).semantics { contentDescription = description },
    )
}

@Composable
private fun BilateralTapControls(
    side: String,
    weightKg: Double?,
    reps: Int?,
    enabled: Boolean,
    modifier: Modifier = Modifier,
    onChange: (Double, Int) -> Unit,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(side, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
        InvisibleTapZone(
            description = "${side}側の重量を2.5キログラム増やす",
            enabled = enabled,
            onClick = { onChange((weightKg ?: 0.0) + 2.5, reps ?: 0) },
            modifier = Modifier.fillMaxWidth().weight(0.8f),
        )
        Row(Modifier.fillMaxWidth().weight(3f), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            InvisibleTapZone(
                description = "${side}側の回数を1回減らす",
                enabled = enabled && (reps ?: 0) > 0,
                onClick = { onChange(weightKg ?: 0.0, ((reps ?: 0) - 1).coerceAtLeast(0)) },
                modifier = Modifier.weight(0.7f).fillMaxHeight(),
            )
        Surface(
            Modifier.weight(2f).fillMaxHeight(),
            shape = MaterialTheme.shapes.extraLarge,
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 0.dp,
        ) {
            Column(Modifier.fillMaxSize().padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Text(weightKg?.let(::formatWeight) ?: "—", style = MaterialTheme.typography.headlineMedium, maxLines = 1)
                Text("kg", style = MaterialTheme.typography.labelMedium)
                Spacer(Modifier.height(8.dp))
                Text(reps?.toString() ?: "—", style = MaterialTheme.typography.headlineMedium, maxLines = 1)
                Text("回", style = MaterialTheme.typography.labelMedium)
            }
        }
            InvisibleTapZone(
                description = "${side}側の回数を1回増やす",
                enabled = enabled,
                onClick = { onChange(weightKg ?: 0.0, (reps ?: 0) + 1) },
                modifier = Modifier.weight(0.7f).fillMaxHeight(),
            )
        }
        InvisibleTapZone(
            description = "${side}側の重量を2.5キログラム減らす",
            enabled = enabled && (weightKg ?: 0.0) >= 2.5,
            onClick = { onChange(((weightKg ?: 0.0) - 2.5).coerceAtLeast(0.0), reps ?: 0) },
            modifier = Modifier.fillMaxWidth().weight(0.8f),
        )
    }
}

private fun formatWeight(weightKg: Double): String =
    BigDecimal.valueOf(weightKg).stripTrailingZeros().toPlainString()

@Composable
private fun RestTimerBanner(
    restEndsAtMillis: Long,
    onAddRestSeconds: () -> Unit,
    onSkipRest: () -> Unit,
) {
    if (restEndsAtMillis <= 0L) return
    val remainingSeconds by produceState(
        initialValue = ((restEndsAtMillis - System.currentTimeMillis()).coerceAtLeast(0L) + 999L) / 1_000L,
        key1 = restEndsAtMillis,
    ) {
        while (System.currentTimeMillis() < restEndsAtMillis) {
            value = ((restEndsAtMillis - System.currentTimeMillis()).coerceAtLeast(0L) + 999L) / 1_000L
            delay(1_000)
        }
        value = 0L
    }
    Card(Modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = if (remainingSeconds > 0) "休憩 ${remainingSeconds / 60}:${(remainingSeconds % 60).toString().padStart(2, '0')}" else "休憩終了",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.weight(1f),
            )
            if (remainingSeconds > 0) TextButton(onClick = onAddRestSeconds) { Text("+15秒") }
            TextButton(onClick = onSkipRest) { Text(if (remainingSeconds > 0) "終了" else "閉じる") }
        }
    }
}

@Composable
private fun WorkoutDock(
    displayName: String,
) {
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        val nameSize = when {
            displayName.length <= 4 -> 88.sp
            displayName.length <= 8 -> 72.sp
            displayName.length <= 14 -> 56.sp
            else -> 40.sp
        }
        Text(
            displayName,
            style = MaterialTheme.typography.displayLarge.copy(fontSize = nameSize, fontWeight = FontWeight.Bold),
            maxLines = 1,
            softWrap = false,
        )
    }
}

@Composable
private fun rememberFlatDeviceCandidate(enabled: Boolean, workoutActive: Boolean): Boolean {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val isFlat = androidx.compose.runtime.remember { mutableStateOf(false) }
    DisposableEffect(context, lifecycleOwner, enabled, workoutActive) {
        isFlat.value = false
        if (!enabled || !workoutActive) {
            onDispose { }
        } else {
            val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
            val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
            if (accelerometer == null) {
                onDispose { }
            } else {
                val listener = object : SensorEventListener {
                    var flatSinceMillis = 0L
                    var tiltedSinceMillis = 0L
                    var isCurrentlyFlat = false

                    override fun onSensorChanged(event: SensorEvent) {
                        val now = SystemClock.elapsedRealtime()
                        val x = abs(event.values[0])
                        val y = abs(event.values[1])
                        val z = event.values[2]
                        if (!isCurrentlyFlat) {
                            val flatEnoughToEnter = x < 1.8f && y < 1.8f && z > 8.8f
                            if (flatEnoughToEnter) {
                                if (flatSinceMillis == 0L) flatSinceMillis = now
                                if (now - flatSinceMillis >= 500L) {
                                    isCurrentlyFlat = true
                                    tiltedSinceMillis = 0L
                                    isFlat.value = true
                                }
                            } else {
                                flatSinceMillis = 0L
                            }
                        } else {
                            val remainsFlat = x < 3.8f && y < 3.8f && z > 7.0f
                            if (remainsFlat) {
                                tiltedSinceMillis = 0L
                            } else {
                                if (tiltedSinceMillis == 0L) tiltedSinceMillis = now
                                if (now - tiltedSinceMillis >= 500L) {
                                    isCurrentlyFlat = false
                                    flatSinceMillis = 0L
                                    isFlat.value = false
                                }
                            }
                        }
                    }

                    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
                }
                var listening = false
                fun startListening() {
                    if (!listening) listening = sensorManager.registerListener(listener, accelerometer, SensorManager.SENSOR_DELAY_UI)
                }
                fun stopListening() {
                    if (listening) sensorManager.unregisterListener(listener)
                    listening = false
                    listener.flatSinceMillis = 0L
                    listener.tiltedSinceMillis = 0L
                    listener.isCurrentlyFlat = false
                    isFlat.value = false
                }
                val observer = LifecycleEventObserver { _, event ->
                    if (event == Lifecycle.Event.ON_RESUME) startListening()
                    if (event == Lifecycle.Event.ON_PAUSE) stopListening()
                }
                lifecycleOwner.lifecycle.addObserver(observer)
                if (lifecycleOwner.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) startListening()
                onDispose {
                    lifecycleOwner.lifecycle.removeObserver(observer)
                    stopListening()
                }
            }
        }
    }
    return isFlat.value
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
    flatModeEnabled: Boolean,
    displayName: String,
    onDisplayNameChange: (String) -> Unit,
    onFlatModeEnabledChange: (Boolean) -> Unit,
    onShowHistory: () -> Unit,
    onShowCharts: () -> Unit,
) {
    val routineExerciseIds by viewModel.routineExerciseIds.collectAsStateWithLifecycle()
    val gymPresetIds by viewModel.gymPresetExerciseIds.collectAsStateWithLifecycle()
    val homePresetIds by viewModel.homePresetExerciseIds.collectAsStateWithLifecycle()
    var displayNameDraft by rememberSaveable { mutableStateOf(displayName) }
    LaunchedEffect(displayName) { displayNameDraft = displayName }
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("表示名", style = MaterialTheme.typography.titleLarge) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = displayNameDraft,
                    onValueChange = { displayNameDraft = it.take(24) },
                    label = { Text("水平に置いた時の名前") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                Button(
                    onClick = { onDisplayNameChange(displayNameDraft) },
                    enabled = displayNameDraft.trim().isNotEmpty() && displayNameDraft.trim() != displayName,
                ) { Text("保存") }
            }
        }
        item { Text("記録を振り返る", style = MaterialTheme.typography.titleLarge) }
        item { OutlinedButton(onClick = onShowHistory, modifier = Modifier.fillMaxWidth().height(56.dp)) { Icon(Icons.Default.History, null); Text("履歴") } }
        item { OutlinedButton(onClick = onShowCharts, modifier = Modifier.fillMaxWidth().height(56.dp)) { Icon(Icons.Default.BarChart, null); Text("グラフ") } }
        item { Text("プリセット", style = MaterialTheme.typography.titleLarge) }
        item { Text("ジム", style = MaterialTheme.typography.titleMedium) }
        items(exercises, key = { "gym-${it.id}" }) { exercise ->
            PresetExerciseRow(exercise, exercise.id in gymPresetIds) { viewModel.togglePresetExercise(true, exercise.id) }
        }
        item { Text("家", style = MaterialTheme.typography.titleMedium) }
        items(exercises, key = { "home-${it.id}" }) { exercise ->
            PresetExerciseRow(exercise, exercise.id in homePresetIds) { viewModel.togglePresetExercise(false, exercise.id) }
        }
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
                        IconButton(onClick = { viewModel.toggleRoutineExercise(exercise.id) }) {
                            Text(if (exercise.id in routineExerciseIds) "★" else "☆")
                        }
                        IconButton(onClick = { editing = true }) { Icon(Icons.Default.Edit, "名前を変更") }
                        IconButton(onClick = { viewModel.archiveExercise(exercise) }) { Icon(Icons.Default.Delete, "非表示") }
                    }
                }
            }
        }
        item { Divider() }
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("スマホを水平に置いたら休憩表示", style = MaterialTheme.typography.titleSmall)
                    Text("記録中、画面を上向きでしばらく安定して置くと表示が切り替わります。小さな揺れでは戻りません。", style = MaterialTheme.typography.bodySmall)
                }
                Switch(checked = flatModeEnabled, onCheckedChange = onFlatModeEnabledChange)
            }
        }
        item { Divider() }
        item { Text("データ", style = MaterialTheme.typography.titleLarge) }
        item { Button(onClick = onExport, modifier = Modifier.fillMaxWidth()) { Text("データを書き出す（JSON）") } }
        item { Text("このアプリは筋トレ記録を端末内に保存し、外部へ送信しません。", style = MaterialTheme.typography.bodySmall) }
    }
}

@Composable
private fun PresetExerciseRow(exercise: ExerciseEntity, selected: Boolean, onToggle: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(exercise.name, Modifier.weight(1f).clickable(onClick = onToggle), style = MaterialTheme.typography.bodyLarge)
        Checkbox(checked = selected, onCheckedChange = { onToggle() })
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
