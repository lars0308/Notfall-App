package de.notfall.familie;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class ReminderReceiver extends BroadcastReceiver {
  @Override public void onReceive(Context c, Intent intent) {
    String title = intent.getStringExtra("title");
    String text = intent.getStringExtra("text");
    String key = intent.getStringExtra("key");
    String kind = intent.getStringExtra("kind");
    String route = intent.getStringExtra("route");
    boolean test = "test".equals(kind);
    if (key != null) Reminders.markFired(c, key);
    Reminders.ensureChannel(c);
    NotificationManager nm = c.getSystemService(NotificationManager.class);
    boolean enabled = nm.areNotificationsEnabled();
    if (test) Reminders.log(c, key, kind, enabled);
    if (!enabled) return;
    Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    if (route != null && !route.isEmpty()) open.putExtra("route", route);
    int req = key == null ? 0 : key.hashCode();
    PendingIntent pi = PendingIntent.getActivity(c, req, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    Notification.Builder b = new Notification.Builder(c, test ? Reminders.CHANNEL_TEST : Reminders.CHANNEL)
        .setSmallIcon(R.drawable.ic_stat)
        .setContentTitle(title == null ? "Notfall!" : title)
        .setContentText(text == null ? "" : text)
        .setStyle(new Notification.BigTextStyle().bigText(text == null ? "" : text))
        .setContentIntent(pi)
        .setAutoCancel(true)
        .setVisibility(test ? Notification.VISIBILITY_PUBLIC : Notification.VISIBILITY_PRIVATE)
        .setCategory(test ? Notification.CATEGORY_ALARM : Notification.CATEGORY_REMINDER);
    nm.notify(req == 0 ? 1 : req, b.build());
  }
}
