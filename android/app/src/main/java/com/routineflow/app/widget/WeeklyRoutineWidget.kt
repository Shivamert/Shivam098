package com.routineflow.app.widget

import android.content.Context
import android.content.Intent
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.routineflow.app.MainActivity
import java.util.*

class WeeklyRoutineWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val weekdays = listOf(
            Triple("Mon", "4/4", 100),
            Triple("Tue", "3/4", 75),
            Triple("Wed", "4/4", 100),
            Triple("Thu", "2/3", 66),
            Triple("Fri", "3/5", 60),
            Triple("Sat", "2/2", 100),
            Triple("Sun", "1/2", 50)
        )

        provideContent {
            GlanceTheme {
                Column(
                    modifier = GlanceModifier
                        .fillMaxSize()
                        .background(Color(0xFF0F172A))
                        .padding(12.dp)
                        .clickable(actionStartActivity(Intent(context, MainActivity::class.java)))
                ) {
                    Text(
                        text = "Weekly Habits & Routines",
                        style = TextStyle(
                            color = ColorProvider(Color.White),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    )

                    Spacer(modifier = GlanceModifier.height(8.dp))

                    Row(
                        modifier = GlanceModifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        weekdays.forEach { (day, score, percent) ->
                            Column(
                                modifier = GlanceModifier.defaultWeight().padding(2.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = day,
                                    style = TextStyle(
                                        color = ColorProvider(Color(0xFF94A3B8)),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                )
                                Spacer(modifier = GlanceModifier.height(4.dp))
                                Box(
                                    modifier = GlanceModifier
                                        .fillMaxWidth()
                                        .height(28.dp)
                                        .background(
                                            if (percent == 100) Color(0xFF10B981)
                                            else if (percent > 50) Color(0xFF4F46E5)
                                            else Color(0xFF334155)
                                        )
                                        .cornerRadius(4.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = score,
                                        style = TextStyle(color = ColorProvider(Color.White), fontSize = 9.sp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

class WeeklyRoutineWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = WeeklyRoutineWidget()
}
