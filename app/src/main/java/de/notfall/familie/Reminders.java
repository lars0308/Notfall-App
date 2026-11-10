package de.notfall.familie;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

/** Plant lokale Erinnerungen per AlarmManager (ohne exakte Alarme, akkuschonend). */
final class Reminders {
  static final String CHANNEL = "erinnerungen";
  static final String ACTION = "de.notfall.familie.REMIND";
  private static final String PREFS = "rem";
  private static final int MAX = 150;

  private Reminders() {}

  static void ensureChannel(Context c) {
    NotificationManager nm = c.getSystemService(NotificationManager.class);
    if (nm.getNotificationChannel(CHANNEL) == null) {
      NotificationChannel ch = new NotificationChannel(CHANNEL, "Erinnerungen", NotificationManager.IMPORTANCE_DEFAULT);
      ch.setDescription("Kontrollen, Ablaufdaten und fällige Aufgaben deiner Notfallvorsorge");
      ch.setLockscreenVisibility(android.app.Notification.VISIBILITY_PRIVATE);
      nm.createNotificationChannel(ch);
    }
  }

  private static Intent intentFor(Context c, String id) {
    Intent i = new Intent(c, ReminderReceiver.class);
    i.setAction(ACTION);
    i.setData(Uri.parse("notfall://rem/" + Uri.encode(id)));
    return i;
  }

  /** json: [{id, at(ms), title, text}] */
  static int apply(Context c, String json) {
    SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    AlarmManager am = c.getSystemService(AlarmManager.class);
    Set<String> old = p.getStringSet("ids", new HashSet<>());
    for (String id : old) {
      PendingIntent pi = PendingIntent.getBroadcast(c, 0, intentFor(c, id), PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
      if (pi != null) {
        am.cancel(pi);
        pi.cancel();
      }
    }
    Set<String> fired = new HashSet<>(p.getStringSet("fired", new HashSet<>()));
    Set<String> ids = new HashSet<>();
    int scheduled = 0;
    long now = System.currentTimeMillis();
    try {
      JSONArray arr = new JSONArray(json);
      for (int i = 0; i < arr.length() && scheduled < MAX; i++) {
        JSONObject o = arr.getJSONObject(i);
        String id = o.getString("id");
        long at = o.getLong("at");
        String key = id + "@" + at;
        if (at <= now && fired.contains(key)) continue;
        long when = at <= now ? now + 8000L + scheduled * 1500L : at;
        Intent in = intentFor(c, id);
        in.putExtra("title", o.optString("title", "Notfall!"));
        in.putExtra("text", o.optString("text", ""));
        in.putExtra("key", key);
        PendingIntent pi = PendingIntent.getBroadcast(c, 0, in, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
        ids.add(id);
        scheduled++;
      }
    } catch (Exception e) {
      return -1;
    }
    p.edit().putStringSet("ids", ids).putString("json", json).apply();
    return scheduled;
  }

  static void reapplyStored(Context c) {
    SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    String json = p.getString("json", null);
    if (json != null) apply(c, json);
  }

  static void markFired(Context c, String key) {
    SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    Set<String> fired = new HashSet<>(p.getStringSet("fired", new HashSet<>()));
    if (fired.size() > 400) fired.clear();
    fired.add(key);
    p.edit().putStringSet("fired", fired).apply();
  }
}
