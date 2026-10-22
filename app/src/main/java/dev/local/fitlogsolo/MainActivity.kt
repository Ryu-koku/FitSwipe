package dev.local.fitlogsolo

import android.os.Bundle
import android.content.Intent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.ViewModelProvider
import dev.local.fitlogsolo.ui.FitLogApp

class MainActivity : ComponentActivity() {
    private lateinit var viewModel: FitLogViewModel
    private var inviteCode by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val application = application as FitLogApplication
        viewModel = ViewModelProvider(
            this,
            FitLogViewModel.Factory(application.repository, application.workoutPreferences, application.rooms),
        )[FitLogViewModel::class.java]

        readInvitation(intent)
        setContent {
            FitLogApp(viewModel = viewModel, inviteCode = inviteCode, onInviteConsumed = { inviteCode = null; setIntent(Intent(intent).apply { data = null }) })
        }
    }
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        readInvitation(intent)
    }

    private fun readInvitation(intent: Intent?) {
        val uri = intent?.data ?: return
        if (uri.scheme == "fitswipe" && uri.host == "room") {
            inviteCode = uri.getQueryParameter("code")?.uppercase()?.takeIf { it.matches(Regex("[A-Z2-9]{10}")) }
        }
    }
}
