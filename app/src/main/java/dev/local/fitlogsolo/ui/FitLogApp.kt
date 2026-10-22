package dev.local.fitlogsolo.ui

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.view.HapticFeedbackConstants
import android.view.WindowManager
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.Image
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.background
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.layout.width
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
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
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
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.local.fitlogsolo.FitLogViewModel
import dev.local.fitlogsolo.R
import dev.local.fitlogsolo.RestTimerAlarm
import dev.local.fitlogsolo.data.PresetExerciseConfig
import dev.local.fitlogsolo.data.WorkoutPreset
import dev.local.fitlogsolo.data.ExerciseEntity
import dev.local.fitlogsolo.data.ExerciseMode
import dev.local.fitlogsolo.data.SessionStatus
import dev.local.fitlogsolo.data.WorkoutSetEntity
import dev.local.fitlogsolo.data.exerciseTrainingDefault
import java.time.ZoneId
import java.time.LocalDate
import java.time.YearMonth
import kotlin.math.roundToInt
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.math.BigDecimal
import kotlin.math.abs
import kotlin.math.hypot
import kotlinx.coroutines.delay
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

private const val WORKOUT_CARD_HEIGHT_FRACTION = 0.78f

private enum class MainScreen { HOME, SETTINGS, WORKOUT_COMPLETE }
private enum class ExerciseSide { RIGHT, LEFT }
private val ExerciseSide.label: String
    get() = if (this == ExerciseSide.RIGHT) "右" else "左"

private data class WorkoutCardRef(
    val exercise: ExerciseEntity,
    val set: WorkoutSetEntity,
    val side: ExerciseSide? = null,
)

private data class EditorCardScene(
    val key: String,
    val exercise: ExerciseEntity? = null,
    val set: WorkoutSetEntity? = null,
    val side: ExerciseSide? = null,
    val totalSets: Int = 0,
    val enabled: Boolean = true,
    val restEndsAtMillis: Long = 0L,
    val restStartedAtMillis: Long = 0L,
)

private data class WorkoutCompletionStats(
    val exerciseCount: Int = 0,
    val setCount: Int = 0,
    val durationMinutes: Int = 0,
)

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

