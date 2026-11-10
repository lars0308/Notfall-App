package de.notfall.familie;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.net.Uri;
import android.os.Build;
import android.os.CancellationSignal;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.concurrent.Executor;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Schnittstelle zwischen der Web-Oberflaeche und Android. Nur fuer die lokale App-Herkunft erreichbar. */
public class NativeBridge {
  private final MainActivity act;
  private final SecureStore store;
  private final MapStore maps;
  private final java.util.concurrent.ExecutorService net = java.util.concurrent.Executors.newFixedThreadPool(4);

  NativeBridge(MainActivity a) {
    act = a;
    store = new SecureStore(a);
    maps = new MapStore(a);
  }
  MapStore maps() { return maps; }

  private Executor mainExec() { return act.getMainExecutor(); }

  // ---------- Info ----------
  @JavascriptInterface public String info() {
    try {
      JSONObject o = new JSONObject();
      o.put("native", true);
      o.put("sdk", Build.VERSION.SDK_INT);
      o.put("version", act.getPackageManager().getPackageInfo(act.getPackageName(), 0).versionName);
      o.put("device", Build.MANUFACTURER + " " + Build.MODEL);
      return o.toString();
    } catch (Exception e) {
      return "{\"native\":true}";
    }
  }

  // ---------- Verschluesselter Speicher ----------
  @JavascriptInterface public String storeGet(String name) {
    try { return store.get(name); } catch (Exception e) { return null; }
  }
  @JavascriptInterface public boolean storePut(String name, String value) {
    try { return store.put(name, value); } catch (Exception e) { return false; }
  }
  @JavascriptInterface public boolean storeDel(String name) {
    try { return store.delete(name); } catch (Exception e) { return false; }
  }
  @JavascriptInterface public String storeList(String prefix) {
    try { return new JSONArray(store.list(prefix)).toString(); } catch (Exception e) { return "[]"; }
  }
  @JavascriptInterface public void storeWipe() {
    store.wipeAll();
    act.getSharedPreferences("bio", 0).edit().clear().apply();
    act.getSharedPreferences("rem", 0).edit().clear().apply();
  }

  // ---------- Downloads ----------
  @JavascriptInterface public boolean saveDownload(String name, String mime, String base64) {
    try {
      String safeName = name.replaceAll("[^\\p{L}\\p{N}_.() -]", "_");
      if (safeName.isEmpty() || safeName.startsWith(".")) safeName = "notfall-export.bin";
      byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
      ContentValues v = new ContentValues();
      v.put(MediaStore.Downloads.DISPLAY_NAME, safeName);
      v.put(MediaStore.Downloads.MIME_TYPE, mime == null ? "application/octet-stream" : mime);
      v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Notfall");
      v.put(MediaStore.Downloads.IS_PENDING, 1);
      Uri target = act.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
      if (target == null) throw new IOException("Download nicht erstellbar");
      try (OutputStream out = act.getContentResolver().openOutputStream(target)) {
        if (out == null) throw new IOException("Speicher nicht verfügbar");
        out.write(bytes);
      }
      v.clear();
      v.put(MediaStore.Downloads.IS_PENDING, 0);
      act.getContentResolver().update(target, v, null, null);
      final String shown = safeName;
      act.runOnUiThread(() -> Toast.makeText(act, "Gespeichert: Downloads/Notfall/" + shown, Toast.LENGTH_LONG).show());
      return true;
    } catch (Exception e) {
      act.runOnUiThread(() -> Toast.makeText(act, "Speichern fehlgeschlagen", Toast.LENGTH_LONG).show());
      return false;
    }
  }

  // ---------- Kamera ----------
  @JavascriptInterface public void takePhoto(final int cb) {
    act.runOnUiThread(() -> act.startCameraCapture(cb));
  }

  // ---------- Benachrichtigungen ----------
  @JavascriptInterface public int scheduleReminders(String json) {
    try {
      Reminders.ensureChannel(act);
      return Reminders.apply(act, json);
    } catch (Exception e) {
      return -1;
    }
  }
  @JavascriptInterface public String notifStatus() {
    boolean on = act.getSystemService(android.app.NotificationManager.class).areNotificationsEnabled();
    return on ? "granted" : "denied";
  }
  @JavascriptInterface public void requestNotifications(final int cb) {
    act.runOnUiThread(() -> act.requestNotifPermission(cb));
  }
  @JavascriptInterface public String alarmLog() { return Reminders.logJson(act); }
  @JavascriptInterface public String exactAlarmStatus() {
    if (Build.VERSION.SDK_INT < 31) return "na";
    return Reminders.canExact(act) ? "granted" : "denied";
  }

