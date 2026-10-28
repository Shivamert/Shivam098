package com.routineflow.app.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.routineflow.app.MainActivity
import com.routineflow.app.data.TaskRepository
import java.text.SimpleDateFormat
import java.util.*

class TodayTasksWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val repo = TaskRepository(context)
        val todayTasks = repo.getTodayTasks()
        val total = todayTasks.size
        val completed = todayTasks.count { it.second.status == "completed" }
        val percent = if (total > 0) ((completed.toFloat() / total) * 100).toInt() else 0
        val dateLabel = SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(Date())

        provideContent {
            GlanceTheme {
                Column(
                    modifier = GlanceModifier
                        .fillMaxSize()
                        .background(Color(0xFF0F172A))
                        .padding(14.dp)
                ) {
                    // Header: Date & Daily Progress Bar
                    Row(
                        modifier = GlanceModifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = GlanceModifier.defaultWeight()) {
                            Text(
                                text = "Today • $dateLabel",
                                style = TextStyle(
                                    color = ColorProvider(Color(0xFF94A3B8)),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            )
                            Text(
                                text = "$completed of $total done ($percent%)",
                                style = TextStyle(
                                    color = ColorProvider(Color.White),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        }

                        // Open app button
                        Box(
                            modifier = GlanceModifier
                                .background(Color(0xFF4F46E5))
                                .cornerRadius(8.dp)
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                                .clickable(actionStartActivity(Intent(context, MainActivity::class.java)))
                        ) {
                            Text(
                                text = "Open",
                                style = TextStyle(color = ColorProvider(Color.White), fontSize = 11.sp)
                            )
                        }
                    }

                    Spacer(modifier = GlanceModifier.height(8.dp))

                    // Tasks List
                    LazyColumn(modifier = GlanceModifier.fillMaxSize()) {
                        items(todayTasks) { (task, occ) ->
                            val isDone = occ.status == "completed"
                            Row(
                                modifier = GlanceModifier
                                    .fillMaxWidth()
                                    .background(if (isDone) Color(0xFF1E293B) else Color(0xFF1E293B))
                                    .cornerRadius(8.dp)
                                    .padding(8.dp)
                                    .clickable(
                                        actionRunCallback<CompleteTaskActionCallback>(
                                            actionParametersOf(
                                                ActionParameters.Key<String>("occurrenceId") to occ.id,
                                                ActionParameters.Key<String>("taskId") to task.id
                                            )
                                        )
                                    ),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Checkbox Indicator
                                Text(
                                    text = if (isDone) "✓" else "○",
                                    style = TextStyle(
                                        color = ColorProvider(if (isDone) Color(0xFF10B981) else Color(0xFF64748B)),
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                )

                                Spacer(modifier = GlanceModifier.width(8.dp))

                                Column(modifier = GlanceModifier.defaultWeight()) {
                                    Text(
                                        text = task.title,
                                        maxLines = 1,
                                        style = TextStyle(
                                            color = ColorProvider(if (isDone) Color(0xFF94A3B8) else Color.White),
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                    )
                                    if (task.scheduledTime != null) {
                                        Text(
                                            text = task.scheduledTime,
                                            style = TextStyle(color = ColorProvider(Color(0xFF818CF8)), fontSize = 10.sp)
                                        )
                                    }
                                }
                            }
                            Spacer(modifier = GlanceModifier.height(4.dp))
                        }
                    }
                }
            }
        }
    }
}

class CompleteTaskActionCallback : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val occurrenceId = parameters[ActionParameters.Key<String>("occurrenceId")] ?: return
        val taskId = parameters[ActionParameters.Key<String>("taskId")] ?: return
        TaskRepository(context).markTaskComplete(occurrenceId, taskId)
        TodayTasksWidget().update(context, glanceId)
    }
}

class TodayTasksWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TodayTasksWidget()
}
