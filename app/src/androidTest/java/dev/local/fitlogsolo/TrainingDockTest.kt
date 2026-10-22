package dev.local.fitlogsolo

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import dev.local.fitlogsolo.ui.TrainingDock
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class TrainingDockTest {
    @get:Rule val compose = createComposeRule()

    @Test fun plusAndPlayKeepTheSameCenterAndHideTheOtherDestinations() {
        val preparing = mutableStateOf(false)
        compose.setContent {
            MaterialTheme {
                TrainingDock(preparing.value, false, "ジム", false, true, false, {}, {}, { preparing.value = true })
            }
        }
        val before = compose.onNodeWithContentDescription("トレーニングを準備").fetchSemanticsNode().boundsInRoot.center
        compose.onNodeWithContentDescription("トレーニングを準備").performClick()
        compose.waitForIdle()
        val after = compose.onNodeWithContentDescription("トレーニングを開始").fetchSemanticsNode().boundsInRoot.center
        assertEquals(before.x, after.x, .1f)
        assertEquals(before.y, after.y, .1f)
        compose.onNodeWithText("ホーム").assertDoesNotExist()
        compose.onNodeWithText("ルーム").assertDoesNotExist()
    }
}
