package de.notfall.familie;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.util.Base64;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.ByteArrayOutputStream;

/**
 * Offline-Kartenkacheln: einfache Dateiablage maps/<paket>/<z>_<x>_<y>.
 * Kartenkacheln sind oeffentliche Daten und werden nicht verschluesselt.
 */
final class MapStore {
  private final File root;

  MapStore(Context c) {
    root = new File(c.getFilesDir(), "maps");
    //noinspection ResultOfMethodCallIgnored
    root.mkdirs();
  }

  private static String pack(String p) {
    if (p == null || !p.matches("[A-Za-z0-9_-]{1,40}")) throw new IllegalArgumentException("Paketname");
    return p;
  }

  private File tile(String p, int z, int x, int y) {
    if (z < 0 || z > 20 || x < 0 || y < 0) throw new IllegalArgumentException("Kachel");
    return new File(new File(root, pack(p)), z + "_" + x + "_" + y);
  }

  boolean put(String p, int z, int x, int y, byte[] data) {
    File f = tile(p, z, x, y);
    //noinspection ResultOfMethodCallIgnored
    f.getParentFile().mkdirs();
    try (FileOutputStream out = new FileOutputStream(f)) {
      out.write(data);
      return true;
    } catch (IOException e) {
      return false;
    }
  }

  String get(String p, int z, int x, int y) {
    File f = tile(p, z, x, y);
    if (!f.exists() || f.length() == 0 || f.length() > 4_000_000) return null;
    byte[] b = new byte[(int) f.length()];
    try (FileInputStream in = new FileInputStream(f)) {
      int off = 0;
      while (off < b.length) { int n = in.read(b, off, b.length - off); if (n < 0) break; off += n; }
    } catch (IOException e) {
      return null;
    }
    return "data:" + mime(b) + ";base64," + Base64.encodeToString(b, Base64.NO_WRAP);
  }

  static String mime(byte[] b) {
    if (b.length > 3 && (b[0] & 0xff) == 0x89 && b[1] == 'P') return "image/png";
    if (b.length > 2 && (b[0] & 0xff) == 0xFF && (b[1] & 0xff) == 0xD8) return "image/jpeg";
    if (b.length > 12 && b[0] == 'R' && b[8] == 'W') return "image/webp";
    return "application/octet-stream";
  }

  long bytes(String p) {
    File[] fs = new File(root, pack(p)).listFiles();
    long s = 0;
    if (fs != null) for (File f : fs) s += f.length();
    return s;
  }

  void delete(String p) {
    File d = new File(root, pack(p));
    File[] fs = d.listFiles();
    if (fs != null) for (File f : fs) //noinspection ResultOfMethodCallIgnored
      f.delete();
    //noinspection ResultOfMethodCallIgnored
    d.delete();
  }

  /** Laedt eine Datei per HTTPS (nur fuer den ausdruecklich gestarteten Kartendownload). */
  static JSONObject httpGet(String url) {
    JSONObject o = new JSONObject();
    HttpURLConnection con = null;
    try {
      if (!url.startsWith("https://")) throw new IOException("Nur HTTPS");
      con = (HttpURLConnection) new URL(url).openConnection();
      con.setConnectTimeout(15000);
      con.setReadTimeout(20000);
      con.setRequestProperty("User-Agent", "NotfallApp/2.2 (Android; Offline-Karten)");
      int code = con.getResponseCode();
      o.put("status", code);
      if (code != 200) { o.put("ok", false); return o; }
      try (InputStream in = con.getInputStream(); ByteArrayOutputStream bo = new ByteArrayOutputStream()) {
        byte[] buf = new byte[16384];
        int n, total = 0;
        while ((n = in.read(buf)) > 0) { total += n; if (total > 2_000_000) throw new IOException("Datei zu groß"); bo.write(buf, 0, n); }
        byte[] b = bo.toByteArray();
        o.put("ok", true);
        o.put("type", mime(b));
        o.put("b64", Base64.encodeToString(b, Base64.NO_WRAP));
      }
    } catch (Exception e) {
      try { o.put("ok", false); o.put("error", String.valueOf(e.getMessage())); } catch (Exception ignored) {}
    } finally {
      if (con != null) con.disconnect();
    }
    return o;
  }

  interface Progress { void report(int done, int total); }

  /** Importiert eine MBTiles-Datei (Raster: PNG/JPEG/WEBP) in ein Paket. */
  JSONObject importMbtiles(InputStream src, File tmp, String p, Progress prog) throws Exception {
    try (OutputStream out = new FileOutputStream(tmp)) {
      byte[] buf = new byte[65536]; int n;
      while ((n = src.read(buf)) > 0) out.write(buf, 0, n);
    }
    JSONObject meta = new JSONObject();
    SQLiteDatabase db = SQLiteDatabase.openDatabase(tmp.getPath(), null, SQLiteDatabase.OPEN_READONLY);
    try {
      try (Cursor c = db.rawQuery("SELECT name, value FROM metadata", null)) {
        while (c.moveToNext()) meta.put(c.getString(0), c.getString(1));
      }
      String fmt = meta.optString("format", "png").toLowerCase();
      if (fmt.equals("pbf") || fmt.equals("mvt")) throw new IOException("Vektorkarten (pbf) werden nicht unterstützt – bitte Rasterkarten (png/jpg).");
      int total;
      try (Cursor c = db.rawQuery("SELECT COUNT(*) FROM tiles", null)) { c.moveToFirst(); total = c.getInt(0); }
      if (total == 0) throw new IOException("Die Datei enthält keine Kacheln.");
      if (total > 300000) throw new IOException("Zu viele Kacheln (" + total + ").");
      int done = 0, minz = 99, maxz = 0;
      try (Cursor c = db.rawQuery("SELECT zoom_level, tile_column, tile_row, tile_data FROM tiles", null)) {
        while (c.moveToNext()) {
          int z = c.getInt(0), x = c.getInt(1), row = c.getInt(2);
          int y = (1 << z) - 1 - row; // MBTiles nutzt TMS-Zeilen
          if (put(p, z, x, y, c.getBlob(3))) done++;
          minz = Math.min(minz, z); maxz = Math.max(maxz, z);
          if (done % 500 == 0) prog.report(done, total);
        }
      }
      meta.put("tiles", done);
      meta.put("minzoomReal", minz);
      meta.put("maxzoomReal", maxz);
      meta.put("bytes", bytes(p));
      return meta;
    } finally {
      db.close();
      //noinspection ResultOfMethodCallIgnored
      tmp.delete();
    }
  }
}
