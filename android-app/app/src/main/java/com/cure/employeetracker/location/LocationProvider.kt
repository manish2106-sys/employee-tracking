package com.cure.employeetracker.location

import android.annotation.SuppressLint
import android.content.Context
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

data class Coordinates(
    val latitude: Double,
    val longitude: Double
)

class LocationProvider(context: Context) {
    private val fusedClient = LocationServices.getFusedLocationProviderClient(context)

    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): Coordinates? {
        return suspendCancellableCoroutine { continuation ->
            val cancellationTokenSource = CancellationTokenSource()

            fun safeResume(value: Coordinates?) {
                if (continuation.isActive) {
                    continuation.resume(value)
                }
            }

            fusedClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cancellationTokenSource.token)
                .addOnSuccessListener { location ->
                    if (location != null) {
                        safeResume(Coordinates(location.latitude, location.longitude))
                        return@addOnSuccessListener
                    }

                    fusedClient.lastLocation
                        .addOnSuccessListener { fallback ->
                            if (fallback != null) {
                                safeResume(Coordinates(fallback.latitude, fallback.longitude))
                            } else {
                                safeResume(null)
                            }
                        }
                        .addOnFailureListener {
                            safeResume(null)
                        }
                }
                .addOnFailureListener {
                    safeResume(null)
                }

            continuation.invokeOnCancellation {
                cancellationTokenSource.cancel()
            }
        }
    }
}
