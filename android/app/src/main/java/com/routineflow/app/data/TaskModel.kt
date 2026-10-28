package com.routineflow.app.data

data class Task(
    val id: String = "",
    val title: String = "",
    val category: String = "Personal",
    val priority: String = "normal",
    val scheduledTime: String? = null,
    val durationMinutes: Int? = null,
    val recurrenceFrequency: String = "daily",
    val isArchived: Boolean = false,
    val userId: String = ""
)

data class Occurrence(
    val id: String = "",
    val taskId: String = "",
    val date: String = "",
    val status: String = "pending", // pending, completed, skipped
    val activityCompleted: Int = 0,
    val activityTarget: Int = 0
)

data class DaySummary(
    val date: String,
    val dayLabel: String,
    val totalScheduled: Int,
    val completed: Int,
    val isToday: Boolean
) {
    val completionPercent: Int
        get() = if (totalScheduled > 0) ((completed.toFloat() / totalScheduled) * 100).toInt() else 0
}
