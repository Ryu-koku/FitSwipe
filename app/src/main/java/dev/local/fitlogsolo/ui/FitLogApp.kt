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
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.Image
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.background
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.material.icons.filled.DragHandle
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.PlayArrow
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
import androidx.compose.material3.FilledTonalIconButton
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
import androidx.compose.ui.layout.onSizeChanged
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
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.zIndex
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
import dev.local.fitlogsolo.data.WorkoutHistoryEntry
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
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

private const val WORKOUT_CARD_HEIGHT_FRACTION = 0.84f

private enum class MainScreen { HOME, PREPARE, ROOMS, WORKOUT, SETTINGS, RECORDS, WORKOUT_COMPLETE }
private enum class SettingsPage { MENU, BASIC, PRESETS, EXERCISES }
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
    val exerciseColorIndex: Int = 0,
    val totalSets: Int = 0,
    val enabled: Boolean = true,
    val valueEditingEnabled: Boolean = false,
    val restEndsAtMillis: Long = 0L,
    val restStartedAtMillis: Long = 0L,
)

private data class WorkoutCompletionStats(
    val exerciseCount: Int = 0,
    val setCount: Int = 0,
    val durationMinutes: Int = 0,
)

@Composable
internal fun Modifier.pressMotionClickable(enabled: Boolean = true, onClick: () -> Unit): Modifier {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val clickWithHaptic = hapticClick(onClick)
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.97f else 1f,
        animationSpec = spring(stiffness = 700f),
        label = "press motion",
    )
    return graphicsLayer { scaleX = scale; scaleY = scale }
        .clickable(enabled = enabled, interactionSource = interactionSource, onClick = clickWithHaptic)
}

@Composable
internal fun hapticClick(onClick: () -> Unit): () -> Unit {
    val view = LocalView.current
    val latestOnClick = rememberUpdatedState(onClick)
    return remember(view) {
        {
            view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
            latestOnClick.value()
        }
    }
}

@Composable
private fun hapticChange(onChange: (Boolean) -> Unit): (Boolean) -> Unit {
    val view = LocalView.current
    val latestOnChange = rememberUpdatedState(onChange)
    return remember(view) {
        { value ->
            view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
            latestOnChange.value(value)
        }
    }
}

