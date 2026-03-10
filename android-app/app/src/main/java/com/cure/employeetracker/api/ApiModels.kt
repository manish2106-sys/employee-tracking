package com.cure.employeetracker.api

data class AttendanceRequest(
    val employeeCode: String,
    val latitude: Double?,
    val longitude: Double?,
    val deviceName: String
)

data class AttendanceApiResponse(
    val message: String,
    val session: AttendanceSession?
)

data class AttendanceSession(
    val id: String,
    val employeeCode: String,
    val employeeName: String,
    val loginTime: String,
    val logoutTime: String?,
    val loginLocation: SessionLocation?,
    val logoutLocation: SessionLocation?,
    val loginDeviceName: String?,
    val logoutDeviceName: String?
)

data class SessionLocation(
    val latitude: Double?,
    val longitude: Double?
)
