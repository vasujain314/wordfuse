package expo.modules.roomkeepalive

import android.content.Intent
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JS API for [RoomKeepAliveService]: start it when the player enters a multiplayer room,
 * stop it when they leave, and tell it when the app goes to the background or comes back.
 */
class RoomKeepAliveModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RoomKeepAlive")

    // onTaskRemoved: the app was swiped away from recents (leave the room properly).
    // onExpired: too long in the background; the service stopped to save battery.
    Events("onTaskRemoved", "onExpired")

    OnCreate { instance = this@RoomKeepAliveModule }
    OnDestroy { if (instance === this@RoomKeepAliveModule) instance = null }

    /** Starts (or updates the notification of) the keep-alive service. Must be called while the app is in the foreground. */
    Function("start") { title: String, text: String ->
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(context, RoomKeepAliveService::class.java)
        .putExtra(RoomKeepAliveService.EXTRA_TITLE, title)
        .putExtra(RoomKeepAliveService.EXTRA_TEXT, text)
      try {
        ContextCompat.startForegroundService(context, intent)
        true
      } catch (e: Exception) {
        // e.g. ForegroundServiceStartNotAllowedException if the app is already in the background.
        false
      }
    }

    Function("stop") {
      val context = appContext.reactContext ?: return@Function false
      context.stopService(Intent(context, RoomKeepAliveService::class.java))
    }

    Function("setInBackground") { inBackground: Boolean ->
      RoomKeepAliveService.setInBackground(inBackground)
    }

    Function("isRunning") { RoomKeepAliveService.isRunning() }
  }

  companion object {
    @Volatile private var instance: RoomKeepAliveModule? = null

    internal fun emit(name: String) {
      instance?.sendEvent(name, mapOf<String, Any?>())
    }
  }
}
