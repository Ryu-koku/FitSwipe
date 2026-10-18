package dev.local.fitlogsolo.health

import dev.local.fitlogsolo.data.WeightMeasurement
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.Instant

class WeightDataSourceTest {
    @Test
    fun fakeCanRepresentPermissionDenied() = runTest {
        val fake = object : WeightDataSource {
            override suspend fun readRecentWeights(hasPermission: Boolean): HealthReadResult =
                if (hasPermission) HealthReadResult.Success(listOf(WeightMeasurement("1", Instant.EPOCH, 70.0)))
                else HealthReadResult.PermissionDenied
        }
        assertEquals(HealthReadResult.PermissionDenied, fake.readRecentWeights(false))
        assertEquals(1, (fake.readRecentWeights(true) as HealthReadResult.Success).measurements.size)
    }
}
