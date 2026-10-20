package dev.local.fitlogsolo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.setContent
import androidx.lifecycle.ViewModelProvider
import dev.local.fitlogsolo.ui.FitLogApp
import java.nio.charset.StandardCharsets

class MainActivity : ComponentActivity() {
    private lateinit var viewModel: FitLogViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val application = application as FitLogApplication
        viewModel = ViewModelProvider(
            this,
            FitLogViewModel.Factory(application.repository),
        )[FitLogViewModel::class.java]

        val createDocumentLauncher = registerForActivityResult(
            ActivityResultContracts.CreateDocument("application/json"),
        ) { uri ->
            if (uri != null) {
                viewModel.export(uri) { target, json ->
                    contentResolver.openOutputStream(target)?.use { output ->
                        output.write(json.toByteArray(StandardCharsets.UTF_8))
                    }
                }
            }
        }

        setContent {
            FitLogApp(
                viewModel = viewModel,
                onExport = { createDocumentLauncher.launch("fitlog-solo-backup.json") },
            )
        }
    }
}
