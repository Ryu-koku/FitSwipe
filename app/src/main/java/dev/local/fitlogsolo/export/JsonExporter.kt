package dev.local.fitlogsolo.export

import dev.local.fitlogsolo.data.ExportSnapshot
import org.json.JSONArray
import org.json.JSONObject

object JsonExporter {
    fun toJson(snapshot: ExportSnapshot): String = JSONObject().apply {
        put("formatVersion", 1)
        put("exportedAt", System.currentTimeMillis())
        put("exercises", JSONArray().apply {
            snapshot.exercises.forEach { exercise ->
                put(JSONObject().apply {
                    put("id", exercise.id)
                    put("name", exercise.name)
                    put("mode", exercise.mode.name)
                    put("sortOrder", exercise.sortOrder)
                    put("archived", exercise.archived)
                    put("createdAt", exercise.createdAt.toString())
                })
            }
        })
        put("sessions", JSONArray().apply {
            snapshot.sessions.forEach { session ->
                put(JSONObject().apply {
                    put("id", session.id)
                    put("startedAt", session.startedAt.toString())
                    put("endedAt", session.endedAt?.toString())
                    put("status", session.status.name)
                })
            }
        })
        put("sets", JSONArray().apply {
            snapshot.sets.forEach { set ->
                put(JSONObject().apply {
                    put("id", set.id)
                    put("sessionId", set.sessionId)
                    put("exerciseId", set.exerciseId)
                    put("setOrder", set.setOrder)
                    putNullable("normalWeightKg", set.normalWeightKg)
                    putNullable("normalReps", set.normalReps)
                    putNullable("leftWeightKg", set.leftWeightKg)
                    putNullable("leftReps", set.leftReps)
                    putNullable("rightWeightKg", set.rightWeightKg)
                    putNullable("rightReps", set.rightReps)
                    put("isCompleted", set.isCompleted)
                    put("createdAt", set.createdAt.toString())
                    put("updatedAt", set.updatedAt.toString())
                })
            }
        })
    }.toString(2)

    private fun JSONObject.putNullable(key: String, value: Any?) {
        put(key, value ?: JSONObject.NULL)
    }
}
