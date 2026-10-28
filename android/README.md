# RoutineFlow Native Android Companion & Home-Screen Widgets

This directory contains the complete native Android companion project for RoutineFlow, providing genuine Android AppWidgets built with Kotlin and Jetpack Glance.

## Included Native Widgets

1. **Widget A: Today's Tasks (`TodayTasksWidget`)**
   - Displays the current local date, scheduled tasks, and completion progress.
   - Includes interactive checkboxes allowing users to mark tasks complete directly from the Android home screen without opening the full application.
   - Resizable (compact 3x2 to full 4x4 layout).

2. **Widget B: Weekly Routine (`WeeklyRoutineWidget`)**
   - Displays all 7 weekdays in the configured week-start order (Monday or Sunday).
   - Shows daily completion percentages and habit completion ratios.
   - Tapping any day opens the daily agenda in the app.

3. **Widget C: Next Reminder (`NextReminderWidget`)**
   - Real-time indicator of the next scheduled routine and its countdown time.
   - Automatically refreshes on task completion or schedule updates.

4. **Widget D: Quick Add (`QuickAddWidget`)**
   - Instant 1-tap launcher that triggers the `routineflow://add-task` deep link to open the task creation dialog directly.

---

## Architecture & Data Synchronization

- **UI Framework:** Jetpack Glance (`androidx.glance:glance-appwidget`) + Jetpack Compose.
- **Database & Sync:** Cloud Firestore + Firebase Auth.
- **Offline Cache:** SharedPreferences and SQLite caching so widgets display immediately even when offline or in airplane mode.
- **Background Sync:** Android WorkManager (`PeriodicWorkRequest`) periodically refreshes widget state every 30 minutes while respecting Android battery and background execution limits.

---

## Build, Sign, and Installation Instructions

### Prerequisites
- Android Studio Iguana / Jellyfish (or higher) or JDK 17 with Android Command Line Tools (`cmdline-tools`).
- Android SDK 34 (UpsideDownCake) and Build-Tools 34.0.0.

### 1. Build the APK via Gradle

Open a terminal in the `android` folder:

```bash
cd android
./gradlew assembleDebug
```

The compiled APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### 2. Install on Device or Emulator via ADB

Connect your Android phone with USB Debugging enabled (or start an Android emulator):

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 3. Signing for Production (Release APK / AAB)

To generate a signed release APK or Android App Bundle:

```bash
# Generate release keystore if you don't have one
keytool -genkey -v -keystore routineflow-release.keystore -alias routineflow -keyalg RSA -keysize 2048 -validity 10000

# Build release bundle
./gradlew bundleRelease
```

---

## How to Add Widgets to Your Android Home Screen

1. Long-press on any empty space on your Android phone's home screen.
2. Tap **Widgets** from the pop-up menu.
3. Scroll or search for **RoutineFlow**.
4. Choose any of the 4 available widgets:
   - **Today's Tasks**
   - **Weekly Routine**
   - **Next Reminder**
   - **Quick Add**
5. Drag and drop the widget onto your home screen. Resize as desired!
