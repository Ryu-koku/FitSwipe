package dev.local.fitlogsolo

import androidx.compose.ui.test.assertExists
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test

class MainActivityTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun recordScreenStartsWithAppTitle() {
        composeRule.onNodeWithText("FitLog Solo").assertExists()
    }
}