private val FitLogColors = lightColorScheme(
    primary = Color(0xFF147C73),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDCEFEB),
    onPrimaryContainer = Color(0xFF124640),
    secondary = Color(0xFF5C7A72),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE7F0ED),
    onSecondaryContainer = Color(0xFF263B36),
    tertiary = Color(0xFF3D9483),
    onTertiary = Color(0xFF193039),
    tertiaryContainer = Color(0xFFDCEFEA),
    onTertiaryContainer = Color(0xFF193039),
    background = Color(0xFFFAF7F0),
    surface = Color.White,
    surfaceVariant = Color(0xFFEEF4F2),
    onSurface = Color(0xFF193039),
    onSurfaceVariant = Color(0xFF64777B),
    surfaceTint = Color(0xFF147C73),
    surfaceDim = Color(0xFFDCE6E3),
    surfaceBright = Color.White,
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color(0xFFFAFCFB),
    surfaceContainer = Color(0xFFF4F8F6),
    surfaceContainerHigh = Color(0xFFEEF4F2),
    surfaceContainerHighest = Color(0xFFE8F0ED),
    outline = Color(0xFFD5E2DE),
    outlineVariant = Color(0xFFE5EEEB),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FitLogApp(
    viewModel: FitLogViewModel,
    inviteCode: String? = null,
    onInviteConsumed: () -> Unit = {},
) {
    MaterialTheme(colorScheme = FitLogColors) {
        FitLogAppContent(viewModel, inviteCode, onInviteConsumed)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FitLogAppContent(
    viewModel: FitLogViewModel,
    inviteCode: String?,
    onInviteConsumed: () -> Unit,
) {
    var settings by rememberSaveable { mutableStateOf(false) }
    var settingsPage by rememberSaveable { mutableStateOf(SettingsPage.MENU) }
    var showRecords by rememberSaveable { mutableStateOf(false) }
    var roomsSelected by rememberSaveable { mutableStateOf(false) }
    var preparing by rememberSaveable { mutableStateOf(false) }
    var startingWorkout by remember { mutableStateOf(false) }
    var completedSessionId by rememberSaveable { mutableStateOf<Long?>(null) }
    var sharePicker by rememberSaveable { mutableStateOf(false) }
    var pendingRoomInvite by rememberSaveable { mutableStateOf<String?>(null) }
    var activePresetId by rememberSaveable { mutableStateOf<String?>(null) }
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
    var activePresetName by rememberSaveable { mutableStateOf<String?>(null) }
    val exercises by viewModel.exercises.collectAsStateWithLifecycle()
    val allExercises by viewModel.allExercises.collectAsStateWithLifecycle()
    val activeSession by viewModel.activeSession.collectAsStateWithLifecycle()
    val sessions by viewModel.completedSessions.collectAsStateWithLifecycle()
    val weekStartsMonday by viewModel.weekStartsMonday.collectAsStateWithLifecycle()
    val selectedExercise = allExercises.firstOrNull { it.id == selectedExerciseId }
    val workoutFullscreen = activeSession != null && selectedExercise != null
    val weightStepKg by viewModel.weightStepKg.collectAsStateWithLifecycle()
    val exerciseWeightSteps by viewModel.exerciseWeightSteps.collectAsStateWithLifecycle()
    val restDurationSeconds by viewModel.restDurationSeconds.collectAsStateWithLifecycle()
    val exerciseRestDurations by viewModel.exerciseRestDurations.collectAsStateWithLifecycle()
    val sideSwitchRestExerciseIds by viewModel.sideSwitchRestExerciseIds.collectAsStateWithLifecycle()
    val leftFirstExerciseIds by viewModel.leftFirstExerciseIds.collectAsStateWithLifecycle()
    val presets by viewModel.presets.collectAsStateWithLifecycle()
    val storedPresetId by viewModel.selectedPresetId.collectAsStateWithLifecycle()
    val selectedPreset = presets.firstOrNull { it.id == storedPresetId } ?: presets.firstOrNull()
    val canStartPreset = selectedPreset?.exercises?.any { config -> exercises.any { it.id == config.exerciseId } } == true
    val message by viewModel.message.collectAsStateWithLifecycle()
    val roomsState by viewModel.rooms.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val context = LocalContext.current
    val permissionScope = rememberCoroutineScope()

    LaunchedEffect(Unit) { viewModel.initializeDefaultPresets() }

    fun startWithExactAlarmPermission(action: () -> Unit) {
        if (RestTimerAlarm.canScheduleExactAlarms(context)) {
            action()
        } else {
            pendingWorkoutStart = action
            showExactAlarmPermissionDialog = true
        }
    }

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

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) {
        val action = pendingWorkoutStart
        pendingWorkoutStart = null
        action?.let(::startWithExactAlarmPermission)
    }

    fun startWorkoutWithBackgroundAlerts(action: () -> Unit) {
        val needsNotificationPermission = android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU &&
            context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED
        if (needsNotificationPermission) {
            pendingWorkoutStart = action
            notificationPermissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        } else {
            startWithExactAlarmPermission(action)
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

    LaunchedEffect(inviteCode) {
        if (inviteCode != null) { pendingRoomInvite = inviteCode; roomsSelected = true; preparing = false; onInviteConsumed() }
    }
    LaunchedEffect(roomsState.notice) {
        roomsState.notice?.let { snackbar.showSnackbar(it); viewModel.rooms.acknowledgeNotice() }
    }
    LaunchedEffect(roomsState.error) {
        if (showWorkoutComplete) roomsState.error?.let { snackbar.showSnackbar(it) }
    }

    fun beginSelectedWorkout() {
        if (startingWorkout || (activeSession == null && !canStartPreset)) return
        val clickedSession = activeSession
        val clickedPreset = selectedPreset
        startWorkoutWithBackgroundAlerts {
            startingWorkout = true
            val onStarted: (Long, List<Long>) -> Unit = { sessionId, exerciseIds ->
                permissionScope.launch {
                    try {
                        val savedSets = viewModel.historySets(listOf(sessionId))
                        val sessionPreset = presets.firstOrNull { it.id == clickedSession?.presetId } ?: clickedPreset
                        activePresetId = sessionPreset?.id
                        activePresetName = sessionPreset?.name ?: "トレーニング"
                        val savedOrder = presetExerciseOrder.split(',').mapNotNull(String::toLongOrNull)
                        val preferred = if (savedOrder.isNotEmpty() && clickedSession != null) savedOrder else sessionPreset?.exercises?.map { it.exerciseId }.orEmpty()
                        val order = (preferred.filter { it in exerciseIds } + exerciseIds).distinct()
                        presetExerciseOrder = order.joinToString(",")
                        selectedExerciseId = order.firstOrNull { id -> savedSets.any { it.exerciseId == id && !it.isCompleted } } ?: order.firstOrNull()
                        preparing = false
                    } finally { startingWorkout = false }
                }
            }
            if (clickedSession != null) viewModel.resumeWorkout(onFailed = { startingWorkout = false }, onReady = onStarted)
            else if (clickedPreset != null) viewModel.startPreset(clickedPreset, onFailed = { startingWorkout = false }, onReady = onStarted)
            else startingWorkout = false
        }
    }

    val mainScreen = when {
        showWorkoutComplete -> MainScreen.WORKOUT_COMPLETE
        settings -> MainScreen.SETTINGS
        showRecords -> MainScreen.RECORDS
        workoutFullscreen -> MainScreen.WORKOUT
        preparing -> MainScreen.PREPARE
        roomsSelected -> MainScreen.ROOMS
        else -> MainScreen.HOME
    }
    BackHandler(
        enabled = showAddExercise || showWorkoutComplete || settings || showRecords || workoutFullscreen || preparing || roomsSelected,
    ) {
        when {
            showAddExercise -> showAddExercise = false
            showWorkoutComplete -> { showWorkoutComplete = false; workoutCompletionSaved = false; roomsSelected = false }
            settings && settingsPage != SettingsPage.MENU -> settingsPage = SettingsPage.MENU
            settings -> settings = false
            showRecords -> showRecords = false
            workoutFullscreen -> { selectedExerciseId = null; preparing = true }
            preparing -> preparing = false
            roomsSelected -> roomsSelected = false
        }
    }
    val showDock = mainScreen in setOf(MainScreen.HOME, MainScreen.ROOMS, MainScreen.PREPARE)
    Scaffold(
        modifier = Modifier.safeDrawingPadding(),
        topBar = {},
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Surface(
            Modifier.fillMaxSize()
                .padding(padding)
                .animateContentSize(spring(stiffness = 500f)),
            color = MaterialTheme.colorScheme.background,
        ) {
          Box(Modifier.fillMaxSize()) {
            AnimatedContent(
                modifier = Modifier.fillMaxSize(),
                targetState = mainScreen,
                transitionSpec = {
                    if (targetState == MainScreen.WORKOUT_COMPLETE) {
                        (fadeIn(tween(280)) + scaleIn(tween(320), initialScale = 0.94f)) togetherWith
                            (fadeOut(tween(180)) + scaleOut(tween(220), targetScale = 1.03f))
                    } else if (targetState == MainScreen.PREPARE) {
                        (slideInVertically(tween(300)) { it / 12 } + fadeIn(tween(240))) togetherWith fadeOut(tween(180))
                    } else if (initialState == MainScreen.PREPARE && targetState != MainScreen.WORKOUT) {
                        fadeIn(tween(240)) togetherWith (slideOutVertically(tween(280)) { it / 12 } + fadeOut(tween(180)))
                    } else {
                        val direction = if (targetState == MainScreen.HOME) -1 else 1
                        (slideInHorizontally(tween(320)) { width -> direction * width / 5 } + fadeIn(tween(240))) togetherWith
                            (slideOutHorizontally(tween(280)) { width -> -direction * width / 5 } + fadeOut(tween(180)))
                    }
                },
                label = "main screen transition",
            ) { screen ->
              Box(Modifier.fillMaxSize().padding(bottom = if (screen in setOf(MainScreen.HOME, MainScreen.ROOMS, MainScreen.PREPARE)) 112.dp else 0.dp)) {
                when (screen) {
                    MainScreen.WORKOUT_COMPLETE -> WorkoutCompleteScreen(
                        stats = completionStats,
                        saving = !workoutCompletionSaved,
                        onHome = {
                            showWorkoutComplete = false
                            workoutCompletionSaved = false
                            roomsSelected = false
                        },
                        onShare = { sharePicker = true },
                    )
                    MainScreen.SETTINGS -> SettingsScreen(
                        viewModel = viewModel,
                        exercises = exercises,
                        presets = presets,
                        page = settingsPage,
                        onPageChange = { settingsPage = it },
                        onBack = { settings = false },
                        onAddExercise = { showAddExercise = true },
                        weekStartsMonday = weekStartsMonday,
                        onWeekStartsMondayChange = viewModel::setWeekStartsMonday,
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
                    MainScreen.RECORDS -> RecordsScreen(
                        viewModel = viewModel,
                        sessions = sessions,
                        presets = presets,
                        selectedPresetId = activePresetId,
                        onPresetSelected = { activePresetId = it },
                        onBack = { showRecords = false },
                    )
                    MainScreen.PREPARE -> TrainingPreparationScreen(
                        presets = presets, exercises = exercises, selectedId = selectedPreset?.id,
                        exerciseRestDurations = exerciseRestDurations,
                        onExerciseRestDurationChange = viewModel::setExerciseRestDurationSeconds,
                        onSelect = viewModel::selectPreset, onPresetsChange = viewModel::setPresets,
                        onAddExercise = { showAddExercise = true }, onBack = { preparing = false },
                    )
                    MainScreen.ROOMS -> RoomsScreen(
                        repository = viewModel.rooms, sessions = sessions, presets = presets,
                        inviteCode = pendingRoomInvite, onInviteConsumed = { pendingRoomInvite = null },
                        onShareSession = { roomId, sessionId -> viewModel.shareSession(roomId, sessionId) },
                    )
                    MainScreen.HOME, MainScreen.WORKOUT -> RecordScreen(
                        viewModel = viewModel,
                        exercises = if (screen == MainScreen.WORKOUT) allExercises else exercises,
                        allExercises = allExercises,
                        activePresetName = activePresetName,
                        onOpenSettingsMenu = {
                            settingsPage = SettingsPage.MENU
                            settings = true
                        },
                        activeSessionId = activeSession?.id,
                        completedSessions = sessions,
                        presetExerciseOrder = presetExerciseOrder.split(',').mapNotNull(String::toLongOrNull),
                        selectedExercise = if (screen == MainScreen.WORKOUT) selectedExercise else null,
                        onExerciseOrderChange = { ids -> presetExerciseOrder = ids.joinToString(",") },
                        weekStartsMonday = weekStartsMonday,
                        restEndsAtMillis = restEndsAtMillis,
                        restStartedAtMillis = restStartedAtMillis,
                        weightStepKg = weightStepKg,
                        exerciseWeightSteps = exerciseWeightSteps,
                        restDurationSeconds = restDurationSeconds,
                        exerciseRestDurations = exerciseRestDurations,
                        sideSwitchRestExerciseIds = sideSwitchRestExerciseIds,
                        leftFirstExerciseIds = leftFirstExerciseIds,
                        onSelectExercise = { exercise ->
                            startWorkoutWithBackgroundAlerts {
                                viewModel.startExercise(exercise) {
                                    selectedExerciseId = exercise.id
                                }
                            }
                        },
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
                            activePresetName = null
                        },
                        onWorkoutComplete = { stats ->
                            completedSessionId = activeSession?.id
                            completionStats = stats
                            workoutCompletionSaved = false
                            activeSession?.id?.let { sessionId ->
                                viewModel.finishSession(sessionId) { workoutCompletionSaved = true }
                            } ?: run { workoutCompletionSaved = true }
                            selectedExerciseId = null
                            RestTimerAlarm.cancel(context)
                            restStartedAtMillis = 0L
                            restEndsAtMillis = 0L
                            presetExerciseOrder = ""
                            activePresetName = null
                            showWorkoutComplete = true
                        },
                        onBack = { selectedExerciseId = null; preparing = true },
                    )
                }
              }
            }
            AnimatedVisibility(
                visible = showDock,
                modifier = Modifier.align(Alignment.BottomCenter),
                enter = fadeIn(tween(220)) + slideInVertically(tween(260)) { it / 3 },
                exit = fadeOut(tween(180)) + slideOutVertically(tween(220)) { it / 3 },
            ) {
                TrainingDock(
                    preparing = preparing, roomsSelected = roomsSelected,
                    selectedPresetName = selectedPreset?.name, resuming = activeSession != null,
                    canStart = canStartPreset || activeSession != null,
                    starting = startingWorkout,
                    onHome = { roomsSelected = false }, onRooms = { roomsSelected = true },
                    onCenter = { if (preparing) beginSelectedWorkout() else preparing = true },
                )
            }
          }
        }
    }

    if (sharePicker && completedSessionId != null) {
        RoomShareSheet(repository = viewModel.rooms, onDismiss = { sharePicker = false },
            onOpenRooms = { sharePicker = false; showWorkoutComplete = false; roomsSelected = true },
            onShare = { roomId -> viewModel.shareSession(roomId, completedSessionId!!); sharePicker = false })
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
                TextButton(onClick = hapticClick {
                    showExactAlarmPermissionDialog = false
                    val settingsIntent = Intent(
                        Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                        Uri.parse("package:${context.packageName}"),
                    )
                    exactAlarmPermissionLauncher.launch(settingsIntent)
                }) { Text("設定を開く") }
            },
            dismissButton = {
                TextButton(onClick = hapticClick {
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
    activePresetName: String?,
    onOpenSettingsMenu: () -> Unit,
    activeSessionId: Long?,
    completedSessions: List<dev.local.fitlogsolo.data.WorkoutSessionEntity>,
    presetExerciseOrder: List<Long>,
    selectedExercise: ExerciseEntity?,
    onExerciseOrderChange: (List<Long>) -> Unit,
    weekStartsMonday: Boolean,
    restEndsAtMillis: Long,
    restStartedAtMillis: Long,
    weightStepKg: Double,
    exerciseWeightSteps: Map<Long, Double>,
    restDurationSeconds: Long,
    exerciseRestDurations: Map<Long, Long>,
    sideSwitchRestExerciseIds: Set<Long>,
    leftFirstExerciseIds: Set<Long>,
    onSelectExercise: (ExerciseEntity) -> Unit,
    onSetCompleted: (Long) -> Unit,
    onSkipRest: () -> Unit,
    onFinishSession: () -> Unit,
    onWorkoutComplete: (WorkoutCompletionStats) -> Unit,
    onBack: () -> Unit,
) {
    val initialSessionId = remember { activeSessionId }
    val displayedSessionId = activeSessionId ?: initialSessionId
    val sessionSetsFlow = remember(viewModel, displayedSessionId) {
        displayedSessionId?.let(viewModel::sessionSets) ?: kotlinx.coroutines.flow.flowOf(emptyList())
    }
    val sessionSets by sessionSetsFlow
        .collectAsStateWithLifecycle(emptyList())
    val progressUnits = sessionSets.sumOf { set ->
        if (allExercises.firstOrNull { it.id == set.exerciseId }?.mode == ExerciseMode.BILATERAL) 2L else 1L
    }
    val completedProgressUnits = sessionSets.sumOf { set ->
        if (allExercises.firstOrNull { it.id == set.exerciseId }?.mode == ExerciseMode.BILATERAL) {
            if (set.isCompleted) 2L else (if (set.leftCompleted) 1L else 0L) + (if (set.rightCompleted) 1L else 0L)
        } else if (set.isCompleted) 1L else 0L
    }
    val progressTarget = if (progressUnits > 0) completedProgressUnits.toFloat() / progressUnits else 0f
    val workoutProgress = progressTarget.coerceIn(0f, 1f)
    val sessionExerciseIds = presetExerciseOrder.ifEmpty {
        sessionSets.sortedBy { it.createdAt }.map { it.exerciseId }.distinct()
    }
    val resumableExercise = sessionExerciseIds
        .firstOrNull { exerciseId -> sessionSets.any { it.exerciseId == exerciseId && !it.isCompleted } }
        ?.let { exerciseId -> exercises.firstOrNull { it.id == exerciseId } }
        ?: sessionExerciseIds.firstOrNull()?.let { exerciseId -> exercises.firstOrNull { it.id == exerciseId } }
    var lastEditorExercise by remember { mutableStateOf(selectedExercise) }
    if (selectedExercise != null) lastEditorExercise = selectedExercise
    val editorSelection = selectedExercise ?: lastEditorExercise
    AnimatedContent(
        targetState = editorSelection?.let { exercise -> displayedSessionId?.let { sessionId -> sessionId to exercise.id } },
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
                workoutProgress = workoutProgress,
                presetName = activePresetName,
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
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Row(
                    Modifier.fillMaxWidth().height(56.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "FitSwipe",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontSize = 24.sp,
                            fontWeight = FontWeight.ExtraBold,
                            fontStyle = FontStyle.Italic,
                        ),
                        color = MaterialTheme.colorScheme.primary,
                    )
                    Spacer(Modifier.weight(1f))
                    FilledTonalIconButton(onClick = hapticClick(onOpenSettingsMenu), modifier = Modifier.size(44.dp), shape = CircleShape) {
                        Icon(Icons.Default.Settings, "設定")
                    }
                }
                if (activeSessionId != null) {
                    Card(Modifier.fillMaxWidth()) {
                        Row(
                            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text("進行中", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                                Text(
                                    resumableExercise?.let { "続き：${it.name}" } ?: "プリセットから再開できます",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                                )
                            }
                            if (resumableExercise != null) {
                                TextButton(onClick = hapticClick { onSelectExercise(resumableExercise) }) { Text("再開") }
                            }
                            TextButton(onClick = hapticClick(onFinishSession)) { Text("終了") }
                        }
                    }
                }
                Text("カレンダー", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 8.dp, bottom = 2.dp))
                WorkoutCalendar(completedSessions, allExercises, viewModel, weekStartsMonday)
                HomeAchievements(viewModel, allExercises, weekStartsMonday)
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun WorkoutCompleteScreen(
    stats: WorkoutCompletionStats,
    saving: Boolean,
    onHome: () -> Unit,
    onShare: () -> Unit,
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
        Row(
            Modifier.fillMaxWidth().padding(top = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            CompletionStatCard("${stats.exerciseCount}", "種目", Modifier.weight(1f))
            CompletionStatCard("${stats.setCount}", "セット", Modifier.weight(1f))
            CompletionStatCard("${stats.durationMinutes}", "分", Modifier.weight(1f))
        }
        Button(onClick = hapticClick(onHome), enabled = !saving, modifier = Modifier.fillMaxWidth().padding(top = 24.dp).height(52.dp)) {
            Text("ホームに戻る", fontWeight = FontWeight.Bold)
        }
        OutlinedButton(onClick = hapticClick(onShare), enabled = !saving, modifier = Modifier.fillMaxWidth().padding(top = 10.dp).height(52.dp)) {
            Text("ルームへ共有", fontWeight = FontWeight.Bold)
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
private fun TrainingHistoryChart(
    sessions: List<dev.local.fitlogsolo.data.WorkoutSessionEntity>,
    sets: List<WorkoutSetEntity>,
) {
    val chartValues = sessions.map { session ->
        session to sets.count { it.sessionId == session.id && it.isCompleted }
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("記録", Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text("完了セット数", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Card(Modifier.fillMaxWidth()) {
            if (chartValues.isEmpty()) {
                Text(
                    "トレーニング記録がここに表示されます",
                    Modifier.padding(16.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                val primary = MaterialTheme.colorScheme.primary
                val grid = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f)
                val maxValue = chartValues.maxOf { it.second }.coerceAtLeast(1)
                Column(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp)) {
                    Canvas(Modifier.fillMaxWidth().height(132.dp)) {
                        val left = 8.dp.toPx()
                        val right = size.width - left
                        val top = 8.dp.toPx()
                        val bottom = size.height - 8.dp.toPx()
                        val plotHeight = bottom - top
                        repeat(3) { index ->
                            val y = top + plotHeight * index / 2f
                            drawLine(grid, Offset(left, y), Offset(right, y), strokeWidth = 1.dp.toPx())
                        }
                        val points = chartValues.mapIndexed { index, (_, value) ->
                            val x = if (chartValues.size == 1) (left + right) / 2f
                            else left + (right - left) * index / (chartValues.size - 1).toFloat()
                            val y = bottom - (value.toFloat() / maxValue) * plotHeight
                            Offset(x, y)
                        }
                        points.zipWithNext().forEach { (start, end) ->
                            drawLine(primary, start, end, strokeWidth = 3.dp.toPx())
                        }
                        points.forEach { point -> drawCircle(primary, radius = 4.dp.toPx(), center = point) }
                    }
                    Row(Modifier.fillMaxWidth().padding(top = 4.dp)) {
                        chartValues.forEach { (session, _) ->
                            val date = session.startedAt.atZone(ZoneId.systemDefault()).toLocalDate()
                            Text(
                                date.format(DateTimeFormatter.ofPattern("M/d", Locale.JAPAN)),
                                Modifier.weight(1f),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                maxLines = 1,
                            )
                        }
                    }
                }
            }
        }
    }
}

private data class PresetVolumePoint(
    val date: LocalDate,
    val valueKgSets: Double,
)

@Composable
private fun RecordsScreen(
    viewModel: FitLogViewModel,
    sessions: List<dev.local.fitlogsolo.data.WorkoutSessionEntity>,
    presets: List<WorkoutPreset>,
    selectedPresetId: String?,
    onPresetSelected: (String?) -> Unit,
    onBack: () -> Unit,
) {
    var menuExpanded by rememberSaveable { mutableStateOf(false) }
    var localPresetId by rememberSaveable { mutableStateOf(selectedPresetId) }
    LaunchedEffect(selectedPresetId, presets.map { it.id }) {
        val resolvedId = presets.firstOrNull { it.id == selectedPresetId }?.id
            ?: presets.firstOrNull()?.id
        localPresetId = resolvedId
        if (resolvedId != selectedPresetId) onPresetSelected(resolvedId)
    }
    val selectedPreset = presets.firstOrNull { it.id == localPresetId }

    val sessionIds = remember(sessions) { sessions.map { it.id } }
    var loadedSets by remember { mutableStateOf<List<WorkoutSetEntity>?>(null) }
    LaunchedEffect(sessionIds) {
        if (sessionIds.isEmpty()) {
            loadedSets = emptyList()
        } else {
            loadedSets = null
            loadedSets = viewModel.historySets(sessionIds)
        }
    }

    val setsBySession = loadedSets.orEmpty().groupBy { it.sessionId }
    val presetExerciseIds = selectedPreset?.exercises?.map { it.exerciseId }?.toSet().orEmpty()
    val matchingPresetCount = presets.count { preset ->
        preset.exercises.map { it.exerciseId }.toSet() == presetExerciseIds && presetExerciseIds.isNotEmpty()
    }
    val matchingSessions = if (selectedPreset == null || presetExerciseIds.isEmpty()) {
        emptyList()
    } else {
        sessions.filter { session ->
            session.presetId == selectedPreset.id ||
                (session.presetId == null && matchingPresetCount == 1 &&
                    setsBySession[session.id].orEmpty().map { it.exerciseId }.toSet() == presetExerciseIds)
        }
    }
    val points = matchingSessions.mapNotNull { session ->
        val value = setsBySession[session.id].orEmpty()
            .filter { it.isCompleted && it.exerciseId in presetExerciseIds }
            .sumOf { set ->
                listOfNotNull(set.normalWeightKg, set.leftWeightKg, set.rightWeightKg).sum()
            }
        if (value <= 0.0) null else PresetVolumePoint(
            date = session.startedAt.atZone(ZoneId.systemDefault()).toLocalDate(),
            valueKgSets = value,
        )
    }.sortedBy { it.date }

    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 8.dp, bottom = 24.dp),
    ) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = hapticClick(onBack)) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "戻る", tint = MaterialTheme.colorScheme.primary)
                }
                Text("記録", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
            }
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("プリセット", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Box {
                    OutlinedButton(
                        onClick = hapticClick { menuExpanded = true },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = selectedPreset != null,
                    ) {
                        Text(selectedPreset?.name ?: "プリセットがありません", Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Start)
                        Text("⌄", style = MaterialTheme.typography.titleMedium)
                    }
                    DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                        presets.forEach { preset ->
                            DropdownMenuItem(
                                text = { Text(preset.name) },
                                onClick = hapticClick {
                                    localPresetId = preset.id
                                    onPresetSelected(preset.id)
                                    menuExpanded = false
                                },
                            )
                        }
                    }
                }
            }
        }
        if (selectedPreset == null) {
            item {
                Text("設定からプリセットを追加できます。", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            item {
                Text("${presetExerciseIds.size}種目の重量 × 完了セット数の合計", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (loadedSets == null) {
                item { Text("記録を読み込み中…", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            } else if (points.isEmpty()) {
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Text(
                            "このプリセットの重量記録はまだありません",
                            Modifier.fillMaxWidth().padding(18.dp),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            } else {
                val latest = points.last()
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Row(
                            Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 16.dp),
                            verticalAlignment = Alignment.Bottom,
                        ) {
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("直近の合計", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text(formatWeight(latest.valueKgSets), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
                                    Text("kg·セット", Modifier.padding(bottom = 4.dp), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            Text(latest.date.format(DateTimeFormatter.ofPattern("M月d日", Locale.JAPAN)), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                item { PresetVolumeChart(points.takeLast(7)) }
                item {
                    Text(
                        "各種目の完了セットに記録された重量を合計しています。回数は含みません。",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun PresetVolumeChart(points: List<PresetVolumePoint>) {
    val primary = MaterialTheme.colorScheme.primary
    val grid = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f)
    val maxValue = points.maxOfOrNull { it.valueKgSets }?.coerceAtLeast(1.0) ?: 1.0
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 14.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("合計重量の推移", Modifier.weight(1f), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text("kg·セット", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Canvas(Modifier.fillMaxWidth().height(176.dp).padding(top = 12.dp)) {
                val horizontalInset = 8.dp.toPx()
                val top = 8.dp.toPx()
                val bottom = size.height - 8.dp.toPx()
                val right = size.width - horizontalInset
                val plotHeight = bottom - top
                repeat(4) { index ->
                    val y = top + plotHeight * index / 3f
                    drawLine(grid, Offset(horizontalInset, y), Offset(right, y), strokeWidth = 1.dp.toPx())
                }
                val dataPoints = points.mapIndexed { index, point ->
                    val x = if (points.size == 1) (horizontalInset + right) / 2f
                    else horizontalInset + (right - horizontalInset) * index / (points.size - 1).toFloat()
                    val y = bottom - (point.valueKgSets.toFloat() / maxValue.toFloat()) * plotHeight
                    Offset(x, y)
                }
                dataPoints.zipWithNext().forEach { (start, end) ->
                    drawLine(primary, start, end, strokeWidth = 3.dp.toPx())
                }
                dataPoints.forEach { point -> drawCircle(primary, radius = 5.dp.toPx(), center = point) }
            }
            Row(Modifier.fillMaxWidth().padding(top = 4.dp)) {
                points.forEach { point ->
                    Text(
                        point.date.format(DateTimeFormatter.ofPattern("M/d", Locale.JAPAN)),
                        Modifier.weight(1f),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}

@Composable
private fun SetProgressBadge(
    setNumber: Int,
    totalSets: Int,
    color: Color,
    trackColor: Color,
) {
    val total = totalSets.coerceAtLeast(setNumber).coerceAtLeast(1)
    val progress by animateFloatAsState(
        targetValue = setNumber.toFloat() / total,
        animationSpec = tween(durationMillis = 420),
        label = "set ring progress",
    )
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(1.dp)) {
        Canvas(Modifier.size(32.dp)) {
            val stroke = 3.dp.toPx()
            val arcSize = androidx.compose.ui.geometry.Size(size.width - stroke, size.height - stroke)
            val topLeft = Offset(stroke / 2f, stroke / 2f)
            drawArc(trackColor, -90f, 360f, false, topLeft, arcSize, style = androidx.compose.ui.graphics.drawscope.Stroke(stroke))
            if (progress > 0f) {
                drawArc(color, -90f, 360f * progress, false, topLeft, arcSize, style = androidx.compose.ui.graphics.drawscope.Stroke(stroke))
            }
        }
        Text(
            "$setNumber/$total",
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            color = color,
            maxLines = 1,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WorkoutCalendar(
    sessions: List<dev.local.fitlogsolo.data.WorkoutSessionEntity>,
    exercises: List<ExerciseEntity>,
    viewModel: FitLogViewModel,
    weekStartsMonday: Boolean,
) {
    var month by rememberSaveable { mutableStateOf(YearMonth.now().toString()) }
    var selectedDateText by rememberSaveable { mutableStateOf<String?>(null) }
    var historySets by remember { mutableStateOf<List<WorkoutSetEntity>?>(null) }
    val yearMonth = YearMonth.parse(month)
    val today = LocalDate.now()
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
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFEFA)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = BorderStroke(1.dp, Color(0xFFF0E9DE)),
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
            Column(Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) {
                Box(Modifier.fillMaxWidth().height(28.dp), contentAlignment = Alignment.Center) {
                    Text(
                        displayedMonth.format(DateTimeFormatter.ofPattern("yyyy年 M月", Locale.JAPAN)),
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    )
                }
                Row(Modifier.fillMaxWidth()) {
                    val weekLabels = if (weekStartsMonday) {
                        listOf("月", "火", "水", "木", "金", "土", "日")
                    } else {
                        listOf("日", "月", "火", "水", "木", "金", "土")
                    }
                    weekLabels.forEach { day ->
                        Text(
                            day,
                            modifier = Modifier.weight(1f),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        )
                    }
                }
                val firstDayOfWeekValue = displayedMonth.atDay(1).dayOfWeek.value
                val leadingBlanks = if (weekStartsMonday) firstDayOfWeekValue - 1 else firstDayOfWeekValue % 7
                val cells = ((leadingBlanks + displayedMonth.lengthOfMonth() + 6) / 7) * 7
                repeat(cells / 7) { week ->
                    Row(Modifier.fillMaxWidth()) {
                        repeat(7) { column ->
                            val dayNumber = week * 7 + column - leadingBlanks + 1
                            Box(Modifier.weight(1f).height(32.dp), contentAlignment = Alignment.Center) {
                                if (dayNumber in 1..displayedMonth.lengthOfMonth()) {
                                    val day = displayedMonth.atDay(dayNumber)
                                    val hasWorkout = day in workoutDays
                                    val isSelected = day == selectedDate
                                    val isToday = day == today
                                    Surface(
                                        modifier = Modifier.size(28.dp)
                                            .clickable(enabled = hasWorkout, onClick = hapticClick { selectedDateText = day.toString() })
                                            .semantics {
                                                contentDescription = buildString {
                                                    append(day.format(DateTimeFormatter.ofPattern("M月d日", Locale.JAPAN)))
                                                    if (isToday) append("、今日")
                                                    if (hasWorkout) append("、トレーニング記録あり")
                                                    if (isSelected) append("、選択中")
                                                }
                                            },
                                        shape = MaterialTheme.shapes.large,
                                        color = when {
                                            isToday -> MaterialTheme.colorScheme.primaryContainer
                                            isSelected || hasWorkout -> MaterialTheme.colorScheme.primary
                                            else -> Color.Transparent
                                        },
                                    ) {
                                        Column(
                                            Modifier.fillMaxSize(),
                                            horizontalAlignment = Alignment.CenterHorizontally,
                                            verticalArrangement = Arrangement.Center,
                                        ) {
                                            Text(
                                                dayNumber.toString(),
                                                style = MaterialTheme.typography.bodySmall.copy(
                                                    fontWeight = if (isToday) FontWeight.Bold else FontWeight.Normal,
                                                ),
                                                color = when {
                                                    isToday -> MaterialTheme.colorScheme.onPrimaryContainer
                                                    isSelected || hasWorkout -> MaterialTheme.colorScheme.onPrimary
                                                    else -> MaterialTheme.colorScheme.onSurface
                                                },
                                            )
                                            if (isToday) {
                                                Box(
                                                    Modifier.padding(top = 1.dp)
                                                        .width(12.dp)
                                                        .height(2.dp)
                                                        .clip(CircleShape)
                                                        .background(MaterialTheme.colorScheme.primary),
                                                )
                                            } else if (hasWorkout) {
                                                Box(
                                                    Modifier.padding(top = 1.dp)
                                                        .size(4.dp)
                                                        .clip(CircleShape)
                                                        .background(if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.primary),
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
    if (selectedDate != null) {
        ModalBottomSheet(onDismissRequest = { selectedDateText = null }) {
            Column(
                Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp),
            ) {
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
                    val performanceCounts = exerciseSets
                        .sortedWith(compareBy<WorkoutSetEntity> { it.setOrder }.thenBy { it.id })
                        .mapNotNull { set ->
                            val normal = if (set.normalWeightKg != null || set.normalReps != null) {
                                performance(set.normalWeightKg, set.normalReps)
                            } else null
                            val left = if (set.leftWeightKg != null || set.leftReps != null) {
                                "左 ${performance(set.leftWeightKg, set.leftReps)}"
                            } else null
                            val right = if (set.rightWeightKg != null || set.rightReps != null) {
                                "右 ${performance(set.rightWeightKg, set.rightReps)}"
                            } else null
                            listOfNotNull(normal, left, right).takeIf { it.isNotEmpty() }
                                ?.joinToString(" · ")
                        }
                        .groupingBy { it }
                        .eachCount()
                    if (performanceCounts.isNotEmpty()) {
                        Text(
                            performanceCounts.entries.joinToString("  /  ") { (performance, count) ->
                                "$performance${if (count > 1) " · ${count}セット" else ""}"
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                        )
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
            Row(
                Modifier.weight(1f).pressMotionClickable(onClick = onClick),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (exercise.name.pictogramResource() != null) {
                    ExercisePictogramThumbnail(
                        exerciseName = exercise.name,
                        modifier = Modifier.padding(end = 12.dp).size(width = 88.dp, height = 64.dp),
                    )
                }
                Column(Modifier.weight(1f)) {
                    Text(exercise.name, style = MaterialTheme.typography.titleMedium)
                    Text(if (exercise.mode == ExerciseMode.NORMAL) "通常" else "左右別", style = MaterialTheme.typography.bodySmall)
                }
            }
            IconButton(onClick = hapticClick(onToggleRoutine)) {
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
private fun ExercisePictogramThumbnail(exerciseName: String, modifier: Modifier = Modifier) {
    val pictogram = exerciseName.pictogramResource() ?: return
    val motion by rememberInfiniteTransition(label = "exercise pictogram motion")
        .animateFloat(
            initialValue = -1f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = 680),
                repeatMode = RepeatMode.Reverse,
            ),
            label = "exercise pictogram motion",
        )
    Surface(
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        color = Color(0xFFFFF6F2),
    ) {
        Image(
            painter = painterResource(pictogram),
            contentDescription = "${exerciseName}のピクトグラム",
            contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxSize().padding(4.dp).graphicsLayer {
                translationY = motion * 3.dp.toPx()
                rotationZ = motion * 4f
                scaleX = 1f + kotlin.math.abs(motion) * 0.02f
                scaleY = 1f + kotlin.math.abs(motion) * 0.02f
            },
        )
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
    workoutProgress: Float,
    presetName: String?,
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
    fun nextPendingExerciseId(afterExerciseId: Long): Long? {
        val idsAfterCurrent = orderedIds.dropWhile { it != afterExerciseId }.drop(1) +
            orderedIds.takeWhile { it != afterExerciseId }
        return idsAfterCurrent.firstOrNull { nextId ->
            allSessionSets.any { it.exerciseId == nextId && !it.isCompleted }
        }
    }
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
        nextPendingExerciseId(exercise.id)
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
    val workoutCards = remember(orderedIds, allExercises, allSessionSets, currentSet?.id, activeSide, leftFirstExerciseIds) {
        orderedIds.flatMap { exerciseId ->
            val itemExercise = allExercises.firstOrNull { it.id == exerciseId } ?: return@flatMap emptyList()
            val itemFirstSide = if (exerciseId in leftFirstExerciseIds) ExerciseSide.LEFT else ExerciseSide.RIGHT
            val itemOtherSide = if (itemFirstSide == ExerciseSide.LEFT) ExerciseSide.RIGHT else ExerciseSide.LEFT
            allSessionSets.filter { it.exerciseId == exerciseId }.sortedBy { it.setOrder }.flatMap { set ->
                if (itemExercise.mode != ExerciseMode.BILATERAL) {
                    if (set.isCompleted || set.id == currentSet?.id) listOf(WorkoutCardRef(itemExercise, set)) else emptyList()
                } else {
                    val sides = listOf(itemFirstSide, itemOtherSide)
                    val visitedSides = when {
                        set.isCompleted -> sides.filter { side ->
                            if (side == ExerciseSide.LEFT) set.leftCompleted else set.rightCompleted
                        }
                        set.id == currentSet?.id -> sides.filter { side ->
                            if (side == ExerciseSide.LEFT) set.leftCompleted else set.rightCompleted
                        } + listOfNotNull(activeSide?.takeIf { it !in sides.filter { side ->
                            if (side == ExerciseSide.LEFT) set.leftCompleted else set.rightCompleted
                        } })
                        else -> emptyList()
                    }
                    visitedSides.map { side -> WorkoutCardRef(itemExercise, set, side) }
                }
            }
        }
    }
    val currentCardIndex = workoutCards.indexOfFirst {
        it.exercise.id == exercise.id && it.set.id == currentSet?.id && it.side == activeSide
    }
    var browsingCardKey by rememberSaveable(sessionId) { mutableStateOf<String?>(null) }
    var cardMotionDirection by remember(sessionId) { mutableStateOf(1) }
    var showWorkoutHistory by rememberSaveable(sessionId) { mutableStateOf(false) }
    LaunchedEffect(exercise.id, currentSet?.id, activeSide) {
        browsingCardKey = null
        cardMotionDirection = 1
    }
    val browsingCardIndex = browsingCardKey?.let { key ->
        workoutCards.indexOfFirst { "${it.exercise.id}:${it.set.id}:${it.side?.name ?: "all"}" == key }
    } ?: -1
    val browsingCard = workoutCards.getOrNull(browsingCardIndex)
    val effectiveRestSeconds = exerciseRestDurations[exercise.id] ?: restDurationSeconds
    val cardScene = when {
        browsingCard != null -> {
            val previousExercise = browsingCard.exercise
            val previousSet = browsingCard.set
            EditorCardScene(
                key = "previous:${previousExercise.id}:${previousSet.id}:${browsingCard.side?.name ?: "all"}",
                exercise = previousExercise,
                set = previousSet,
                side = browsingCard.side,
                exerciseColorIndex = orderedIds.indexOf(previousExercise.id).coerceAtLeast(0),
                totalSets = allSessionSets.count { it.exerciseId == previousExercise.id }
                    .coerceAtLeast(previousSet.setOrder + 1),
                enabled = false,
                valueEditingEnabled = true,
            )
        }
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
                exerciseColorIndex = orderedIds.indexOf(displayedExercise.id).coerceAtLeast(0),
                totalSets = allSessionSets.count { it.exerciseId == displayedExercise.id }
                    .coerceAtLeast(displayedSet.setOrder + 1),
                enabled = currentSet?.id == displayedSet.id && activeSide == displayedCard.side,
                valueEditingEnabled = currentSet?.id == displayedSet.id && activeSide == displayedCard.side,
            )
        }
        else -> null
    }
    val previousWorkoutSetsFlow = remember(viewModel, sessionId, cardScene?.exercise?.id) {
        cardScene?.exercise?.id?.let { viewModel.previousWorkoutSets(sessionId, it) }
            ?: kotlinx.coroutines.flow.flowOf(emptyList())
    }
    val previousWorkoutSets by previousWorkoutSetsFlow.collectAsStateWithLifecycle(emptyList())
    val previousWorkoutSet = cardScene?.set?.let { visibleSet ->
        previousWorkoutSets.firstOrNull { it.setOrder == visibleSet.setOrder }
            ?: previousWorkoutSets.lastOrNull()
    }
    val workoutHistoryFlow = remember(viewModel, sessionId, cardScene?.exercise?.id) {
        cardScene?.exercise?.id?.let { viewModel.workoutHistory(sessionId, it) }
            ?: kotlinx.coroutines.flow.flowOf(emptyList())
    }
    val workoutHistory by workoutHistoryFlow.collectAsStateWithLifecycle(emptyList())

    fun proceedFrom(set: WorkoutSetEntity) {
        val nextSet = exerciseSets.firstOrNull { it.setOrder > set.setOrder && !it.isCompleted }
        if (nextSet != null) {
            currentSetId = nextSet.id
            currentSideName = firstSide.name
        } else {
            val nextExerciseId = nextPendingExerciseId(exercise.id)
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
            pendingExerciseIds = orderedIds.filterNot { it in completedExerciseIds },
            completedExerciseIds = completedExerciseIds,
            currentExerciseId = exercise.id,
            exercises = allExercises,
            onReorder = onExerciseOrderChange,
            onAddExisting = { exerciseToAdd ->
                viewModel.addExistingExerciseToSession(sessionId, exerciseToAdd) {
                    onExerciseOrderChange((orderedIds + exerciseToAdd.id).distinct())
                }
            },
            onAddNew = { name, mode ->
                viewModel.addExerciseToSession(sessionId, name, mode) { addedExercise ->
                    onExerciseOrderChange((orderedIds + addedExercise.id).distinct())
                }
            },
            onRemove = { removedId ->
                val remainingOrder = orderedIds.filterNot { it == removedId }
                val nextExerciseId = remainingOrder.firstOrNull { id ->
                    allSessionSets.any { it.exerciseId == id && !it.isCompleted }
                }
                viewModel.removeExerciseFromSession(sessionId, removedId) {
                    onExerciseOrderChange(remainingOrder)
                    if (removedId == exercise.id) {
                        if (nextExerciseId != null) onNextExercise(nextExerciseId) else onWorkoutComplete()
                    }
                }
            },
            onClose = { showExerciseOrder = false },
        )
    } else {
        Column(Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 4.dp)) {
            val displayedExerciseId = browsingCard?.exercise?.id ?: exercise.id
            val exercisePosition = (orderedIds.indexOf(displayedExerciseId) + 1).coerceAtLeast(1)
            val exerciseCount = orderedIds.size.coerceAtLeast(1)
            Row(
                Modifier.fillMaxWidth().height(48.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    presetName ?: "トレーニング",
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                )
                Text(
                    "$exercisePosition / $exerciseCount 種目",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                IconButton(onClick = hapticClick(onFinishSession), modifier = Modifier.size(48.dp)) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "トレーニングを終了",
                        tint = MaterialTheme.colorScheme.primary,
                    )
                }
            }
            WorkoutProgressBar(progress = workoutProgress)
            Box(Modifier.weight(1f).fillMaxWidth()) {
                Box(Modifier.fillMaxSize().padding(horizontal = 4.dp), contentAlignment = Alignment.Center) {
                    AnimatedContent(
                        targetState = cardScene,
                        contentKey = { it?.key },
                        transitionSpec = {
                            slideInHorizontally(
                                initialOffsetX = { width -> if (cardMotionDirection < 0) -width / 12 else width / 12 },
                                animationSpec = spring(dampingRatio = 0.82f, stiffness = 420f),
                            ) + fadeIn(tween(150)) togetherWith
                                slideOutHorizontally(
                                    targetOffsetX = { width -> if (cardMotionDirection < 0) width / 14 else -width / 14 },
                                    animationSpec = tween(140),
                                ) + fadeOut(tween(120))
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
                                onSkipRest = { onSkipRest() },
                            )
                            scene.exercise != null && scene.set != null -> SetEditorCard(
                                exercise = scene.exercise,
                                set = scene.set,
                                previousSet = previousWorkoutSet,
                                onOpenHistory = { showWorkoutHistory = true },
                                side = scene.side,
                                exerciseColorIndex = scene.exerciseColorIndex,
                                totalSets = scene.totalSets,
                                enabled = scene.enabled,
                                valueEditingEnabled = scene.valueEditingEnabled,
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
                    onClick = hapticClick { showExerciseOrder = true },
                    modifier = Modifier.align(Alignment.BottomEnd).padding(end = 8.dp, bottom = 4.dp)
                        .size(48.dp),
                    shape = CircleShape,
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                ) {
                    Icon(Icons.Default.Edit, contentDescription = "種目の順番を編集")
                }
                val cardCursor = if (browsingCardIndex >= 0) browsingCardIndex else currentCardIndex
                TextButton(
                    onClick = hapticClick {
                        if (cardCursor > 0) {
                            cardMotionDirection = -1
                            val target = workoutCards[cardCursor - 1]
                            browsingCardKey = "${target.exercise.id}:${target.set.id}:${target.side?.name ?: "all"}"
                        }
                    },
                    enabled = cardCursor > 0,
                    modifier = Modifier.align(Alignment.BottomStart).padding(start = 4.dp, bottom = 4.dp),
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(if (browsingCard != null) "さらに前" else "前のカード")
                }
                if (browsingCard != null) {
                    TextButton(
                        onClick = hapticClick {
                            cardMotionDirection = 1
                            browsingCardKey = null
                        },
                        modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 4.dp),
                    ) { Text("現在へ") }
                }
            }
        }
    }
    if (showWorkoutHistory && cardScene?.exercise != null) {
        WorkoutHistorySheet(
            exercise = cardScene.exercise,
            mode = cardScene.exercise.mode,
            entries = workoutHistory,
            onDismiss = { showWorkoutHistory = false },
        )
    }
}

@Composable
private fun WorkoutProgressBar(progress: Float) {
    val animatedProgress by animateFloatAsState(
        targetValue = progress.coerceIn(0f, 1f),
        animationSpec = tween(durationMillis = 180),
        label = "workout progress",
    )
    Box(
        Modifier.fillMaxWidth().height(40.dp).padding(vertical = 4.dp),
        contentAlignment = Alignment.Center,
    ) {
        LinearProgressIndicator(
            progress = { animatedProgress },
            modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape),
            color = MaterialTheme.colorScheme.primary,
            trackColor = MaterialTheme.colorScheme.surfaceVariant,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WorkoutExerciseOrderScreen(
    exerciseOrderIds: List<Long>,
    pendingExerciseIds: List<Long>,
    completedExerciseIds: Set<Long>,
    currentExerciseId: Long,
    exercises: List<ExerciseEntity>,
    onReorder: (List<Long>) -> Unit,
    onAddExisting: (ExerciseEntity) -> Unit,
    onAddNew: (String, ExerciseMode) -> Unit,
    onRemove: (Long) -> Unit,
    onClose: () -> Unit,
) {
    val exerciseById = remember(exercises) { exercises.associateBy { it.id } }
    val latestOrder by rememberUpdatedState(exerciseOrderIds)
    var draftPending by remember(currentExerciseId) {
        mutableStateOf(pendingExerciseIds)
    }
    LaunchedEffect(pendingExerciseIds) {
        draftPending = draftPending.filter { it in pendingExerciseIds } +
            pendingExerciseIds.filterNot { it in draftPending }
    }
    val latestDraftPending by rememberUpdatedState(draftPending)
    val completedOrder = exerciseOrderIds.filter { it in completedExerciseIds }
    val displayOrder = draftPending + completedOrder
    val hasOrderChanges = draftPending != pendingExerciseIds
    val rowPitchPx = with(LocalDensity.current) { 64.dp.toPx() }
    var draggedExerciseId by remember { mutableStateOf<Long?>(null) }
    val dragFeedbackView = LocalView.current
    var showAddChooser by rememberSaveable { mutableStateOf(false) }
    var showAddExerciseDialog by rememberSaveable { mutableStateOf(false) }
    var exerciseToDelete by remember { mutableStateOf<ExerciseEntity?>(null) }

    Column(
        Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = hapticClick(onClose)) { Icon(Icons.Default.ArrowBack, contentDescription = "戻る", tint = MaterialTheme.colorScheme.primary) }
            Text("種目の順番", Modifier.weight(1f), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
            FilledTonalIconButton(onClick = hapticClick { showAddChooser = true }) {
                Icon(Icons.Default.Add, contentDescription = "種目を追加")
            }
        }
        LazyColumn(
            Modifier.weight(1f).fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(displayOrder, key = { "order-$it" }) { exerciseId ->
                val name = exerciseById[exerciseId]?.name ?: "種目"
                val isCurrent = exerciseId == currentExerciseId
                val isCompleted = exerciseId in completedExerciseIds
                val isDraggable = !isCompleted
                val isDragged = draggedExerciseId == exerciseId
                val cardScale by animateFloatAsState(
                    targetValue = if (isDragged) 1.035f else 1f,
                    animationSpec = spring(dampingRatio = 0.72f, stiffness = 520f),
                    label = "reorder card scale",
                )
                val cardRotation by animateFloatAsState(
                    targetValue = if (isDragged) -1.2f else 0f,
                    animationSpec = spring(dampingRatio = 0.72f, stiffness = 520f),
                    label = "reorder card tilt",
                )
                val cardElevation by animateDpAsState(
                    targetValue = if (isDragged) 14.dp else 1.dp,
                    animationSpec = spring(dampingRatio = 0.72f, stiffness = 520f),
                    label = "reorder card elevation",
                )
                Card(
                    Modifier.fillMaxWidth().height(56.dp)
                        .animateItem(
                            fadeInSpec = tween(140),
                            placementSpec = spring(dampingRatio = 0.78f, stiffness = 520f),
                            fadeOutSpec = tween(110),
                        )
                        .zIndex(if (isDragged) 1f else 0f)
                        .graphicsLayer {
                            scaleX = cardScale
                            scaleY = cardScale
                            rotationZ = cardRotation
                        }
                        .then(
                            if (isDraggable) {
                                Modifier.pointerInput(exerciseId) {
                                    var startIndex = -1
                                    var draggedDistance = 0f
                                    detectDragGestures(
                                        onDragStart = {
                                            startIndex = latestDraftPending.indexOf(exerciseId)
                                            draggedDistance = 0f
                                            draggedExerciseId = exerciseId
                                            dragFeedbackView.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                                        },
                                        onDrag = { change, amount ->
                                            change.consume()
                                            draggedDistance += amount.y
                                            val currentPending = latestDraftPending
                                            val currentIndex = currentPending.indexOf(exerciseId)
                                            if (startIndex >= 0 && currentIndex >= 0 && currentPending.isNotEmpty()) {
                                                val targetIndex = (startIndex + (draggedDistance / rowPitchPx).roundToInt())
                                                    .coerceIn(0, currentPending.lastIndex)
                                                if (targetIndex != currentIndex) {
                                                    draftPending = currentPending.toMutableList().apply {
                                                        add(targetIndex, removeAt(currentIndex))
                                                    }
                                                    dragFeedbackView.performHapticFeedback(HapticFeedbackConstants.TEXT_HANDLE_MOVE)
                                                }
                                            }
                                        },
                                        onDragEnd = { draggedExerciseId = null },
                                        onDragCancel = { draggedExerciseId = null },
                                    )
                                }
                            } else Modifier
                        )
                        .semantics {
                            if (isDraggable) contentDescription = "$name、カードを長押しして並べ替え"
                        },
                    elevation = CardDefaults.cardElevation(defaultElevation = cardElevation),
                    border = if (isDragged) BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary) else null,
                    colors = CardDefaults.cardColors(
                        containerColor = if (isCurrent) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
                    ),
                ) {
                    Row(Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically) {
                        if (isDraggable) {
                            Box(
                                Modifier.size(width = 46.dp, height = 56.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(Icons.Default.DragHandle, contentDescription = "並べ替え", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        } else {
                            Box(Modifier.size(width = 46.dp, height = 56.dp), contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = if (isCurrent) Icons.Default.PlayArrow else Icons.Default.Check,
                                    contentDescription = if (isCurrent) "進行中" else "完了",
                                    tint = if (isCurrent) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.tertiary,
                                )
                            }
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
                        IconButton(onClick = hapticClick {
                            exerciseToDelete = exerciseById[exerciseId]
                        }) {
                            Icon(Icons.Default.Delete, contentDescription = "$name を削除", tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
            if (draftPending.size <= 1) {
                item {
                    Text(
                        "並べ替えできる種目はありません",
                        Modifier.fillMaxWidth().padding(vertical = 16.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            }
        }
        Button(
            onClick = hapticClick {
                if (hasOrderChanges) {
                    val latestCompleted = latestOrder.filter { it in completedExerciseIds }
                    onReorder(draftPending + latestCompleted)
                }
                onClose()
            },
            modifier = Modifier.fillMaxWidth().height(50.dp),
        ) {
            Text(if (hasOrderChanges) "順番を適用" else "閉じる")
        }
    }
    if (showAddChooser) {
        ModalBottomSheet(onDismissRequest = { showAddChooser = false }) {
            Column(
                Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text("種目を追加", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                Button(
                    onClick = hapticClick {
                        showAddChooser = false
                        showAddExerciseDialog = true
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("新しい種目を登録")
                }
                exercises.filter { !it.archived && it.id !in exerciseOrderIds }.forEach { candidate ->
                    TextButton(
                        onClick = hapticClick {
                            onAddExisting(candidate)
                            showAddChooser = false
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(candidate.name, Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Start)
                        Icon(Icons.Default.Add, contentDescription = null)
                    }
                }
            }
        }
    }
    if (showAddExerciseDialog) {
        AddExerciseDialog(
            onDismiss = { showAddExerciseDialog = false },
            onSave = { name, mode ->
                onAddNew(name, mode)
                showAddExerciseDialog = false
            },
        )
    }
    exerciseToDelete?.let { target ->
        AlertDialog(
            onDismissRequest = { exerciseToDelete = null },
            title = { Text("種目を削除") },
            text = { Text("${target.name}を今回のトレーニングから削除しますか？ 記録済みのセットもこのトレーニングから外れます。") },
            confirmButton = {
                TextButton(onClick = hapticClick {
                    onRemove(target.id)
                    exerciseToDelete = null
                }) { Text("削除", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = hapticClick { exerciseToDelete = null }) { Text("キャンセル") } },
        )
    }
}

@Composable
private fun RestTimerPreviewCard(restSeconds: Long, swipeOffset: Offset) {
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val horizontal = abs(swipeOffset.x) >= abs(swipeOffset.y)
        val skipped = if (horizontal) swipeOffset.x < 0f else swipeOffset.y > 0f
        Card(
            Modifier.align(Alignment.TopCenter).fillMaxWidth().padding(horizontal = 4.dp, vertical = 6.dp)
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
        colors = CardDefaults.cardColors(containerColor = Color(0xFFEDF5F2)),
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
            Modifier.align(Alignment.TopCenter).fillMaxWidth().padding(horizontal = 4.dp, vertical = 6.dp)
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
                .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (exercise.name.pictogramResource() != null) {
                    ExercisePictogramThumbnail(
                        exerciseName = exercise.name,
                        modifier = Modifier.size(width = 68.dp, height = 54.dp),
                    )
                }
                Text(
                    exercise.name,
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.ExtraBold, color = Color.White),
                    maxLines = 2,
                    modifier = Modifier.weight(1f),
                )
                SetProgressBadge(
                    setNumber = set.setOrder + 1,
                    totalSets = totalSets,
                    color = palette.headerStart,
                    trackColor = palette.headerStart.copy(alpha = 0.18f),
                )
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

private fun exerciseCardPalette(exerciseColorIndex: Int = 0): ExerciseCardPalette {
    val hue = (164f + exerciseColorIndex.coerceAtLeast(0) * 18f) % 360f
    return ExerciseCardPalette(
        headerStart = Color.hsv(hue, saturation = 0.72f, value = 0.56f),
        headerEnd = Color.hsv((hue + 14f) % 360f, saturation = 0.78f, value = 0.44f),
        surfaceStart = Color.hsv(hue, saturation = 0.08f, value = 0.99f),
        surfaceEnd = Color.hsv(hue, saturation = 0.14f, value = 0.95f),
    )
}

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
    previousSet: WorkoutSetEntity?,
    onOpenHistory: () -> Unit,
    side: ExerciseSide?,
    exerciseColorIndex: Int,
    totalSets: Int,
    enabled: Boolean,
    valueEditingEnabled: Boolean,
    weightStepKg: Double,
    onUpdate: ((WorkoutSetEntity) -> WorkoutSetEntity) -> Unit,
    onAdvance: () -> Unit,
    onSkip: () -> Unit,
    onSwipeOffsetChanged: (Offset, Boolean?) -> Unit,
) {
    val palette = exerciseCardPalette(exerciseColorIndex)
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
            val cardTopPx = with(density) { 6.dp.toPx() }
            val swipeThreshold = minOf(cardWidthPx, cardHeightPx) * 0.08f
            val minFlingVelocity = with(density) { 700.dp.toPx() }

            fun updateDrag(offset: Offset) {
                swipeOffsetX = offset.x
                swipeOffsetY = offset.y
                if (offset.getDistance() >= swipeThreshold) {
                    val horizontal = swipeHorizontalLock ?: (abs(offset.x) >= abs(offset.y))
                    swipeHorizontalLock = horizontal
                    swipeSkips = if (horizontal) offset.x < 0f else offset.y > 0f
                } else {
                    swipeSkips = null
                    swipeHorizontalLock = null
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
        Modifier.align(Alignment.TopCenter).padding(top = 6.dp).fillMaxWidth().fillMaxHeight(WORKOUT_CARD_HEIGHT_FRACTION)
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
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (exercise.name.pictogramResource() != null) {
                    ExercisePictogramThumbnail(
                        exerciseName = exercise.name,
                        modifier = Modifier.size(width = 68.dp, height = 54.dp),
                    )
                }
                Text(
                    exercise.name,
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.ExtraBold, color = Color.White),
                    maxLines = 2,
                    modifier = Modifier.weight(1f),
                )
                SetProgressBadge(
                    setNumber = set.setOrder + 1,
                    totalSets = totalSets,
                    color = Color.White,
                    trackColor = Color.White.copy(alpha = 0.25f),
                )
            }
            if (exercise.mode == ExerciseMode.NORMAL) {
                val previousWeight = previousSet?.normalWeightKg
                val previousReps = previousSet?.normalReps
                Column(Modifier.weight(1f).fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp)) {
                    Box(Modifier.weight(1f).fillMaxWidth()) {
                        Surface(
                            Modifier.align(Alignment.Center).fillMaxWidth(0.96f).fillMaxHeight(0.88f),
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
                        Column(Modifier.align(Alignment.Center).fillMaxWidth().fillMaxHeight(0.88f)) {
                        Row(Modifier.weight(1f).fillMaxWidth()) {
                            InvisibleTapZone(
                                description = "重量を${formatWeight(weightStepKg)}キログラム増やす",
                                enabled = valueEditingEnabled,
                                onClick = {
                                    onUpdate { latest ->
                                        latest.copy(normalWeightKg = adjustWeight(latest.normalWeightKg, weightStepKg, increase = true))
                                    }
                                },
                                modifier = Modifier.weight(1f).fillMaxHeight(),
                            )
                            InvisibleTapZone(
                                description = "回数を1回増やす",
                                enabled = valueEditingEnabled,
                                onClick = { onUpdate { latest -> latest.copy(normalReps = (latest.normalReps ?: 0) + 1) } },
                                modifier = Modifier.weight(1f).fillMaxHeight(),
                            )
                        }
                        Row(Modifier.weight(1f).fillMaxWidth()) {
                            InvisibleTapZone(
                                description = "重量を${formatWeight(weightStepKg)}キログラム減らす",
                                enabled = valueEditingEnabled && (set.normalWeightKg ?: 0.0) > 0.0,
                                onClick = {
                                    onUpdate { latest ->
                                        latest.copy(normalWeightKg = adjustWeight(latest.normalWeightKg, weightStepKg, increase = false))
                                    }
                                },
                                modifier = Modifier.weight(1f).fillMaxHeight(),
                            )
                            InvisibleTapZone(
                                description = "回数を1回減らす",
                                enabled = valueEditingEnabled && (set.normalReps ?: 0) > 0,
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
                    Box(Modifier.fillMaxWidth().height(42.dp), contentAlignment = Alignment.Center) {
                        PreviousRecordSummary(previousWeight, previousReps, onOpenHistory)
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
                        valueEditingEnabled,
                        weightStepKg,
                        Modifier.weight(1f).fillMaxWidth(),
                        previousWeightKg = if (isRight) previousSet?.rightWeightKg else previousSet?.leftWeightKg,
                        previousReps = if (isRight) previousSet?.rightReps else previousSet?.leftReps,
                        onOpenHistory = onOpenHistory,
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
                    BilateralTapControls(
                        "左", set.leftWeightKg, set.leftReps, valueEditingEnabled, weightStepKg, Modifier.weight(1f),
                        previousWeightKg = previousSet?.leftWeightKg,
                        previousReps = previousSet?.leftReps,
                        onOpenHistory = onOpenHistory,
                    ) { weight, reps ->
                        onUpdate { latest -> latest.copy(leftWeightKg = weight, leftReps = reps) }
                    }
                    BilateralTapControls(
                        "右", set.rightWeightKg, set.rightReps, valueEditingEnabled, weightStepKg, Modifier.weight(1f),
                        previousWeightKg = previousSet?.rightWeightKg,
                        previousReps = previousSet?.rightReps,
                    ) { weight, reps ->
                        onUpdate { latest -> latest.copy(rightWeightKg = weight, rightReps = reps) }
                    }
                }
            }
            Column(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                TextButton(
                    onClick = hapticClick(onSkip),
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
                  if (advancing) {
                      Surface(
                          modifier = Modifier.size(30.dp),
                          shape = CircleShape,
                          color = Color.Transparent,
                          border = BorderStroke(3.dp, swipeColor),
                      ) {}
                  } else {
                      Icon(
                          imageVector = Icons.Default.Close,
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
private fun PreviousRecordSummary(
    weightKg: Double?,
    reps: Int?,
    onOpenHistory: (() -> Unit)? = null,
) {
    if (weightKg == null && reps == null && onOpenHistory == null) return
    Surface(
        modifier = Modifier.zIndex(1f),
        shape = CircleShape,
        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.62f),
    ) {
        Row(
            Modifier.padding(start = 14.dp, end = 6.dp, top = 5.dp, bottom = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text("前回", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onPrimaryContainer)
            Text(
                if (weightKg == null && reps == null) "記録なし"
                else "${weightKg?.let(::formatWeight) ?: "—"}kg × ${reps?.let { "${it}回" } ?: "—"}",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
            if (onOpenHistory != null) {
                TextButton(onClick = hapticClick(onOpenHistory), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)) {
                    Text("履歴", style = MaterialTheme.typography.labelMedium)
                }
            }
        }
    }
}

@Composable
private fun BilateralTapControls(
    side: String,
    weightKg: Double?,
    reps: Int?,
    enabled: Boolean,
    weightStepKg: Double,
    modifier: Modifier = Modifier,
    previousWeightKg: Double? = null,
    previousReps: Int? = null,
    onOpenHistory: (() -> Unit)? = null,
    onChange: (Double, Int) -> Unit,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(side, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
        Column(Modifier.weight(1f).fillMaxWidth()) {
            Box(Modifier.weight(1f).fillMaxWidth()) {
                Surface(
                    Modifier.align(Alignment.Center).fillMaxWidth(0.96f).fillMaxHeight(0.88f),
                    shape = MaterialTheme.shapes.extraLarge,
                    color = Color.Transparent,
                    tonalElevation = 0.dp,
                ) {
                    Row(Modifier.fillMaxSize().padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
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
                Column(Modifier.align(Alignment.Center).fillMaxWidth().fillMaxHeight(0.88f)) {
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
            Box(Modifier.fillMaxWidth().height(42.dp), contentAlignment = Alignment.Center) {
                PreviousRecordSummary(previousWeightKg, previousReps, onOpenHistory)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WorkoutHistorySheet(
    exercise: ExerciseEntity,
    mode: ExerciseMode,
    entries: List<WorkoutHistoryEntry>,
    onDismiss: () -> Unit,
) {
    val sessions = remember(entries) {
        entries.groupBy { it.sessionId }.values.drop(1).map { it.first().startedAt to it }
    }
    val dateFormatter = remember {
        DateTimeFormatter.ofPattern("yyyy年M月d日 (E)", Locale.JAPAN)
    }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 24.dp)) {
            Text(exercise.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
            Text("前々回以降", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (sessions.isEmpty()) {
                Text(
                    "前々回以降の記録はありません",
                    Modifier.fillMaxWidth().padding(vertical = 36.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                LazyColumn(
                    Modifier.fillMaxWidth().heightIn(max = 520.dp).padding(top = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(sessions, key = { it.second.first().sessionId }) { (startedAt, sets) ->
                        Card(Modifier.fillMaxWidth()) {
                            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    dateFormatter.format(startedAt.atZone(ZoneId.systemDefault())),
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                )
                                sets.forEach { set ->
                                    if (mode == ExerciseMode.NORMAL) {
                                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                            Text("${set.setOrder + 1}セット", Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text(
                                                "${set.normalWeightKg?.let(::formatWeight) ?: "—"}kg × ${set.normalReps?.let { "${it}回" } ?: "—"}",
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.SemiBold,
                                            )
                                        }
                                    } else {
                                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                            Text("${set.setOrder + 1}セット", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text(
                                                "左 ${set.leftWeightKg?.let(::formatWeight) ?: "—"}kg × ${set.leftReps?.let { "${it}回" } ?: "—"}　 右 ${set.rightWeightKg?.let(::formatWeight) ?: "—"}kg × ${set.rightReps?.let { "${it}回" } ?: "—"}",
                                                style = MaterialTheme.typography.bodyMedium,
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
        val restRingDiameter = minOf(280.dp, maxWidth * 0.82f)
        val cardWidthPx = with(LocalDensity.current) { maxWidth.toPx() }
        val effectiveRestStart = remember(restEndsAtMillis, restStartedAtMillis) {
            restStartedAtMillis.takeIf { it in 1 until restEndsAtMillis }
                ?: (restEndsAtMillis - remainingSeconds * 1_000L).coerceAtLeast(0L)
        }
        val totalDurationMillis = (restEndsAtMillis - effectiveRestStart).coerceAtLeast(1L)
        val timerProgress by produceState(
            initialValue = (
                1f - (restEndsAtMillis - System.currentTimeMillis()).coerceAtLeast(0L).toFloat() /
                    totalDurationMillis
                ).coerceIn(0f, 1f),
            key1 = restEndsAtMillis,
            key2 = effectiveRestStart,
        ) {
            while (true) {
                val remainingMillis = (restEndsAtMillis - System.currentTimeMillis()).coerceAtLeast(0L)
                value = (1f - remainingMillis.toFloat() / totalDurationMillis).coerceIn(0f, 1f)
                if (remainingMillis == 0L) break
                androidx.compose.runtime.withFrameNanos { }
            }
        }
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
            Modifier.align(Alignment.TopCenter).fillMaxWidth().fillMaxHeight(0.92f)
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
              Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp),
              horizontalAlignment = Alignment.CenterHorizontally,
              verticalArrangement = Arrangement.spacedBy(10.dp),
          ) {
              Text("休憩", style = MaterialTheme.typography.titleMedium, color = primaryColor, fontWeight = FontWeight.Bold)
              Box(
                  Modifier.weight(1f).fillMaxWidth(),
                  contentAlignment = Alignment.Center,
              ) {
                  CircularProgressRing(
                      progress = 1f - timerProgress,
                      modifier = Modifier.size(restRingDiameter),
                      color = primaryColor,
                      trackColor = Color.White.copy(alpha = 0.9f),
                      strokeWidth = 7.dp,
                  ) {
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
                  }
              }
              Card(
                  Modifier.fillMaxWidth(),
                  colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.8f)),
              ) {
                  Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 9.dp)) {
                      Text("NEXT SET", style = MaterialTheme.typography.labelSmall, color = primaryColor, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.5.sp)
                      Text(
                          nextExercise.name,
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
          }
        }
    }
}

@Composable
private fun CircularProgressRing(
    progress: Float,
    modifier: Modifier = Modifier,
    color: Color,
    trackColor: Color,
    strokeWidth: androidx.compose.ui.unit.Dp = 10.dp,
    content: @Composable () -> Unit,
) {
    Box(modifier, contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            val stroke = strokeWidth.toPx()
            val arcSize = androidx.compose.ui.geometry.Size(
                width = size.width - stroke,
                height = size.height - stroke,
            )
            val arcTopLeft = Offset(stroke / 2f, stroke / 2f)
            drawArc(
                color = trackColor,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = arcTopLeft,
                size = arcSize,
                style = Stroke(width = stroke),
            )
            val clampedProgress = progress.coerceIn(0f, 1f)
            if (clampedProgress > 0f) {
                drawArc(
                    color = color,
                    startAngle = -90f,
                    sweepAngle = 360f * clampedProgress,
                    useCenter = false,
                    topLeft = arcTopLeft,
                    size = arcSize,
                    style = Stroke(width = stroke, cap = StrokeCap.Round),
                )
            }
        }
        content()
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

@Composable
private fun SettingsNavigationCard(
    title: String,
    description: String,
    onClick: () -> Unit,
) {
    Card(Modifier.fillMaxWidth().clickable(onClick = hapticClick(onClick))) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ExerciseManagementItem(
    exerciseId: Long,
    name: String,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    val revealWidth = 92.dp
    val revealWidthPx = with(LocalDensity.current) { revealWidth.toPx() }
    var revealOffset by remember(exerciseId) { androidx.compose.runtime.mutableFloatStateOf(0f) }
    var settleJob by remember(exerciseId) { mutableStateOf<Job?>(null) }
    val scope = rememberCoroutineScope()

    fun settle(target: Float) {
        settleJob?.cancel()
        settleJob = scope.launch {
            androidx.compose.animation.core.Animatable(revealOffset).animateTo(
                target,
                animationSpec = spring(stiffness = 520f, dampingRatio = 0.82f),
            ) { revealOffset = value }
        }
    }

    Box(
        Modifier.fillMaxWidth().height(62.dp)
            .clip(MaterialTheme.shapes.large)
            .background(MaterialTheme.colorScheme.errorContainer),
    ) {
        Box(
            Modifier.align(Alignment.CenterStart).width(revealWidth).fillMaxHeight()
                .background(MaterialTheme.colorScheme.error)
                .clickable(onClick = hapticClick(onDelete)),
            contentAlignment = Alignment.Center,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.onError)
                Text("削除", color = MaterialTheme.colorScheme.onError, style = MaterialTheme.typography.labelLarge)
            }
        }
        Card(
            Modifier.fillMaxSize()
                .graphicsLayer { translationX = revealOffset }
                .pointerInput(exerciseId, revealWidthPx) {
                    detectHorizontalDragGestures(
                        onDragStart = { settleJob?.cancel() },
                        onHorizontalDrag = { change, dragAmount ->
                            change.consume()
                            revealOffset = (revealOffset + dragAmount).coerceIn(0f, revealWidthPx)
                        },
                        onDragEnd = { settle(if (revealOffset >= revealWidthPx * 0.42f) revealWidthPx else 0f) },
                        onDragCancel = { settle(if (revealOffset >= revealWidthPx * 0.42f) revealWidthPx else 0f) },
                    )
                }
                .clickable(onClick = hapticClick {
                    if (revealOffset > 0f) settle(0f) else onEdit()
                }),
        ) {
            Box(Modifier.fillMaxSize().padding(horizontal = 18.dp), contentAlignment = Alignment.CenterStart) {
                Text(name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Medium)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SettingsScreen(
    viewModel: FitLogViewModel,
    exercises: List<ExerciseEntity>,
    presets: List<WorkoutPreset>,
    page: SettingsPage,
    onPageChange: (SettingsPage) -> Unit,
    onBack: () -> Unit,
    onAddExercise: () -> Unit,
    weekStartsMonday: Boolean,
    onWeekStartsMondayChange: (Boolean) -> Unit,
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
    var weightStepDraft by rememberSaveable { mutableStateOf(weightStepKg.toInput()) }
    var restDurationDraft by rememberSaveable { mutableStateOf(restDurationSeconds.toMinutesInput()) }
    var editingWeightStepExerciseId by rememberSaveable { mutableStateOf<Long?>(null) }
    var exerciseNameDraft by rememberSaveable { mutableStateOf("") }
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
    val pageTitle = when (page) {
        SettingsPage.MENU -> "設定"
        SettingsPage.BASIC -> "基本設定"
        SettingsPage.PRESETS -> "プリセット"
        SettingsPage.EXERCISES -> "種目管理"
    }
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                IconButton(
                    onClick = hapticClick { if (page == SettingsPage.MENU) onBack() else onPageChange(SettingsPage.MENU) },
                ) { Icon(Icons.Default.ArrowBack, contentDescription = "戻る", tint = MaterialTheme.colorScheme.primary) }
                Column {
                    Text("PREFERENCES", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.7.sp)
                    Text(pageTitle, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                }
            }
        }
        when (page) {
            SettingsPage.MENU -> {
                item {
                    SettingsNavigationCard("基本設定", "曜日・重量・休憩") {
                        onPageChange(SettingsPage.BASIC)
                    }
                }
                item {
                    SettingsNavigationCard("種目管理", "名前・種目別設定・削除") {
                        onPageChange(SettingsPage.EXERCISES)
                    }
                }
                item {
                    Text(
                        "記録は端末内に保存します。ルームへ投稿した記録だけがメンバーに共有されます。",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            SettingsPage.BASIC -> {
                item { Text("カレンダー", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold) }
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("週の始まり", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                            SegmentedButton(
                                selected = !weekStartsMonday,
                                onClick = hapticClick { onWeekStartsMondayChange(false) },
                                shape = SegmentedButtonDefaults.itemShape(0, 2),
                            ) { Text("日曜から") }
                            SegmentedButton(
                                selected = weekStartsMonday,
                                onClick = hapticClick { onWeekStartsMondayChange(true) },
                                shape = SegmentedButtonDefaults.itemShape(1, 2),
                            ) { Text("月曜から") }
                        }
                        Text("カレンダーの曜日表示に反映します。", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                                if (normalized.length <= 7 && normalized.count { it == '.' } <= 1 &&
                                    normalized.all { it.isDigit() || it == '.' } && normalized.substringAfter('.', "").length <= 2
                                ) weightStepDraft = normalized
                            },
                            label = { Text("1タップあたり（kg）") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.weight(1f),
                        )
                        Button(
                            onClick = hapticClick { parsedWeightStep?.let(onWeightStepKgChange) },
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
                                    normalized.all { it.isDigit() || it == '.' } && normalized.substringAfter('.', "").length <= 2
                                ) restDurationDraft = normalized
                            },
                            label = { Text("分（0で休憩なし）") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.weight(1f),
                        )
                        Button(
                            onClick = hapticClick { parsedRestDuration?.let(onRestDurationChange) },
                            enabled = parsedRestDuration != null && parsedRestDuration != restDurationSeconds,
                        ) { Text("保存") }
                    }
                    Text("種目ごとの設定がある場合は、その時間を使います。左右の切り替えは種目ごとに設定できます。", style = MaterialTheme.typography.bodySmall)
                }
            }
            SettingsPage.PRESETS -> {
                item { Text("プリセット", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold) }
                items(presets, key = { "preset-${it.id}" }) { preset ->
                    Card(Modifier.fillMaxWidth().pressMotionClickable { editingPresetId = preset.id }) {
                        Row(Modifier.padding(start = 16.dp, end = 4.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(preset.name, style = MaterialTheme.typography.titleMedium)
                                Text("${preset.exercises.size}種目", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            IconButton(onClick = hapticClick { editingPresetId = preset.id }) { Icon(Icons.Default.Edit, "編集") }
                            IconButton(onClick = hapticClick { viewModel.setPresets(presets.filterNot { it.id == preset.id }) }) { Icon(Icons.Default.Delete, "削除") }
                        }
                    }
                }
                item {
                    OutlinedButton(onClick = hapticClick { newPresetName = ""; showAddPreset = true }, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                        Icon(Icons.Default.Add, null); Text("プリセットを追加")
                    }
                }
            }
            SettingsPage.EXERCISES -> {
                item { Button(onClick = hapticClick(onAddExercise), modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.Add, null); Text("種目を追加") } }
                items(exercises, key = { "exercise-${it.id}" }) { exercise ->
                    ExerciseManagementItem(
                        exerciseId = exercise.id,
                        name = exercise.name,
                        onEdit = {
                            exerciseNameDraft = exercise.name
                            exerciseWeightStepDraft = (exerciseWeightSteps[exercise.id] ?: weightStepKg).toInput()
                            exerciseRestDurationDraft = exerciseRestDurations[exercise.id]?.toMinutesInput().orEmpty()
                            exerciseSideSwitchRestDraft = exercise.id in sideSwitchRestExerciseIds
                            exerciseStartsLeftDraft = exercise.id in leftFirstExerciseIds
                            editingWeightStepExerciseId = exercise.id
                        },
                        onDelete = { viewModel.archiveExercise(exercise) },
                    )
                }
                if (exercises.isEmpty()) {
                    item { Text("種目はありません", Modifier.fillMaxWidth().padding(vertical = 12.dp), color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
        }
    }
    editingWeightStepExercise?.let { exercise ->
        ModalBottomSheet(onDismissRequest = { editingWeightStepExerciseId = null }) {
            Column(
                Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 22.dp)
                    .heightIn(max = 680.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text("種目を編集", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                OutlinedTextField(
                    value = exerciseNameDraft,
                    onValueChange = { exerciseNameDraft = it.take(32) },
                    label = { Text("種目名") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text("種目別の設定", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                )
                if (exercise.mode == ExerciseMode.BILATERAL) {
                    Text("最初に行う側", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                        SegmentedButton(!exerciseStartsLeftDraft, hapticClick { exerciseStartsLeftDraft = false }, SegmentedButtonDefaults.itemShape(0, 2)) { Text("右から") }
                        SegmentedButton(exerciseStartsLeftDraft, hapticClick { exerciseStartsLeftDraft = true }, SegmentedButtonDefaults.itemShape(1, 2)) { Text("左から") }
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("左右切り替え時にも休憩", Modifier.weight(1f))
                        Switch(checked = exerciseSideSwitchRestDraft, onCheckedChange = hapticChange { exerciseSideSwitchRestDraft = it })
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = hapticClick {
                        onResetExerciseWeightStep(exercise.id)
                        onExerciseRestDurationChange(exercise.id, null)
                        onExerciseSideSwitchRestChange(exercise.id, false)
                        onExerciseStartSideChange(exercise.id, false)
                        exerciseWeightStepDraft = weightStepKg.toInput()
                        exerciseRestDurationDraft = ""
                        exerciseSideSwitchRestDraft = false
                        exerciseStartsLeftDraft = false
                    }) { Text("共通設定に戻す") }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        TextButton(onClick = hapticClick { editingWeightStepExerciseId = null }) { Text("キャンセル") }
                        Button(
                            enabled = exerciseNameDraft.isNotBlank() && parsedExerciseWeightStep != null &&
                                (exerciseRestDurationDraft.isBlank() || parsedExerciseRestDuration != null),
                            onClick = hapticClick {
                                val cleanedName = exerciseNameDraft.trim()
                                if (cleanedName != exercise.name) viewModel.renameExercise(exercise, cleanedName)
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
                OutlinedTextField(
                    value = newPresetName,
                    onValueChange = { newPresetName = it.take(24) },
                    label = { Text("名前") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = hapticClick { showAddPreset = false }) { Text("キャンセル") }
                    Button(enabled = newPresetName.trim().isNotEmpty(), onClick = hapticClick {
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
            exerciseRestDurations = exerciseRestDurations,
            onExerciseRestDurationChange = onExerciseRestDurationChange,
            onChange = { updated -> viewModel.setPresets(presets.map { if (it.id == preset.id) updated else it }) },
            onDismiss = { editingPresetId = null },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun PresetEditorDialog(
    preset: WorkoutPreset,
    exercises: List<ExerciseEntity>,
    exerciseRestDurations: Map<Long, Long>,
    onExerciseRestDurationChange: (Long, Long?) -> Unit,
    onChange: (WorkoutPreset) -> Unit,
    onDismiss: () -> Unit,
) {
    val latestPreset by androidx.compose.runtime.rememberUpdatedState(preset)
    var expanded by rememberSaveable(preset.id) { mutableStateOf(false) }
    var expandedExerciseId by rememberSaveable(preset.id) { mutableStateOf<Long?>(null) }
    var exerciseRestDrafts by remember(preset.id) { mutableStateOf<Map<Long, String>>(emptyMap()) }
    var draggedExerciseId by remember(preset.id) { mutableStateOf<Long?>(null) }
    var measuredCardHeightsPx by remember(preset.id) { mutableStateOf<Map<Long, Int>>(emptyMap()) }
    val dragFeedbackView = LocalView.current
    val exerciseById = remember(exercises) { exercises.associateBy { it.id } }
    val presetExerciseRows = preset.exercises.mapNotNull { config ->
        exerciseById[config.exerciseId]?.let { exercise -> config to exercise }
    }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 16.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("プリセットを編集", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                }
                TextButton(onClick = hapticClick(onDismiss)) { Text("完了") }
            }
            LazyColumn(
                Modifier.fillMaxWidth().heightIn(max = 620.dp),
                contentPadding = PaddingValues(bottom = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item(key = "preset-name") {
                    OutlinedTextField(
                        value = preset.name,
                        onValueChange = { onChange(preset.copy(name = it.take(24))) },
                        label = { Text("プリセット名") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                items(presetExerciseRows, key = { "preset-exercise-${it.first.exerciseId}" }) { (config, exercise) ->
                    fun updateConfig(transform: (PresetExerciseConfig) -> PresetExerciseConfig) {
                        onChange(
                            preset.copy(
                                exercises = preset.exercises.map {
                                    if (it.exerciseId == config.exerciseId) transform(it) else it
                                },
                            ),
                        )
                    }
                    val isExpanded = expandedExerciseId == config.exerciseId
                    val restDraft = exerciseRestDrafts[exercise.id]
                        ?: exerciseRestDurations[exercise.id]?.toMinutesInput().orEmpty()
                    val parsedRestDraft = restDraft.toRestSecondsOrNull()
                    val savedRestDraft = exerciseRestDurations[exercise.id]?.toMinutesInput().orEmpty()
                    val isDragged = draggedExerciseId == config.exerciseId
                    val cardScale by animateFloatAsState(
                        targetValue = if (isDragged) 1.025f else 1f,
                        animationSpec = spring(dampingRatio = 0.72f, stiffness = 520f),
                        label = "preset exercise scale",
                    )
                    val cardRotation by animateFloatAsState(
                        targetValue = if (isDragged) -0.8f else 0f,
                        animationSpec = spring(dampingRatio = 0.72f, stiffness = 520f),
                        label = "preset exercise tilt",
                    )
                    val cardElevation by animateDpAsState(
                        targetValue = if (isDragged) 14.dp else 1.dp,
                        animationSpec = spring(dampingRatio = 0.72f, stiffness = 520f),
                        label = "preset exercise elevation",
                    )
                    Card(
                        Modifier.fillMaxWidth()
                            .onSizeChanged { size ->
                                if (measuredCardHeightsPx[config.exerciseId] != size.height) {
                                    measuredCardHeightsPx = measuredCardHeightsPx + (config.exerciseId to size.height)
                                }
                            }
                            .animateItem(
                                fadeInSpec = tween(140),
                                placementSpec = spring(dampingRatio = 0.78f, stiffness = 520f),
                                fadeOutSpec = tween(110),
                            )
                            .zIndex(if (isDragged) 1f else 0f)
                            .graphicsLayer {
                                scaleX = cardScale
                                scaleY = cardScale
                                rotationZ = cardRotation
                            }
                            .semantics { contentDescription = "${exercise.name}の設定" },
                        elevation = CardDefaults.cardElevation(defaultElevation = cardElevation),
                        border = if (isDragged) BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary) else null,
                    ) {
                        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(
                                Modifier.fillMaxWidth()
                                    .clickable {
                                        expandedExerciseId = if (isExpanded) null else config.exerciseId
                                        if (!isExpanded && exercise.id !in exerciseRestDrafts) {
                                            exerciseRestDrafts = exerciseRestDrafts + (exercise.id to savedRestDraft)
                                        }
                                    }
                                    .pointerInput(config.exerciseId) {
                                    var startCenterY = 0f
                                    var pointerOffsetFromCenter = 0f
                                    var draggedDistance = 0f
                                    fun cardHeightPx(item: PresetExerciseConfig): Float {
                                        measuredCardHeightsPx[item.exerciseId]?.let { return it.toFloat() }
                                        val isBilateral = exerciseById[item.exerciseId]?.mode == ExerciseMode.BILATERAL
                                        return with(density) { (if (isBilateral) 196.dp else 132.dp).toPx() }
                                    }
                                    fun itemPitchPx(item: PresetExerciseConfig): Float =
                                        cardHeightPx(item) + with(density) { 10.dp.toPx() }
                                    detectDragGestures(
                                        onDragStart = { touchPosition ->
                                            val startIndex = latestPreset.exercises.indexOfFirst { it.exerciseId == config.exerciseId }
                                            startCenterY = latestPreset.exercises.take(startIndex).fold(0f) { total, item -> total + itemPitchPx(item) } +
                                                cardHeightPx(config) / 2f
                                            pointerOffsetFromCenter = touchPosition.y - cardHeightPx(config) / 2f
                                            draggedDistance = 0f
                                            draggedExerciseId = config.exerciseId
                                            dragFeedbackView.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                                        },
                                        onDrag = { change, amount ->
                                            change.consume()
                                            draggedDistance += amount.y
                                            val currentPreset = latestPreset.exercises
                                            val targetCenterY = startCenterY + draggedDistance + pointerOffsetFromCenter
                                            var cursor = 0f
                                            var targetIndex = -1
                                            var closestDistance = Float.POSITIVE_INFINITY
                                            currentPreset.forEachIndexed { index, item ->
                                                val center = cursor + cardHeightPx(item) / 2f
                                                val distance = abs(center - targetCenterY)
                                                if (distance < closestDistance) {
                                                    closestDistance = distance
                                                    targetIndex = index
                                                }
                                                cursor += itemPitchPx(item)
                                            }
                                            val currentIndex = currentPreset.indexOfFirst { it.exerciseId == config.exerciseId }
                                            if (targetIndex >= 0 && currentIndex >= 0 && targetIndex != currentIndex) {
                                                val reordered = currentPreset.toMutableList().apply {
                                                    add(targetIndex, removeAt(currentIndex))
                                                }
                                                onChange(latestPreset.copy(exercises = reordered))
                                                dragFeedbackView.performHapticFeedback(HapticFeedbackConstants.TEXT_HANDLE_MOVE)
                                            }
                                        },
                                        onDragEnd = { draggedExerciseId = null },
                                        onDragCancel = { draggedExerciseId = null },
                                    )
                                },
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(exercise.name, Modifier.weight(1f), style = MaterialTheme.typography.titleSmall)
                                Icon(Icons.Default.DragHandle, contentDescription = "並べ替え", tint = MaterialTheme.colorScheme.primary)
                                IconButton(onClick = hapticClick {
                                    onChange(preset.copy(exercises = preset.exercises.filterNot { it.exerciseId == config.exerciseId }))
                                }) { Icon(Icons.Default.Delete, "種目を削除") }
                            }
                            if (isExpanded) {
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                    OutlinedTextField(
                                        value = restDraft,
                                        onValueChange = { input ->
                                            val normalized = input.replace(',', '.')
                                            if (normalized.length <= 6 && normalized.count { it == '.' } <= 1 &&
                                                normalized.all { it.isDigit() || it == '.' } &&
                                                normalized.substringAfter('.', "").length <= 2
                                            ) exerciseRestDrafts = exerciseRestDrafts + (exercise.id to normalized)
                                        },
                                        label = { Text("休憩（分）") },
                                        singleLine = true,
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                        modifier = Modifier.weight(1f),
                                    )
                                    Button(
                                        enabled = (restDraft.isBlank() || parsedRestDraft != null) && restDraft != savedRestDraft,
                                        onClick = hapticClick {
                                            onExerciseRestDurationChange(
                                                exercise.id,
                                                if (restDraft.isBlank()) null else parsedRestDraft,
                                            )
                                        },
                                    ) { Text("保存") }
                                }
                            }
                            if (isExpanded && exercise.mode == ExerciseMode.BILATERAL) {
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
                            } else if (isExpanded) {
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
                item(key = "preset-add-exercise") {
                    Box {
                        OutlinedButton(onClick = hapticClick { expanded = true }, modifier = Modifier.fillMaxWidth()) {
                            Icon(Icons.Default.Add, null); Text("種目を追加")
                        }
                        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                            exercises.filter { candidate -> preset.exercises.none { it.exerciseId == candidate.id } }.forEach { exercise ->
                                DropdownMenuItem(
                                    text = { Text(exercise.name) },
                                onClick = hapticClick {
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
                SegmentedButton(mode == ExerciseMode.NORMAL, hapticClick { mode = ExerciseMode.NORMAL }, SegmentedButtonDefaults.itemShape(0, 2)) { Text("通常") }
                SegmentedButton(mode == ExerciseMode.BILATERAL, hapticClick { mode = ExerciseMode.BILATERAL }, SegmentedButtonDefaults.itemShape(1, 2)) { Text("左右別") }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = hapticClick(onDismiss)) { Text("キャンセル") }
                Button(enabled = name.trim().isNotEmpty(), onClick = hapticClick { onSave(name, mode) }) { Text("追加") }
            }
        }
    }
}

@Composable
private fun EmptyState(title: String, message: String = "", action: (() -> Unit)? = null) {
    Column(Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text(title, style = MaterialTheme.typography.titleMedium)
        if (message.isNotEmpty()) Text(message, modifier = Modifier.padding(top = 8.dp))
        if (action != null) Button(onClick = hapticClick(action), modifier = Modifier.padding(top = 16.dp)) { Text("種目を追加") }
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
