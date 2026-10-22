package dev.local.fitlogsolo.data

import android.content.Context
import dev.local.fitlogsolo.BuildConfig
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.util.concurrent.atomic.AtomicLong
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

internal fun JSONObject.nullableString(key: String): String? = if (isNull(key)) null else optString(key).takeIf { it.isNotBlank() }
private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map { getJSONObject(it) }

data class RoomAccount(val id: String, val name: String)
data class RoomSummary(val id: String, val name: String, val ownerId: String, val inviteCode: String, val memberCount: Int)
data class RoomMember(val id: String, val name: String)
data class SharedSet(val order: Int, val side: String?, val weightKg: Double?, val reps: Int)
data class SharedExercise(val name: String, val sets: List<SharedSet>)
data class SharedWorkout(val presetName: String, val startedAt: String, val durationMinutes: Int, val exercises: List<SharedExercise>)
data class RoomPost(val id: String, val userId: String, val name: String, val workout: SharedWorkout)
data class RoomDetail(val roomId: String, val members: List<RoomMember>, val posts: List<RoomPost>, val nextCursor: String?)
data class RoomsState(
    val account: RoomAccount? = null,
    val rooms: List<RoomSummary> = emptyList(),
    val detail: RoomDetail? = null,
    val busy: Boolean = false,
    val pendingCount: Int = 0,
    val error: String? = null,
    val notice: String? = null,
)
private class RoomsApiException(val status: Int, message: String) : IOException(message)

/** Device identity and a durable outbox are kept separately from the workout database. */
class RoomsRepository(context: Context) {
    private val identity = context.getSharedPreferences("fitlog_rooms_identity", Context.MODE_PRIVATE)
    private val cache = context.getSharedPreferences("fitlog_rooms_cache", Context.MODE_PRIVATE)
    private val mutex = Mutex()
    private val navigationVersion = AtomicLong()
    private val endpoint = BuildConfig.ROOMS_BASE_URL.trimEnd('/')
    val configured: Boolean = endpoint.startsWith("https://") ||
        (BuildConfig.DEBUG && (endpoint.startsWith("http://10.0.2.2:") || endpoint.startsWith("http://127.0.0.1:")))
    private val installationId = identity.getString("installationId", null) ?: UUID.randomUUID().toString().also {
        identity.edit().putString("installationId", it).commit()
    }
    private val _state = MutableStateFlow(RoomsState(
        account = identity.getString("userId", null)?.let { RoomAccount(it, identity.getString("name", "") ?: "") },
        rooms = runCatching { parseRooms(JSONObject(cache.getString("rooms", "{}")!!)) }.getOrDefault(emptyList()),
        pendingCount = readOutbox().length(),
    ))
    val state = _state.asStateFlow()

    fun clientId(sessionId: Long): String = "$installationId-$sessionId"
    fun acknowledgeNotice() { _state.value = _state.value.copy(notice = null) }
    fun closeRoom() { navigationVersion.incrementAndGet(); _state.value = _state.value.copy(detail = null, error = null) }

    private fun readOutbox(): JSONArray = runCatching { JSONArray(cache.getString("outbox", "[]")) }.getOrDefault(JSONArray())
    private fun saveOutbox(items: JSONArray) {
        // commit keeps a requested share durable before attempting the network.
        check(cache.edit().putString("outbox", items.toString()).commit()) { "共有する記録を保存できませんでした" }
        _state.value = _state.value.copy(pendingCount = items.length())
    }

    private suspend fun operation(block: suspend () -> Unit) = mutex.withLock {
        _state.value = _state.value.copy(busy = true, error = null)
        try { withContext(Dispatchers.IO) { block() } }
        catch (cancelled: CancellationException) { throw cancelled }
        catch (error: Exception) {
            _state.value = _state.value.copy(error = if (error is RoomsApiException || error !is IOException) error.message ?: "操作できませんでした" else "接続できません。通信状況を確認して再度お試しください")
        } finally { _state.value = _state.value.copy(busy = false) }
    }

