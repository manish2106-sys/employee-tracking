package com.cure.employeetracker.api

import retrofit2.http.Body
import retrofit2.http.POST

interface EmployeeTrackerApi {
    @POST("attendance/check-in")
    suspend fun checkIn(@Body request: AttendanceRequest): AttendanceApiResponse

    @POST("attendance/check-out")
    suspend fun checkOut(@Body request: AttendanceRequest): AttendanceApiResponse
}