private val FitLogColors = lightColorScheme(
    primary = Color(0xFF147C73),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD9ECE8),
    onPrimaryContainer = Color(0xFF124640),
    secondary = Color(0xFF5C7A72),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE2ECE7),
    onSecondaryContainer = Color(0xFF263B36),
    tertiary = Color(0xFF78931F),
    onTertiary = Color(0xFF193039),
    tertiaryContainer = Color(0xFFD6EF86),
    onTertiaryContainer = Color(0xFF193039),
    background = Color(0xFFF3F6F2),
    surface = Color.White,
    surfaceVariant = Color(0xFFE7EEEA),
    onSurface = Color(0xFF193039),
    onSurfaceVariant = Color(0xFF64777B),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FitLogApp(
    viewModel: FitLogViewModel,
) {
    MaterialTheme(colorScheme = FitLogColors) {
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
    var completionStats by remember { mutableStateOf(WorkoutCompletionStats()) }
    var restEndsAtMillis by rememberSaveable { mutableLongStateOf(0L) }
    var restStartedAtMillis by rememberSaveable { mutableLongStateOf(0L) }
    var pendingWorkoutStart by remember { mutableStateOf<(() -> Unit)?>(null) }
    var showExactAlarmPermissionDialog by rememberSaveable { mutableStateOf(false) }
    var presetExerciseOrder by rememberSaveable { mutableStateOf("") }
    val exercises by viewModel.exercises.collectAsStateWithLifecycle()
    val allExercises by viewModel.allExercises.collectAsStateWithLifecycle()
    val activeSession by viewModel.activeSession.collectAsStateWithLifecycle()
    val sessions by viewModel.completedSessions.collectAsStateWithLifecycle()
    val routineExerciseIds by viewModel.routineExerciseIds.collectAsStateWithLifecycle()
    val selectedExercise = exercises.firstOrNull { it.id == selectedExerciseId }
    val workoutFullscreen = activeSession != null && selectedExercise != null
    val weightStepKg by viewModel.weightStepKg.collectAsStateWithLifecycle()
    val exerciseWeightSteps by viewModel.exerciseWeightSteps.collectAsStateWithLifecycle()
    val restDurationSeconds by viewModel.restDurationSeconds.collectAsStateWithLifecycle()
    val exerciseRestDurations by viewModel.exerciseRestDurations.collectAsStateWithLifecycle()
    val sideSwitchRestExerciseIds by viewModel.sideSwitchRestExerciseIds.collectAsStateWithLifecycle()
    val leftFirstExerciseIds by viewModel.leftFirstExerciseIds.collectAsStateWithLifecycle()
    val presets by viewModel.presets.collectAsStateWithLifecycle()
    val message by viewModel.message.collectAsStateWithLifecycle()
    val snackbar = SnackbarHostState()
    val context = LocalContext.current
    val permissionScope = rememberCoroutineScope()

    LaunchedEffect(Unit) { viewModel.initializeDefaultPresets() }

    val exactAlarmPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) {
        val action = pendingWorkoutStart
        pendingWorkoutStart = null
        if (RestTimerAlarm.canScheduleExactAlarms(context)) {
            action?.invoke()
        } else if (action != null) {
            permissionScope.launch {
                snackbar.showSnackbar("許可されていないためトレーニングを開始しませんでした")
            }
        }
    }

    fun startWorkoutWithBackgroundAlerts(action: () -> Unit) {
        if (RestTimerAlarm.canScheduleExactAlarms(context)) {
            action()
        } else {
            pendingWorkoutStart = action
            showExactAlarmPermissionDialog = true
        }
    }

    DisposableEffect(workoutFullscreen) {
        val window = (context as? Activity)?.window
        val keepAwake = workoutFullscreen
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

    val mainScreen = when {
        showWorkoutComplete -> MainScreen.WORKOUT_COMPLETE
        settings -> MainScreen.SETTINGS
        else -> MainScreen.HOME
    }
    BackHandler(
        enabled = showAddExercise || settings || workoutFullscreen,
    ) {
        when {
            showAddExercise -> showAddExercise = false
            settings -> settings = false
            workoutFullscreen -> selectedExerciseId = null
        }
    }
    Scaffold(
        modifier = Modifier.safeDrawingPadding(),
        topBar = {},
        floatingActionButton = {
            AnimatedVisibility(
                visible = !workoutFullscreen && !settings && !showWorkoutComplete,
                enter = fadeIn(tween(220)) + scaleIn(tween(220), initialScale = 0.82f),
                exit = fadeOut(tween(150)) + scaleOut(tween(150), targetScale = 0.82f),
            ) {
                FloatingActionButton(onClick = { settings = true }, shape = CircleShape) {
                    Icon(Icons.Default.Settings, contentDescription = "設定")
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Surface(
            Modifier.fillMaxSize()
                .padding(padding)
                .animateContentSize(spring(stiffness = 500f)),
            color = MaterialTheme.colorScheme.background,
        ) {
            AnimatedContent(
                targetState = mainScreen,
                transitionSpec = {
                    if (targetState == MainScreen.WORKOUT_COMPLETE) {
                        (fadeIn(tween(280)) + scaleIn(tween(320), initialScale = 0.94f)) togetherWith
                            (fadeOut(tween(180)) + scaleOut(tween(220), targetScale = 1.03f))
                    } else {
                        (slideInHorizontally(tween(320)) { width -> width / 5 } + fadeIn(tween(240))) togetherWith
                            (slideOutHorizontally(tween(280)) { width -> -width / 5 } + fadeOut(tween(180)))
                    }
                },
                label = "main screen transition",
            ) { screen ->
                when (screen) {
                    MainScreen.WORKOUT_COMPLETE -> WorkoutCompleteScreen(
                        stats = completionStats,
                        saving = !workoutCompletionSaved,
                        onOpenRecords = {
                            showWorkoutComplete = false
                            workoutCompletionSaved = false
                        },
                    )
                    MainScreen.SETTINGS -> SettingsScreen(
                        viewModel = viewModel,
                        exercises = exercises,
                        presets = presets,
                        onBack = { settings = false },
                        onAddExercise = { showAddExercise = true },
                        weightStepKg = weightStepKg,
                        exerciseWeightSteps = exerciseWeightSteps,
                        restDurationSeconds = restDurationSeconds,
                        exerciseRestDurations = exerciseRestDurations,
                        sideSwitchRestExerciseIds = sideSwitchRestExerciseIds,
                        leftFirstExerciseIds = leftFirstExerciseIds,
                        onWeightStepKgChange = viewModel::setWeightStepKg,
                        onExerciseWeightStepChange = viewModel::setExerciseWeightStepKg,
                        onResetExerciseWeightStep = viewModel::resetExerciseWeightStepKg,
                        onRestDurationChange = viewModel::setRestDurationSeconds,
                        onExerciseRestDurationChange = viewModel::setExerciseRestDurationSeconds,
                        onExerciseSideSwitchRestChange = viewModel::setExerciseSideSwitchRestEnabled,
                        onExerciseStartSideChange = viewModel::setExerciseStartsLeft,
                    )
                    MainScreen.HOME -> RecordScreen(
                        viewModel = viewModel,
                        exercises = exercises,
                        allExercises = allExercises,
                        presets = presets,
                        routineExerciseIds = routineExerciseIds,
                        onOpenSettings = { settings = true },
                        activeSessionId = activeSession?.id,
                        completedSessions = sessions,
                        presetExerciseOrder = presetExerciseOrder.split(',').mapNotNull(String::toLongOrNull),
                        selectedExercise = selectedExercise,
                        onExerciseOrderChange = { ids -> presetExerciseOrder = ids.joinToString(",") },
                        restEndsAtMillis = restEndsAtMillis,
                        restStartedAtMillis = restStartedAtMillis,
                        weightStepKg = weightStepKg,
                        exerciseWeightSteps = exerciseWeightSteps,
                        restDurationSeconds = restDurationSeconds,
                        exerciseRestDurations = exerciseRestDurations,
                        sideSwitchRestExerciseIds = sideSwitchRestExerciseIds,
                        leftFirstExerciseIds = leftFirstExerciseIds,
                        onStartPreset = { preset ->
                            startWorkoutWithBackgroundAlerts {
                                viewModel.startPreset(preset) { _, exerciseIds ->
                                    selectedExerciseId = exerciseIds.firstOrNull()
                                    presetExerciseOrder = exerciseIds.joinToString(",")
                                }
                            }
                        },
                        onSelectExercise = { exercise ->
                            startWorkoutWithBackgroundAlerts {
                                viewModel.startExercise(exercise) {
                                    selectedExerciseId = exercise.id
                                }
                            }
                        },
                        onToggleRoutineExercise = viewModel::toggleRoutineExercise,
                        onSetCompleted = { durationSeconds ->
                            if (durationSeconds > 0L) {
                                val restStartTime = System.currentTimeMillis()
                                val restEndTime = restStartTime + durationSeconds * 1_000L
                                RestTimerAlarm.schedule(context, restEndTime)
                                restStartedAtMillis = restStartTime
                                restEndsAtMillis = restEndTime
                            }
                        },
                        onSkipRest = {
                            RestTimerAlarm.cancel(context)
                            restStartedAtMillis = 0L
                            restEndsAtMillis = 0L
                        },
                        onFinishSession = {
                            activeSession?.id?.let { viewModel.finishSession(it) }
                            selectedExerciseId = null
                            RestTimerAlarm.cancel(context)
                            restStartedAtMillis = 0L
                            restEndsAtMillis = 0L
                            presetExerciseOrder = ""
                        },
                        onWorkoutComplete = { stats ->
                            completionStats = stats
                            workoutCompletionSaved = false
                            activeSession?.id?.let { sessionId ->
                                viewModel.finishSession(sessionId, announce = false) { workoutCompletionSaved = true }
                            } ?: run { workoutCompletionSaved = true }
                            selectedExerciseId = null
                            RestTimerAlarm.cancel(context)
                            restStartedAtMillis = 0L
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
    }

    if (showAddExercise) {
        AddExerciseDialog(
            onDismiss = { showAddExercise = false },
            onSave = { name, mode -> viewModel.addExercise(name, mode); showAddExercise = false },
        )
    }

    if (showExactAlarmPermissionDialog) {
        AlertDialog(
            onDismissRequest = {
                showExactAlarmPermissionDialog = false
                pendingWorkoutStart = null
            },
            title = { Text("バックグラウンドの休憩アラーム") },
            text = {
                Text("別のアプリを開いている時や画面が消えている時も、休憩終了時に音と振動を出すには「アラームとリマインダー」の許可が必要です。設定後にトレーニングを開始します。")
            },
            confirmButton = {
                TextButton(onClick = {
                    showExactAlarmPermissionDialog = false
                    val settingsIntent = Intent(
                        Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                        Uri.parse("package:${context.packageName}"),
                    )
                    exactAlarmPermissionLauncher.launch(settingsIntent)
                }) { Text("設定を開く") }
            },
            dismissButton = {
                TextButton(onClick = {
                    showExactAlarmPermissionDialog = false
                    pendingWorkoutStart = null
                }) { Text("キャンセル") }
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RecordScreen(
    viewModel: FitLogViewModel,
    exercises: List<ExerciseEntity>,
    allExercises: List<ExerciseEntity>,
    presets: List<WorkoutPreset>,
    routineExerciseIds: List<Long>,
    onOpenSettings: () -> Unit,
    activeSessionId: Long?,
    completedSessions: List<dev.local.fitlogsolo.data.WorkoutSessionEntity>,
    presetExerciseOrder: List<Long>,
    selectedExercise: ExerciseEntity?,
    onExerciseOrderChange: (List<Long>) -> Unit,
    restEndsAtMillis: Long,
    restStartedAtMillis: Long,
    weightStepKg: Double,
    exerciseWeightSteps: Map<Long, Double>,
    restDurationSeconds: Long,
    exerciseRestDurations: Map<Long, Long>,
    sideSwitchRestExerciseIds: Set<Long>,
    leftFirstExerciseIds: Set<Long>,
    onStartPreset: (WorkoutPreset) -> Unit,
    onSelectExercise: (ExerciseEntity) -> Unit,
    onToggleRoutineExercise: (Long) -> Unit,
    onSetCompleted: (Long) -> Unit,
    onSkipRest: () -> Unit,
    onFinishSession: () -> Unit,
    onWorkoutComplete: (WorkoutCompletionStats) -> Unit,
    onBack: () -> Unit,
    onAddExercise: () -> Unit,
) {
    var showExercisePicker by rememberSaveable { mutableStateOf(false) }
    val sessionSetsFlow = remember(viewModel, activeSessionId) {
        activeSessionId?.let(viewModel::sessionSets) ?: kotlinx.coroutines.flow.flowOf(emptyList())
    }
    val sessionSets by sessionSetsFlow
        .collectAsStateWithLifecycle(emptyList())
    val sessionExerciseIds = presetExerciseOrder.ifEmpty {
        sessionSets.sortedBy { it.createdAt }.map { it.exerciseId }.distinct()
    }
    val resumableExercise = sessionExerciseIds
        .firstOrNull { exerciseId -> sessionSets.any { it.exerciseId == exerciseId && !it.isCompleted } }
        ?.let { exerciseId -> exercises.firstOrNull { it.id == exerciseId } }
        ?: sessionExerciseIds.firstOrNull()?.let { exerciseId -> exercises.firstOrNull { it.id == exerciseId } }
    val currentMonth = remember { YearMonth.now() }
    val monthlySessions = remember(completedSessions, currentMonth) {
        completedSessions.filter { session ->
            runCatching { YearMonth.from(session.startedAt.atZone(ZoneId.systemDefault()).toLocalDate()) == currentMonth }
                .getOrDefault(false)
        }.sortedByDescending { it.endedAt ?: it.startedAt }
    }
    val monthlySessionIds = remember(monthlySessions) { monthlySessions.map { it.id } }
    val recentSession = remember(completedSessions) { completedSessions.maxByOrNull { it.endedAt ?: it.startedAt } }
    val homeSessionIds = remember(monthlySessionIds, recentSession) {
        (monthlySessionIds + listOfNotNull(recentSession?.id)).distinct()
    }
    var homeSets by remember { mutableStateOf<List<WorkoutSetEntity>>(emptyList()) }
    LaunchedEffect(homeSessionIds) {
        homeSets = if (homeSessionIds.isEmpty()) emptyList() else viewModel.historySets(homeSessionIds)
    }
    AnimatedContent(
        targetState = selectedExercise?.let { exercise -> activeSessionId?.let { sessionId -> sessionId to exercise.id } },
        transitionSpec = {
            when {
                initialState == null && targetState != null ->
                    (slideInVertically(tween(320)) { height -> height / 4 } + fadeIn(tween(220))) togetherWith fadeOut(tween(160))
                initialState != null && targetState == null ->
                    fadeIn(tween(160)) togetherWith (slideOutVertically(tween(280)) { height -> height / 4 } + fadeOut(tween(180)))
                else -> androidx.compose.animation.EnterTransition.None togetherWith
                    androidx.compose.animation.ExitTransition.None
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
                allExercises = allExercises,
                allSessionSets = sessionSets,
                exerciseOrderIds = presetExerciseOrder,
                onExerciseOrderChange = onExerciseOrderChange,
                restEndsAtMillis = restEndsAtMillis,
                restStartedAtMillis = restStartedAtMillis,
                weightStepKg = weightStepKg,
                exerciseWeightSteps = exerciseWeightSteps,
                restDurationSeconds = restDurationSeconds,
                exerciseRestDurations = exerciseRestDurations,
                sideSwitchRestExerciseIds = sideSwitchRestExerciseIds,
                leftFirstExerciseIds = leftFirstExerciseIds,
                onSetCompleted = onSetCompleted,
                onSkipRest = onSkipRest,
                onBack = onBack,
                onNextExercise = { nextId -> exercises.firstOrNull { it.id == nextId }?.let(onSelectExercise) },
                onFinishSession = onFinishSession,
                onWorkoutComplete = {
                    val completedSets = sessionSets.filter { it.isCompleted }
                    val start = completedSets.minOfOrNull { it.createdAt }
                    val end = completedSets.maxOfOrNull { it.updatedAt }
                    val minutes = if (start != null && end != null) {
                        java.time.Duration.between(start, end).toMinutes().coerceAtLeast(1).toInt()
                    } else 0
                    onWorkoutComplete(
                        WorkoutCompletionStats(
                            exerciseCount = completedSets.map { it.exerciseId }.distinct().size,
                            setCount = completedSets.size,
                            durationMinutes = minutes,
                        ),
                    )
                },
            )
        } else {
            Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
                LazyColumn(
                    Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item {
                        Row(
                            Modifier.fillMaxWidth().padding(top = 10.dp, bottom = 2.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text("今日も一歩ずつ", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("トレーニング記録", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                            }
                            Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = CircleShape) {
                                Text(
                                    "今月 ${monthlySessions.size}回",
                                    Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }
                    if (activeSessionId != null) {
                        item {
                            Card(Modifier.fillMaxWidth()) {
                                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("進行中のトレーニング", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    Text(
                                        resumableExercise?.let { "続き：${it.name}" } ?: "プリセットから再開できます",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        if (resumableExercise != null) Button(onClick = { onSelectExercise(resumableExercise) }) { Text("再開") }
                                        TextButton(onClick = onFinishSession) { Text("終了") }
                                    }
                                }
                            }
                        }
                    }
                    item { WorkoutCalendar(completedSessions, allExercises, viewModel) }
                    item {
                        val completedSetCount = homeSets.count { it.sessionId in monthlySessionIds && it.isCompleted }
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                            MonthlyStatCard("${monthlySessions.size}回", "今月の回数", Modifier.weight(1f))
                            MonthlyStatCard("${completedSetCount}セット", "今月の記録", Modifier.weight(1f))
                        }
                    }
                    item {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text("プリセット", Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            TextButton(onClick = onOpenSettings) { Text("編集 ›", style = MaterialTheme.typography.labelSmall) }
                        }
                    }
                    if (presets.isEmpty()) {
                        item { Text("プリセットがありません。設定から追加できます。", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    } else {
                        items(presets.chunked(2), key = { it.first().id }) { rowPresets ->
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                                rowPresets.forEachIndexed { index, preset ->
                                    PresetChoiceCard(
                                        label = preset.name,
                                        detail = if (preset.exercises.isEmpty()) "種目を設定" else "${preset.exercises.size}種目",
                                        enabled = preset.exercises.isNotEmpty(),
                                        accent = if (index == 0) MaterialTheme.colorScheme.primary else Color(0xFF83A891),
                                        onClick = { onStartPreset(preset) },
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                                if (rowPresets.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                    item {
                        val recent = recentSession
                        val recentSets = homeSets.filter { it.sessionId == recent?.id && it.isCompleted }
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text("最近の記録", Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text("履歴", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Card(Modifier.fillMaxWidth()) {
                            if (recent == null) {
                                Text("トレーニング記録がここに表示されます", Modifier.padding(14.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            } else {
                                val recentDate = recent.startedAt.atZone(ZoneId.systemDefault()).toLocalDate()
                                val recentExerciseIds = recentSets.map { it.exerciseId }.distinct()
                                Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(recentDate.format(DateTimeFormatter.ofPattern("M月d日", Locale.JAPAN)), Modifier.weight(1f), style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                                        Text("${recentExerciseIds.size}種目・${recentSets.size}セット", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    val latestSet = recentSets.maxByOrNull { it.updatedAt }
                                    val latestExercise = latestSet?.let { set -> allExercises.firstOrNull { it.id == set.exerciseId } }
                                    if (latestSet != null) {
                                        Divider(color = MaterialTheme.colorScheme.surfaceVariant)
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(latestExercise?.name ?: "トレーニング", Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                                            Text(
                                                "${latestSet.normalWeightKg?.let(::formatWeight) ?: "—"}kg × ${latestSet.normalReps ?: "—"}回",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                Button(
                    onClick = { showExercisePicker = true },
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 8.dp).height(52.dp),
                ) {
                    Icon(Icons.Default.Add, null)
                    Text("種目を選んで開始", Modifier.padding(start = 8.dp), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
    if (showExercisePicker) {
        ModalBottomSheet(onDismissRequest = { showExercisePicker = false }) {
            Column(
                Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text("種目を選んで開始", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                Text("記録を始める種目を選んでください。", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Column(Modifier.heightIn(max = 420.dp).verticalScroll(rememberScrollState())) {
                    exercises.forEach { exercise ->
                        Card(
                            Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable {
                                showExercisePicker = false
                                onSelectExercise(exercise)
                            },
                        ) {
                            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text(exercise.name, Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                                Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                    if (exercises.isEmpty()) Text("種目を追加すると、ここから開始できます。", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    TextButton(
                        onClick = { showExercisePicker = false; onAddExercise() },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("＋ 種目を追加") }
                }
            }
        }
    }
}

@Composable
private fun MonthlyStatCard(value: String, label: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(value.substringBefore("回").substringBefore("セット"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
                Text(if ("セット" in value) "セット" else "回", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun PresetChoiceCard(
    label: String,
    detail: String,
    enabled: Boolean,
    accent: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(modifier = modifier.height(88.dp).pressMotionClickable(enabled, onClick)) {
        Column(Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Box(Modifier.width(24.dp).height(4.dp).clip(CircleShape).background(accent))
            Text(label, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1)
            Text(detail, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun WorkoutCompleteScreen(
    stats: WorkoutCompletionStats,
    saving: Boolean,
    onOpenRecords: () -> Unit,
) {
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
        Text("SESSION COMPLETE", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.ExtraBold, letterSpacing = 2.sp)
        Box(
            Modifier.padding(top = 12.dp).size(112.dp)
                .graphicsLayer { scaleX = progress; scaleY = progress; alpha = progress }
                .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Box(Modifier.size(88.dp).background(MaterialTheme.colorScheme.primary, CircleShape), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.Check, contentDescription = "完了", modifier = Modifier.size(56.dp), tint = Color.White)
            }
        }
        Text(
            "おつかれさま！",
            Modifier.padding(top = 24.dp).graphicsLayer { alpha = progress },
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Text(
            if (saving) "今日のトレーニングを保存しています" else "今日のトレーニングを記録しました",
            Modifier.padding(top = 8.dp),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Row(
            Modifier.fillMaxWidth().padding(top = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            CompletionStatCard("${stats.exerciseCount}", "種目", Modifier.weight(1f))
            CompletionStatCard("${stats.setCount}", "セット", Modifier.weight(1f))
            CompletionStatCard("${stats.durationMinutes}", "分", Modifier.weight(1f))
        }
        Button(onClick = onOpenRecords, enabled = !saving, modifier = Modifier.fillMaxWidth().padding(top = 24.dp).height(52.dp)) {
            Text("記録を見る", fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun CompletionStatCard(value: String, label: String, modifier: Modifier = Modifier) {
    Card(modifier) {
        Column(Modifier.fillMaxWidth().padding(vertical = 13.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun WorkoutCalendar(
    sessions: List<dev.local.fitlogsolo.data.WorkoutSessionEntity>,
    exercises: List<ExerciseEntity>,
    viewModel: FitLogViewModel,
) {
    var month by rememberSaveable { mutableStateOf(YearMonth.now().toString()) }
    var selectedDateText by rememberSaveable { mutableStateOf<String?>(null) }
    var historySets by remember { mutableStateOf<List<WorkoutSetEntity>?>(null) }
    val yearMonth = YearMonth.parse(month)
    val selectedDate = selectedDateText?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
    val sessionDays = sessions.mapNotNull { session ->
        runCatching { session.startedAt.atZone(ZoneId.systemDefault()).toLocalDate() }.getOrNull()
    }.toSet()
    val selectedSessions = sessions.filter { session ->
        selectedDate != null && runCatching {
            session.startedAt.atZone(ZoneId.systemDefault()).toLocalDate() == selectedDate
        }.getOrDefault(false)
    }
    val selectedSessionIds = selectedSessions.map { it.id }

    LaunchedEffect(selectedSessionIds) {
        if (selectedSessionIds.isEmpty()) {
            historySets = emptyList()
        } else {
            historySets = null
            historySets = viewModel.historySets(selectedSessionIds)
        }
    }

    Card(
        Modifier.fillMaxWidth()
            .animateContentSize(spring(stiffness = 500f))
            .pointerInput(yearMonth) {
                var horizontalDistance = 0f
                detectHorizontalDragGestures(
                    onHorizontalDrag = { change, dragAmount -> change.consume(); horizontalDistance += dragAmount },
                    onDragEnd = {
                        when {
                            horizontalDistance > 64f -> {
                                month = yearMonth.minusMonths(1).toString()
                                selectedDateText = null
                            }
                            horizontalDistance < -64f -> {
                                month = yearMonth.plusMonths(1).toString()
                                selectedDateText = null
                            }
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
                    IconButton(onClick = {
                        month = displayedMonth.minusMonths(1).toString()
                        selectedDateText = null
                    }) { Icon(Icons.Default.ChevronLeft, "前の月") }
                    Text(
                        displayedMonth.format(DateTimeFormatter.ofPattern("yyyy年 M月", Locale.JAPAN)),
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.weight(1f),
                    )
                    IconButton(onClick = {
                        month = displayedMonth.plusMonths(1).toString()
                        selectedDateText = null
                    }) { Icon(Icons.Default.ChevronRight, "次の月") }
                }
                Row(Modifier.fillMaxWidth()) {
                    listOf("月", "火", "水", "木", "金", "土", "日").forEach { day ->
                        Text(day, modifier = Modifier.weight(1f), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                val leadingBlanks = displayedMonth.atDay(1).dayOfWeek.value - 1
                val cells = ((leadingBlanks + displayedMonth.lengthOfMonth() + 6) / 7) * 7
                repeat(cells / 7) { week ->
                    Row(Modifier.fillMaxWidth()) {
                        repeat(7) { column ->
                            val dayNumber = week * 7 + column - leadingBlanks + 1
                            Box(Modifier.weight(1f).height(40.dp), contentAlignment = Alignment.Center) {
                                if (dayNumber in 1..displayedMonth.lengthOfMonth()) {
                                    val day = displayedMonth.atDay(dayNumber)
                                    val hasWorkout = day in workoutDays
                                    val isSelected = day == selectedDate
                                    Surface(
                                        modifier = Modifier.size(36.dp)
                                            .clickable(enabled = hasWorkout) { selectedDateText = day.toString() }
                                            .semantics {
                                                contentDescription = buildString {
                                                    append(day.format(DateTimeFormatter.ofPattern("M月d日", Locale.JAPAN)))
                                                    if (hasWorkout) append("、トレーニング記録あり")
                                                    if (isSelected) append("、選択中")
                                                }
                                            },
                                        shape = MaterialTheme.shapes.large,
                                        border = if (day == LocalDate.now() && !hasWorkout && !isSelected) {
                                            BorderStroke(1.dp, MaterialTheme.colorScheme.primary)
                                        } else null,
                                        color = when {
                                            isSelected || hasWorkout -> MaterialTheme.colorScheme.primary
                                            else -> Color.Transparent
                                        },
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(
                                                dayNumber.toString(),
                                                style = MaterialTheme.typography.bodySmall,
                                                color = when {
                                                    isSelected || hasWorkout -> MaterialTheme.colorScheme.onPrimary
                                                    day == LocalDate.now() -> MaterialTheme.colorScheme.primary
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

                if (selectedDate != null) {
                    Divider(Modifier.padding(top = 8.dp, bottom = 4.dp), color = MaterialTheme.colorScheme.surfaceVariant)
                    WorkoutHistorySummary(
                        date = selectedDate,
                        sessions = selectedSessions,
                        sets = historySets,
                        exercises = exercises,
                    )
                }
            }
        }
    }
}

@Composable
private fun WorkoutHistorySummary(
    date: LocalDate,
    sessions: List<dev.local.fitlogsolo.data.WorkoutSessionEntity>,
    sets: List<WorkoutSetEntity>?,
    exercises: List<ExerciseEntity>,
) {
    val exerciseById = remember(exercises) { exercises.associateBy { it.id } }
    val recordedSets = sets.orEmpty().filter { set ->
        listOf(set.normalWeightKg, set.leftWeightKg, set.rightWeightKg).any { it != null } ||
            listOf(set.normalReps, set.leftReps, set.rightReps).any { it != null && it > 0 }
    }
    val groupedSets = recordedSets.groupBy { it.exerciseId }.toList().sortedWith(
        compareBy<Pair<Long, List<WorkoutSetEntity>>> { (_, exerciseSets) -> exerciseSets.minOf { it.setOrder } }
            .thenBy { (exerciseId, _) -> exerciseId },
    )
    val recordedSetCount = groupedSets.sumOf { (_, exerciseSets) -> exerciseSets.size }
    val dateLabel = date.format(DateTimeFormatter.ofPattern("M月d日 (E)", Locale.JAPAN))

    fun performance(weight: Double?, reps: Int?): String =
        "${weight?.let { "${formatWeight(it)}kg" } ?: "—"} × ${reps?.let { "${it}回" } ?: "—"}"

    Column(
        Modifier.fillMaxWidth().animateContentSize(spring(stiffness = 500f)),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(dateLabel, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
            Text(
                when {
                    sets == null -> "読み込み中"
                    recordedSetCount == 0 -> "記録なし"
                    else -> "${groupedSets.size}種目 · ${recordedSetCount}セット"
                },
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        when {
            sets == null -> Text("記録を読み込んでいます", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            recordedSetCount == 0 -> Text(
                if (sessions.isEmpty()) "この日の記録はありません" else "この日に完了したセットはありません",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            else -> groupedSets.forEach { (exerciseId, exerciseSets) ->
                Column(
                    Modifier.fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.38f), MaterialTheme.shapes.medium)
                        .padding(horizontal = 12.dp, vertical = 9.dp),
                    verticalArrangement = Arrangement.spacedBy(5.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            exerciseById[exerciseId]?.name ?: "種目",
                            modifier = Modifier.weight(1f),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            "${exerciseSets.size}セット",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    exerciseSets.sortedWith(compareBy<WorkoutSetEntity> { it.setOrder }.thenBy { it.id })
                        .forEachIndexed { index, set ->
                            val normalPerformance = if (set.normalWeightKg != null || set.normalReps != null) {
                                performance(set.normalWeightKg, set.normalReps)
                            } else null
                            val leftPerformance = if (set.leftWeightKg != null || set.leftReps != null) {
                                "左 ${performance(set.leftWeightKg, set.leftReps)}"
                            } else null
                            val rightPerformance = if (set.rightWeightKg != null || set.rightReps != null) {
                                "右 ${performance(set.rightWeightKg, set.rightReps)}"
                            } else null
                            val detail = listOfNotNull(normalPerformance, leftPerformance, rightPerformance)
                                .joinToString("  ·  ")
                            if (detail.isNotEmpty()) {
                                Row(verticalAlignment = Alignment.Top) {
                                    Text(
                                        "${index + 1}",
                                        modifier = Modifier.padding(end = 8.dp),
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    Text(detail, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
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
            val pictogram = exercise.name.pictogramResource()
            if (pictogram != null) {
                Image(
                    painter = painterResource(pictogram),
                    contentDescription = "${exercise.name}のピクトグラム",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.size(width = 88.dp, height = 64.dp).padding(end = 12.dp),
                )
            }
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

private fun String.pictogramResource(): Int? = when (trim().lowercase()) {
    "ダンベルカール", "ダンベル・カール", "dumbbell curl", "dumbbell curls",
    "dumbbell bicep curl", "dumbbell biceps curl" -> R.drawable.dumbbell_curl
    "インクラインダンベルプレス", "インクライン・ダンベルプレス",
    "incline dumbbell press", "incline db press" -> R.drawable.incline_dumbbell_press
    "サイドレイズ", "サイド・レイズ", "ダンベルサイドレイズ",
    "lateral raise", "dumbbell lateral raise", "side lateral raise" -> R.drawable.dumbbell_lateral_raise
    "ペクトラルフライ", "ペックフライ", "ペクトラルフライ（マシン）",
    "pec fly", "pectoral fly", "pec deck", "machine fly" -> R.drawable.pectoral_fly
    else -> null
}

@Composable
private fun ExerciseEditor(
    viewModel: FitLogViewModel,
    sessionId: Long,
    exercise: ExerciseEntity,
    allExercises: List<ExerciseEntity>,
    allSessionSets: List<WorkoutSetEntity>,
    exerciseOrderIds: List<Long>,
    onExerciseOrderChange: (List<Long>) -> Unit,
    restEndsAtMillis: Long,
    restStartedAtMillis: Long,
    weightStepKg: Double,
    exerciseWeightSteps: Map<Long, Double>,
    restDurationSeconds: Long,
    exerciseRestDurations: Map<Long, Long>,
    sideSwitchRestExerciseIds: Set<Long>,
    leftFirstExerciseIds: Set<Long>,
    onSetCompleted: (Long) -> Unit,
    onSkipRest: () -> Unit,
    onBack: () -> Unit,
    onNextExercise: (Long) -> Unit,
    onFinishSession: () -> Unit,
    onWorkoutComplete: () -> Unit,
) {
    val exerciseSetsFlow = remember(viewModel, sessionId, exercise.id) {
        viewModel.exerciseSets(sessionId, exercise.id)
    }
    val sets by exerciseSetsFlow.collectAsStateWithLifecycle()
    // Keep the current card visible while this exercise-specific Room flow starts collecting.
    val exerciseSets = sets.ifEmpty { allSessionSets.filter { it.exerciseId == exercise.id } }
    var currentSetId by rememberSaveable(sessionId, exercise.id) { mutableLongStateOf(-1L) }
    var currentSideName by rememberSaveable(sessionId, exercise.id) { mutableStateOf(ExerciseSide.RIGHT.name) }
    val firstSide = if (exercise.id in leftFirstExerciseIds) ExerciseSide.LEFT else ExerciseSide.RIGHT
    LaunchedEffect(exerciseSets, currentSetId, exercise.mode, firstSide) {
        if (exerciseSets.isNotEmpty() && exerciseSets.none { it.id == currentSetId && !it.isCompleted }) {
            currentSetId = exerciseSets.firstOrNull { !it.isCompleted }?.id ?: exerciseSets.last().id
        }
        val activeSet = exerciseSets.firstOrNull { it.id == currentSetId }
            ?: exerciseSets.firstOrNull { !it.isCompleted }
        currentSideName = when {
            exercise.mode != ExerciseMode.BILATERAL -> ExerciseSide.RIGHT.name
            activeSet?.leftCompleted == true && activeSet.rightCompleted != true -> ExerciseSide.RIGHT.name
            activeSet?.rightCompleted == true && activeSet.leftCompleted != true -> ExerciseSide.LEFT.name
            else -> firstSide.name
        }
    }
    val currentSet = exerciseSets.firstOrNull { it.id == currentSetId && !it.isCompleted }
        ?: exerciseSets.firstOrNull { !it.isCompleted }
        ?: exerciseSets.lastOrNull()
    val currentSide = when {
        exercise.mode != ExerciseMode.BILATERAL -> ExerciseSide.RIGHT
        currentSet?.leftCompleted == true && currentSet.rightCompleted != true -> ExerciseSide.RIGHT
        currentSet?.rightCompleted == true && currentSet.leftCompleted != true -> ExerciseSide.LEFT
        currentSideName == ExerciseSide.LEFT.name -> ExerciseSide.LEFT
        else -> firstSide
    }
    val activeSide = currentSide.takeIf { exercise.mode == ExerciseMode.BILATERAL }
    var showExerciseOrder by rememberSaveable(sessionId) { mutableStateOf(false) }
    // Keep the outgoing card on screen while Compose/Room switches to the next exercise query.
    // The exercise-specific flow briefly emits an empty list during that handoff.
    var lastVisibleCard by androidx.compose.runtime.remember(sessionId) {
        androidx.compose.runtime.mutableStateOf<WorkoutCardRef?>(null)
    }
    LaunchedEffect(exercise, currentSet, activeSide) {
        if (currentSet != null) lastVisibleCard = WorkoutCardRef(exercise, currentSet, activeSide)
    }
    val displayedCard = currentSet?.let { WorkoutCardRef(exercise, it, activeSide) } ?: lastVisibleCard
    val sessionExerciseIds = allSessionSets.map { it.exerciseId }.distinct()
    val orderedIds = exerciseOrderIds.filter { it in sessionExerciseIds }.distinct() +
        sessionExerciseIds.filterNot { it in exerciseOrderIds }
    val completedExerciseIds = allSessionSets.groupBy { it.exerciseId }
        .filterValues { setsForExercise -> setsForExercise.isNotEmpty() && setsForExercise.all { it.isCompleted } }
        .keys
    val upcomingExerciseIds = orderedIds.filter { it != exercise.id && it !in completedExerciseIds }
    val progressUnits = allSessionSets.sumOf { set ->
        if (allExercises.firstOrNull { it.id == set.exerciseId }?.mode == ExerciseMode.BILATERAL) 2L else 1L
    }
    val completedProgressUnits = allSessionSets.sumOf { set ->
        if (allExercises.firstOrNull { it.id == set.exerciseId }?.mode == ExerciseMode.BILATERAL) {
            if (set.isCompleted) 2L else (if (set.leftCompleted) 1L else 0L) + (if (set.rightCompleted) 1L else 0L)
        } else {
            if (set.isCompleted) 1L else 0L
        }
    }
    val progress = if (progressUnits > 0) completedProgressUnits.toFloat() / progressUnits else 0f
    val nextSetInExercise = currentSet?.let { current ->
        exerciseSets.filter { it.setOrder > current.setOrder && !it.isCompleted }
            .minByOrNull { it.setOrder }
    }
    val otherSide = activeSide?.let { if (it == ExerciseSide.RIGHT) ExerciseSide.LEFT else ExerciseSide.RIGHT }
    val otherSideCompleted = when (otherSide) {
        ExerciseSide.RIGHT -> currentSet?.rightCompleted == true || activeSide != firstSide
        ExerciseSide.LEFT -> currentSet?.leftCompleted == true || activeSide != firstSide
        null -> true
    }
    val upcomingExerciseId = if (currentSet != null && nextSetInExercise == null && activeSide != firstSide) {
        orderedIds.dropWhile { it != exercise.id }.drop(1)
            .firstOrNull { nextId -> allSessionSets.any { it.exerciseId == nextId && !it.isCompleted } }
    } else {
        null
    }
    val upcomingCard: WorkoutCardRef? = when {
        exercise.mode == ExerciseMode.BILATERAL && activeSide != null && !otherSideCompleted ->
            currentSet?.let { WorkoutCardRef(exercise, it, otherSide) }
        nextSetInExercise != null -> WorkoutCardRef(
            exercise,
            nextSetInExercise,
            firstSide.takeIf { exercise.mode == ExerciseMode.BILATERAL },
        )
        upcomingExerciseId != null -> {
            val nextExercise = allExercises.firstOrNull { it.id == upcomingExerciseId }
            val nextSet = allSessionSets.filter { it.exerciseId == upcomingExerciseId && !it.isCompleted }
                .minByOrNull { it.setOrder }
            if (nextExercise != null && nextSet != null) {
                WorkoutCardRef(
                    nextExercise,
                    nextSet,
                    (if (nextExercise.id in leftFirstExerciseIds) ExerciseSide.LEFT else ExerciseSide.RIGHT)
                        .takeIf { nextExercise.mode == ExerciseMode.BILATERAL },
                )
            } else null
        }
        else -> null
    }
    val effectiveRestSeconds = exerciseRestDurations[exercise.id] ?: restDurationSeconds
    val cardScene = when {
        restEndsAtMillis > 0L && currentSet != null -> EditorCardScene(
            key = "rest:$restEndsAtMillis",
            restEndsAtMillis = restEndsAtMillis,
            restStartedAtMillis = restStartedAtMillis,
        )
        displayedCard != null -> {
            val displayedExercise = displayedCard.exercise
            val displayedSet = displayedCard.set
            EditorCardScene(
                key = "set:${displayedExercise.id}:${displayedSet.id}:${displayedCard.side?.name ?: "all"}",
                exercise = displayedExercise,
                set = displayedSet,
                side = displayedCard.side,
                totalSets = allSessionSets.count { it.exerciseId == displayedExercise.id }
                    .coerceAtLeast(displayedSet.setOrder + 1),
                enabled = currentSet?.id == displayedSet.id && activeSide == displayedCard.side,
            )
        }
        else -> null
    }

    fun proceedFrom(set: WorkoutSetEntity) {
        val nextSet = exerciseSets.firstOrNull { it.setOrder > set.setOrder && !it.isCompleted }
        if (nextSet != null) {
            currentSetId = nextSet.id
            currentSideName = firstSide.name
        } else {
            val nextExerciseId = orderedIds.dropWhile { it != exercise.id }.drop(1)
                .firstOrNull { nextId -> allSessionSets.any { it.exerciseId == nextId && !it.isCompleted } }
            if (nextExerciseId != null) onNextExercise(nextExerciseId) else onWorkoutComplete()
        }
    }

    fun advance(set: WorkoutSetEntity) {
        if (exercise.mode == ExerciseMode.BILATERAL && activeSide != null) {
            if (!otherSideCompleted) {
                viewModel.updateSet(set.id) { latest ->
                    when (activeSide) {
                        ExerciseSide.RIGHT -> latest.copy(rightCompleted = true)
                        ExerciseSide.LEFT -> latest.copy(leftCompleted = true)
                    }
                }
                currentSideName = otherSide?.name ?: firstSide.name
                if (exercise.id in sideSwitchRestExerciseIds) {
                    onSetCompleted(effectiveRestSeconds)
                }
                return
            }
            viewModel.updateSet(set.id) { latest ->
                when (activeSide) {
                    ExerciseSide.RIGHT -> latest.copy(rightCompleted = true, isCompleted = true)
                    ExerciseSide.LEFT -> latest.copy(leftCompleted = true, isCompleted = true)
                }
            }
        } else {
            viewModel.updateSet(set.id) { latest -> latest.copy(isCompleted = true) }
        }
        if (upcomingCard?.exercise?.id == exercise.id) {
            onSetCompleted(effectiveRestSeconds)
        }
        proceedFrom(set)
    }

    fun skip(set: WorkoutSetEntity) {
        if (exercise.mode == ExerciseMode.BILATERAL && activeSide != null) {
            if (!otherSideCompleted) {
                viewModel.updateSet(set.id) { latest ->
                    when (activeSide) {
                        ExerciseSide.RIGHT -> latest.copy(rightWeightKg = null, rightReps = null, rightCompleted = true)
                        ExerciseSide.LEFT -> latest.copy(leftWeightKg = null, leftReps = null, leftCompleted = true)
                    }
                }
                currentSideName = otherSide?.name ?: firstSide.name
                return
            }
            viewModel.updateSet(set.id) { latest ->
                when (activeSide) {
                    ExerciseSide.RIGHT -> latest.copy(rightWeightKg = null, rightReps = null, rightCompleted = true, isCompleted = true)
                    ExerciseSide.LEFT -> latest.copy(leftWeightKg = null, leftReps = null, leftCompleted = true, isCompleted = true)
                }
            }
        } else {
            viewModel.updateSet(set.id) { latest ->
                latest.copy(normalWeightKg = null, normalReps = null, isCompleted = true)
            }
        }
        proceedFrom(set)
    }

    BackHandler(enabled = showExerciseOrder) { showExerciseOrder = false }
    if (showExerciseOrder) {
        WorkoutExerciseOrderScreen(
            exerciseOrderIds = orderedIds,
            upcomingExerciseIds = upcomingExerciseIds,
            completedExerciseIds = completedExerciseIds,
            currentExerciseId = exercise.id,
            exercises = allExercises,
            onReorder = onExerciseOrderChange,
            onClose = { showExerciseOrder = false },
        )
    } else {
        Column(Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 4.dp)) {
            WorkoutProgressBar(progress = progress)
            Box(Modifier.weight(1f).fillMaxWidth()) {
                Box(Modifier.fillMaxSize().padding(horizontal = 4.dp), contentAlignment = Alignment.Center) {
                    AnimatedContent(
                        targetState = cardScene,
                        contentKey = { it?.key },
                        transitionSpec = {
                            fadeIn(tween(180)) togetherWith fadeOut(tween(120))
                        },
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                        label = "workout card transition",
                    ) { scene ->
                        when {
                            scene == null -> Unit
                            scene.restEndsAtMillis > 0L -> RestTimerCard(
                                restEndsAtMillis = scene.restEndsAtMillis,
                                restStartedAtMillis = scene.restStartedAtMillis,
                                nextExercise = exercise,
                                nextSet = currentSet,
                                totalSets = exerciseSets.size,
                                onSkipRest = { onSkipRest() },
                            )
                            scene.exercise != null && scene.set != null -> SetEditorCard(
                                exercise = scene.exercise,
                                set = scene.set,
                                side = scene.side,
                                totalSets = scene.totalSets,
                                enabled = scene.enabled,
                                weightStepKg = exerciseWeightSteps[scene.exercise.id]
                                    ?: weightStepKg,
                                onUpdate = { transform -> viewModel.updateSet(scene.set.id, transform) },
                                onAdvance = { if (currentSet?.id == scene.set.id) advance(scene.set) },
                                onSkip = { if (currentSet?.id == scene.set.id) skip(scene.set) },
                                onSwipeOffsetChanged = { _, _ -> },
                            )
                        }
                    }
                }
                FloatingActionButton(
                    onClick = { showExerciseOrder = true },
                    modifier = Modifier.align(Alignment.BottomEnd).padding(end = 8.dp, bottom = 4.dp)
                        .size(48.dp),
                    shape = CircleShape,
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                ) {
                    Icon(Icons.Default.Edit, contentDescription = "種目の順番を編集")
                }
            }
        }
    }
}

@Composable
private fun WorkoutProgressBar(progress: Float) {
    Box(
        Modifier.fillMaxWidth().height(40.dp).padding(vertical = 4.dp),
        contentAlignment = Alignment.Center,
    ) {
        LinearProgressIndicator(
            progress = { progress.coerceIn(0f, 1f) },
            modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape),
            color = MaterialTheme.colorScheme.primary,
            trackColor = MaterialTheme.colorScheme.surfaceVariant,
        )
    }
}

@Composable
private fun WorkoutExerciseOrderScreen(
    exerciseOrderIds: List<Long>,
    upcomingExerciseIds: List<Long>,
    completedExerciseIds: Set<Long>,
    currentExerciseId: Long,
    exercises: List<ExerciseEntity>,
    onReorder: (List<Long>) -> Unit,
    onClose: () -> Unit,
) {
    val exerciseById = remember(exercises) { exercises.associateBy { it.id } }
    val latestOrder by rememberUpdatedState(exerciseOrderIds)
    var draftUpcoming by remember(currentExerciseId, upcomingExerciseIds) {
        mutableStateOf(upcomingExerciseIds)
    }
    val latestDraftUpcoming by rememberUpdatedState(draftUpcoming)
    val completedOrder = exerciseOrderIds.filter { it in completedExerciseIds && it != currentExerciseId }
    val displayOrder = listOf(currentExerciseId) + draftUpcoming + completedOrder
    val hasOrderChanges = draftUpcoming != upcomingExerciseIds
    val rowPitchPx = with(LocalDensity.current) { 62.dp.toPx() }
    var draggedExerciseId by remember { mutableStateOf<Long?>(null) }

    Column(
        Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onClose) { Icon(Icons.Default.ArrowBack, contentDescription = "戻る", tint = MaterialTheme.colorScheme.primary) }
            Text("種目の順番", Modifier.weight(1f), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
            Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = CircleShape) {
                Text("編集", Modifier.padding(horizontal = 11.dp, vertical = 6.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
            }
        }
        Text(
            "長押しして並べ替え。複数変更してから適用できます。",
            Modifier.padding(start = 8.dp),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Column(
            Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            displayOrder.forEach { exerciseId ->
                val name = exerciseById[exerciseId]?.name ?: "種目"
                val isCurrent = exerciseId == currentExerciseId
                val isCompleted = exerciseId in completedExerciseIds
                val isDraggable = !isCurrent && !isCompleted
                val isDragged = draggedExerciseId == exerciseId
                Card(
                    Modifier.fillMaxWidth().height(56.dp).graphicsLayer {
                        scaleX = if (isDragged) 1.025f else 1f
                        scaleY = if (isDragged) 1.025f else 1f
                    },
                    elevation = CardDefaults.cardElevation(defaultElevation = if (isDragged) 8.dp else 1.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isCurrent) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
                    ),
                ) {
                    Row(Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically) {
                        if (isDraggable) {
                            Box(
                                Modifier.size(width = 46.dp, height = 56.dp)
                                    .pointerInput(exerciseId) {
                                        var startIndex = -1
                                        var draggedDistance = 0f
                                        detectDragGesturesAfterLongPress(
                                            onDragStart = {
                                                startIndex = latestDraftUpcoming.indexOf(exerciseId)
                                                draggedDistance = 0f
                                                draggedExerciseId = exerciseId
                                            },
                                            onDrag = { change, amount ->
                                                change.consume()
                                                draggedDistance += amount.y
                                                val currentUpcoming = latestDraftUpcoming
                                                val currentIndex = currentUpcoming.indexOf(exerciseId)
                                                if (startIndex >= 0 && currentIndex >= 0 && currentUpcoming.isNotEmpty()) {
                                                    val targetIndex = (startIndex + (draggedDistance / rowPitchPx).roundToInt())
                                                        .coerceIn(0, currentUpcoming.lastIndex)
                                                    if (targetIndex != currentIndex) {
                                                        draftUpcoming = currentUpcoming.toMutableList().apply {
                                                            add(targetIndex, removeAt(currentIndex))
                                                        }
                                                    }
                                                }
                                            },
                                            onDragEnd = { draggedExerciseId = null },
                                            onDragCancel = { draggedExerciseId = null },
                                        )
                                    }
                                    .semantics { contentDescription = "$name、長押しして並べ替え" },
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    "☷",
                                    style = MaterialTheme.typography.headlineSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        } else {
                            Text(
                                if (isCurrent) "●" else "✓",
                                Modifier.size(width = 46.dp, height = 56.dp),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                color = if (isCurrent) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.tertiary,
                                style = MaterialTheme.typography.titleMedium,
                            )
                        }
                        Text(
                            name,
                            Modifier.weight(1f),
                            style = MaterialTheme.typography.titleMedium,
                            color = if (isCompleted) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                        )
                        if (isCurrent) {
                            Text(
                                "進行中",
                                Modifier.padding(horizontal = 14.dp),
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        } else if (isCompleted) {
                            Text(
                                "完了",
                                Modifier.padding(horizontal = 14.dp),
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
            if (upcomingExerciseIds.isEmpty()) {
                Text(
                    "並べ替えできる種目はありません",
                    Modifier.fillMaxWidth().padding(vertical = 16.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
        }
        Button(
            onClick = {
                if (hasOrderChanges) {
                    val latestCompleted = latestOrder.filter {
                        it in completedExerciseIds && it != currentExerciseId
                    }
                    onReorder(listOf(currentExerciseId) + draftUpcoming + latestCompleted)
                }
                onClose()
            },
            modifier = Modifier.fillMaxWidth().height(50.dp),
        ) {
            Text(if (hasOrderChanges) "順番を適用" else "閉じる")
        }
    }
}

@Composable
private fun RestTimerPreviewCard(restSeconds: Long, swipeOffset: Offset) {
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val horizontal = abs(swipeOffset.x) >= abs(swipeOffset.y)
        val skipped = if (horizontal) swipeOffset.x < 0f else swipeOffset.y > 0f
        Card(
            Modifier.align(Alignment.Center).fillMaxWidth().padding(horizontal = 4.dp)
                .fillMaxHeight(WORKOUT_CARD_HEIGHT_FRACTION)
                .graphicsLayer {
                    if (skipped) {
                        translationX = swipeOffset.x
                        translationY = swipeOffset.y
                        rotationZ = if (size.width > 0f) {
                            (swipeOffset.x / size.width * 12f).coerceIn(-12f, 12f)
                        } else {
                            0f
                        }
                    }
                },
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFE4F1EF)),
        ) {
            Column(Modifier.fillMaxSize()) {
                Row(
                    Modifier.fillMaxWidth().background(Color(0xFF0F665F)).padding(horizontal = 20.dp, vertical = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "休憩",
                        style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.ExtraBold),
                        color = Color.White,
                    )
                }
                Column(
                    Modifier.weight(1f).fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(
                        "次のセットまで",
                        style = MaterialTheme.typography.titleLarge,
                        color = Color(0xFF5C7774),
                    )
                    Text(
                        "${restSeconds / 60}:${(restSeconds % 60).toString().padStart(2, '0')}",
                        style = MaterialTheme.typography.displayLarge.copy(fontSize = 76.sp, fontWeight = FontWeight.ExtraBold),
                        color = Color(0xFF193039),
                        maxLines = 1,
                    )
                }
                Text(
                    "スライドして休憩を終了",
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 18.dp),
                    style = MaterialTheme.typography.titleMedium,
                    color = Color(0xFF5C7774),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
                Text(
                    "スキップ",
                    Modifier.align(Alignment.CenterHorizontally).padding(vertical = 8.dp),
                    color = Color(0xFF147C73),
                )
            }
        }
    }
}

@Composable
private fun UpcomingSetPreviewCard(
    exercise: ExerciseEntity,
    set: WorkoutSetEntity,
    side: ExerciseSide?,
    totalSets: Int,
    restCardActive: Boolean,
    dismissWithRest: Boolean,
) {
    val palette = exerciseCardPalette()
    val density = LocalDensity.current
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val widthPx = with(density) { maxWidth.toPx() }
        val translationX by animateFloatAsState(
            targetValue = if (restCardActive && dismissWithRest) -widthPx * 1.25f else 0f,
            animationSpec = tween(if (restCardActive) 220 else 0),
            label = "rest preview card dismissal",
        )
        Card(
            Modifier.align(Alignment.Center).fillMaxWidth().padding(horizontal = 4.dp)
                .fillMaxHeight(WORKOUT_CARD_HEIGHT_FRACTION)
                .graphicsLayer {
                    this.translationX = translationX
                },
            colors = CardDefaults.cardColors(containerColor = palette.surfaceStart),
        ) {
        Column(
            Modifier.fillMaxSize().background(
                Brush.verticalGradient(listOf(palette.surfaceStart, palette.surfaceEnd)),
            ),
        ) {
            Row(
                Modifier.fillMaxWidth()
                    .background(Brush.horizontalGradient(listOf(palette.headerStart, palette.headerEnd)))
                    .padding(horizontal = 20.dp, vertical = 16.dp),
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
                            color = palette.headerStart,
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
                        style = MaterialTheme.typography.displayLarge.copy(fontWeight = FontWeight.ExtraBold),
                        maxLines = 1,
                    )
                    Text(" × ", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
                    Text(
                        set.normalReps?.toString() ?: "—",
                        style = MaterialTheme.typography.displayLarge.copy(fontWeight = FontWeight.ExtraBold),
                        maxLines = 1,
                    )
                }
            } else if (side != null) {
                PreviewSideValue(
                    side.label,
                    if (side == ExerciseSide.RIGHT) set.rightWeightKg else set.leftWeightKg,
                    if (side == ExerciseSide.RIGHT) set.rightReps else set.leftReps,
                    Modifier.weight(1f).fillMaxWidth(),
                )
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
}

private data class ExerciseCardPalette(
    val headerStart: Color,
    val headerEnd: Color,
    val surfaceStart: Color,
    val surfaceEnd: Color,
)

private fun exerciseCardPalette(): ExerciseCardPalette = ExerciseCardPalette(
    headerStart = Color(0xFF0F665F),
    headerEnd = Color(0xFF0B5B55),
    surfaceStart = Color(0xFFFFFFFF),
    surfaceEnd = Color(0xFFFAFCFA),
)

@Composable
private fun PreviewSideValue(label: String, weightKg: Double?, reps: Int?, modifier: Modifier = Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            "${weightKg?.let(::formatWeight) ?: "—"} × ${reps ?: "—"}",
            style = MaterialTheme.typography.displayMedium.copy(fontWeight = FontWeight.ExtraBold),
            maxLines = 1,
        )
    }
}

@Composable
private fun SetEditorCard(
    exercise: ExerciseEntity,
    set: WorkoutSetEntity,
    side: ExerciseSide?,
    totalSets: Int,
    enabled: Boolean,
    weightStepKg: Double,
    onUpdate: ((WorkoutSetEntity) -> WorkoutSetEntity) -> Unit,
    onAdvance: () -> Unit,
    onSkip: () -> Unit,
    onSwipeOffsetChanged: (Offset, Boolean?) -> Unit,
) {
    val palette = exerciseCardPalette()
    val primaryActionColor = MaterialTheme.colorScheme.primary
    val skipActionColor = MaterialTheme.colorScheme.error
    var swipeOffsetX by androidx.compose.runtime.remember(set.id, side) { androidx.compose.runtime.mutableFloatStateOf(0f) }
    var swipeOffsetY by androidx.compose.runtime.remember(set.id, side) { androidx.compose.runtime.mutableFloatStateOf(0f) }
    var swipeSkips by remember(set.id, side) { mutableStateOf<Boolean?>(null) }
    var swipeHorizontalLock by remember(set.id, side) { mutableStateOf<Boolean?>(null) }
    var swipeAnimating by remember(set.id, side) { mutableStateOf(false) }
    LaunchedEffect(enabled, set.id, side) {
        if (!enabled) {
            swipeOffsetX = 0f
            swipeOffsetY = 0f
            swipeSkips = null
            swipeHorizontalLock = null
            onSwipeOffsetChanged(Offset.Zero, null)
        }
    }
    val animationScope = rememberCoroutineScope()
    val density = LocalDensity.current
    BoxWithConstraints(
        Modifier.fillMaxSize().pointerInput(set.id, enabled, side, swipeAnimating) {
            if (!enabled || swipeAnimating) return@pointerInput

            val cardWidthPx = size.width.toFloat()
            val cardHeightPx = size.height * WORKOUT_CARD_HEIGHT_FRACTION
            val cardTopPx = (size.height - cardHeightPx) / 2f
            val swipeThreshold = minOf(cardWidthPx, cardHeightPx) * 0.08f
            val minFlingVelocity = with(density) { 700.dp.toPx() }

            fun updateDrag(offset: Offset) {
                swipeOffsetX = offset.x
                swipeOffsetY = offset.y
                if (swipeSkips == null && offset.getDistance() >= swipeThreshold) {
                    val horizontal = abs(offset.x) >= abs(offset.y)
                    swipeHorizontalLock = horizontal
                    swipeSkips = if (horizontal) offset.x < 0f else offset.y > 0f
                }
                onSwipeOffsetChanged(offset, swipeSkips)
            }

            fun settleBack() {
                swipeAnimating = true
                animationScope.launch {
                    coroutineScope {
                        launch {
                            Animatable(swipeOffsetX).animateTo(0f, spring(dampingRatio = 0.62f, stiffness = 220f)) {
                                swipeOffsetX = value
                                onSwipeOffsetChanged(Offset(value, swipeOffsetY), swipeSkips)
                            }
                        }
                        launch {
                            Animatable(swipeOffsetY).animateTo(0f, spring(dampingRatio = 0.62f, stiffness = 220f)) {
                                swipeOffsetY = value
                                onSwipeOffsetChanged(Offset(swipeOffsetX, value), swipeSkips)
                            }
                        }
                    }
                    swipeSkips = null
                    swipeHorizontalLock = null
                    onSwipeOffsetChanged(Offset.Zero, null)
                    swipeAnimating = false
                }
            }

            fun finishDrag(offset: Offset, velocity: androidx.compose.ui.unit.Velocity) {
                updateDrag(offset)
                val distance = offset.getDistance()
                val velocityIsHorizontal = abs(velocity.x) >= abs(velocity.y)
                val horizontal = swipeHorizontalLock ?: if (
                    distance < swipeThreshold && maxOf(abs(velocity.x), abs(velocity.y)) >= minFlingVelocity
                ) {
                    velocityIsHorizontal
                } else {
                    abs(offset.x) >= abs(offset.y)
                }
                val axisDistance = if (horizontal) abs(offset.x) else abs(offset.y)
                val axisVelocity = if (horizontal) abs(velocity.x) else abs(velocity.y)
                val crossAxisVelocity = if (horizontal) abs(velocity.y) else abs(velocity.x)
                val fastFling = axisVelocity >= minFlingVelocity && axisVelocity >= crossAxisVelocity * 1.2f
                if (axisDistance < swipeThreshold && !fastFling) {
                    settleBack()
                    return
                }

                val useVelocityDirection = axisDistance < swipeThreshold && fastFling
                val direction = when {
                    horizontal && useVelocityDirection -> velocity.x
                    !horizontal && useVelocityDirection -> velocity.y
                    horizontal -> offset.x
                    else -> offset.y
                }
                swipeHorizontalLock = horizontal
                swipeSkips = if (horizontal) direction < 0f else direction > 0f
                swipeAnimating = true
                val advance = !swipeSkips!!
                val exitDistance = hypot(cardWidthPx.toDouble(), cardHeightPx.toDouble()).toFloat() * 1.25f
                val target = if (useVelocityDirection) {
                    if (horizontal) Offset(if (direction < 0f) -exitDistance else exitDistance, 0f)
                    else Offset(0f, if (direction < 0f) -exitDistance else exitDistance)
                } else {
                    val scale = exitDistance / distance.coerceAtLeast(1f)
                    Offset(offset.x * scale, offset.y * scale)
                }
                animationScope.launch {
                    coroutineScope {
                        launch {
                            Animatable(swipeOffsetX).animateTo(target.x, tween(160)) {
                                swipeOffsetX = value
                                onSwipeOffsetChanged(Offset(value, swipeOffsetY), swipeSkips)
                            }
                        }
                        launch {
                            Animatable(swipeOffsetY).animateTo(target.y, tween(160)) {
                                swipeOffsetY = value
                                onSwipeOffsetChanged(Offset(swipeOffsetX, value), swipeSkips)
                            }
                        }
                    }
                    if (advance) onAdvance() else onSkip()
                }
            }

            awaitEachGesture {
                val down = awaitFirstDown(requireUnconsumed = false, pass = PointerEventPass.Initial)
                if (down.position.y !in cardTopPx..(cardTopPx + cardHeightPx)) return@awaitEachGesture

                val velocityTracker = androidx.compose.ui.input.pointer.util.VelocityTracker()
                velocityTracker.addPosition(down.uptimeMillis, down.position)
                var dragStarted = false
                while (true) {
                    val event = awaitPointerEvent(PointerEventPass.Initial)
                    val change = event.changes.firstOrNull { it.id == down.id } ?: break
                    velocityTracker.addPosition(change.uptimeMillis, change.position)
                    val offset = change.position - down.position
                    if (change.pressed) {
                        if (!dragStarted && offset.getDistance() > viewConfiguration.touchSlop) {
                            dragStarted = true
                            swipeOffsetX = 0f
                            swipeOffsetY = 0f
                            swipeSkips = null
                            swipeHorizontalLock = null
                            onSwipeOffsetChanged(Offset.Zero, null)
                        }
                        if (dragStarted) {
                            change.consume()
                            updateDrag(offset)
                        }
                    } else {
                        if (dragStarted) {
                            change.consume()
                            finishDrag(offset, velocityTracker.calculateVelocity())
                        }
                        break
                    }
                }
            }
        },
    ) {

        val horizontalSwipe = swipeHorizontalLock ?: (abs(swipeOffsetX) >= abs(swipeOffsetY))
        val cardWidthPx = with(density) { maxWidth.toPx() }
        val cardHeightPx = with(density) { (maxHeight * WORKOUT_CARD_HEIGHT_FRACTION).toPx() }
        val swipeEdgePx = if (horizontalSwipe) cardWidthPx else cardHeightPx
        val swipeDistance = hypot(swipeOffsetX.toDouble(), swipeOffsetY.toDouble()).toFloat()
        val swipeProgress = if (swipeEdgePx > 0f) (swipeDistance / (swipeEdgePx * 0.45f)).coerceIn(0f, 1f) else 0f
        val advancing = swipeSkips?.not() ?: if (horizontalSwipe) swipeOffsetX > 0f else swipeOffsetY < 0f
        val swipeColor = if (!advancing) skipActionColor else primaryActionColor
        Card(
        Modifier.align(Alignment.Center).fillMaxWidth().fillMaxHeight(WORKOUT_CARD_HEIGHT_FRACTION)
            .graphicsLayer {
                translationX = swipeOffsetX
                translationY = swipeOffsetY
                rotationZ = if (size.width > 0f) (swipeOffsetX / size.width * 12f).coerceIn(-12f, 12f) else 0f
            }
            .drawWithContent {
                drawContent()
                val horizontal = swipeHorizontalLock ?: (abs(swipeOffsetX) >= abs(swipeOffsetY))
                val distance = hypot(swipeOffsetX.toDouble(), swipeOffsetY.toDouble()).toFloat()
                val edgeSize = if (horizontal) size.width else size.height
                val progress = if (edgeSize > 0f) (distance / (edgeSize * 0.45f)).coerceIn(0f, 1f) else 0f
                if (progress > 0f) {
                    val swipeAdvances = swipeSkips?.not()
                        ?: if (horizontal) swipeOffsetX > 0f else swipeOffsetY < 0f
                    val color = if (swipeAdvances) primaryActionColor else skipActionColor
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
            },
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = palette.surfaceStart),
        ) {
        Box(
            Modifier.fillMaxSize().background(
                Brush.verticalGradient(listOf(palette.surfaceStart, palette.surfaceEnd)),
            ),
        ) {
          Column(Modifier.fillMaxSize()) {
            Row(
                Modifier.fillMaxWidth()
                    .background(Brush.horizontalGradient(listOf(palette.headerStart, palette.headerEnd)))
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    exercise.name,
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.ExtraBold, color = Color.White),
                    maxLines = 2,
                    modifier = Modifier.weight(1f),
                )
                Surface(color = Color.White.copy(alpha = 0.14f), shape = CircleShape) {
                    Box(
                        modifier = Modifier.height(32.dp).padding(horizontal = 12.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "${set.setOrder + 1}/$totalSets",
                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.ExtraBold),
                            color = Color.White,
                            maxLines = 1,
                        )
                    }
                }
            }
            if (exercise.mode == ExerciseMode.NORMAL) {
                Box(Modifier.weight(1f).fillMaxWidth().padding(12.dp)) {
                    Text(
                        "セット ${set.setOrder + 1}",
                        Modifier.align(Alignment.TopCenter).padding(top = 18.dp),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.Bold,
                    )
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
                                description = "重量を${formatWeight(weightStepKg)}キログラム増やす",
                                enabled = enabled,
                                onClick = {
                                    onUpdate { latest ->
                                        latest.copy(normalWeightKg = adjustWeight(latest.normalWeightKg, weightStepKg, increase = true))
                                    }
                                },
                                modifier = Modifier.weight(1f).fillMaxHeight(),
                            )
                            InvisibleTapZone(
                                description = "回数を1回増やす",
                                enabled = enabled,
                                onClick = { onUpdate { latest -> latest.copy(normalReps = (latest.normalReps ?: 0) + 1) } },
                                modifier = Modifier.weight(1f).fillMaxHeight(),
                            )
                        }
                        Row(Modifier.weight(1f).fillMaxWidth()) {
                            InvisibleTapZone(
                                description = "重量を${formatWeight(weightStepKg)}キログラム減らす",
                                enabled = enabled && (set.normalWeightKg ?: 0.0) > 0.0,
                                onClick = {
                                    onUpdate { latest ->
                                        latest.copy(normalWeightKg = adjustWeight(latest.normalWeightKg, weightStepKg, increase = false))
                                    }
                                },
                                modifier = Modifier.weight(1f).fillMaxHeight(),
                            )
                            InvisibleTapZone(
                                description = "回数を1回減らす",
                                enabled = enabled && (set.normalReps ?: 0) > 0,
                                onClick = {
                                    onUpdate { latest ->
                                        latest.copy(normalReps = ((latest.normalReps ?: 0) - 1).coerceAtLeast(0))
                                    }
                                },
                                modifier = Modifier.weight(1f).fillMaxHeight(),
                            )
                        }
                    }
                }
            } else if (side != null) {
                val isRight = side == ExerciseSide.RIGHT
                Column(
                    Modifier.weight(1f).fillMaxWidth().padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    BilateralTapControls(
                        side.label,
                        if (isRight) set.rightWeightKg else set.leftWeightKg,
                        if (isRight) set.rightReps else set.leftReps,
                        enabled,
                        weightStepKg,
                        Modifier.weight(1f).fillMaxWidth(),
                    ) { weight, reps ->
                        onUpdate { latest ->
                            if (isRight) latest.copy(rightWeightKg = weight, rightReps = reps)
                            else latest.copy(leftWeightKg = weight, leftReps = reps)
                        }
                    }
                }
            } else {
                Column(Modifier.weight(1f).fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    BilateralTapControls("左", set.leftWeightKg, set.leftReps, enabled, weightStepKg, Modifier.weight(1f)) { weight, reps ->
                        onUpdate { latest -> latest.copy(leftWeightKg = weight, leftReps = reps) }
                    }
                    BilateralTapControls("右", set.rightWeightKg, set.rightReps, enabled, weightStepKg, Modifier.weight(1f)) { weight, reps ->
                        onUpdate { latest -> latest.copy(rightWeightKg = weight, rightReps = reps) }
                    }
                }
            }
            Column(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    "右へスワイプで次へ　·　左へスワイプでスキップ",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                TextButton(
                    onClick = onSkip,
                    enabled = enabled,
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp)
                        .background(MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.shapes.large),
                ) {
                    Text("スキップ", color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                }
            }
          }
          }
          if (swipeProgress > 0f) {
              val tintSpread = 0.12f + swipeProgress * 0.62f
              val markPosition = when {
                  horizontalSwipe && swipeOffsetX > 0f -> Modifier.align(Alignment.TopStart).padding(start = 16.dp, top = 84.dp)
                  horizontalSwipe -> Modifier.align(Alignment.TopEnd).padding(end = 16.dp, top = 84.dp)
                  swipeOffsetY < 0f -> Modifier.align(Alignment.TopCenter).padding(top = 84.dp)
                  else -> {
                      val tintedHeight = with(density) { (cardHeightPx * tintSpread).toDp() }
                      Modifier.align(Alignment.BottomCenter).offset(y = -(tintedHeight + 36.dp))
                  }
              }
              Box(
                  modifier = markPosition
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
    weightStepKg: Double,
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
                        description = "${side}側の重量を${formatWeight(weightStepKg)}キログラム増やす",
                        enabled = enabled,
                        onClick = { onChange(adjustWeight(weightKg, weightStepKg, increase = true), reps ?: 0) },
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
                        description = "${side}側の重量を${formatWeight(weightStepKg)}キログラム減らす",
                        enabled = enabled && (weightKg ?: 0.0) > 0.0,
                        onClick = { onChange(adjustWeight(weightKg, weightStepKg, increase = false), reps ?: 0) },
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

private fun adjustWeight(weightKg: Double?, stepKg: Double, increase: Boolean): Double {
    val current = BigDecimal.valueOf(weightKg ?: 0.0)
    val step = BigDecimal.valueOf(stepKg)
    val updated = if (increase) current.add(step) else current.subtract(step)
    return updated.max(BigDecimal.ZERO).stripTrailingZeros().toDouble()
}

@Composable
private fun RestTimerCard(
    restEndsAtMillis: Long,
    restStartedAtMillis: Long,
    nextExercise: ExerciseEntity,
    nextSet: WorkoutSetEntity?,
    totalSets: Int,
    onSkipRest: () -> Unit,
) {
    val primaryColor = MaterialTheme.colorScheme.primary
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
    var dragOffsetX by androidx.compose.runtime.remember(restEndsAtMillis) {
        androidx.compose.runtime.mutableFloatStateOf(0f)
    }
    var dragOffsetY by androidx.compose.runtime.remember(restEndsAtMillis) {
        androidx.compose.runtime.mutableFloatStateOf(0f)
    }
    var isDismissing by androidx.compose.runtime.remember(restEndsAtMillis) {
        androidx.compose.runtime.mutableStateOf(false)
    }
    val animationScope = rememberCoroutineScope()
    fun dismissTo(targetX: Float, targetY: Float) {
        if (isDismissing) return
        isDismissing = true
        animationScope.launch {
            coroutineScope {
                launch {
                    Animatable(dragOffsetX).animateTo(targetX, tween(220)) { dragOffsetX = value }
                }
                launch {
                    Animatable(dragOffsetY).animateTo(targetY, tween(220)) { dragOffsetY = value }
                }
            }
            onSkipRest()
        }
    }
    BoxWithConstraints(
        Modifier.fillMaxSize().pointerInput(restEndsAtMillis) {
            var dragX = 0f
            var dragY = 0f
            detectDragGestures(
                onDragStart = { _ ->
                    dragX = 0f
                    dragY = 0f
                },
                onDrag = { change, dragAmount ->
                    change.consume()
                    if (!isDismissing) {
                        dragX += dragAmount.x
                        dragY += dragAmount.y
                        dragOffsetX = dragX
                        dragOffsetY = dragY
                    }
                },
                onDragEnd = {
                    if (!isDismissing) {
                        val distance = hypot(dragX.toDouble(), dragY.toDouble()).toFloat()
                        if (distance >= minOf(size.width, size.height) * 0.08f) {
                            val exitDistance = hypot(size.width.toDouble(), size.height.toDouble()).toFloat() * 1.25f
                            val scale = exitDistance / distance.coerceAtLeast(1f)
                            val targetX = dragX * scale
                            val targetY = dragY * scale
                            dismissTo(targetX, targetY)
                        } else {
                            animationScope.launch {
                                coroutineScope {
                                    launch {
                                        Animatable(dragOffsetX).animateTo(0f, spring(dampingRatio = 0.62f, stiffness = 220f)) {
                                            dragOffsetX = value
                                        }
                                    }
                                    launch {
                                        Animatable(dragOffsetY).animateTo(0f, spring(dampingRatio = 0.62f, stiffness = 220f)) {
                                            dragOffsetY = value
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                onDragCancel = {
                    animationScope.launch {
                        coroutineScope {
                            launch {
                                Animatable(dragOffsetX).animateTo(0f, spring(dampingRatio = 0.62f, stiffness = 220f)) {
                                    dragOffsetX = value
                                }
                            }
                            launch {
                                Animatable(dragOffsetY).animateTo(0f, spring(dampingRatio = 0.62f, stiffness = 220f)) {
                                    dragOffsetY = value
                                }
                            }
                        }
                    }
                },
            )
        },
    ) {
        val cardWidthPx = with(LocalDensity.current) { maxWidth.toPx() }
        val effectiveRestStart = remember(restEndsAtMillis, restStartedAtMillis) {
            restStartedAtMillis.takeIf { it in 1 until restEndsAtMillis }
                ?: (restEndsAtMillis - remainingSeconds * 1_000L).coerceAtLeast(0L)
        }
        val totalDurationMillis = (restEndsAtMillis - effectiveRestStart).coerceAtLeast(1L)
        val timerProgress by animateFloatAsState(
            targetValue = (
                1f - (restEndsAtMillis - System.currentTimeMillis()).coerceAtLeast(0L).toFloat() /
                    totalDurationMillis
                ).coerceIn(0f, 1f),
            animationSpec = tween(durationMillis = 900),
            label = "rest timer progress",
        )
        LaunchedEffect(restEndsAtMillis, remainingSeconds) {
            if (remainingSeconds == 0L && !isDismissing) {
                delay(3_000L)
                if (!isDismissing) {
                    isDismissing = true
                    Animatable(dragOffsetX).animateTo(cardWidthPx * 1.25f, tween(360)) { dragOffsetX = value }
                    onSkipRest()
                }
            }
        }
        Card(
            Modifier.align(Alignment.Center).fillMaxWidth().fillMaxHeight(WORKOUT_CARD_HEIGHT_FRACTION)
                .graphicsLayer {
                    translationX = dragOffsetX
                    translationY = dragOffsetY
                    rotationZ = if (size.width > 0f) (dragOffsetX / size.width * 8f).coerceIn(-8f, 8f) else 0f
                }
                .drawWithContent {
                    drawContent()
                    val horizontal = abs(dragOffsetX) >= abs(dragOffsetY)
                    val progress = if (horizontal && size.width > 0f) {
                        (abs(dragOffsetX) / (size.width * 0.45f)).coerceIn(0f, 1f)
                    } else if (!horizontal && size.height > 0f) {
                        (abs(dragOffsetY) / (size.height * 0.45f)).coerceIn(0f, 1f)
                    } else {
                        0f
                    }
                    if (progress > 0f) {
                        val tint = primaryColor.copy(alpha = progress * 0.18f)
                        val softTint = tint.copy(alpha = tint.alpha * 0.58f)
                        val spread = 0.12f + progress * 0.62f
                        val gradientStart = when {
                            horizontal && dragOffsetX >= 0f -> Offset.Zero
                            horizontal -> Offset(size.width, 0f)
                            dragOffsetY >= 0f -> Offset.Zero
                            else -> Offset(0f, size.height)
                        }
                        val gradientEnd = when {
                            horizontal && dragOffsetX >= 0f -> Offset(size.width, 0f)
                            horizontal -> Offset.Zero
                            dragOffsetY >= 0f -> Offset(0f, size.height)
                            else -> Offset.Zero
                        }
                        drawRect(
                            Brush.linearGradient(
                                colorStops = arrayOf(
                                    0f to tint,
                                    spread * 0.55f to softTint,
                                    spread to Color.Transparent,
                                    1f to Color.Transparent,
                                ),
                                start = gradientStart,
                                end = gradientEnd,
                            ),
                        )
                    }
                },
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFE2F0EE)),
        ) {
          Column(
              Modifier.fillMaxSize().padding(horizontal = 18.dp, vertical = 17.dp),
              horizontalAlignment = Alignment.CenterHorizontally,
              verticalArrangement = Arrangement.spacedBy(10.dp),
          ) {
              Column(
                  Modifier.weight(1f).fillMaxWidth(),
                  horizontalAlignment = Alignment.CenterHorizontally,
                  verticalArrangement = Arrangement.Center,
              ) {
                  Text("RECOVERY", style = MaterialTheme.typography.labelMedium, color = primaryColor, fontWeight = FontWeight.ExtraBold, letterSpacing = 2.sp)
                  Box(
                      Modifier.padding(top = 10.dp).size(50.dp)
                          .background(Color.White.copy(alpha = 0.8f), MaterialTheme.shapes.large),
                      contentAlignment = Alignment.Center,
                  ) {
                      Text("◷", color = primaryColor, style = MaterialTheme.typography.headlineMedium)
                  }
                  Text(
                      if (remainingSeconds > 0L) "次のセットまで" else "休憩終了",
                      Modifier.padding(top = 10.dp),
                      style = MaterialTheme.typography.titleMedium,
                      color = MaterialTheme.colorScheme.secondary,
                      fontWeight = FontWeight.Bold,
                  )
                  Text(
                      "${remainingSeconds / 60}:${(remainingSeconds % 60).toString().padStart(2, '0')}",
                      Modifier.semantics {
                          contentDescription = if (remainingSeconds > 0L) {
                              "次のセットまで残り ${remainingSeconds / 60}分 ${remainingSeconds % 60}秒"
                          } else "休憩終了"
                      },
                      style = MaterialTheme.typography.displayLarge.copy(fontSize = 68.sp, fontWeight = FontWeight.ExtraBold),
                      color = MaterialTheme.colorScheme.onSurface,
                      maxLines = 1,
                  )
                  Text("呼吸を整えて次のセットへ", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
              }
              LinearProgressIndicator(
                  progress = { timerProgress },
                  modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape),
                  color = primaryColor,
                  trackColor = Color.White.copy(alpha = 0.8f),
              )
              Card(
                  Modifier.fillMaxWidth(),
                  colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.8f)),
              ) {
                  Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 9.dp)) {
                      Text("NEXT SET", style = MaterialTheme.typography.labelSmall, color = primaryColor, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.5.sp)
                      Text(
                          "${nextExercise.name}　·　セット ${((nextSet?.setOrder ?: 0) + 1).coerceAtMost(totalSets.coerceAtLeast(1))}",
                          style = MaterialTheme.typography.titleSmall,
                          fontWeight = FontWeight.Bold,
                      )
                      if (nextSet != null) {
                          Text(
                              "${nextSet.normalWeightKg?.let(::formatWeight) ?: "—"}kg　×　${nextSet.normalReps ?: "—"}回",
                              style = MaterialTheme.typography.bodySmall,
                              color = MaterialTheme.colorScheme.onSurfaceVariant,
                          )
                      }
                  }
              }
              Button(
                  onClick = { dismissTo(-cardWidthPx * 1.25f, 0f) },
                  modifier = Modifier.fillMaxWidth().height(48.dp),
              ) { Text("休憩を終了", fontWeight = FontWeight.Bold) }
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

private fun Long.toMinutesInput(): String = (this / 60.0).toInput()

private fun String.toRestSecondsOrNull(): Long? {
    val minutes = trim().replace(',', '.').toDoubleOrNull() ?: return null
    if (!minutes.isFinite() || minutes !in 0.0..120.0) return null
    return (minutes * 60.0).roundToInt().toLong()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SettingsScreen(
    viewModel: FitLogViewModel,
    exercises: List<ExerciseEntity>,
    presets: List<WorkoutPreset>,
    onBack: () -> Unit,
    onAddExercise: () -> Unit,
    weightStepKg: Double,
    exerciseWeightSteps: Map<Long, Double>,
    restDurationSeconds: Long,
    exerciseRestDurations: Map<Long, Long>,
    sideSwitchRestExerciseIds: Set<Long>,
    leftFirstExerciseIds: Set<Long>,
    onWeightStepKgChange: (Double) -> Unit,
    onExerciseWeightStepChange: (Long, Double) -> Unit,
    onResetExerciseWeightStep: (Long) -> Unit,
    onRestDurationChange: (Long) -> Unit,
    onExerciseRestDurationChange: (Long, Long?) -> Unit,
    onExerciseSideSwitchRestChange: (Long, Boolean) -> Unit,
    onExerciseStartSideChange: (Long, Boolean) -> Unit,
) {
    val routineExerciseIds by viewModel.routineExerciseIds.collectAsStateWithLifecycle()
    var weightStepDraft by rememberSaveable { mutableStateOf(weightStepKg.toInput()) }
    var restDurationDraft by rememberSaveable { mutableStateOf(restDurationSeconds.toMinutesInput()) }
    var editingWeightStepExerciseId by rememberSaveable { mutableStateOf<Long?>(null) }
    var exerciseWeightStepDraft by rememberSaveable { mutableStateOf("") }
    var exerciseRestDurationDraft by rememberSaveable { mutableStateOf("") }
    var exerciseSideSwitchRestDraft by rememberSaveable { mutableStateOf(false) }
    var exerciseStartsLeftDraft by rememberSaveable { mutableStateOf(false) }
    var editingPresetId by rememberSaveable { mutableStateOf<String?>(null) }
    var showAddPreset by rememberSaveable { mutableStateOf(false) }
    var newPresetName by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(weightStepKg) { weightStepDraft = weightStepKg.toInput() }
    LaunchedEffect(restDurationSeconds) { restDurationDraft = restDurationSeconds.toMinutesInput() }
    val parsedWeightStep = weightStepDraft.toDoubleOrNull()
        ?.takeIf { it.isFinite() && it in 0.01..1_000.0 }
    val parsedRestDuration = restDurationDraft.toRestSecondsOrNull()
    val editingWeightStepExercise = editingWeightStepExerciseId?.let { id -> exercises.firstOrNull { it.id == id } }
    val parsedExerciseWeightStep = exerciseWeightStepDraft.toDoubleOrNull()
        ?.takeIf { it.isFinite() && it in 0.01..1_000.0 }
    val parsedExerciseRestDuration = exerciseRestDurationDraft.toRestSecondsOrNull()
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "戻る", tint = MaterialTheme.colorScheme.primary) }
                Column {
                    Text("PREFERENCES", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.7.sp)
                    Text("設定", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                }
            }
        }
        item { Text("トレーニング", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold) }
        item { Text("基本の重量増減幅", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = weightStepDraft,
                    onValueChange = { input ->
                        val normalized = input.replace(',', '.')
                        if (normalized.length <= 7 &&
                            normalized.count { it == '.' } <= 1 &&
                            normalized.all { it.isDigit() || it == '.' } &&
                            normalized.substringAfter('.', "").length <= 2
                        ) {
                            weightStepDraft = normalized
                        }
                    },
                    label = { Text("1タップあたり（kg）") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                )
                Button(
                    onClick = { parsedWeightStep?.let(onWeightStepKgChange) },
                    enabled = parsedWeightStep != null && parsedWeightStep != weightStepKg,
                ) { Text("保存") }
            }
        }
        item {
            Text(
                "すべての種目に適用します。種目ごとの設定がある場合はそちらを使います。",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        item { Text("共通のセット間休憩", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = restDurationDraft,
                    onValueChange = { input ->
                        val normalized = input.replace(',', '.')
                        if (normalized.length <= 6 && normalized.count { it == '.' } <= 1 &&
                            normalized.all { it.isDigit() || it == '.' } &&
                            normalized.substringAfter('.', "").length <= 2
                        ) restDurationDraft = normalized
                    },
                    label = { Text("分（0で休憩なし）") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.weight(1f),
                )
                Button(
                    onClick = { parsedRestDuration?.let(onRestDurationChange) },
                    enabled = parsedRestDuration != null && parsedRestDuration != restDurationSeconds,
                ) { Text("保存") }
            }
            Text("種目ごとの設定がある場合は、その時間を使います。左右の切り替えは種目ごとに設定できます。", style = MaterialTheme.typography.bodySmall)
        }
        item { Text("プリセット", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold) }
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
        item { Text("種目を管理", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold) }
        item { Button(onClick = onAddExercise, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.Add, null); Text("種目を追加") } }
        items(exercises, key = { it.id }) { exercise ->
            var editing by rememberSaveable(exercise.id) { mutableStateOf(false) }
            var name by rememberSaveable(exercise.id) { mutableStateOf(exercise.name) }
            val exerciseStepKg = exerciseWeightSteps[exercise.id]
                ?: weightStepKg
            val exerciseRest = exerciseRestDurations[exercise.id]
            val restSummary = exerciseRest?.let { "休憩${it.toMinutesInput()}分" } ?: "共通休憩"
            Card(Modifier.fillMaxWidth()) {
                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (editing) {
                        OutlinedTextField(name, { name = it }, modifier = Modifier.weight(1f), singleLine = true)
                        IconButton(onClick = { viewModel.renameExercise(exercise, name); editing = false }) { Icon(Icons.Default.Check, "保存") }
                    } else {
                        Column(Modifier.weight(1f)) {
                            Text(exercise.name)
                            Text(
                                "${if (exercise.mode == ExerciseMode.NORMAL) "通常" else "左右別"}・${formatWeight(exerciseStepKg)}kg刻み・$restSummary" +
                                    (if (exercise.mode == ExerciseMode.BILATERAL) "・${if (exercise.id in leftFirstExerciseIds) "左" else "右"}から" else "") +
                                    (if (exercise.id in sideSwitchRestExerciseIds) "・左右切替休憩あり" else ""),
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        IconButton(onClick = { viewModel.toggleRoutineExercise(exercise.id) }) {
                            Text(if (exercise.id in routineExerciseIds) "★" else "☆")
                        }
                        IconButton(onClick = {
                            editingWeightStepExerciseId = exercise.id
                            exerciseWeightStepDraft = exerciseStepKg.toInput()
                            exerciseRestDurationDraft = exerciseRest?.toMinutesInput().orEmpty()
                            exerciseSideSwitchRestDraft = exercise.id in sideSwitchRestExerciseIds
                            exerciseStartsLeftDraft = exercise.id in leftFirstExerciseIds
                        }) { Icon(Icons.Default.Settings, "重量・休憩を設定") }
                        IconButton(onClick = { editing = true }) { Icon(Icons.Default.Edit, "名前を変更") }
                        IconButton(onClick = { viewModel.archiveExercise(exercise) }) { Icon(Icons.Default.Delete, "非表示") }
                    }
                }
            }
        }
        item { Text("このアプリは筋トレ記録を端末内に保存し、外部へ送信しません。", style = MaterialTheme.typography.bodySmall) }
    }
    editingWeightStepExercise?.let { exercise ->
        ModalBottomSheet(onDismissRequest = { editingWeightStepExerciseId = null }) {
            Column(
                Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 22.dp)
                    .heightIn(max = 680.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text("${exercise.name}の設定", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                Text("この種目だけに適用", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("重量の刻み幅", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                OutlinedTextField(
                    value = exerciseWeightStepDraft,
                    onValueChange = { input ->
                        val normalized = input.replace(',', '.')
                        if (normalized.length <= 7 && normalized.count { it == '.' } <= 1 &&
                            normalized.all { it.isDigit() || it == '.' } && normalized.substringAfter('.', "").length <= 2
                        ) exerciseWeightStepDraft = normalized
                    },
                    label = { Text("1タップあたり（kg）") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                )
                Text("マシンやプレートの実際の刻みに合わせて設定できます。", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("セット間休憩", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                OutlinedTextField(
                    value = exerciseRestDurationDraft,
                    onValueChange = { input ->
                        val normalized = input.replace(',', '.')
                        if (normalized.length <= 6 && normalized.count { it == '.' } <= 1 &&
                            normalized.all { it.isDigit() || it == '.' } && normalized.substringAfter('.', "").length <= 2
                        ) exerciseRestDurationDraft = normalized
                    },
                    label = { Text("種目別（分）") },
                    supportingText = { Text("空欄は共通設定、0は休憩なし") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                )
                if (exercise.mode == ExerciseMode.BILATERAL) {
                    Text("最初に行う側", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                        SegmentedButton(!exerciseStartsLeftDraft, { exerciseStartsLeftDraft = false }, SegmentedButtonDefaults.itemShape(0, 2)) { Text("右から") }
                        SegmentedButton(exerciseStartsLeftDraft, { exerciseStartsLeftDraft = true }, SegmentedButtonDefaults.itemShape(1, 2)) { Text("左から") }
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("左右切り替え時にも休憩", Modifier.weight(1f))
                        Switch(checked = exerciseSideSwitchRestDraft, onCheckedChange = { exerciseSideSwitchRestDraft = it })
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = {
                        onResetExerciseWeightStep(exercise.id)
                        onExerciseRestDurationChange(exercise.id, null)
                        onExerciseSideSwitchRestChange(exercise.id, false)
                        onExerciseStartSideChange(exercise.id, false)
                        editingWeightStepExerciseId = null
                    }) { Text("共通設定に戻す") }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        TextButton(onClick = { editingWeightStepExerciseId = null }) { Text("キャンセル") }
                        Button(
                            enabled = parsedExerciseWeightStep != null &&
                                (exerciseRestDurationDraft.isBlank() || parsedExerciseRestDuration != null),
                            onClick = {
                                parsedExerciseWeightStep?.let { onExerciseWeightStepChange(exercise.id, it) }
                                onExerciseRestDurationChange(exercise.id, parsedExerciseRestDuration)
                                onExerciseSideSwitchRestChange(exercise.id, exerciseSideSwitchRestDraft)
                                onExerciseStartSideChange(exercise.id, exerciseStartsLeftDraft)
                                editingWeightStepExerciseId = null
                            },
                        ) { Text("保存") }
                    }
                }
            }
        }
    }
    if (showAddPreset) {
        ModalBottomSheet(onDismissRequest = { showAddPreset = false }) {
            Column(
                Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text("プリセットを追加", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                Text("よく使う種目をまとめて、トレーニングをすぐ開始できます。", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                OutlinedTextField(
                    value = newPresetName,
                    onValueChange = { newPresetName = it.take(24) },
                    label = { Text("名前") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Surface(color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f), shape = MaterialTheme.shapes.large) {
                    Column(Modifier.fillMaxWidth().padding(14.dp)) {
                        Text("あとから設定できます", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                        Text("種目の順番・重量・回数・セット数", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = { showAddPreset = false }) { Text("キャンセル") }
                    Button(enabled = newPresetName.trim().isNotEmpty(), onClick = {
                        val preset = WorkoutPreset(name = newPresetName.trim())
                        viewModel.setPresets(presets + preset)
                        editingPresetId = preset.id
                        showAddPreset = false
                    }) { Text("作成して編集") }
                }
            }
        }
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PresetEditorDialog(
    preset: WorkoutPreset,
    exercises: List<ExerciseEntity>,
    onChange: (WorkoutPreset) -> Unit,
    onDismiss: () -> Unit,
) {
    val latestPreset by androidx.compose.runtime.rememberUpdatedState(preset)
    var expanded by rememberSaveable(preset.id) { mutableStateOf(false) }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 16.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("PRESET / EDIT", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.5.sp)
                    Text("プリセットを編集", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                }
                TextButton(onClick = onDismiss) { Text("完了") }
            }
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
                    fun updateConfig(transform: (PresetExerciseConfig) -> PresetExerciseConfig) {
                        onChange(
                            preset.copy(
                                exercises = preset.exercises.map {
                                    if (it.exerciseId == config.exerciseId) transform(it) else it
                                },
                            ),
                        )
                    }
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
                            if (exercise.mode == ExerciseMode.BILATERAL) {
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    listOf(
                                        "左kg" to config.leftWeightKg,
                                        "右kg" to config.rightWeightKg,
                                    ).forEach { (label, value) ->
                                        OutlinedTextField(
                                            value = value,
                                            onValueChange = { input ->
                                                val normalized = input.replace(',', '.')
                                                if (normalized.count { it == '.' } <= 1 &&
                                                    normalized.all { it.isDigit() || it == '.' } &&
                                                    normalized.substringAfter('.', "").length <= 2
                                                ) {
                                                    updateConfig {
                                                        if (label == "左kg") it.copy(leftWeightKg = normalized)
                                                        else it.copy(rightWeightKg = normalized)
                                                    }
                                                }
                                            },
                                            label = { Text(label) },
                                            singleLine = true,
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                            modifier = Modifier.weight(1f),
                                        )
                                    }
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    OutlinedTextField(
                                        value = config.reps,
                                        onValueChange = { value -> updateConfig { it.copy(reps = value.filter(Char::isDigit)) } },
                                        label = { Text("左右の回数") },
                                        singleLine = true,
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        modifier = Modifier.weight(1f),
                                    )
                                    OutlinedTextField(
                                        value = config.sets,
                                        onValueChange = { value -> updateConfig { it.copy(sets = value.filter(Char::isDigit)) } },
                                        label = { Text("セット") },
                                        singleLine = true,
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                            } else {
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    OutlinedTextField(
                                        value = config.weightKg,
                                        onValueChange = { value ->
                                            val normalized = value.replace(',', '.')
                                            if (normalized.count { it == '.' } <= 1 &&
                                                normalized.all { it.isDigit() || it == '.' } &&
                                                normalized.substringAfter('.', "").length <= 2
                                            ) updateConfig { it.copy(weightKg = normalized) }
                                        },
                                        label = { Text("kg") },
                                        singleLine = true,
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                        modifier = Modifier.weight(1f),
                                    )
                                    OutlinedTextField(
                                        value = config.reps,
                                        onValueChange = { value -> updateConfig { it.copy(reps = value.filter(Char::isDigit)) } },
                                        label = { Text("回") },
                                        singleLine = true,
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        modifier = Modifier.weight(1f),
                                    )
                                    OutlinedTextField(
                                        value = config.sets,
                                        onValueChange = { value -> updateConfig { it.copy(sets = value.filter(Char::isDigit)) } },
                                        label = { Text("セット") },
                                        singleLine = true,
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        modifier = Modifier.weight(1f),
                                    )
                                }
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
                                    val defaults = exerciseTrainingDefault(exercise.name)
                                    val defaultWeight = defaults?.tenRepWeightKg?.let(::formatWeight) ?: "0"
                                    onChange(
                                        preset.copy(
                                            exercises = preset.exercises + PresetExerciseConfig(
                                                exerciseId = exercise.id,
                                                weightKg = defaultWeight,
                                                leftWeightKg = defaultWeight,
                                                rightWeightKg = defaultWeight,
                                                reps = "10",
                                            ),
                                        ),
                                    )
                                    expanded = false
                                },
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddExerciseDialog(onDismiss: () -> Unit, onSave: (String, ExerciseMode) -> Unit) {
    var name by rememberSaveable { mutableStateOf("") }
    var mode by rememberSaveable { mutableStateOf(ExerciseMode.NORMAL) }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text("種目を追加", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
            Text("トレーニング種目を登録", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            OutlinedTextField(name, { name = it }, label = { Text("種目名") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                SegmentedButton(mode == ExerciseMode.NORMAL, { mode = ExerciseMode.NORMAL }, SegmentedButtonDefaults.itemShape(0, 2)) { Text("通常") }
                SegmentedButton(mode == ExerciseMode.BILATERAL, { mode = ExerciseMode.BILATERAL }, SegmentedButtonDefaults.itemShape(1, 2)) { Text("左右別") }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onDismiss) { Text("キャンセル") }
                Button(enabled = name.trim().isNotEmpty(), onClick = { onSave(name, mode) }) { Text("追加") }
            }
        }
    }
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
