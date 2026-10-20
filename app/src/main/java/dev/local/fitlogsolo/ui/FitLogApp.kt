package dev.local.fitlogsolo.ui

import android.app.Activity
import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.SystemClock
import android.view.HapticFeedbackConstants
import android.view.WindowManager
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.runtime.remember
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
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
import dev.local.fitlogsolo.data.PresetExerciseConfig
import dev.local.fitlogsolo.data.WorkoutPreset
import dev.local.fitlogsolo.data.ExerciseEntity
import dev.local.fitlogsolo.data.ExerciseMode
import dev.local.fitlogsolo.data.SessionStatus
import dev.local.fitlogsolo.data.WorkoutSetEntity
import java.time.ZoneId
import java.time.LocalDate
import java.time.YearMonth
import kotlin.math.roundToInt
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.math.BigDecimal
import kotlin.math.abs
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val REST_SECONDS = 90L

@Composable
private fun Modifier.pressMotionClickable(enabled: Boolean = true, onClick: () -> Unit): Modifier {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.97f else 1f,
        animationSpec = spring(stiffness = 700f),
        label = "press motion",
    )
    return graphicsLayer { scaleX = scale; scaleY = scale }
        .clickable(enabled = enabled, interactionSource = interactionSource, onClick = onClick)
}

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
    background = Color(0xFFF4E9E7),
    surface = Color.White,
    surfaceVariant = Color(0xFFF4DDDA),
    onSurface = Color(0xFF201A19),
    onSurfaceVariant = Color(0xFF534341),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FitLogApp(
    viewModel: FitLogViewModel,
) {
    MaterialTheme(colorScheme = FitLogRedColors) {
        FitLogAppContent(viewModel)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FitLogAppContent(
    viewModel: FitLogViewModel,
) {
    var settings by rememberSaveable { mutableStateOf(false) }
    var selectedExerciseId by rememberSaveable { mutableStateOf<Long?>(null) }
    var showAddExercise by rememberSaveable { mutableStateOf(false) }
    var showWorkoutComplete by rememberSaveable { mutableStateOf(false) }
    var workoutCompletionSaved by rememberSaveable { mutableStateOf(false) }
    var restEndsAtMillis by rememberSaveable { mutableLongStateOf(0L) }
    var presetExerciseOrder by rememberSaveable { mutableStateOf("") }
    val exercises by viewModel.exercises.collectAsStateWithLifecycle()
    val activeSession by viewModel.activeSession.collectAsStateWithLifecycle()
    val sessions by viewModel.completedSessions.collectAsStateWithLifecycle()
    val routineExerciseIds by viewModel.routineExerciseIds.collectAsStateWithLifecycle()
    val flatModeEnabled by viewModel.flatModeEnabled.collectAsStateWithLifecycle()
    val displayName by viewModel.displayName.collectAsStateWithLifecycle()
    val presets by viewModel.presets.collectAsStateWithLifecycle()
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

    LaunchedEffect(showWorkoutComplete, workoutCompletionSaved) {
        if (showWorkoutComplete && workoutCompletionSaved) {
            delay(2_200L)
            (context as? Activity)?.finish()
        }
    }

    val selectedExercise = exercises.firstOrNull { it.id == selectedExerciseId }
    val workoutFullscreen = activeSession != null
    BackHandler(
        enabled = showAddExercise || settings || (activeSession != null && selectedExerciseId != null),
    ) {
        when {
            showAddExercise -> showAddExercise = false
            settings -> settings = false
            activeSession != null && selectedExerciseId != null -> selectedExerciseId = null
        }
    }
    Scaffold(
        modifier = Modifier.safeDrawingPadding(),
        topBar = {
            if (!workoutFullscreen && settings) {
                TopAppBar(
                    title = { Text("設定") },
                    navigationIcon = {
                        IconButton(onClick = { settings = false }) { Icon(Icons.Default.ArrowBack, "戻る") }
                    },
                )
            }
        },
        floatingActionButton = {
            if (!workoutFullscreen && !settings && !flatCandidate) {
                FloatingActionButton(onClick = { settings = true }, shape = CircleShape) {
                    Icon(Icons.Default.Settings, contentDescription = "設定")
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Surface(
            Modifier.fillMaxSize().padding(padding).animateContentSize(spring(stiffness = 500f)),
            color = MaterialTheme.colorScheme.background,
        ) {
            if (showWorkoutComplete) {
                WorkoutCompleteScreen()
            } else if (!settings && activeSession != null && flatCandidate) {
                WorkoutDock(displayName = displayName)
            } else if (settings) {
                SettingsScreen(
                    viewModel = viewModel,
                    exercises = exercises,
                    presets = presets,
                    onAddExercise = { showAddExercise = true },
                    flatModeEnabled = flatModeEnabled,
                    displayName = displayName,
                    onDisplayNameChange = viewModel::setDisplayName,
                    onFlatModeEnabledChange = viewModel::setFlatModeEnabled,
                )
            } else {
                RecordScreen(
                    viewModel = viewModel,
                    exercises = exercises,
                    presets = presets,
                    routineExerciseIds = routineExerciseIds,
                    activeSessionId = activeSession?.id,
                    completedSessions = sessions,
                    presetExerciseOrder = presetExerciseOrder.split(',').mapNotNull(String::toLongOrNull),
                    selectedExercise = selectedExercise,
                    restEndsAtMillis = restEndsAtMillis,
                    onStartPreset = { preset ->
                        viewModel.startPreset(preset) { _, exerciseIds ->
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
                        activeSession?.id?.let { viewModel.finishSession(it) }
                        selectedExerciseId = null
                        restEndsAtMillis = 0L
                        presetExerciseOrder = ""
                    },
                    onWorkoutComplete = {
                        workoutCompletionSaved = false
                        activeSession?.id?.let { sessionId ->
                            viewModel.finishSession(sessionId, announce = false) { workoutCompletionSaved = true }
                        } ?: run { workoutCompletionSaved = true }
                        selectedExerciseId = null
                        restEndsAtMillis = 0L
                        presetExerciseOrder = ""
                        showWorkoutComplete = true
                    },
                    onBack = { selectedExerciseId = null },
                    onAddExercise = { showAddExercise = true },
                )
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
    presets: List<WorkoutPreset>,
    routineExerciseIds: List<Long>,
    activeSessionId: Long?,
    completedSessions: List<dev.local.fitlogsolo.data.WorkoutSessionEntity>,
    presetExerciseOrder: List<Long>,
    selectedExercise: ExerciseEntity?,
    restEndsAtMillis: Long,
    onStartPreset: (WorkoutPreset) -> Unit,
    onSelectExercise: (ExerciseEntity) -> Unit,
    onToggleRoutineExercise: (Long) -> Unit,
    onSetCompleted: () -> Unit,
    onAddRestSeconds: () -> Unit,
    onSkipRest: () -> Unit,
    onFinishSession: () -> Unit,
    onWorkoutComplete: () -> Unit,
    onBack: () -> Unit,
    onAddExercise: () -> Unit,
) {
    val sessionSets by (activeSessionId?.let(viewModel::sessionSets) ?: kotlinx.coroutines.flow.flowOf(emptyList()))
        .collectAsStateWithLifecycle(emptyList())
    AnimatedContent(
        targetState = selectedExercise?.let { exercise -> activeSessionId?.let { sessionId -> sessionId to exercise.id } },
        transitionSpec = {
            when {
                initialState == null && targetState != null ->
                    (slideInVertically(tween(320)) { height -> height / 4 } + fadeIn(tween(220))) togetherWith fadeOut(tween(160))
                initialState != null && targetState == null ->
                    fadeIn(tween(160)) togetherWith (slideOutVertically(tween(280)) { height -> height / 4 } + fadeOut(tween(180)))
                else -> {
                    val direction = if ((targetState?.second ?: 0L) >= (initialState?.second ?: 0L)) 1 else -1
                    (slideInHorizontally(tween(120)) { width -> direction * width / 5 } + fadeIn(tween(100))) togetherWith
                        (slideOutHorizontally(tween(100)) { width -> -direction * width / 5 } + fadeOut(tween(80)))
                }
            }
        },
        label = "workout screen",
    ) { editorRoute ->
        val editorExercise = editorRoute?.let { route -> exercises.firstOrNull { it.id == route.second } }
        if (editorRoute != null && editorExercise != null) {
            ExerciseEditor(
                viewModel = viewModel,
                sessionId = editorRoute.first,
                exercise = editorExercise,
                allExercises = exercises,
                allSessionSets = sessionSets,
                exerciseOrderIds = presetExerciseOrder,
                restEndsAtMillis = restEndsAtMillis,
                onSetCompleted = onSetCompleted,
                onAddRestSeconds = onAddRestSeconds,
                onSkipRest = onSkipRest,
                onBack = onBack,
                onNextExercise = { nextId -> exercises.firstOrNull { it.id == nextId }?.let(onSelectExercise) },
                onFinishSession = onFinishSession,
                onWorkoutComplete = onWorkoutComplete,
            )
        } else {
            LazyColumn(
                Modifier.fillMaxSize().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
        if (activeSessionId == null) {
            item { Text("カレンダー", style = MaterialTheme.typography.titleLarge) }
            item { WorkoutCalendar(completedSessions) }
            item { Text("プリセット", style = MaterialTheme.typography.titleLarge) }
            if (presets.isEmpty()) {
                item { Text("設定からプリセットを追加してください", style = MaterialTheme.typography.titleMedium) }
            } else {
                items(presets.chunked(2), key = { it.first().id }) { rowPresets ->
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                        rowPresets.forEach { preset ->
                            PresetChoiceCard(
                                label = preset.name,
                                detail = if (preset.exercises.isEmpty()) "種目を設定" else "${preset.exercises.size}種目",
                                enabled = preset.exercises.isNotEmpty(),
                                onClick = { onStartPreset(preset) },
                                modifier = Modifier.weight(1f),
                            )
                        }
                        if (rowPresets.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
        } else {
            val orderedIds = presetExerciseOrder.ifEmpty { sessionSets.map { it.exerciseId }.distinct() }
            items(orderedIds.mapNotNull { id -> exercises.firstOrNull { it.id == id } }, key = { "active-${it.id}" }) { exercise ->
                Card(Modifier.fillMaxWidth().pressMotionClickable { onSelectExercise(exercise) }) {
                    Text(exercise.name, Modifier.padding(20.dp), style = MaterialTheme.typography.titleLarge)
                }
            }
            item { TextButton(onClick = onFinishSession) { Text("終了") } }
        }
            }
        }
    }
}

@Composable
private fun PresetChoiceCard(label: String, detail: String, enabled: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Card(modifier = modifier.height(116.dp).pressMotionClickable(enabled, onClick)) {
        Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Text(label, style = MaterialTheme.typography.headlineLarge, maxLines = 2)
            Text(detail, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun WorkoutCompleteScreen() {
    var animateIn by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { animateIn = true }
    val progress by animateFloatAsState(
        targetValue = if (animateIn) 1f else 0f,
        animationSpec = spring(dampingRatio = 0.55f, stiffness = 420f),
        label = "workout complete check",
    )
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            Modifier.size(112.dp)
                .graphicsLayer { scaleX = progress; scaleY = progress; alpha = progress }
                .background(MaterialTheme.colorScheme.primary, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Default.Check, contentDescription = "完了", modifier = Modifier.size(72.dp), tint = Color.White)
        }
        Text(
            "ワークアウト完了",
            Modifier.padding(top = 24.dp).graphicsLayer { alpha = progress },
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )
    }
}

@Composable
private fun WorkoutCalendar(sessions: List<dev.local.fitlogsolo.data.WorkoutSessionEntity>) {
    var month by rememberSaveable { mutableStateOf(YearMonth.now().toString()) }
    val yearMonth = YearMonth.parse(month)
    val sessionDays = sessions.mapNotNull { session ->
        runCatching { session.startedAt.atZone(ZoneId.systemDefault()).toLocalDate() }.getOrNull()
    }.toSet()
    Card(
        Modifier.fillMaxWidth()
            .animateContentSize(spring(stiffness = 500f))
            .pointerInput(yearMonth) {
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
        AnimatedContent(
            targetState = yearMonth,
            transitionSpec = {
                val direction = if (targetState > initialState) 1 else -1
                (slideInHorizontally(tween(240)) { width -> direction * width / 4 } + fadeIn(tween(180))) togetherWith
                    (slideOutHorizontally(tween(200)) { width -> -direction * width / 4 } + fadeOut(tween(120)))
            },
            label = "calendar month",
        ) { displayedMonth ->
            val workoutDays = sessionDays.filter { YearMonth.from(it) == displayedMonth }.toSet()
            Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { month = displayedMonth.minusMonths(1).toString() }) { Icon(Icons.Default.ChevronLeft, "前の月") }
                    Text(displayedMonth.format(DateTimeFormatter.ofPattern("yyyy年 M月", Locale.JAPAN)), style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    IconButton(onClick = { month = displayedMonth.plusMonths(1).toString() }) { Icon(Icons.Default.ChevronRight, "次の月") }
                }
                Row(Modifier.fillMaxWidth()) {
                    listOf("月", "火", "水", "木", "金", "土", "日").forEach { day ->
                        Text(day, modifier = Modifier.weight(1f), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                val leadingBlanks = (displayedMonth.atDay(1).dayOfWeek.value - 1)
                val cells = ((leadingBlanks + displayedMonth.lengthOfMonth() + 6) / 7) * 7
                repeat(cells / 7) { week ->
                    Row(Modifier.fillMaxWidth()) {
                        repeat(7) { column ->
                            val dayNumber = week * 7 + column - leadingBlanks + 1
                            Box(Modifier.weight(1f).height(34.dp), contentAlignment = Alignment.Center) {
                                if (dayNumber in 1..displayedMonth.lengthOfMonth()) {
                                    val day = displayedMonth.atDay(dayNumber)
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
            Column(Modifier.weight(1f).pressMotionClickable(onClick = onClick)) {
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
    allExercises: List<ExerciseEntity>,
    allSessionSets: List<WorkoutSetEntity>,
    exerciseOrderIds: List<Long>,
    restEndsAtMillis: Long,
    onSetCompleted: () -> Unit,
    onAddRestSeconds: () -> Unit,
    onSkipRest: () -> Unit,
    onBack: () -> Unit,
    onNextExercise: (Long) -> Unit,
    onFinishSession: () -> Unit,
    onWorkoutComplete: () -> Unit,
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
    val nextSetInExercise = currentSet?.let { current ->
        exerciseSets.filter { it.setOrder > current.setOrder && !it.isCompleted }
            .minByOrNull { it.setOrder }
    }
    val upcomingExerciseId = if (currentSet != null && nextSetInExercise == null) {
        orderedIds.dropWhile { it != exercise.id }.drop(1)
            .firstOrNull { nextId -> allSessionSets.any { it.exerciseId == nextId && !it.isCompleted } }
    } else {
        null
    }
    val upcomingCard = when {
        nextSetInExercise != null -> exercise to nextSetInExercise
        upcomingExerciseId != null -> {
            val nextExercise = allExercises.firstOrNull { it.id == upcomingExerciseId }
            val nextSet = allSessionSets.filter { it.exerciseId == upcomingExerciseId && !it.isCompleted }
                .minByOrNull { it.setOrder }
            if (nextExercise != null && nextSet != null) nextExercise to nextSet else null
        }
        else -> null
    }

    fun proceedFrom(set: WorkoutSetEntity) {
        val nextSet = exerciseSets.firstOrNull { it.setOrder > set.setOrder && !it.isCompleted }
        if (nextSet != null) {
            currentSetId = nextSet.id
        } else {
            val nextExerciseId = orderedIds.dropWhile { it != exercise.id }.drop(1)
                .firstOrNull { nextId -> allSessionSets.any { it.exerciseId == nextId && !it.isCompleted } }
            if (nextExerciseId != null) onNextExercise(nextExerciseId) else onWorkoutComplete()
        }
    }

    fun advance(set: WorkoutSetEntity) {
        val hasRemainingSet = upcomingCard != null
        viewModel.updateSet(set.copy(isCompleted = true))
        if (hasRemainingSet) onSetCompleted()
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
                    if (restEndsAtMillis > 0L && currentSet != null) {
                        SetEditorCard(
                            exercise = exercise,
                            set = currentSet,
                            totalSets = allSessionSets.count { it.exerciseId == exercise.id }
                                .coerceAtLeast(currentSet.setOrder + 1),
                            enabled = false,
                            onUpdate = {},
                            onAdvance = {},
                            onSkip = {},
                        )
                        RestTimerCard(
                            restEndsAtMillis = restEndsAtMillis,
                            onAddRestSeconds = onAddRestSeconds,
                            onSkipRest = onSkipRest,
                        )
                    } else if (currentSet != null && upcomingCard != null) {
                        val (nextExercise, nextSet) = upcomingCard
                        UpcomingSetPreviewCard(
                            exercise = nextExercise,
                            set = nextSet,
                            totalSets = allSessionSets.count { it.exerciseId == nextExercise.id }
                                .coerceAtLeast(nextSet.setOrder + 1),
                        )
                    }
                    if (restEndsAtMillis <= 0L || currentSet == null) {
                        SetEditorCard(
                            exercise = displayedExercise,
                            set = displayedSet,
                            totalSets = allSessionSets.count { it.exerciseId == displayedExercise.id }
                                .coerceAtLeast(displayedSet.setOrder + 1),
                            enabled = currentSet != null,
                            onUpdate = viewModel::updateSet,
                            onAdvance = { if (currentSet?.id == displayedSet.id) advance(displayedSet) },
                            onSkip = { if (currentSet?.id == displayedSet.id) skip(displayedSet) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun UpcomingSetPreviewCard(
    exercise: ExerciseEntity,
    set: WorkoutSetEntity,
    totalSets: Int,
) {
    Card(
        Modifier.fillMaxWidth().fillMaxHeight(0.78f).offset(y = 14.dp)
            .graphicsLayer { scaleX = 0.94f; scaleY = 0.95f; rotationZ = 1.2f },
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF0EB)),
    ) {
        Column(Modifier.fillMaxSize()) {
            Row(
                Modifier.fillMaxWidth().background(Color(0xFFE93630)).padding(horizontal = 20.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    exercise.name,
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.ExtraBold, color = Color.White),
                    maxLines = 2,
                    modifier = Modifier.weight(1f),
                )
                Surface(color = Color.White, shape = CircleShape) {
                    Box(Modifier.height(44.dp).padding(horizontal = 12.dp), contentAlignment = Alignment.Center) {
                        Text(
                            "${set.setOrder + 1}/$totalSets",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.ExtraBold),
                            color = Color(0xFFE12F2B),
                            maxLines = 1,
                        )
                    }
                }
            }
            if (exercise.mode == ExerciseMode.NORMAL) {
                Row(
                    Modifier.weight(1f).fillMaxWidth().padding(horizontal = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Text(
                        set.normalWeightKg?.let(::formatWeight) ?: "—",
                        style = MaterialTheme.typography.displayMedium.copy(fontWeight = FontWeight.ExtraBold),
                        maxLines = 1,
                    )
                    Text(" × ", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
                    Text(
                        set.normalReps?.toString() ?: "—",
                        style = MaterialTheme.typography.displayMedium.copy(fontWeight = FontWeight.ExtraBold),
                        maxLines = 1,
                    )
                }
            } else {
                Row(
                    Modifier.weight(1f).fillMaxWidth().padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    PreviewSideValue("左", set.leftWeightKg, set.leftReps, Modifier.weight(1f))
                    PreviewSideValue("右", set.rightWeightKg, set.rightReps, Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun PreviewSideValue(label: String, weightKg: Double?, reps: Int?, modifier: Modifier = Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            "${weightKg?.let(::formatWeight) ?: "—"} × ${reps ?: "—"}",
            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.ExtraBold),
            maxLines = 1,
        )
    }
}

@Composable
private fun SetEditorCard(
    exercise: ExerciseEntity,
    set: WorkoutSetEntity,
    totalSets: Int,
    enabled: Boolean,
    onUpdate: (WorkoutSetEntity) -> Unit,
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
    val density = LocalDensity.current
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val horizontalSwipe = abs(swipeOffsetX) >= abs(swipeOffsetY)
        val cardWidthPx = with(density) { maxWidth.toPx() }
        val cardHeightPx = with(density) { (maxHeight * 0.78f).toPx() }
        val swipeEdgePx = if (horizontalSwipe) cardWidthPx else cardHeightPx
        val swipeDistance = if (horizontalSwipe) abs(swipeOffsetX) else abs(swipeOffsetY)
        val swipeProgress = if (swipeEdgePx > 0f) (swipeDistance / (swipeEdgePx * 0.45f)).coerceIn(0f, 1f) else 0f
        val advancing = if (horizontalSwipe) swipeOffsetX > 0f else swipeOffsetY < 0f
        val swipeColor = if (!advancing) Color(0xFF201A19) else Color(0xFFF0442E)
        Card(
        Modifier.fillMaxWidth().fillMaxHeight(0.78f)
            .graphicsLayer {
                translationX = swipeOffsetX
                translationY = swipeOffsetY
                rotationZ = if (size.width > 0f) (swipeOffsetX / size.width * 12f).coerceIn(-12f, 12f) else 0f
            }
            .drawWithContent {
                drawContent()
                val horizontal = abs(swipeOffsetX) >= abs(swipeOffsetY)
                val distance = if (horizontal) abs(swipeOffsetX) else abs(swipeOffsetY)
                val edgeSize = if (horizontal) size.width else size.height
                val progress = if (edgeSize > 0f) (distance / (edgeSize * 0.45f)).coerceIn(0f, 1f) else 0f
                if (progress > 0f) {
                    val swipeAdvances = if (horizontal) swipeOffsetX > 0f else swipeOffsetY < 0f
                    val color = if (swipeAdvances) Color(0xFFF0442E) else Color(0xFF201A19)
                    val tint = color.copy(alpha = progress * 0.2f)
                    val softTint = tint.copy(alpha = tint.alpha * 0.58f)
                    val clear = Color.Transparent
                    val spread = 0.12f + progress * 0.62f
                    val brush = when {
                        horizontal && swipeOffsetX > 0f -> Brush.horizontalGradient(
                            colorStops = arrayOf(0f to tint, spread * 0.55f to softTint, spread to clear, 1f to clear),
                            endX = size.width,
                        )
                        horizontal -> Brush.horizontalGradient(
                            colorStops = arrayOf(0f to clear, 1f - spread to clear, 1f - spread * 0.55f to softTint, 1f to tint),
                            endX = size.width,
                        )
                        swipeOffsetY > 0f -> Brush.verticalGradient(
                            colorStops = arrayOf(0f to tint, spread * 0.55f to softTint, spread to clear, 1f to clear),
                            endY = size.height,
                        )
                        else -> Brush.verticalGradient(
                            colorStops = arrayOf(0f to clear, 1f - spread to clear, 1f - spread * 0.55f to softTint, 1f to tint),
                            endY = size.height,
                        )
                    }
                    drawRect(brush = brush)
                }
            }
            .pointerInput(set.id, enabled) {
                var dragX = 0f
                var dragY = 0f
                detectDragGestures(
                    onDragStart = {
                        dragX = 0f
                        dragY = 0f
                    },
                    onDrag = { change, dragAmount ->
                        change.consume()
                        dragX += dragAmount.x
                        dragY += dragAmount.y
                        swipeOffsetX = dragX
                        swipeOffsetY = dragY.coerceIn(-size.height * 0.35f, size.height * 0.35f)
                    },
                    onDragEnd = {
                        if (!enabled) {
                            animationScope.launch {
                                Animatable(swipeOffsetX).animateTo(0f, spring()) { swipeOffsetX = value }
                                Animatable(swipeOffsetY).animateTo(0f, spring()) { swipeOffsetY = value }
                            }
                        } else {
                            val horizontal = abs(dragX) >= abs(dragY)
                            val distance = if (horizontal) abs(dragX) else abs(dragY)
                            val threshold = minOf(size.width, size.height) * 0.12f
                            if (distance >= threshold) {
                                val advance = if (horizontal) dragX > 0f else dragY < 0f
                                // Promote the real card behind this one immediately on release.
                                // The drag itself already provides the swipe motion, so waiting for
                                // an extra off-screen animation only made skip feel delayed.
                                if (advance) onAdvance() else onSkip()
                            } else {
                                animationScope.launch {
                                    Animatable(swipeOffsetX).animateTo(0f, spring()) { swipeOffsetX = value }
                                    Animatable(swipeOffsetY).animateTo(0f, spring()) { swipeOffsetY = value }
                                }
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
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFAF7)),
        ) {
        Box(Modifier.fillMaxSize()) {
          Column(Modifier.fillMaxSize()) {
            Row(
                Modifier.fillMaxWidth().background(Color(0xFFE93630)).padding(horizontal = 20.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    exercise.name,
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.ExtraBold, color = Color.White),
                    maxLines = 2,
                    modifier = Modifier.weight(1f),
                )
                Surface(color = Color.White, shape = CircleShape) {
                    Box(
                        modifier = Modifier.height(44.dp).padding(horizontal = 12.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "${set.setOrder + 1}/$totalSets",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.ExtraBold),
                            color = Color(0xFFE12F2B),
                            maxLines = 1,
                        )
                    }
                }
            }
            if (exercise.mode == ExerciseMode.NORMAL) {
                Box(Modifier.weight(1f).fillMaxWidth().padding(12.dp)) {
                    Surface(
                        Modifier.align(Alignment.Center).fillMaxWidth(0.96f).fillMaxHeight(0.64f),
                        shape = MaterialTheme.shapes.extraLarge,
                        color = Color.Transparent,
                        tonalElevation = 0.dp,
                    ) {
                        Row(
                            Modifier.fillMaxSize().padding(horizontal = 5.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                        ) {
                            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    set.normalWeightKg?.let(::formatWeight) ?: "—",
                                    style = MaterialTheme.typography.displayLarge.copy(fontWeight = FontWeight.ExtraBold),
                                    maxLines = 1,
                                    softWrap = false,
                                )
                                Text("kg", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text("×", style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold), color = MaterialTheme.colorScheme.primary)
                            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    set.normalReps?.toString() ?: "—",
                                    style = MaterialTheme.typography.displayLarge.copy(fontWeight = FontWeight.ExtraBold),
                                    maxLines = 1,
                                    softWrap = false,
                                )
                                Text("回", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                    Column(Modifier.fillMaxSize()) {
                        Row(Modifier.weight(1f).fillMaxWidth()) {
                            InvisibleTapZone(
                                description = "重量を2.5キログラム増やす",
                                enabled = enabled,
                                onClick = { onUpdate(set.copy(normalWeightKg = (set.normalWeightKg ?: 0.0) + 2.5)) },
                                modifier = Modifier.weight(1f).fillMaxHeight(),
                            )
                            InvisibleTapZone(
                                description = "回数を1回増やす",
                                enabled = enabled,
                                onClick = { onUpdate(set.copy(normalReps = (set.normalReps ?: 0) + 1)) },
                                modifier = Modifier.weight(1f).fillMaxHeight(),
                            )
                        }
                        Row(Modifier.weight(1f).fillMaxWidth()) {
                            InvisibleTapZone(
                                description = "重量を2.5キログラム減らす",
                                enabled = enabled && (set.normalWeightKg ?: 0.0) >= 2.5,
                                onClick = { onUpdate(set.copy(normalWeightKg = ((set.normalWeightKg ?: 0.0) - 2.5).coerceAtLeast(0.0))) },
                                modifier = Modifier.weight(1f).fillMaxHeight(),
                            )
                            InvisibleTapZone(
                                description = "回数を1回減らす",
                                enabled = enabled && (set.normalReps ?: 0) > 0,
                                onClick = { onUpdate(set.copy(normalReps = ((set.normalReps ?: 0) - 1).coerceAtLeast(0))) },
                                modifier = Modifier.weight(1f).fillMaxHeight(),
                            )
                        }
                    }
                }
            } else {
                Column(Modifier.weight(1f).fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
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
          if (swipeProgress > 0f) {
              Box(
                  modifier = Modifier
                      .align(Alignment.Center)
                      .size(72.dp)
                      .graphicsLayer {
                          alpha = swipeProgress
                          scaleX = 0.72f + 0.28f * swipeProgress
                          scaleY = 0.72f + 0.28f * swipeProgress
                      }
                      .background(swipeColor.copy(alpha = 0.16f), CircleShape),
                  contentAlignment = Alignment.Center,
              ) {
                  Icon(
                      imageVector = if (advancing) Icons.Default.Check else Icons.Default.Close,
                      contentDescription = null,
                      modifier = Modifier.size(36.dp),
                      tint = swipeColor,
                  )
              }
          }
        }
    }
}
}

@Composable
private fun InvisibleTapZone(
    description: String,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val view = LocalView.current
    Box(
        modifier.clickable(
            enabled = enabled,
            interactionSource = androidx.compose.runtime.remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
            indication = null,
            onClick = {
                view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                onClick()
            },
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
    Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(side, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
        Box(Modifier.weight(1f).fillMaxWidth()) {
            Surface(
                Modifier.align(Alignment.Center).fillMaxWidth(0.96f).fillMaxHeight(0.64f),
                shape = MaterialTheme.shapes.extraLarge,
                color = Color.Transparent,
                tonalElevation = 0.dp,
            ) {
                Row(Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(weightKg?.let(::formatWeight) ?: "—", style = MaterialTheme.typography.displayMedium, maxLines = 1, softWrap = false)
                        Text("kg", style = MaterialTheme.typography.labelLarge)
                    }
                    Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(reps?.toString() ?: "—", style = MaterialTheme.typography.displayMedium, maxLines = 1, softWrap = false)
                        Text("回", style = MaterialTheme.typography.labelLarge)
                    }
                }
            }
            Column(Modifier.fillMaxSize()) {
                Row(Modifier.weight(1f).fillMaxWidth()) {
                    InvisibleTapZone(
                        description = "${side}側の重量を2.5キログラム増やす",
                        enabled = enabled,
                        onClick = { onChange((weightKg ?: 0.0) + 2.5, reps ?: 0) },
                        modifier = Modifier.weight(1f).fillMaxHeight(),
                    )
                    InvisibleTapZone(
                        description = "${side}側の回数を1回増やす",
                        enabled = enabled,
                        onClick = { onChange(weightKg ?: 0.0, (reps ?: 0) + 1) },
                        modifier = Modifier.weight(1f).fillMaxHeight(),
                    )
                }
                Row(Modifier.weight(1f).fillMaxWidth()) {
                    InvisibleTapZone(
                        description = "${side}側の重量を2.5キログラム減らす",
                        enabled = enabled && (weightKg ?: 0.0) >= 2.5,
                        onClick = { onChange(((weightKg ?: 0.0) - 2.5).coerceAtLeast(0.0), reps ?: 0) },
                        modifier = Modifier.weight(1f).fillMaxHeight(),
                    )
                    InvisibleTapZone(
                        description = "${side}側の回数を1回減らす",
                        enabled = enabled && (reps ?: 0) > 0,
                        onClick = { onChange(weightKg ?: 0.0, ((reps ?: 0) - 1).coerceAtLeast(0)) },
                        modifier = Modifier.weight(1f).fillMaxHeight(),
                    )
                }
            }
        }
    }
}

private fun formatWeight(weightKg: Double): String =
    BigDecimal.valueOf(weightKg).stripTrailingZeros().toPlainString()

@Composable
private fun RestTimerCard(
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
    Card(
        Modifier.fillMaxWidth().fillMaxHeight(0.78f),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1976D2)),
    ) {
        Column(Modifier.fillMaxSize()) {
            Row(
                Modifier.fillMaxWidth().background(Color(0xFF0D47A1)).padding(horizontal = 20.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("休憩", style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.ExtraBold), color = Color.White)
            }
            Column(
                Modifier.weight(1f).fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    if (remainingSeconds > 0L) "次のセットまで" else "休憩終了",
                    style = MaterialTheme.typography.titleLarge,
                    color = Color.White.copy(alpha = 0.88f),
                )
                Text(
                    "${remainingSeconds / 60}:${(remainingSeconds % 60).toString().padStart(2, '0')}",
                    style = MaterialTheme.typography.displayLarge.copy(fontSize = 76.sp, fontWeight = FontWeight.ExtraBold),
                    color = Color.White,
                    maxLines = 1,
                )
            }
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (remainingSeconds > 0L) {
                    OutlinedButton(
                        onClick = onAddRestSeconds,
                        modifier = Modifier.weight(1f).height(56.dp),
                        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                    ) { Text("+15秒", style = MaterialTheme.typography.titleMedium) }
                }
                Button(
                    onClick = onSkipRest,
                    modifier = Modifier.weight(1f).height(56.dp),
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = Color(0xFF0D47A1),
                    ),
                ) {
                    Text(if (remainingSeconds > 0L) "休憩終了" else "次へ", style = MaterialTheme.typography.titleMedium)
                }
            }
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
private fun SettingsScreen(
    viewModel: FitLogViewModel,
    exercises: List<ExerciseEntity>,
    presets: List<WorkoutPreset>,
    onAddExercise: () -> Unit,
    flatModeEnabled: Boolean,
    displayName: String,
    onDisplayNameChange: (String) -> Unit,
    onFlatModeEnabledChange: (Boolean) -> Unit,
) {
    val routineExerciseIds by viewModel.routineExerciseIds.collectAsStateWithLifecycle()
    var displayNameDraft by rememberSaveable { mutableStateOf(displayName) }
    var editingPresetId by rememberSaveable { mutableStateOf<String?>(null) }
    var showAddPreset by rememberSaveable { mutableStateOf(false) }
    var newPresetName by rememberSaveable { mutableStateOf("") }
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
        item { Text("プリセット", style = MaterialTheme.typography.titleLarge) }
        items(presets, key = { "preset-${it.id}" }) { preset ->
            Card(Modifier.fillMaxWidth().pressMotionClickable { editingPresetId = preset.id }) {
                Row(Modifier.padding(start = 16.dp, end = 4.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(preset.name, style = MaterialTheme.typography.titleMedium)
                        Text("${preset.exercises.size}種目", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    IconButton(onClick = { editingPresetId = preset.id }) { Icon(Icons.Default.Edit, "編集") }
                    IconButton(onClick = { viewModel.setPresets(presets.filterNot { it.id == preset.id }) }) { Icon(Icons.Default.Delete, "削除") }
                }
            }
        }
        item {
            OutlinedButton(onClick = { newPresetName = ""; showAddPreset = true }, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                Icon(Icons.Default.Add, null); Text("プリセットを追加")
            }
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
        item { Text("このアプリは筋トレ記録を端末内に保存し、外部へ送信しません。", style = MaterialTheme.typography.bodySmall) }
    }
    if (showAddPreset) {
        AlertDialog(
            onDismissRequest = { showAddPreset = false },
            title = { Text("プリセットを追加") },
            text = {
                OutlinedTextField(
                    value = newPresetName,
                    onValueChange = { newPresetName = it.take(24) },
                    label = { Text("名前") },
                    singleLine = true,
                )
            },
            confirmButton = {
                TextButton(enabled = newPresetName.trim().isNotEmpty(), onClick = {
                    val preset = WorkoutPreset(name = newPresetName.trim())
                    viewModel.setPresets(presets + preset)
                    editingPresetId = preset.id
                    showAddPreset = false
                }) { Text("追加") }
            },
            dismissButton = { TextButton(onClick = { showAddPreset = false }) { Text("キャンセル") } },
        )
    }
    presets.firstOrNull { it.id == editingPresetId }?.let { preset ->
        PresetEditorDialog(
            preset = preset,
            exercises = exercises,
            onChange = { updated -> viewModel.setPresets(presets.map { if (it.id == preset.id) updated else it }) },
            onDismiss = { editingPresetId = null },
        )
    }
}

@Composable
private fun PresetEditorDialog(
    preset: WorkoutPreset,
    exercises: List<ExerciseEntity>,
    onChange: (WorkoutPreset) -> Unit,
    onDismiss: () -> Unit,
) {
    val latestPreset by androidx.compose.runtime.rememberUpdatedState(preset)
    var expanded by rememberSaveable(preset.id) { mutableStateOf(false) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("プリセットを編集") },
        text = {
            Column(
                Modifier.fillMaxWidth().heightIn(max = 620.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedTextField(
                    value = preset.name,
                    onValueChange = { onChange(preset.copy(name = it.take(24))) },
                    label = { Text("プリセット名") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text("種目の順番と、開始時の値を設定", style = MaterialTheme.typography.bodySmall)
                preset.exercises.forEach { config ->
                    val exercise = exercises.firstOrNull { it.id == config.exerciseId } ?: return@forEach
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(exercise.name, Modifier.weight(1f), style = MaterialTheme.typography.titleSmall)
                                Text(
                                    "☷",
                                    Modifier.pointerInput(config.exerciseId) {
                                        var startIndex = 0
                                        var draggedDistance = 0f
                                        val rowHeight = with(density) { 156.dp.toPx() }
                                        detectDragGesturesAfterLongPress(
                                            onDragStart = {
                                                startIndex = latestPreset.exercises.indexOfFirst { it.exerciseId == config.exerciseId }
                                                draggedDistance = 0f
                                            },
                                            onDrag = { change, amount ->
                                                change.consume()
                                                draggedDistance += amount.y
                                                val target = (startIndex + (draggedDistance / rowHeight).roundToInt())
                                                    .coerceIn(0, latestPreset.exercises.lastIndex)
                                                val current = latestPreset.exercises.indexOfFirst { it.exerciseId == config.exerciseId }
                                                if (current >= 0 && target != current) {
                                                    val reordered = latestPreset.exercises.toMutableList().apply {
                                                        add(target, removeAt(current))
                                                    }
                                                    onChange(latestPreset.copy(exercises = reordered))
                                                }
                                            },
                                        )
                                    }.padding(horizontal = 12.dp, vertical = 4.dp),
                                    color = MaterialTheme.colorScheme.primary,
                                    style = MaterialTheme.typography.headlineSmall,
                                )
                                IconButton(onClick = {
                                    onChange(preset.copy(exercises = preset.exercises.filterNot { it.exerciseId == config.exerciseId }))
                                }) { Icon(Icons.Default.Delete, "種目を削除") }
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                OutlinedTextField(
                                    value = config.weightKg,
                                    onValueChange = { value ->
                                        onChange(preset.copy(exercises = preset.exercises.map {
                                            if (it.exerciseId == config.exerciseId) it.copy(weightKg = value.filter { char -> char.isDigit() || char == '.' }) else it
                                        }))
                                    },
                                    label = { Text("kg") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                    modifier = Modifier.weight(1f),
                                )
                                OutlinedTextField(
                                    value = config.reps,
                                    onValueChange = { value ->
                                        onChange(preset.copy(exercises = preset.exercises.map {
                                            if (it.exerciseId == config.exerciseId) it.copy(reps = value.filter(Char::isDigit)) else it
                                        }))
                                    },
                                    label = { Text("回") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    modifier = Modifier.weight(1f),
                                )
                                OutlinedTextField(
                                    value = config.sets,
                                    onValueChange = { value ->
                                        onChange(preset.copy(exercises = preset.exercises.map {
                                            if (it.exerciseId == config.exerciseId) it.copy(sets = value.filter(Char::isDigit)) else it
                                        }))
                                    },
                                    label = { Text("セット") },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                    }
                }
                Box {
                    OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Default.Add, null); Text("種目を追加")
                    }
                    DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        exercises.filter { candidate -> preset.exercises.none { it.exerciseId == candidate.id } }.forEach { exercise ->
                            DropdownMenuItem(
                                text = { Text(exercise.name) },
                                onClick = {
                                    onChange(preset.copy(exercises = preset.exercises + PresetExerciseConfig(exerciseId = exercise.id)))
                                    expanded = false
                                },
                            )
                        }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("完了") } },
    )
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
