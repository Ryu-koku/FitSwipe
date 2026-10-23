package dev.local.fitlogsolo.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import dev.local.fitlogsolo.data.ExerciseEntity
import dev.local.fitlogsolo.data.WorkoutPreset

/** This dock stays mounted while + becomes play, so the button never changes position. */
@Composable
internal fun TrainingDock(
    preparing: Boolean,
    roomsSelected: Boolean,
    selectedPresetName: String?,
    resuming: Boolean,
    canStart: Boolean,
    starting: Boolean,
    onHome: () -> Unit,
    onRooms: () -> Unit,
    onCenter: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val progress by animateFloatAsState(if (preparing) 1f else 0f, spring(stiffness = 420f), label = "plus to play")
    Box(modifier.fillMaxWidth().height(112.dp)) {
        Surface(
            modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(72.dp)
                .then(if (preparing) Modifier.clearAndSetSemantics {} else Modifier)
                .graphicsLayer { alpha = (1f - progress).coerceIn(0f, 1f); translationY = progress * 26.dp.toPx() },
            shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 6.dp,
        ) {
            Row(Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically) {
                DockDestination("ホーム", Icons.Default.Home, !roomsSelected, !preparing, onHome, Modifier.weight(1f))
                Spacer(Modifier.width(104.dp))
                DockDestination("ルーム", Icons.Default.Groups, roomsSelected, !preparing, onRooms, Modifier.weight(1f))
            }
        }
        AnimatedVisibility(
            preparing,
            Modifier.align(Alignment.TopCenter),
            enter = fadeIn(), exit = fadeOut(),
        ) {
            Text(
                if (resuming) "トレーニングを再開" else selectedPresetName ?: "プリセットを選択",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                maxLines = 1, overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(horizontal = 28.dp),
            )
        }
        FilledIconButton(
            onClick = hapticClick(onCenter),
            enabled = !starting && (!preparing || canStart),
            shape = CircleShape,
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 18.dp).size(72.dp),
        ) {
            if (starting) {
                CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
            } else {
                Box(Modifier.size(36.dp), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Add, if (!preparing) "トレーニングを準備" else null,
                        Modifier.size(36.dp).graphicsLayer {
                            alpha = (1f - progress).coerceIn(0f, 1f); rotationZ = progress * 90f
                            scaleX = 1f - progress * .3f; scaleY = scaleX
                        })
                    Icon(Icons.Default.PlayArrow, if (preparing) { if (resuming) "トレーニングを再開" else "トレーニングを開始" } else null,
                        Modifier.size(36.dp).graphicsLayer {
                            alpha = progress.coerceIn(0f, 1f); scaleX = .7f + progress * .3f; scaleY = scaleX
                        })
                }
            }
        }
    }
}

@Composable
private fun DockDestination(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    selected: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier,
) {
    TextButton(onClick = hapticClick(onClick), enabled = enabled,
        modifier = modifier.height(70.dp).semantics { this.selected = selected }) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(3.dp)) {
            val tint = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
            Icon(icon, null, Modifier.size(25.dp), tint = tint)
            Text(label, style = MaterialTheme.typography.labelMedium, color = tint,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun TrainingPreparationScreen(
    presets: List<WorkoutPreset>,
    exercises: List<ExerciseEntity>,
    selectedId: String?,
    exerciseRestDurations: Map<Long, Long>,
    onExerciseRestDurationChange: (Long, Long?) -> Unit,
    onSelect: (String) -> Unit,
    onPresetsChange: (List<WorkoutPreset>) -> Unit,
    onAddExercise: () -> Unit,
    onBack: () -> Unit,
) {
    var editingId by rememberSaveable { mutableStateOf<String?>(null) }
    var adding by rememberSaveable { mutableStateOf(false) }
    var newName by rememberSaveable { mutableStateOf("") }
    BackHandler { onBack() }
    val activeIds = exercises.map { it.id }.toSet()
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = hapticClick(onBack)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る") }
                Text("トレーニング", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            }
        }
        item { Text("プリセット", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
        items(presets.chunked(2), key = { row -> "prepare-preset-row-${row.first().id}" }) { rowPresets ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                rowPresets.forEach { preset ->
                    val selected = preset.id == selectedId
                    val count = preset.exercises.count { it.exerciseId in activeIds }
                    Card(
                        modifier = Modifier.weight(1f).heightIn(min = 132.dp).animateContentSize()
                            .semantics { this.selected = selected }.pressMotionClickable { onSelect(preset.id) },
                        colors = CardDefaults.cardColors(containerColor = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface),
                        border = BorderStroke(if (selected) 2.dp else 1.dp, if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant),
                    ) {
                        Column(Modifier.fillMaxSize().padding(12.dp), verticalArrangement = Arrangement.SpaceBetween) {
                            Icon(
                                if (selected) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                                contentDescription = if (selected) "選択中" else null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(22.dp),
                            )
                            Column(Modifier.fillMaxWidth()) {
                                Text(preset.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold,
                                    maxLines = 2, overflow = TextOverflow.Ellipsis)
                                Text("${count}種目 · ${preset.exercises.filter { it.exerciseId in activeIds }.sumOf { it.sets.toIntOrNull()?.coerceIn(1, 30) ?: 3 }}セット",
                                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                                IconButton(onClick = hapticClick { onSelect(preset.id); editingId = preset.id }, modifier = Modifier.size(40.dp)) {
                                    Icon(Icons.Default.Edit, "${preset.name}を編集", tint = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
                }
                if (rowPresets.size == 1) Spacer(Modifier.weight(1f))
            }
        }
        item {
            OutlinedButton(onClick = hapticClick { newName = ""; adding = true }, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                Icon(Icons.Default.Add, null); Spacer(Modifier.width(8.dp)); Text("プリセットを追加")
            }
        }
        item { TextButton(onClick = hapticClick(onAddExercise), modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Default.FitnessCenter, null); Spacer(Modifier.width(8.dp)); Text("種目を追加")
        } }
    }
    presets.firstOrNull { it.id == editingId }?.let { preset ->
        PresetEditorDialog(preset, exercises, exerciseRestDurations, onExerciseRestDurationChange,
            onChange = { updated -> onPresetsChange(presets.map { if (it.id == updated.id) updated else it }) },
            onDelete = { onPresetsChange(presets.filterNot { it.id == preset.id }); editingId = null },
            onDismiss = { editingId = null })
    }
    if (adding) {
        ModalBottomSheet(onDismissRequest = { adding = false }) {
            Column(Modifier.fillMaxWidth().padding(24.dp).imePadding(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("プリセットを追加", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                OutlinedTextField(newName, { newName = it.take(24) }, label = { Text("名前") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Button(onClick = hapticClick {
                    val preset = WorkoutPreset(name = newName.trim())
                    onPresetsChange(presets + preset); onSelect(preset.id); adding = false; editingId = preset.id
                }, enabled = newName.isNotBlank(), modifier = Modifier.fillMaxWidth()) { Text("作成して編集") }
            }
        }
    }
}
