package dev.local.fitlogsolo.ui

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.net.Uri
import android.provider.Settings
import android.os.SystemClock
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
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
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

private const val WORKOUT_CARD_HEIGHT_FRACTION = 0.78f

private enum class MainScreen { HOME, SETTINGS, WORKOUT_DOCK, WORKOUT_COMPLETE }
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
    var pendingWorkoutStart by remember { mutableStateOf<(() -> Unit)?>(null) }
    var showExactAlarmPermissionDialog by rememberSaveable { mutableStateOf(false) }
    var presetExerciseOrder by rememberSaveable { mutableStateOf("") }
    val exercises by viewModel.exercises.collectAsStateWithLifecycle()
    val allExercises by viewModel.allExercises.collectAsStateWithLifecycle()
    val activeSession by viewModel.activeSession.collectAsStateWithLifecycle()
    val sessions by viewModel.completedSessions.collectAsStateWithLifecycle()
    val routineExerciseIds by viewModel.routineExerciseIds.collectAsStateWithLifecycle()
    val flatModeEnabled by viewModel.flatModeEnabled.collectAsStateWithLifecycle()
    var lastUserInteractionAtMillis by remember { mutableLongStateOf(0L) }
    var userInteractionActive by remember { mutableStateOf(false) }
    val displayName by viewModel.displayName.collectAsStateWithLifecycle()
    val weightStepKg by viewModel.weightStepKg.collectAsStateWithLifecycle()
    val exerciseWeightSteps by viewModel.exerciseWeightSteps.collectAsStateWithLifecycle()
    val restDurationSeconds by viewModel.restDurationSeconds.collectAsStateWithLifecycle()
    val exerciseRestDurations by viewModel.exerciseRestDurations.collectAsStateWithLifecycle()
    val sideSwitchRestExerciseIds by viewModel.sideSwitchRestExerciseIds.collectAsStateWithLifecycle()
    val leftFirstExerciseIds by viewModel.leftFirstExerciseIds.collectAsStateWithLifecycle()
    val presets by viewModel.presets.collectAsStateWithLifecycle()
    val message by viewModel.message.collectAsStateWithLifecycle()
    val snackbar = SnackbarHostState()
    val flatCandidate = rememberFlatDeviceCandidate(
        enabled = flatModeEnabled,
        workoutActive = activeSession != null,
        lastUserInteractionAtMillis = lastUserInteractionAtMillis,
        userInteractionActive = userInteractionActive,
    )
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
    val mainScreen = when {
        showWorkoutComplete -> MainScreen.WORKOUT_COMPLETE
        !settings && activeSession != null && flatCandidate -> MainScreen.WORKOUT_DOCK
        settings -> MainScreen.SETTINGS
        else -> MainScreen.HOME
    }
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
            AnimatedVisibility(
                visible = !workoutFullscreen && settings && !showWorkoutComplete,
                enter = expandVertically(tween(260), expandFrom = Alignment.Top) +
                    slideInVertically(tween(260)) { -it } + fadeIn(tween(220)),
                exit = shrinkVertically(tween(180), shrinkTowards = Alignment.Top) +
                    slideOutVertically(tween(180)) { -it } + fadeOut(tween(140)),
            ) {
                TopAppBar(
                    title = { Text("設定") },
                    navigationIcon = {
                        IconButton(onClick = { settings = false }) { Icon(Icons.Default.ArrowBack, "戻る") }
                    },
                )
            }
        },
        floatingActionButton = {
            AnimatedVisibility(
                visible = !workoutFullscreen && !settings && !flatCandidate && !showWorkoutComplete,
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
                .animateContentSize(spring(stiffness = 500f))
                .pointerInput(Unit) {
                    awaitPointerEventScope {
                        while (true) {
                            val event = awaitPointerEvent(PointerEventPass.Initial)
                            val now = SystemClock.elapsedRealtime()
                            if (event.changes.any { it.pressed && !it.previousPressed }) {
                                userInteractionActive = true
                                lastUserInteractionAtMillis = now
                            }
                            if (event.changes.any { !it.pressed && it.previousPressed }) {
                                userInteractionActive = event.changes.any { it.pressed }
                                if (!userInteractionActive) lastUserInteractionAtMillis = now
                            }
                        }
                    }
                },
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
                    MainScreen.WORKOUT_COMPLETE -> WorkoutCompleteScreen()
                    MainScreen.WORKOUT_DOCK -> WorkoutDock(displayName = displayName)
                    MainScreen.SETTINGS -> SettingsScreen(
                        viewModel = viewModel,
                        exercises = exercises,
                        presets = presets,
                        onAddExercise = { showAddExercise = true },
                        flatModeEnabled = flatModeEnabled,
                        displayName = displayName,
                        weightStepKg = weightStepKg,
                        exerciseWeightSteps = exerciseWeightSteps,
                        restDurationSeconds = restDurationSeconds,
                        exerciseRestDurations = exerciseRestDurations,
                        sideSwitchRestExerciseIds = sideSwitchRestExerciseIds,
                        leftFirstExerciseIds = leftFirstExerciseIds,
                        onDisplayNameChange = viewModel::setDisplayName,
                        onWeightStepKgChange = viewModel::setWeightStepKg,
                        onExerciseWeightStepChange = viewModel::setExerciseWeightStepKg,
                        onResetExerciseWeightStep = viewModel::resetExerciseWeightStepKg,
                        onRestDurationChange = viewModel::setRestDurationSeconds,
                        onExerciseRestDurationChange = viewModel::setExerciseRestDurationSeconds,
                        onExerciseSideSwitchRestChange = viewModel::setExerciseSideSwitchRestEnabled,
                        onExerciseStartSideChange = viewModel::setExerciseStartsLeft,
                        onFlatModeEnabledChange = viewModel::setFlatModeEnabled,
                    )
                    MainScreen.HOME -> RecordScreen(
                        viewModel = viewModel,
                        exercises = exercises,
                        allExercises = allExercises,
                        presets = presets,
                        routineExerciseIds = routineExerciseIds,
                        activeSessionId = activeSession?.id,
                        completedSessions = sessions,
                        presetExerciseOrder = presetExerciseOrder.split(',').mapNotNull(String::toLongOrNull),
                        selectedExercise = selectedExercise,
                        restEndsAtMillis = restEndsAtMillis,
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
                                val restEndTime = System.currentTimeMillis() + durationSeconds * 1_000L
                                RestTimerAlarm.schedule(context, restEndTime)
                                restEndsAtMillis = restEndTime
                            }
                        },
                        onSkipRest = {
                            RestTimerAlarm.cancel(context)
                            restEndsAtMillis = 0L
                        },
                        onFinishSession = {
                            activeSession?.id?.let { viewModel.finishSession(it) }
                            selectedExerciseId = null
                            RestTimerAlarm.cancel(context)
                            restEndsAtMillis = 0L
                            presetExerciseOrder = ""
                        },
                        onWorkoutComplete = {
                            workoutCompletionSaved = false
                            activeSession?.id?.let { sessionId ->
                                viewModel.finishSession(sessionId, announce = false) { workoutCompletionSaved = true }
                            } ?: run { workoutCompletionSaved = true }
                            selectedExerciseId = null
                            RestTimerAlarm.cancel(context)
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

@Composable
private fun RecordScreen(
    viewModel: FitLogViewModel,
    exercises: List<ExerciseEntity>,
    allExercises: List<ExerciseEntity>,
    presets: List<WorkoutPreset>,
    routineExerciseIds: List<Long>,
    activeSessionId: Long?,
    completedSessions: List<dev.local.fitlogsolo.data.WorkoutSessionEntity>,
    presetExerciseOrder: List<Long>,
    selectedExercise: ExerciseEntity?,
    restEndsAtMillis: Long,
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
                allExercises = exercises,
                allSessionSets = sessionSets,
                exerciseOrderIds = presetExerciseOrder,
                restEndsAtMillis = restEndsAtMillis,
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
                onWorkoutComplete = onWorkoutComplete,
            )
        } else {
            LazyColumn(
                Modifier.fillMaxSize().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
        if (activeSessionId == null) {
            item { Text("カレンダー", style = MaterialTheme.typography.titleLarge) }
            item { WorkoutCalendar(completedSessions, allExercises, viewModel) }
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
                                        color = when {
                                            isSelected || day == LocalDate.now() -> MaterialTheme.colorScheme.primary
                                            hasWorkout -> MaterialTheme.colorScheme.secondaryContainer
                                            else -> Color.Transparent
                                        },
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(
                                                dayNumber.toString(),
                                                style = MaterialTheme.typography.bodySmall,
                                                color = when {
                                                    isSelected || day == LocalDate.now() -> MaterialTheme.colorScheme.onPrimary
                                                    hasWorkout -> MaterialTheme.colorScheme.onSecondaryContainer
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
            if (exercise.name.isDumbbellCurl()) {
                Image(
                    painter = painterResource(R.drawable.dumbbell_curl),
                    contentDescription = "ダンベルカールのピクトグラム",
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

private fun String.isDumbbellCurl(): Boolean = trim().lowercase() in setOf(
    "ダンベルカール",
    "ダンベル・カール",
    "dumbbell curl",
    "dumbbell curls",
    "dumbbell bicep curl",
    "dumbbell biceps curl",
)

@Composable
private fun ExerciseEditor(
    viewModel: FitLogViewModel,
    sessionId: Long,
    exercise: ExerciseEntity,
    allExercises: List<ExerciseEntity>,
    allSessionSets: List<WorkoutSetEntity>,
    exerciseOrderIds: List<Long>,
    restEndsAtMillis: Long,
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
    val sets by viewModel.exerciseSets(sessionId, exercise.id).collectAsStateWithLifecycle()
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
    var restStackCard by remember(sessionId) { mutableStateOf<WorkoutCardRef?>(null) }
    // Keep the outgoing card on screen while Compose/Room switches to the next exercise query.
    // The exercise-specific flow briefly emits an empty list during that handoff.
    var lastVisibleCard by androidx.compose.runtime.remember(sessionId) {
        androidx.compose.runtime.mutableStateOf<WorkoutCardRef?>(null)
    }
    LaunchedEffect(exercise, currentSet, activeSide) {
        if (currentSet != null) lastVisibleCard = WorkoutCardRef(exercise, currentSet, activeSide)
    }
    val displayedCard = currentSet?.let { WorkoutCardRef(exercise, it, activeSide) } ?: lastVisibleCard
    val orderedIds = exerciseOrderIds.ifEmpty { allSessionSets.map { it.exerciseId }.distinct() }
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
    val restWillFollowCurrentCard = if (activeSide != null && !otherSideCompleted) {
        exercise.id in sideSwitchRestExerciseIds
    } else {
        nextSetInExercise != null
    }
    val showRestPreview = restEndsAtMillis <= 0L && restWillFollowCurrentCard
    var restPreviewDragOffset by remember(displayedCard?.set?.id, displayedCard?.side) {
        mutableStateOf(Offset.Zero)
    }
    val cardBehind = when {
        restEndsAtMillis > 0L -> restStackCard ?: upcomingCard
        restWillFollowCurrentCard -> null
        else -> upcomingCard
    }
    var dismissRestStack by remember(restEndsAtMillis) { mutableStateOf(false) }
    val cardScene = when {
        restEndsAtMillis > 0L && currentSet != null -> EditorCardScene(
            key = "rest:$restEndsAtMillis",
            restEndsAtMillis = restEndsAtMillis,
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
            val updated = when (activeSide) {
                ExerciseSide.RIGHT -> set.copy(rightCompleted = true)
                ExerciseSide.LEFT -> set.copy(leftCompleted = true)
            }
            if (!otherSideCompleted) {
                viewModel.updateSet(updated)
                currentSideName = otherSide?.name ?: firstSide.name
                if (exercise.id in sideSwitchRestExerciseIds) {
                    restStackCard = WorkoutCardRef(exercise, set, activeSide)
                    onSetCompleted(effectiveRestSeconds)
                }
                return
            }
            viewModel.updateSet(updated.copy(isCompleted = true))
        } else {
            viewModel.updateSet(set.copy(isCompleted = true))
        }
        if (upcomingCard?.exercise?.id == exercise.id) {
            restStackCard = WorkoutCardRef(exercise, set, activeSide)
            onSetCompleted(effectiveRestSeconds)
        }
        proceedFrom(set)
    }

    fun skip(set: WorkoutSetEntity) {
        if (exercise.mode == ExerciseMode.BILATERAL && activeSide != null) {
            val updated = when (activeSide) {
                ExerciseSide.RIGHT -> set.copy(rightWeightKg = null, rightReps = null, rightCompleted = true)
                ExerciseSide.LEFT -> set.copy(leftWeightKg = null, leftReps = null, leftCompleted = true)
            }
            if (!otherSideCompleted) {
                viewModel.updateSet(updated)
                currentSideName = otherSide?.name ?: firstSide.name
                return
            }
            viewModel.updateSet(updated.copy(isCompleted = true))
        } else {
            viewModel.updateSet(
                set.copy(
                    normalWeightKg = null,
                    normalReps = null,
                    isCompleted = true,
                ),
            )
        }
        proceedFrom(set)
    }

    Column(Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 4.dp)) {
        Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
            if (showRestPreview) {
                RestTimerPreviewCard(
                    restSeconds = effectiveRestSeconds,
                    swipeOffset = restPreviewDragOffset,
                )
            } else if (cardBehind != null) {
                UpcomingSetPreviewCard(
                    exercise = cardBehind.exercise,
                    set = cardBehind.set,
                    side = cardBehind.side,
                    totalSets = allSessionSets.count { it.exerciseId == cardBehind.exercise.id }
                        .coerceAtLeast(cardBehind.set.setOrder + 1),
                    restCardActive = restEndsAtMillis > 0L,
                    dismissWithRest = dismissRestStack,
                )
            }
            AnimatedContent(
                targetState = cardScene,
                contentKey = { it?.key },
                transitionSpec = {
                    val promotesVisibleBackCard = targetState?.key?.startsWith("set:") == true &&
                        (initialState?.key?.startsWith("set:") == true || initialState?.key?.startsWith("rest:") == true)
                    if (promotesVisibleBackCard) {
                        androidx.compose.animation.EnterTransition.None togetherWith
                            androidx.compose.animation.ExitTransition.None
                    } else {
                        (slideInHorizontally(tween(320)) { width -> width / 4 } + fadeIn(tween(240))) togetherWith
                            fadeOut(tween(180))
                    }
                },
                modifier = Modifier.fillMaxSize().padding(horizontal = 4.dp),
                contentAlignment = Alignment.Center,
                label = "workout card transition",
            ) { scene ->
                when {
                    scene == null -> Unit
                    scene.restEndsAtMillis > 0L -> RestTimerCard(
                        restEndsAtMillis = scene.restEndsAtMillis,
                        onSkipRestStarted = { dismissRestStack = true },
                        onSkipRest = {
                            restStackCard = null
                            onSkipRest()
                        },
                    )
                    scene.exercise != null && scene.set != null -> SetEditorCard(
                        exercise = scene.exercise,
                        set = scene.set,
                        side = scene.side,
                        totalSets = scene.totalSets,
                        enabled = scene.enabled,
                        weightStepKg = exerciseWeightSteps[scene.exercise.id]
                            ?: weightStepKg,
                        onUpdate = viewModel::updateSet,
                        onAdvance = { if (currentSet?.id == scene.set.id) advance(scene.set) },
                        onSkip = { if (currentSet?.id == scene.set.id) skip(scene.set) },
                        onSwipeOffsetChanged = { restPreviewDragOffset = it },
                    )
                }
            }
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
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1976D2)),
        ) {
            Column(Modifier.fillMaxSize()) {
                Row(
                    Modifier.fillMaxWidth().background(Color(0xFF0D47A1)).padding(horizontal = 20.dp, vertical = 16.dp),
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
                        color = Color.White.copy(alpha = 0.88f),
                    )
                    Text(
                        "${restSeconds / 60}:${(restSeconds % 60).toString().padStart(2, '0')}",
                        style = MaterialTheme.typography.displayLarge.copy(fontSize = 76.sp, fontWeight = FontWeight.ExtraBold),
                        color = Color.White,
                        maxLines = 1,
                    )
                }
                Text(
                    "スライドして休憩を終了",
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 18.dp),
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White.copy(alpha = 0.92f),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
                Text(
                    "スキップ",
                    Modifier.align(Alignment.CenterHorizontally).padding(vertical = 8.dp),
                    color = Color.White,
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
    val palette = exerciseCardPalette(exercise.name)
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

private fun exerciseCardPalette(exerciseName: String): ExerciseCardPalette {
    val key = exerciseName.trim().lowercase()
    val hue = when {
        "ベンチ" in key || "bench" in key -> 212f
        "ラット" in key || "lat" in key -> 164f
        "レッグ" in key || "leg" in key -> 36f
        "スクワット" in key || "squat" in key -> 276f
        "腕立て" in key || "push" in key -> 194f
        "プランク" in key || "plank" in key -> 340f
        else -> (key.hashCode().and(0x7fffffff) % 360).toFloat()
    }
    val endHue = (hue + 18f) % 360f
    return ExerciseCardPalette(
        headerStart = Color.hsv(hue, saturation = 0.76f, value = 0.42f),
        headerEnd = Color.hsv(endHue, saturation = 0.78f, value = 0.35f),
        surfaceStart = Color.hsv(hue, saturation = 0.12f, value = 0.99f),
        surfaceEnd = Color.hsv(endHue, saturation = 0.24f, value = 0.91f),
    )
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
    side: ExerciseSide?,
    totalSets: Int,
    enabled: Boolean,
    weightStepKg: Double,
    onUpdate: (WorkoutSetEntity) -> Unit,
    onAdvance: () -> Unit,
    onSkip: () -> Unit,
    onSwipeOffsetChanged: (Offset) -> Unit,
) {
    val palette = exerciseCardPalette(exercise.name)
    var swipeOffsetX by androidx.compose.runtime.remember(set.id, side) { androidx.compose.runtime.mutableFloatStateOf(0f) }
    var swipeOffsetY by androidx.compose.runtime.remember(set.id, side) { androidx.compose.runtime.mutableFloatStateOf(0f) }
    LaunchedEffect(enabled, set.id, side) {
        if (!enabled) {
            swipeOffsetX = 0f
            swipeOffsetY = 0f
            onSwipeOffsetChanged(Offset.Zero)
        }
    }
    val animationScope = rememberCoroutineScope()
    val density = LocalDensity.current
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val horizontalSwipe = abs(swipeOffsetX) >= abs(swipeOffsetY)
        val cardWidthPx = with(density) { maxWidth.toPx() }
        val cardHeightPx = with(density) { (maxHeight * WORKOUT_CARD_HEIGHT_FRACTION).toPx() }
        val swipeEdgePx = if (horizontalSwipe) cardWidthPx else cardHeightPx
        val swipeDistance = if (horizontalSwipe) abs(swipeOffsetX) else abs(swipeOffsetY)
        val swipeProgress = if (swipeEdgePx > 0f) (swipeDistance / (swipeEdgePx * 0.45f)).coerceIn(0f, 1f) else 0f
        val advancing = if (horizontalSwipe) swipeOffsetX > 0f else swipeOffsetY < 0f
        val swipeColor = if (!advancing) Color(0xFF201A19) else Color(0xFFF0442E)
        Card(
        Modifier.align(Alignment.Center).fillMaxWidth().fillMaxHeight(WORKOUT_CARD_HEIGHT_FRACTION)
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
            .pointerInput(set.id, enabled, side) {
                var dragX = 0f
                var dragY = 0f
                detectDragGestures(
                    onDragStart = {
                        dragX = 0f
                        dragY = 0f
                        onSwipeOffsetChanged(Offset.Zero)
                    },
                    onDrag = { change, dragAmount ->
                        change.consume()
                        dragX += dragAmount.x
                        dragY += dragAmount.y
                        swipeOffsetX = dragX
                        swipeOffsetY = dragY.coerceIn(-size.height * 0.35f, size.height * 0.35f)
                        onSwipeOffsetChanged(Offset(swipeOffsetX, swipeOffsetY))
                    },
                    onDragEnd = {
                        if (!enabled) {
                            animationScope.launch {
                                Animatable(swipeOffsetX).animateTo(0f, spring(dampingRatio = 0.68f, stiffness = 250f)) { swipeOffsetX = value }
                                Animatable(swipeOffsetY).animateTo(0f, spring(dampingRatio = 0.68f, stiffness = 250f)) { swipeOffsetY = value }
                            }
                        } else {
                            val horizontal = abs(dragX) >= abs(dragY)
                            val distance = if (horizontal) abs(dragX) else abs(dragY)
                            val threshold = minOf(size.width, size.height) * 0.12f
                            if (distance >= threshold) {
                                val advance = if (horizontal) dragX > 0f else dragY < 0f
                                animationScope.launch {
                                    if (horizontal) {
                                        val targetX = if (dragX > 0f) size.width * 1.25f else -size.width * 1.25f
                                        Animatable(swipeOffsetX).animateTo(targetX, tween(220)) {
                                            swipeOffsetX = value
                                            onSwipeOffsetChanged(Offset(value, swipeOffsetY))
                                        }
                                    } else {
                                        val targetY = if (dragY > 0f) size.height * 1.25f else -size.height * 1.25f
                                        Animatable(swipeOffsetY).animateTo(targetY, tween(220)) {
                                            swipeOffsetY = value
                                            onSwipeOffsetChanged(Offset(swipeOffsetX, value))
                                        }
                                    }
                                    if (advance) onAdvance() else onSkip()
                                }
                            } else {
                                animationScope.launch {
                                    Animatable(swipeOffsetX).animateTo(0f, spring(dampingRatio = 0.62f, stiffness = 220f)) {
                                        swipeOffsetX = value
                                        onSwipeOffsetChanged(Offset(value, swipeOffsetY))
                                    }
                                    Animatable(swipeOffsetY).animateTo(0f, spring(dampingRatio = 0.62f, stiffness = 220f)) {
                                        swipeOffsetY = value
                                        onSwipeOffsetChanged(Offset(swipeOffsetX, value))
                                    }
                                }
                            }
                        }
                    },
                    onDragCancel = {
                        animationScope.launch {
                            Animatable(swipeOffsetX).animateTo(0f, spring(dampingRatio = 0.62f, stiffness = 220f)) {
                                swipeOffsetX = value
                                onSwipeOffsetChanged(Offset(value, swipeOffsetY))
                            }
                            Animatable(swipeOffsetY).animateTo(0f, spring(dampingRatio = 0.62f, stiffness = 220f)) {
                                swipeOffsetY = value
                                onSwipeOffsetChanged(Offset(swipeOffsetX, value))
                            }
                        }
                    },
                )
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
                Surface(color = Color.White, shape = CircleShape) {
                    Box(
                        modifier = Modifier.height(44.dp).padding(horizontal = 12.dp),
                        contentAlignment = Alignment.Center,
                    ) {
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
                                description = "重量を${formatWeight(weightStepKg)}キログラム増やす",
                                enabled = enabled,
                                onClick = {
                                    onUpdate(set.copy(normalWeightKg = adjustWeight(set.normalWeightKg, weightStepKg, increase = true)))
                                },
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
                                description = "重量を${formatWeight(weightStepKg)}キログラム減らす",
                                enabled = enabled && (set.normalWeightKg ?: 0.0) > 0.0,
                                onClick = {
                                    onUpdate(set.copy(normalWeightKg = adjustWeight(set.normalWeightKg, weightStepKg, increase = false)))
                                },
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
                        onUpdate(
                            if (isRight) set.copy(rightWeightKg = weight, rightReps = reps)
                            else set.copy(leftWeightKg = weight, leftReps = reps),
                        )
                    }
                }
            } else {
                Column(Modifier.weight(1f).fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    BilateralTapControls("左", set.leftWeightKg, set.leftReps, enabled, weightStepKg, Modifier.weight(1f)) { weight, reps ->
                        onUpdate(set.copy(leftWeightKg = weight, leftReps = reps))
                    }
                    BilateralTapControls("右", set.rightWeightKg, set.rightReps, enabled, weightStepKg, Modifier.weight(1f)) { weight, reps ->
                        onUpdate(set.copy(rightWeightKg = weight, rightReps = reps))
                    }
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
    onSkipRestStarted: () -> Unit,
    onSkipRest: () -> Unit,
) {
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
    fun dismissTo(targetX: Float, targetY: Float, dismissStack: Boolean) {
        if (isDismissing) return
        isDismissing = true
        if (dismissStack) onSkipRestStarted()
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
                        val horizontal = abs(dragX) >= abs(dragY)
                        val distance = if (horizontal) abs(dragX) else abs(dragY)
                        val edgeSize = if (horizontal) size.width else size.height
                        if (distance >= edgeSize * 0.12f) {
                            val targetX = if (horizontal) {
                                if (dragX > 0f) size.width * 1.25f else -size.width * 1.25f
                            } else {
                                0f
                            }
                            val targetY = if (horizontal) {
                                0f
                            } else if (dragY > 0f) {
                                size.height * 1.25f
                            } else {
                                -size.height * 1.25f
                            }
                            dismissTo(targetX, targetY, dismissStack = false)
                        } else {
                            animationScope.launch {
                                Animatable(dragOffsetX).animateTo(0f, spring(dampingRatio = 0.62f, stiffness = 220f)) {
                                    dragOffsetX = value
                                }
                                Animatable(dragOffsetY).animateTo(0f, spring(dampingRatio = 0.62f, stiffness = 220f)) {
                                    dragOffsetY = value
                                }
                            }
                        }
                    }
                },
                onDragCancel = {
                    animationScope.launch {
                        Animatable(dragOffsetX).animateTo(0f, spring(dampingRatio = 0.62f, stiffness = 220f)) {
                            dragOffsetX = value
                        }
                        Animatable(dragOffsetY).animateTo(0f, spring(dampingRatio = 0.62f, stiffness = 220f)) {
                            dragOffsetY = value
                        }
                    }
                },
            )
        },
    ) {
        val cardWidthPx = with(LocalDensity.current) { maxWidth.toPx() }
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
                        val tint = Color(0xFF0D47A1).copy(alpha = progress * 0.24f)
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
            Text(
                "スライドして休憩を終了",
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 18.dp),
                style = MaterialTheme.typography.titleMedium,
                color = Color.White.copy(alpha = 0.92f),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            TextButton(onClick = {
                dismissTo(-cardWidthPx * 1.25f, 0f, dismissStack = true)
            }) {
                Text("スキップ", color = Color.White)
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
private fun rememberFlatDeviceCandidate(
    enabled: Boolean,
    workoutActive: Boolean,
    lastUserInteractionAtMillis: Long,
    userInteractionActive: Boolean,
): Boolean {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val isFlat = androidx.compose.runtime.remember { mutableStateOf(false) }
    DisposableEffect(
        context,
        lifecycleOwner,
        enabled,
        workoutActive,
        lastUserInteractionAtMillis,
        userInteractionActive,
    ) {
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
                            val interactionCooldownActive = userInteractionActive ||
                                (lastUserInteractionAtMillis > 0L && now - lastUserInteractionAtMillis < 5_000L)
                            if (interactionCooldownActive) {
                                flatSinceMillis = 0L
                                return
                            }
                            val flatEnoughToEnter = x < 1.8f && y < 1.8f && z > 8.8f
                            if (flatEnoughToEnter) {
                                if (flatSinceMillis == 0L) flatSinceMillis = now
                                if (now - flatSinceMillis >= 1_000L) {
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

private fun Long.toMinutesInput(): String = (this / 60.0).toInput()

private fun String.toRestSecondsOrNull(): Long? {
    val minutes = trim().replace(',', '.').toDoubleOrNull() ?: return null
    if (!minutes.isFinite() || minutes !in 0.0..120.0) return null
    return (minutes * 60.0).roundToInt().toLong()
}

@Composable
private fun SettingsScreen(
    viewModel: FitLogViewModel,
    exercises: List<ExerciseEntity>,
    presets: List<WorkoutPreset>,
    onAddExercise: () -> Unit,
    flatModeEnabled: Boolean,
    displayName: String,
    weightStepKg: Double,
    exerciseWeightSteps: Map<Long, Double>,
    restDurationSeconds: Long,
    exerciseRestDurations: Map<Long, Long>,
    sideSwitchRestExerciseIds: Set<Long>,
    leftFirstExerciseIds: Set<Long>,
    onDisplayNameChange: (String) -> Unit,
    onWeightStepKgChange: (Double) -> Unit,
    onExerciseWeightStepChange: (Long, Double) -> Unit,
    onResetExerciseWeightStep: (Long) -> Unit,
    onRestDurationChange: (Long) -> Unit,
    onExerciseRestDurationChange: (Long, Long?) -> Unit,
    onExerciseSideSwitchRestChange: (Long, Boolean) -> Unit,
    onExerciseStartSideChange: (Long, Boolean) -> Unit,
    onFlatModeEnabledChange: (Boolean) -> Unit,
) {
    val routineExerciseIds by viewModel.routineExerciseIds.collectAsStateWithLifecycle()
    var displayNameDraft by rememberSaveable { mutableStateOf(displayName) }
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
    LaunchedEffect(displayName) { displayNameDraft = displayName }
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
        item { Text("基本の重量増減幅", style = MaterialTheme.typography.titleLarge) }
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
        item { Text("共通のセット間休憩", style = MaterialTheme.typography.titleLarge) }
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
    editingWeightStepExercise?.let { exercise ->
        AlertDialog(
            onDismissRequest = { editingWeightStepExerciseId = null },
            title = { Text("${exercise.name}の設定") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("重量の刻み幅", style = MaterialTheme.typography.titleSmall)
                    OutlinedTextField(
                        value = exerciseWeightStepDraft,
                        onValueChange = { input ->
                            val normalized = input.replace(',', '.')
                            if (normalized.length <= 7 &&
                                normalized.count { it == '.' } <= 1 &&
                                normalized.all { it.isDigit() || it == '.' } &&
                                normalized.substringAfter('.', "").length <= 2
                            ) {
                                exerciseWeightStepDraft = normalized
                            }
                        },
                        label = { Text("1タップあたり（kg）") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    )
                    Text("マシンやプレートの実際の刻みに合わせて設定できます。")
                    Text("セット間休憩", style = MaterialTheme.typography.titleSmall)
                    OutlinedTextField(
                        value = exerciseRestDurationDraft,
                        onValueChange = { input ->
                            val normalized = input.replace(',', '.')
                            if (normalized.length <= 6 && normalized.count { it == '.' } <= 1 &&
                                normalized.all { it.isDigit() || it == '.' } &&
                                normalized.substringAfter('.', "").length <= 2
                            ) exerciseRestDurationDraft = normalized
                        },
                        label = { Text("種目別（分）") },
                        supportingText = { Text("空欄は共通設定、0は休憩なし") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    )
                    if (exercise.mode == ExerciseMode.BILATERAL) {
                        Text("最初に行う側", style = MaterialTheme.typography.titleSmall)
                        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                            SegmentedButton(
                                selected = !exerciseStartsLeftDraft,
                                onClick = { exerciseStartsLeftDraft = false },
                                shape = SegmentedButtonDefaults.itemShape(0, 2),
                            ) { Text("右から") }
                            SegmentedButton(
                                selected = exerciseStartsLeftDraft,
                                onClick = { exerciseStartsLeftDraft = true },
                                shape = SegmentedButtonDefaults.itemShape(1, 2),
                            ) { Text("左から") }
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("左右切り替え時にも休憩", Modifier.weight(1f))
                            Switch(
                                checked = exerciseSideSwitchRestDraft,
                                onCheckedChange = { exerciseSideSwitchRestDraft = it },
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(
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
            },
            dismissButton = {
                Row {
                    TextButton(onClick = {
                        onResetExerciseWeightStep(exercise.id)
                        onExerciseRestDurationChange(exercise.id, null)
                        onExerciseSideSwitchRestChange(exercise.id, false)
                        onExerciseStartSideChange(exercise.id, false)
                        editingWeightStepExerciseId = null
                    }) { Text("共通設定に戻す") }
                    TextButton(onClick = { editingWeightStepExerciseId = null }) { Text("キャンセル") }
                }
            },
        )
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
