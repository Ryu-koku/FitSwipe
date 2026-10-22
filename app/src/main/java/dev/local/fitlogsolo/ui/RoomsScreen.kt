package dev.local.fitlogsolo.ui

import android.content.Intent
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.tween
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.repeatOnLifecycle
import dev.local.fitlogsolo.data.*
import java.math.BigDecimal
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun RoomsScreen(
    repository: RoomsRepository,
    sessions: List<WorkoutSessionEntity>,
    presets: List<WorkoutPreset> = emptyList(),
    inviteCode: String? = null,
    onInviteConsumed: () -> Unit = {},
    onShareSession: (String, Long) -> Unit,
) {
    val state by repository.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val context = LocalContext.current
    var displayName by rememberSaveable { mutableStateOf("") }
    var dialog by rememberSaveable { mutableStateOf<String?>(null) }
    var draft by rememberSaveable { mutableStateOf("") }
    var choosingWorkout by rememberSaveable { mutableStateOf(false) }
    var deletePostId by rememberSaveable { mutableStateOf<String?>(null) }
    var accountMenu by rememberSaveable { mutableStateOf(false) }
    val detail = state.detail
    val room = state.rooms.firstOrNull { it.id == detail?.roomId }
    val owner = room?.ownerId == state.account?.id
    BackHandler(enabled = detail != null) { repository.closeRoom() }
    LaunchedEffect(repository, lifecycle) {
        lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            while (isActive) {
                if (repository.configured && repository.state.value.account != null && !repository.state.value.busy) repository.refresh()
                delay(30_000)
            }
        }
    }
    LaunchedEffect(inviteCode, state.account?.id) {
        if (inviteCode != null && state.account != null && repository.configured) {
            draft = inviteCode; dialog = "join"; onInviteConsumed()
        }
    }
    AnimatedContent(
        targetState = detail,
        contentKey = { it?.roomId },
        transitionSpec = {
            val direction = if (targetState == null) -1 else 1
            (slideInHorizontally(tween(280)) { direction * it / 8 } + fadeIn(tween(220))) togetherWith
                (slideOutHorizontally(tween(240)) { -direction * it / 8 } + fadeOut(tween(160)))
        },
        label = "room navigation",
    ) { displayedDetail ->
      val detail = displayedDetail
      val retainedRoom = remember(detail?.roomId) { state.rooms.firstOrNull { it.id == detail?.roomId } }
      val room = state.rooms.firstOrNull { it.id == detail?.roomId } ?: retainedRoom
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                if (detail != null) IconButton(onClick = hapticClick { repository.closeRoom() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "ルーム一覧に戻る") }
                Column(Modifier.weight(1f)) {
                    Text(room?.name ?: "ルーム", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    if (room != null) Text("${room.memberCount}人", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (state.account != null) {
                    IconButton(onClick = hapticClick { scope.launch { repository.refresh() } }, enabled = !state.busy) {
                        if (state.busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                        else Icon(Icons.Default.Refresh, "更新")
                    }
                    if (room != null) {
                        IconButton(onClick = hapticClick {
                            val invite = "${room.name}で一緒にトレーニングしよう\n招待コード：${room.inviteCode}\nfitswipe://room?code=${room.inviteCode}"
                            context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, invite) }, "ルームに招待"))
                        }) { Icon(Icons.Default.PersonAdd, "友だちを招待") }
                        IconButton(onClick = hapticClick { dialog = "leave" }) { Icon(Icons.Default.MoreVert, "ルームの操作") }
                    } else {
                        IconButton(onClick = hapticClick { accountMenu = true }) { Icon(Icons.Default.AccountCircle, "プロフィール") }
                    }
                }
            }
        }
        state.error?.let { error ->
            item {
                Surface(color = MaterialTheme.colorScheme.errorContainer, shape = MaterialTheme.shapes.medium) {
                    Text(error, Modifier.fillMaxWidth().padding(14.dp), color = MaterialTheme.colorScheme.onErrorContainer)
                }
            }
        }
        if (!repository.configured) {
            item { RoomEmptyState("ルーム共有は準備中です", "公開後のアップデートで利用できます。") }
        } else if (state.account == null) {
            item {
                Column(Modifier.fillMaxWidth().padding(top = 24.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                    Icon(Icons.Default.Groups, null, Modifier.size(54.dp), tint = MaterialTheme.colorScheme.primary)
                    Text("友だちと、積み重ねよう", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("ルームのメンバーとトレーニング記録を共有できます。", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    OutlinedTextField(displayName, { displayName = it.take(32) }, label = { Text("表示名") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    Button(onClick = hapticClick { scope.launch { repository.register(displayName) } },
                        enabled = displayName.isNotBlank() && !state.busy, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text("ルームをはじめる") }
                }
            }
        } else {
            if (state.pendingCount > 0) {
                item {
                    OutlinedButton(onClick = hapticClick { scope.launch { repository.refresh() } }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Default.CloudUpload, null); Spacer(Modifier.width(8.dp)); Text("${state.pendingCount}件の送信待ち · 再送")
                    }
                }
            }
            if (detail == null) {
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        FilledTonalButton(onClick = hapticClick { draft = ""; dialog = "create" }, enabled = !state.busy, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Default.Add, null); Spacer(Modifier.width(5.dp)); Text("作成")
                        }
                        OutlinedButton(onClick = hapticClick { draft = ""; dialog = "join" }, enabled = !state.busy, modifier = Modifier.weight(1f)) { Text("招待から参加") }
                    }
                }
                if (state.rooms.isEmpty() && !state.busy) item { RoomEmptyState("まだルームがありません", "ルームを作って友だちを招待しましょう。") }
                items(state.rooms, key = { it.id }) { entry ->
                    Card(Modifier.fillMaxWidth().pressMotionClickable(!state.busy) { scope.launch { repository.openRoom(entry.id) } },
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
                        Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                            Avatar(entry.name)
                            Column(Modifier.weight(1f).padding(horizontal = 14.dp)) {
                                Text(entry.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Text("${entry.memberCount}人", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Icon(Icons.Default.ChevronRight, null)
                        }
                    }
                }
            } else if (room != null) {
                item {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        items(detail.members, key = { it.id }) { member ->
                            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(5.dp)) {
                                Avatar(member.name)
                                Text(member.name, style = MaterialTheme.typography.labelSmall, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 68.dp))
                            }
                        }
                    }
                }
                item {
                    FilledTonalButton(onClick = hapticClick { choosingWorkout = true }, enabled = !state.busy,
                        modifier = Modifier.fillMaxWidth().height(50.dp)) { Icon(Icons.Default.Add, null); Spacer(Modifier.width(8.dp)); Text("記録を共有") }
                }
                if (detail.posts.isEmpty() && !state.busy && state.error == null) item { RoomEmptyState("最初の記録を共有しよう", "トレーニングを終えたら、ここに投稿できます。") }
                items(detail.posts, key = { it.id }) { post ->
                    SharedWorkoutCard(post, post.userId == state.account?.id,
                        onDelete = { deletePostId = post.id })
                }
                if (detail.nextCursor != null) item {
                    TextButton(onClick = hapticClick { scope.launch { repository.loadMore() } }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) { Text("以前の記録を読み込む") }
                }
            }
        }
    }
    }
    if (dialog in listOf("create", "join", "rename")) {
        val kind = dialog
        val label = when (kind) { "create" -> "ルーム名"; "rename" -> "表示名"; else -> "招待コード" }
        ModalBottomSheet(onDismissRequest = { dialog = null }) {
            Column(Modifier.fillMaxWidth().padding(24.dp).imePadding(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text(when (kind) { "create" -> "ルームを作成"; "rename" -> "表示名を変更"; else -> "ルームに参加" }, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                OutlinedTextField(draft, { draft = it.take(if (kind == "join") 200 else if (kind == "create") 40 else 32) }, label = { Text(label) }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Button(onClick = hapticClick {
                    val value = draft
                    dialog = null
                    scope.launch { when (kind) { "create" -> repository.createRoom(value); "rename" -> repository.rename(value); else -> repository.joinRoom(value) } }
                }, enabled = draft.isNotBlank() && !state.busy, modifier = Modifier.fillMaxWidth()) { Text(if (kind == "join") "参加" else "保存") }
            }
        }
    }
    if (dialog == "leave" && room != null) {
        AlertDialog(onDismissRequest = { dialog = null }, title = { Text(if (owner) "ルームを削除しますか？" else "ルームを退出しますか？") },
            text = { Text(if (owner) "メンバー全員の共有投稿が削除されます。端末の記録は残ります。" else "このルームへの自分の投稿も削除されます。端末の記録は残ります。") },
            confirmButton = { TextButton(onClick = hapticClick { dialog = null; scope.launch { repository.leaveRoom(room.id) } }) { Text(if (owner) "削除" else "退出") } },
            dismissButton = { TextButton(onClick = hapticClick { dialog = null }) { Text("キャンセル") } })
    }
    if (accountMenu) {
        ModalBottomSheet(onDismissRequest = { accountMenu = false }) {
            Column(Modifier.fillMaxWidth().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(state.account?.name ?: "プロフィール", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                TextButton(onClick = hapticClick { draft = state.account?.name.orEmpty(); accountMenu = false; dialog = "rename" }) { Text("表示名を変更") }
                TextButton(onClick = hapticClick { accountMenu = false; dialog = "deleteAccount" }) { Text("共有アカウントを削除", color = MaterialTheme.colorScheme.error) }
            }
        }
    }
    if (dialog == "deleteAccount") {
        AlertDialog(onDismissRequest = { dialog = null }, title = { Text("共有アカウントを削除しますか？") },
            text = { Text("自分の投稿と作成したルームを削除します。端末のトレーニング記録は残ります。") },
            confirmButton = { TextButton(onClick = hapticClick { dialog = null; scope.launch { repository.deleteAccount() } }) { Text("削除") } },
            dismissButton = { TextButton(onClick = hapticClick { dialog = null }) { Text("キャンセル") } })
    }
    if (deletePostId != null && room != null) {
        AlertDialog(onDismissRequest = { deletePostId = null }, title = { Text("共有した記録を削除しますか？") },
            text = { Text("端末に保存した記録は残ります。") },
            confirmButton = { TextButton(onClick = hapticClick {
                val id = deletePostId!!; deletePostId = null; scope.launch { repository.deletePost(room.id, id) }
            }) { Text("削除") } }, dismissButton = { TextButton(onClick = hapticClick { deletePostId = null }) { Text("キャンセル") } })
    }
    if (choosingWorkout && room != null) {
        ModalBottomSheet(onDismissRequest = { choosingWorkout = false }) {
            LazyColumn(Modifier.fillMaxWidth().heightIn(max = 620.dp), contentPadding = PaddingValues(24.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item { Text("共有する記録", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold) }
                if (sessions.isEmpty()) item { Text("完了したトレーニングはまだありません") }
                items(sessions, key = { it.id }) { session ->
                    OutlinedButton(onClick = hapticClick { onShareSession(room.id, session.id); choosingWorkout = false }, modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                            Text(presets.firstOrNull { it.id == session.presetId }?.name ?: "トレーニング", fontWeight = FontWeight.Bold)
                            Text(formatRoomTime(session.startedAt.toString()), style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RoomEmptyState(title: String, description: String) {
    Column(Modifier.fillMaxWidth().padding(vertical = 32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Icon(Icons.Default.Groups, null, Modifier.size(48.dp), tint = MaterialTheme.colorScheme.primary)
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text(description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun Avatar(name: String) {
    Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.size(44.dp)) {
        Box(contentAlignment = Alignment.Center) { Text(name.take(1), color = MaterialTheme.colorScheme.onPrimaryContainer, fontWeight = FontWeight.Bold) }
    }
}

@Composable
private fun SharedWorkoutCard(post: RoomPost, own: Boolean, onDelete: () -> Unit) {
    var expanded by rememberSaveable(post.id) { mutableStateOf(false) }
    Card(Modifier.fillMaxWidth().animateContentSize().pressMotionClickable { expanded = !expanded },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Avatar(post.name)
                Column(Modifier.weight(1f).padding(start = 12.dp)) {
                    Text(post.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Text(formatRoomTime(post.workout.startedAt), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (own) IconButton(onClick = hapticClick(onDelete)) { Icon(Icons.Default.DeleteOutline, "共有した記録を削除") }
            }
            Text(post.workout.presetName, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("${post.workout.exercises.size}種目 · ${post.workout.exercises.sumOf { it.sets.size }}セット · ${post.workout.durationMinutes}分",
                    style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary, modifier = Modifier.weight(1f))
                Icon(if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore, if (expanded) "詳細を閉じる" else "セットの詳細")
            }
            AnimatedVisibility(expanded, enter = expandVertically() + fadeIn(), exit = shrinkVertically() + fadeOut()) {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    post.workout.exercises.forEach { exercise ->
                        Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            Text(exercise.name, fontWeight = FontWeight.Bold)
                            exercise.sets.forEach { set ->
                                val weight = set.weightKg?.let { BigDecimal.valueOf(it).stripTrailingZeros().toPlainString() + " kg × " }.orEmpty()
                                Text("${set.order}  ${set.side?.let { "$it  " }.orEmpty()}$weight${set.reps}回", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun formatRoomTime(raw: String): String = runCatching {
    Instant.parse(raw).atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("M月d日 HH:mm"))
}.getOrDefault(raw.take(16))

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun RoomShareSheet(repository: RoomsRepository, onDismiss: () -> Unit, onOpenRooms: () -> Unit, onShare: (String) -> Unit) {
    val state by repository.state.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { if (repository.configured && state.account != null) repository.refresh() }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        LazyColumn(Modifier.fillMaxWidth().heightIn(max = 600.dp), contentPadding = PaddingValues(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { Text("共有先のルーム", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold) }
            state.error?.let { error -> item { Text(error, color = MaterialTheme.colorScheme.error) } }
            if (state.rooms.isEmpty()) {
                item { Text("ルームを作成するか、招待コードで参加してください。") }
                item { Button(onClick = hapticClick(onOpenRooms), modifier = Modifier.fillMaxWidth()) { Text("ルームを開く") } }
            }
            items(state.rooms, key = { it.id }) { room ->
                OutlinedButton(onClick = hapticClick { onShare(room.id) }, modifier = Modifier.fillMaxWidth()) { Text(room.name) }
            }
        }
    }
}
