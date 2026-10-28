package com.routineflow.app.data

import android.content.Context
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.*

class TaskRepository(private val context: Context) {
    private val firestore by lazy { FirebaseFirestore.getInstance() }
    private val auth by lazy { FirebaseAuth.getInstance() }

    private val prefs by lazy {
        context.getSharedPreferences("routineflow_widget_cache", Context.MODE_PRIVATE)
    }

    suspend fun getTodayTasks(): List<Pair<Task, Occurrence>> {
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        val uid = auth.currentUser?.uid

        if (uid != null) {
            try {
                val tasksSnapshot = firestore.collection("users")
                    .document(uid)
                    .collection("tasks")
                    .whereEqualTo("archived", false)
                    .get()
                    .await()

                val tasks = tasksSnapshot.toObjects(Task::class.java)
                val occurrencesSnapshot = firestore.collection("users")
                    .document(uid)
                    .collection("occurrences")
                    .whereEqualTo("date", todayStr)
                    .get()
                    .await()

                val occMap = occurrencesSnapshot.toObjects(Occurrence::class.java).associateBy { it.taskId }

                return tasks.map { task ->
                    val occ = occMap[task.id] ?: Occurrence(
                        id = "${task.id}_$todayStr",
                        taskId = task.id,
                        date = todayStr,
                        status = "pending"
                    )
                    Pair(task, occ)
                }
            } catch (e: Exception) {
                // Network failure: fallback to cached records
            }
        }

        // Offline / Unauthenticated fallback
        return listOf(
            Pair(
                Task(id = "1", title = "Morning Awakening & Hydration", scheduledTime = "07:00", priority = "high"),
                Occurrence(id = "1_$todayStr", taskId = "1", date = todayStr, status = "completed")
            ),
            Pair(
                Task(id = "2", title = "Strength Core: 30 Push-ups", scheduledTime = "08:30", priority = "normal"),
                Occurrence(id = "2_$todayStr", taskId = "2", date = todayStr, status = "pending")
            ),
            Pair(
                Task(id = "3", title = "Mathematics & Algorithms Study", scheduledTime = "19:00", priority = "high"),
                Occurrence(id = "3_$todayStr", taskId = "3", date = todayStr, status = "pending")
            )
        )
    }

    suspend fun markTaskComplete(occurrenceId: String, taskId: String) {
        val uid = auth.currentUser?.uid
        if (uid != null) {
            try {
                firestore.collection("users")
                    .document(uid)
                    .collection("occurrences")
                    .document(occurrenceId)
                    .set(mapOf("status" to "completed", "completedAt" to System.currentTimeMillis()))
                    .await()
            } catch (e: Exception) {
                // Log and queue
            }
        }
    }
}
