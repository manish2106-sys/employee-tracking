package com.cure.employeetracker

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.cure.employeetracker.api.AttendanceRequest
import com.cure.employeetracker.api.RetrofitProvider
import com.cure.employeetracker.location.LocationProvider
import kotlinx.coroutines.launch
import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    EmployeeTrackerScreen()
                }
            }
        }
    }
}

private enum class AttendanceAction {
    CHECK_IN,
    CHECK_OUT
}

@Composable
private fun EmployeeTrackerScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val locationProvider = remember { LocationProvider(context.applicationContext) }

    var employeeCode by rememberSaveable { mutableStateOf("") }
    var apiBaseUrl by rememberSaveable { mutableStateOf("http://10.0.2.2:4000/api") }
    var latestLocation by rememberSaveable { mutableStateOf("No location captured yet.") }
    var statusMessage by rememberSaveable { mutableStateOf("Ready for check-in/check-out.") }
    var inFlight by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        val granted = grants[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            grants[Manifest.permission.ACCESS_COARSE_LOCATION] == true

        statusMessage = if (granted) {
            "Location permission granted. Tap check-in/check-out again."
        } else {
            "Location permission denied. GPS is required to submit attendance."
        }
    }

    fun submitAttendance(action: AttendanceAction) {
        val employeeId = employeeCode.trim()
        if (employeeId.isBlank()) {
            statusMessage = "Employee ID is required."
            return
        }

        if (!hasLocationPermission(context)) {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    Manifest.permission.ACCESS_FINE_LOCATION
                )
            )
            return
        }

        scope.launch {
            inFlight = true
            statusMessage = "Sending ${actionLabel(action)} request..."

            val location = locationProvider.getCurrentLocation()
            if (location == null) {
                inFlight = false
                statusMessage = "Could not capture GPS location. Try again in an open area."
                return@launch
            }

            latestLocation = "${location.latitude}, ${location.longitude}"

            val request = AttendanceRequest(
                employeeCode = employeeId,
                latitude = location.latitude,
                longitude = location.longitude,
                deviceName = buildDeviceName()
            )

            try {
                val api = RetrofitProvider.create(normalizeApiBaseUrl(apiBaseUrl))
                val response = when (action) {
                    AttendanceAction.CHECK_IN -> api.checkIn(request)
                    AttendanceAction.CHECK_OUT -> api.checkOut(request)
                }

                statusMessage = response.message
            } catch (httpError: HttpException) {
                statusMessage = parseHttpError(httpError)
            } catch (ioError: IOException) {
                statusMessage = "Network error: ${ioError.message ?: "Unable to connect."}"
            } catch (unexpected: Exception) {
                statusMessage = "Unexpected error: ${unexpected.message ?: "Try again."}"
            } finally {
                inFlight = false
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "Employee Tracking",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )

        Text(
            text = "Capture login/logout time with GPS and device details.",
            style = MaterialTheme.typography.bodyMedium
        )

        OutlinedTextField(
            value = apiBaseUrl,
            onValueChange = { apiBaseUrl = it },
            label = { Text("Backend Base URL") },
            placeholder = { Text("http://10.0.2.2:4000/api") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        OutlinedTextField(
            value = employeeCode,
            onValueChange = { employeeCode = it },
            label = { Text("Employee ID") },
            placeholder = { Text("e.g. EMP001") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Button(
                onClick = { submitAttendance(AttendanceAction.CHECK_IN) },
                modifier = Modifier.weight(1f),
                enabled = !inFlight
            ) {
                Text("Check In")
            }

            Button(
                onClick = { submitAttendance(AttendanceAction.CHECK_OUT) },
                modifier = Modifier.weight(1f),
                enabled = !inFlight
            ) {
                Text("Check Out")
            }
        }

        if (inFlight) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                CircularProgressIndicator()
            }
        }

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(text = "Latest Status", fontWeight = FontWeight.SemiBold)
                Text(text = statusMessage)
            }
        }

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(text = "Captured Location", fontWeight = FontWeight.SemiBold)
                Text(text = latestLocation)
                Text(text = "Device: ${buildDeviceName()}")
            }
        }

        Spacer(modifier = Modifier.height(4.dp))
    }
}

private fun actionLabel(action: AttendanceAction): String {
    return when (action) {
        AttendanceAction.CHECK_IN -> "check-in"
        AttendanceAction.CHECK_OUT -> "check-out"
    }
}

private fun hasLocationPermission(context: Context): Boolean {
    val fine = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.ACCESS_FINE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED

    val coarse = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.ACCESS_COARSE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED

    return fine || coarse
}

private fun buildDeviceName(): String {
    val manufacturer = Build.MANUFACTURER?.trim().orEmpty()
    val model = Build.MODEL?.trim().orEmpty()
    val composed = listOf(manufacturer, model)
        .filter { it.isNotBlank() }
        .joinToString(separator = " ")

    return if (composed.isBlank()) "Android Device" else composed
}

private fun normalizeApiBaseUrl(input: String): String {
    val trimmed = input.trim().removeSuffix("/")
    require(trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        "Base URL must start with http:// or https://"
    }

    return if (trimmed.endsWith("/api")) {
        "$trimmed/"
    } else {
        "$trimmed/api/"
    }
}

private fun parseHttpError(error: HttpException): String {
    val responseBody = error.response()?.errorBody()?.string()
    if (!responseBody.isNullOrBlank()) {
        return try {
            JSONObject(responseBody).optString("message", "Request failed with code ${error.code()}")
        } catch (_: Exception) {
            "Request failed with code ${error.code()}"
        }
    }

    return "Request failed with code ${error.code()}"
}
