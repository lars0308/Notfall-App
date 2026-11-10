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
    if (key != null) Reminders.markFired(c, key);
    Reminders.ensureChannel(c);
    NotificationManager nm = c.getSystemService(NotificationManager.class);
    if (!nm.areNotificationsEnabled()) return;
    Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent pi = PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    Notification n = new Notification.Builder(c, Reminders.CHANNEL)
        .setSmallIcon(R.drawable.ic_stat)
        .setContentTitle(title == null ? "Notfall!" : title)
        .setContentText(text == null ? "" : text)
        .setStyle(new Notification.BigTextStyle().bigText(text == null ? "" : text))
        .setContentIntent(pi)
        .setAutoCancel(true)
        .setVisibility(Notification.VISIBILITY_PRIVATE)
        .setCategory(Notification.CATEGORY_REMINDER)
        .build();
    nm.notify(key == null ? 1 : key.hashCode(), n);
  }
}
