package expo.modules.roomkeepalive

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Keeps a multiplayer room connected while the app is in the background.
 *
 * When an Android app goes to the background React Native pauses JavaScript timers, so the
 * room's heartbeats and the Supabase connection's keep-alive stop and the room drops out
 * after about a minute. While a Headless JS task is running, React Native keeps timers
 * going ([com.facebook.react.modules.core.JavaTimerManager]); this foreground service runs
 * one such task (WordFuseRoomKeepAlive, a promise that the app resolves when it leaves the
 * room) and shows the ongoing notification Android requires.
 *
 * It stops when the player leaves the room, when the app is swiped away (after telling JS
 * to leave the room properly), or after [BACKGROUND_LIMIT_MS] in the background.
 */
class RoomKeepAliveService : HeadlessJsTaskService() {
  private val handler = Handler(Looper.getMainLooper())
  private var taskStarted = false

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val title = intent?.getStringExtra(EXTRA_TITLE) ?: "Word Fuse"
    val text = intent?.getStringExtra(EXTRA_TEXT) ?: "You're in a game room. Tap to return."
    try {
      ServiceCompat.startForeground(
        this,
        NOTIFICATION_ID,
        buildNotification(title, text),
        if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0,
      )
    } catch (e: Exception) {
      stopSelf()
      return START_NOT_STICKY
    }
    current = this
    scheduleBackgroundLimit(inBackground)
    if (!taskStarted) {
      taskStarted = true
      super.onStartCommand(intent, flags, startId) // starts the Headless JS task
    }
    // Never restarted by the system after the app is gone.
    return START_NOT_STICKY
  }

  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig =
    // No timeout: the task lasts as long as the player is in the room.
    HeadlessJsTaskConfig(TASK_NAME, Arguments.createMap(), 0, true)

  /** The app was swiped away: let JS leave the room (hand over hosting), then stop. */
  override fun onTaskRemoved(rootIntent: Intent?) {
    RoomKeepAliveModule.emit("onTaskRemoved")
    handler.postDelayed({ stopSelf() }, TASK_REMOVED_GRACE_MS)
    super.onTaskRemoved(rootIntent)
  }

  override fun onDestroy() {
    handler.removeCallbacksAndMessages(null)
    if (current === this) current = null
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    super.onDestroy() // releases the wake lock
  }

  private fun scheduleBackgroundLimit(inBackground: Boolean) {
    handler.removeCallbacks(expire)
    if (inBackground) handler.postDelayed(expire, BACKGROUND_LIMIT_MS)
  }

  private val expire = Runnable {
    RoomKeepAliveModule.emit("onExpired")
    stopSelf()
  }

  private fun buildNotification(title: String, text: String): Notification {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= 26 && manager.getNotificationChannel(CHANNEL_ID) == null) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Game rooms", NotificationManager.IMPORTANCE_LOW).apply {
          description = "Shown while you're in a multiplayer room, so it stays connected."
          setShowBadge(false)
        },
      )
    }
    val open = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
    }
    val contentIntent = open?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_room_keepalive)
      .setContentTitle(title)
      .setContentText(text)
      .setContentIntent(contentIntent)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .build()
  }

  companion object {
    const val EXTRA_TITLE = "title"
    const val EXTRA_TEXT = "text"
    const val TASK_NAME = "WordFuseRoomKeepAlive"
    private const val CHANNEL_ID = "wordfuse_room"
    private const val NOTIFICATION_ID = 4711
    private const val BACKGROUND_LIMIT_MS = 10 * 60 * 1000L
    private const val TASK_REMOVED_GRACE_MS = 2000L

    @Volatile private var current: RoomKeepAliveService? = null
    @Volatile private var inBackground = false

    fun isRunning(): Boolean = current != null

    fun setInBackground(value: Boolean) {
      inBackground = value
      val service = current ?: return
      service.handler.post { service.scheduleBackgroundLimit(value) }
    }
  }
}
