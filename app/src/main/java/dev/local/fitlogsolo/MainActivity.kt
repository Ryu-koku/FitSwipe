package dev.local.fitlogsolo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.ViewModelProvider
import dev.local.fitlogsolo.ui.FitLogApp

class MainActivity : ComponentActivity() {
    private lateinit var viewModel: FitLogViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val application = application as FitLogApplication
        viewModel = ViewModelProvider(
            this,
            FitLogViewModel.Factory(application.repository, application.workoutPreferences),
        )[FitLogViewModel::class.java]

        setContent {
            FitLogApp(viewModel = viewModel)
        }
    }
}