    private fun request(method: String, path: String, body: JSONObject? = null, authenticated: Boolean = true): JSONObject {
        check(configured) { "ルーム共有は準備中です。公開後のアップデートで利用できます。" }
        val connection = URL(endpoint + path).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 10_000
            connection.readTimeout = 15_000
            connection.instanceFollowRedirects = false
            connection.setRequestProperty("Accept", "application/json")
            if (authenticated) {
                val token = identity.getString("token", null) ?: error("表示名を登録してください")
                connection.setRequestProperty("Authorization", "Bearer $token")
            }
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                val bytes = body.toString().toByteArray(Charsets.UTF_8)
                connection.setFixedLengthStreamingMode(bytes.size)
                connection.outputStream.use { it.write(bytes) }
            }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val raw = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: "{}"
            val result = runCatching { JSONObject(raw) }.getOrElse {
                throw RoomsApiException(status, "サーバーに接続できませんでした")
            }
            if (status !in 200..299) throw RoomsApiException(status, result.optString("error", "操作できませんでした"))
            return result
        } finally { connection.disconnect() }
    }

    suspend fun register(name: String) = operation {
        if (_state.value.account != null) return@operation
        val response = request("POST", "/v1/account", JSONObject().put("name", name.trim()), false)
        check(identity.edit().putString("token", response.getString("token"))
            .putString("userId", response.getString("id")).putString("name", response.getString("name")).commit())
        _state.value = _state.value.copy(account = RoomAccount(response.getString("id"), response.getString("name")))
        refreshLocked()
    }

    suspend fun refresh() = operation {
        if (_state.value.account == null) return@operation
        refreshLocked()
    }

    private fun refreshLocked() {
        val response = request("GET", "/v1/rooms")
        val rooms = parseRooms(response)
        val removed = _state.value.rooms.filter { old -> rooms.none { it.id == old.id } }
        cache.edit().putString("rooms", response.toString()).also { editor -> removed.forEach { editor.remove("detail.${it.id}") } }.apply()
        _state.value = _state.value.copy(rooms = rooms, detail = _state.value.detail?.takeIf { detail -> rooms.any { it.id == detail.roomId } })
        flushOutbox()
        _state.value.detail?.roomId?.let { loadDetail(it) }
    }

    suspend fun createRoom(name: String) = operation {
        val version = navigationVersion.get()
        val room = request("POST", "/v1/rooms", JSONObject().put("name", name.trim())).getString("id")
        refreshLocked()
        showRoom(room, version)
    }

    suspend fun joinRoom(code: String) = operation {
        val version = navigationVersion.get()
        val normalized = if (code.startsWith("fitswipe://")) android.net.Uri.parse(code).getQueryParameter("code") ?: code else code
        val room = request("POST", "/v1/rooms/join", JSONObject().put("code", normalized.trim())).getString("id")
        refreshLocked()
        showRoom(room, version)
    }

    suspend fun openRoom(id: String) = operation {
        showRoom(id, navigationVersion.incrementAndGet())
    }

    private fun showRoom(id: String, version: Long) {
        if (navigationVersion.get() != version) return
        val saved = cache.getString("detail.$id", null)?.let { runCatching { parseDetail(id, JSONObject(it)) }.getOrNull() }
        _state.value = _state.value.copy(detail = saved ?: RoomDetail(id, emptyList(), emptyList(), null))
        loadDetail(id, version)
    }

    private fun loadDetail(id: String, version: Long = navigationVersion.get()) {
        if (navigationVersion.get() != version || _state.value.detail?.roomId != id) return
        val members = request("GET", "/v1/rooms/$id")
        val posts = request("GET", "/v1/rooms/$id/posts")
        posts.put("members", members.getJSONArray("members"))
        cache.edit().putString("detail.$id", posts.toString()).apply()
        // A delayed response must never reopen a room after the user goes back.
        if (navigationVersion.get() == version && _state.value.detail?.roomId == id) {
            _state.value = _state.value.copy(detail = parseDetail(id, posts))
        }
    }

    suspend fun loadMore() = operation {
        val version = navigationVersion.get()
        val old = _state.value.detail ?: return@operation
        val cursor = old.nextCursor ?: return@operation
        val response = request("GET", "/v1/rooms/${old.roomId}/posts?before=$cursor")
        val next = parseDetail(old.roomId, response.put("members", JSONArray()))
        if (navigationVersion.get() == version && _state.value.detail?.roomId == old.roomId) {
            _state.value = _state.value.copy(detail = old.copy(posts = (old.posts + next.posts).distinctBy { it.id }, nextCursor = next.nextCursor))
        }
    }

    suspend fun share(roomId: String, snapshot: JSONObject) = operation {
        check(_state.value.rooms.any { it.id == roomId }) { "共有先のルームを選んでください" }
        val pending = readOutbox()
        val key = snapshot.getString("clientId")
        if (pending.objects().none { it.getString("roomId") == roomId && it.getJSONObject("workout").getString("clientId") == key }) {
            check(pending.length() < 100) { "送信待ちの記録を先に共有してください" }
            pending.put(JSONObject().put("roomId", roomId).put("workout", snapshot))
            saveOutbox(pending)
        }
        try {
            flushOutbox()
        } catch (error: IOException) {
            if (error is RoomsApiException && error.status in 400..499) throw error
            _state.value = _state.value.copy(notice = "送信待ちで保存しました。ルームを開くと再送します")
            return@operation
        }
        _state.value = _state.value.copy(notice = "ルームに共有しました")
        _state.value.detail?.roomId?.let { loadDetail(it) }
    }

    private fun flushOutbox() {
        var pending = readOutbox()
        while (pending.length() > 0) {
            val entry = pending.getJSONObject(0)
            try { request("POST", "/v1/rooms/${entry.getString("roomId")}/posts", entry.getJSONObject("workout")) }
            catch (error: RoomsApiException) {
                if (error.status in setOf(400, 403, 404, 413)) {
                    saveOutbox(JSONArray(pending.objects().drop(1)))
                }
                throw error
            }
            pending = JSONArray(pending.objects().drop(1))
            saveOutbox(pending)
        }
    }

    suspend fun deletePost(roomId: String, postId: String) = operation {
        request("DELETE", "/v1/rooms/$roomId/posts/$postId")
        loadDetail(roomId)
    }

    suspend fun leaveRoom(id: String) = operation {
        request("DELETE", "/v1/rooms/$id")
        saveOutbox(JSONArray(readOutbox().objects().filterNot { it.getString("roomId") == id }))
        _state.value = _state.value.copy(detail = null)
        refreshLocked()
    }

    suspend fun rename(name: String) = operation {
        request("PUT", "/v1/account", JSONObject().put("name", name.trim()))
        identity.edit().putString("name", name.trim()).apply()
        _state.value = _state.value.copy(account = _state.value.account?.copy(name = name.trim()))
        refreshLocked()
    }

    suspend fun deleteAccount() = operation {
        request("DELETE", "/v1/account")
        identity.edit().remove("token").remove("userId").remove("name").commit()
        cache.edit().clear().commit()
        _state.value = RoomsState(notice = "共有アカウントを削除しました。端末の記録は残ります")
    }

    private fun parseRooms(json: JSONObject): List<RoomSummary> = json.optJSONArray("rooms")?.objects()?.map {
        RoomSummary(it.getString("id"), it.getString("name"), it.getString("ownerId"), it.getString("inviteCode"), it.getInt("memberCount"))
    } ?: emptyList()

    private fun parseDetail(id: String, json: JSONObject): RoomDetail = RoomDetail(id,
        json.optJSONArray("members")?.objects()?.map { RoomMember(it.getString("id"), it.getString("name")) } ?: emptyList(),
        json.optJSONArray("posts")?.objects()?.map { post ->
            val data = post.getJSONObject("workout")
            RoomPost(post.getString("id"), post.getString("userId"), post.getString("name"),
                SharedWorkout(data.getString("presetName"), data.getString("startedAt"), data.getInt("durationMinutes"),
                    data.getJSONArray("exercises").objects().map { exercise ->
                        SharedExercise(exercise.getString("name"), exercise.getJSONArray("sets").objects().map { set ->
                            SharedSet(set.getInt("order"), set.nullableString("side"), if (set.isNull("weightKg")) null else set.getDouble("weightKg"), set.getInt("reps"))
                        })
                    }))
        } ?: emptyList(), json.nullableString("nextCursor"))
}
