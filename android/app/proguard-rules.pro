# RoutineFlow Android Proguard rules

# Keep Glance AppWidgets
-keep class com.routineflow.app.widget.** { *; }

# Keep data models for Firestore deserialization
-keep class com.routineflow.app.data.** { *; }

# Keep Compose and Coroutines
-keep class androidx.compose.** { *; }
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