  // ---------- Offline-Karten ----------
  @JavascriptInterface public boolean mapPut(String pack, int z, int x, int y, String b64) {
    try { return maps.put(pack, z, x, y, Base64.decode(b64, Base64.DEFAULT)); } catch (Exception e) { return false; }
  }
  @JavascriptInterface public String mapGet(String pack, int z, int x, int y) {
    try { return maps.get(pack, z, x, y); } catch (Exception e) { return null; }
  }
  @JavascriptInterface public double mapBytes(String pack) {
    try { return maps.bytes(pack); } catch (Exception e) { return 0; }
  }
  @JavascriptInterface public void mapDelete(String pack) {
    try { maps.delete(pack); } catch (Exception ignored) {}
  }
  /** Nur HTTPS, nur auf ausdruecklichen Start des Kartendownloads durch den Nutzer. */
  @JavascriptInterface public void httpGet(final int cb, final String url) {
    net.execute(() -> act.resolve(cb, MapStore.httpGet(url).toString()));
  }
  @JavascriptInterface public void mapImport(final int cb, final String pack) {
    act.runOnUiThread(() -> act.startMapImport(cb, pack));
  }

  @JavascriptInterface public void openSettings(String kind) {
    act.runOnUiThread(() -> {
      try {
        Intent i;
        if ("notif".equals(kind)) {
          i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, act.getPackageName());
        } else if ("exact".equals(kind) && Build.VERSION.SDK_INT >= 31) {
          i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + act.getPackageName()));
        } else if ("battery".equals(kind)) {
          i = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
        } else {
          i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + act.getPackageName()));
        }
        act.startActivity(i);
      } catch (Exception e) {
        Toast.makeText(act, "Einstellungen nicht erreichbar", Toast.LENGTH_SHORT).show();
      }
    });
  }

  // ---------- Biometrie ----------
  @JavascriptInterface public boolean bioAvailable() {
    try {
      BiometricManager bm = act.getSystemService(BiometricManager.class);
      if (bm == null) return false;
      int r = Build.VERSION.SDK_INT >= 30
          ? bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
          : bm.canAuthenticate();
      return r == BiometricManager.BIOMETRIC_SUCCESS;
    } catch (Exception e) {
      return false;
    }
  }

  private BiometricPrompt buildPrompt(String title, String sub, final int cb) {
    BiometricPrompt.Builder b = new BiometricPrompt.Builder(act).setTitle(title);
    if (sub != null && !sub.isEmpty()) b.setSubtitle(sub);
    b.setNegativeButton("Abbrechen", mainExec(), (d, w) -> act.resolve(cb, res(false, "abgebrochen", null)));
    if (Build.VERSION.SDK_INT >= 30) b.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG);
    return b.build();
  }

  private static String res(boolean ok, String err, String data) {
    try {
      JSONObject o = new JSONObject();
      o.put("ok", ok);
      if (err != null) o.put("error", err);
      if (data != null) o.put("data", data);
      return o.toString();
    } catch (Exception e) {
      return "{\"ok\":false}";
    }
  }

  /** Einfache Bestaetigung per Fingerabdruck/Gesicht (z. B. App-Entsperrung). */
  @JavascriptInterface public void bioAuth(final int cb, final String title, final String sub) {
    act.runOnUiThread(() -> {
      try {
        BiometricPrompt bp = buildPrompt(title, sub, cb);
        bp.authenticate(new CancellationSignal(), mainExec(), new BiometricPrompt.AuthenticationCallback() {
          @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r) { act.resolve(cb, res(true, null, null)); }
          @Override public void onAuthenticationError(int code, CharSequence msg) { act.resolve(cb, res(false, String.valueOf(msg), null)); }
        });
      } catch (Exception e) {
        act.resolve(cb, res(false, "Biometrie nicht verfügbar", null));
      }
    });
  }

  private static final String BIO_KEY = "notfall_bio_v1";

  private SecretKey bioKey(boolean create) throws Exception {
    KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
    ks.load(null);
    if (create) {
      if (ks.containsAlias(BIO_KEY)) ks.deleteEntry(BIO_KEY);
      KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
      KeyGenParameterSpec.Builder sb = new KeyGenParameterSpec.Builder(BIO_KEY, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
          .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
          .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
          .setKeySize(256)
          .setUserAuthenticationRequired(true)
          .setInvalidatedByBiometricEnrollment(true);
      if (Build.VERSION.SDK_INT >= 30) sb.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG);
      kg.init(sb.build());
      return kg.generateKey();
    }
    return (SecretKey) ks.getKey(BIO_KEY, null);
  }

  /** Speichert ein Geheimnis (z. B. Safe-Passwort) biometrisch geschuetzt im Keystore. */
  @JavascriptInterface public void bioEnroll(final int cb, final String alias, final String secret, final String title) {
    act.runOnUiThread(() -> {
      try {
        SecretKey k = bioKey(true);
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.ENCRYPT_MODE, k);
        BiometricPrompt bp = buildPrompt(title, "Zum Aktivieren bestätigen", cb);
        bp.authenticate(new BiometricPrompt.CryptoObject(c), new CancellationSignal(), mainExec(), new BiometricPrompt.AuthenticationCallback() {
          @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r) {
            try {
              Cipher cc = r.getCryptoObject().getCipher();
              byte[] ct = cc.doFinal(secret.getBytes(StandardCharsets.UTF_8));
              String blob = Base64.encodeToString(cc.getIV(), Base64.NO_WRAP) + ":" + Base64.encodeToString(ct, Base64.NO_WRAP);
              act.getSharedPreferences("bio", 0).edit().putString("sec_" + alias, blob).apply();
              act.resolve(cb, res(true, null, null));
            } catch (Exception e) {
              act.resolve(cb, res(false, "Verschlüsselung fehlgeschlagen", null));
            }
          }
          @Override public void onAuthenticationError(int code, CharSequence msg) { act.resolve(cb, res(false, String.valueOf(msg), null)); }
        });
      } catch (Exception e) {
        act.resolve(cb, res(false, "Biometrie nicht verfügbar", null));
      }
    });
  }

  @JavascriptInterface public boolean bioHas(String alias) {
    return act.getSharedPreferences("bio", 0).getString("sec_" + alias, null) != null;
  }

  @JavascriptInterface public void bioClear(String alias) {
    act.getSharedPreferences("bio", 0).edit().remove("sec_" + alias).apply();
  }

  @JavascriptInterface public void bioUnlock(final int cb, final String alias, final String title) {
    act.runOnUiThread(() -> {
      try {
        String blob = act.getSharedPreferences("bio", 0).getString("sec_" + alias, null);
        if (blob == null) { act.resolve(cb, res(false, "nicht eingerichtet", null)); return; }
        String[] parts = blob.split(":");
        final byte[] iv = Base64.decode(parts[0], Base64.NO_WRAP);
        final byte[] ct = Base64.decode(parts[1], Base64.NO_WRAP);
        SecretKey k = bioKey(false);
        if (k == null) { bioClear(alias); act.resolve(cb, res(false, "Schlüssel ungültig", null)); return; }
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        try {
          c.init(Cipher.DECRYPT_MODE, k, new GCMParameterSpec(128, iv));
        } catch (KeyPermanentlyInvalidatedException e) {
          bioClear(alias);
          act.resolve(cb, res(false, "Biometrie wurde geändert – Safe-Passwort neu eingeben", null));
          return;
        }
        BiometricPrompt bp = buildPrompt(title, "Safe entsperren", cb);
        bp.authenticate(new BiometricPrompt.CryptoObject(c), new CancellationSignal(), mainExec(), new BiometricPrompt.AuthenticationCallback() {
          @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r) {
            try {
              byte[] pt = r.getCryptoObject().getCipher().doFinal(ct);
              act.resolve(cb, res(true, null, new String(pt, StandardCharsets.UTF_8)));
            } catch (Exception e) {
              act.resolve(cb, res(false, "Entschlüsselung fehlgeschlagen", null));
            }
          }
          @Override public void onAuthenticationError(int code, CharSequence msg) { act.resolve(cb, res(false, String.valueOf(msg), null)); }
        });
      } catch (Exception e) {
        bioClear(alias);
        act.resolve(cb, res(false, "Biometrie nicht verfügbar oder Schlüssel geändert", null));
      }
    });
  }

  // ---------- Sonstiges ----------
  @JavascriptInterface public void printHtml(final String title, final String html) {
    act.runOnUiThread(() -> act.printHtml(title, html));
  }

  @JavascriptInterface public void openUrl(final String url) {
    act.runOnUiThread(() -> {
      try {
        Uri u = Uri.parse(url);
        String s = u.getScheme();
        if (!"https".equals(s) && !"http".equals(s)) return;
        act.startActivity(new Intent(Intent.ACTION_VIEW, u));
      } catch (Exception e) {
        Toast.makeText(act, "Kein Browser verfügbar", Toast.LENGTH_SHORT).show();
      }
    });
  }

  /** Oeffnet nur die Waehlansicht – es wird nie automatisch angerufen. */
  @JavascriptInterface public void dial(final String number) {
    if (number == null || !number.matches("[0-9+*# ]{2,20}")) return;
    act.runOnUiThread(() -> {
      try {
        act.startActivity(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + number.replace(" ", ""))));
      } catch (Exception e) {
        Toast.makeText(act, "Keine Telefon-App verfügbar", Toast.LENGTH_SHORT).show();
      }
    });
  }

  @JavascriptInterface public void setBars(final int color, final boolean darkIcons) {
    act.runOnUiThread(() -> act.applyBars(color, darkIcons));
  }

  @JavascriptInterface public void setSecure(final boolean on) {
    act.runOnUiThread(() -> act.applySecure(on));
  }

  @JavascriptInterface public void quit() {
    act.runOnUiThread(act::finish);
  }
}
