package de.notfall.familie;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Notfallpass für Rettungskräfte auf dem Sperrbildschirm.
 * Gespeichert wird nur, was der Nutzer im Notfallpass freigegeben hat (Name, freigegebene Angaben, Notfallkontakte) –
 * bewusst unverschlüsselt in eigenen Einstellungen, damit es ohne Entsperren lesbar ist.
 */
final class LockPass {
  static final String CHANNEL = "notfallpass";
  static final int NOTIF_ID = 7001;
  private static final String PREFS = "lockpass";

  private LockPass() { }

  static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

  static void save(Context c, String json, boolean enabled) {
    prefs(c).edit().putString("json", json == null ? "" : json).putBoolean("on", enabled).apply();
    if (enabled) show(c); else cancel(c);
  }

  static String json(Context c) { return prefs(c).getString("json", ""); }
  static boolean enabled(Context c) { return prefs(c).getBoolean("on", false); }

  static void cancel(Context c) {
    NotificationManager nm = c.getSystemService(NotificationManager.class);
    if (nm != null) nm.cancel(NOTIF_ID);
  }

  /** Kurzer Text für die Benachrichtigung: je Person eine Zeile mit den wichtigsten Angaben und dem ersten Kontakt. */
  static String summary(String json) {
    StringBuilder sb = new StringBuilder();
    try {
      JSONArray people = new JSONObject(json).optJSONArray("people");
      if (people == null) return "";
      for (int i = 0; i < people.length(); i++) {
        JSONObject p = people.getJSONObject(i);
        if (sb.length() > 0) sb.append('\n');
        sb.append(p.optString("name"));
        JSONArray rows = p.optJSONArray("rows");
        if (rows != null) for (int k = 0; k < rows.length(); k++) {
          JSONArray r = rows.getJSONArray(k);
          sb.append(" · ").append(r.optString(0)).append(": ").append(r.optString(1));
        }
        JSONArray cs = p.optJSONArray("contacts");
        if (cs != null && cs.length() > 0) {
          JSONObject ct = cs.getJSONObject(0);
          sb.append(" · Notfallkontakt: ").append(ct.optString("name")).append(' ').append(ct.optString("phone"));
        }
      }
    } catch (Exception e) {
      return "";
    }
    return sb.toString();
  }

  static void show(Context c) {
    String json = json(c);
    if (json.isEmpty()) { cancel(c); return; }
    NotificationManager nm = c.getSystemService(NotificationManager.class);
    if (nm == null) return;
    if (nm.getNotificationChannel(CHANNEL) == null) {
      NotificationChannel ch = new NotificationChannel(CHANNEL, "Notfallpass auf dem Sperrbildschirm", NotificationManager.IMPORTANCE_LOW);
      ch.setDescription("Zeigt Rettungskräften Notfallkontakte und freigegebene Angaben, ohne das Handy zu entsperren.");
      ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
      ch.setShowBadge(false);
      nm.createNotificationChannel(ch);
    }
    Intent open = new Intent(c, PassActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    PendingIntent pi = PendingIntent.getActivity(c, 7001, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    String text = summary(json);
    Notification n = new Notification.Builder(c, CHANNEL)
        .setSmallIcon(R.drawable.ic_stat)
        .setContentTitle("NOTFALLPASS – für Rettungskräfte antippen")
        .setContentText(text)
        .setStyle(new Notification.BigTextStyle().bigText(text))
        .setVisibility(Notification.VISIBILITY_PUBLIC)
        .setPublicVersion(new Notification.Builder(c, CHANNEL).setSmallIcon(R.drawable.ic_stat)
            .setContentTitle("NOTFALLPASS – für Rettungskräfte antippen").setContentText(text)
            .setStyle(new Notification.BigTextStyle().bigText(text)).setContentIntent(pi).build())
        .setOngoing(true)
        .setShowWhen(false)
        .setCategory(Notification.CATEGORY_STATUS)
        .setContentIntent(pi)
        .build();
    try { nm.notify(NOTIF_ID, n); } catch (SecurityException ignored) { }
  }
}
