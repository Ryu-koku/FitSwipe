package dev.local.fitlogsolo.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import dev.local.fitlogsolo.data.WeightMeasurement
import java.time.Instant
import java.time.temporal.ChronoUnit

enum class HealthAvailability { AVAILABLE, NOT_INSTALLED, UPDATE_REQUIRED }

sealed interface HealthReadResult {
    data class Success(val measurements: List<WeightMeasurement>) : HealthReadResult
    data class Unavailable(val availability: HealthAvailability) : HealthReadResult
    data object PermissionDenied : HealthReadResult
    data class Failed(val message: String) : HealthReadResult
}

interface WeightDataSource {
    suspend fun readRecentWeights(hasPermission: Boolean): HealthReadResult
}

class HealthConnectGateway(private val context: Context) : WeightDataSource {
    val weightPermission: String = HealthPermission.getReadPermission(WeightRecord::class)

    fun availability(): HealthAvailability = when (HealthConnectClient.getSdkStatus(context)) {
        HealthConnectClient.SDK_AVAILABLE -> HealthAvailability.AVAILABLE
        HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> HealthAvailability.UPDATE_REQUIRED
        else -> HealthAvailability.NOT_INSTALLED
    }

    fun clientOrNull(): HealthConnectClient? = if (availability() == HealthAvailability.AVAILABLE) {
        HealthConnectClient.getOrCreate(context)
    } else {
        null
    }

    override suspend fun readRecentWeights(hasPermission: Boolean): HealthReadResult {
        val currentAvailability = availability()
        if (currentAvailability != HealthAvailability.AVAILABLE) {
            return HealthReadResult.Unavailable(currentAvailability)
        }
        if (!hasPermission) return HealthReadResult.PermissionDenied
        val client = clientOrNull() ?: return HealthReadResult.Unavailable(currentAvailability)
        return try {
            val end = Instant.now()
            val start = end.minus(30, ChronoUnit.DAYS)
            val values = mutableListOf<WeightMeasurement>()
            var pageToken: String? = null
            do {
                val response = client.readRecords(
                    ReadRecordsRequest(
                        recordType = WeightRecord::class,
                        timeRangeFilter = TimeRangeFilter.between(start, end),
                        pageToken = pageToken,
                    ),
                )
                response.records.forEach { record ->
                    values += WeightMeasurement(
                        id = record.metadata.id,
                        measuredAt = record.time,
                        kilograms = record.weight.inKilograms,
                        sourcePackage = record.metadata.dataOrigin.packageName,
                    )
                }
                pageToken = response.pageToken
            } while (pageToken != null)
            HealthReadResult.Success(values)
        } catch (security: SecurityException) {
            HealthReadResult.PermissionDenied
        } catch (error: Exception) {
            HealthReadResult.Failed(error.message ?: "Health Connectから体重を読み取れませんでした")
        }
    }
}
