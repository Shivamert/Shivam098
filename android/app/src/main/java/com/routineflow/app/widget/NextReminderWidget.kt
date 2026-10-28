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

class NextReminderWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            GlanceTheme {
                Row(
                    modifier = GlanceModifier
                        .fillMaxSize()
                        .background(Color(0xFF1E1B4B))
                        .padding(12.dp)
                        .clickable(actionStartActivity(Intent(context, MainActivity::class.java))),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = GlanceModifier
                            .size(36.dp)
                            .background(Color(0xFF4F46E5))
                            .cornerRadius(10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "⏱",
                            style = TextStyle(fontSize = 16.sp)
                        )
                    }

                    Spacer(modifier = GlanceModifier.width(10.dp))

                    Column(modifier = GlanceModifier.defaultWeight()) {
                        Text(
                            text = "NEXT UP • 19:00",
                            style = TextStyle(
                                color = ColorProvider(Color(0xFF818CF8)),
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Text(
                            text = "Mathematics & Algorithms",
                            maxLines = 1,
                            style = TextStyle(
                                color = ColorProvider(Color.White),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        )
                    }
                }
            }
        }
    }
}

class NextReminderWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = NextReminderWidget()
}
