package dev.local.fitlogsolo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import dev.local.fitlogsolo.ui.FitLogApp
import kotlinx.coroutines.launch
import java.nio.charset.StandardCharsets

class MainActivity : ComponentActivity() {
    private lateinit var viewModel: FitLogViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val application = application as FitLogApplication
        viewModel = ViewModelProvider(
            this,
            FitLogViewModel.Factory(application.repository, application.healthConnect),
        )[FitLogViewModel::class.java]

        val permissionLauncher = registerForActivityResult(
            PermissionController.createRequestPermissionResultContract(),
        ) {
            refreshHealth()
        }
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
                onRequestHealthPermission = {
                    permissionLauncher.launch(setOf(application.healthConnect.weightPermission))
                },
                onRefreshHealth = ::refreshHealth,
                onExport = { createDocumentLauncher.launch("fitlog-solo-backup.json") },
            )
        }
    }

    private fun refreshHealth() {
        val application = application as FitLogApplication
        lifecycleScope.launch {
            val granted = application.healthConnect.clientOrNull()
                ?.permissionController
                ?.getGrantedPermissions()
                ?.contains(application.healthConnect.weightPermission) == true
            viewModel.refreshHealth(granted)
        }
    }
}
