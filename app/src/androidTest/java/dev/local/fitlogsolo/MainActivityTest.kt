package dev.local.fitlogsolo

import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import org.junit.Rule
import org.junit.Test

class MainActivityTest {
    @get:Rule val composeRule = createAndroidComposeRule<MainActivity>()

    @Test fun homeMovesPresetsToTheCentralAction() {
        composeRule.onNodeWithText("FitSwipe").assertExists()
        composeRule.onNodeWithText("カレンダー").assertExists()
        composeRule.onNodeWithText("プリセット").assertDoesNotExist()
        composeRule.onNodeWithContentDescription("トレーニングを準備").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("プリセット").assertExists()
        composeRule.onNodeWithText("ホーム").assertDoesNotExist()
        composeRule.onNodeWithContentDescription("戻る").performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithText("カレンダー").assertExists()
        composeRule.onNodeWithContentDescription("トレーニングを準備").assertExists()
    }
}
