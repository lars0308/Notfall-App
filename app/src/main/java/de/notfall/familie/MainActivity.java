package de.notfall.familie;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;

public class MainActivity extends Activity {
  static final String HOST = "app.notfall.invalid";
  private static final String BASE = "https://" + HOST + "/";
  private static final int REQ_PICK = 4242, REQ_PHOTO = 4243, REQ_MAP = 4244;
  private static final int PERM_CAMERA = 11, PERM_WEBCAM = 12, PERM_NOTIF = 13, PERM_GEO = 14;
  private android.webkit.GeolocationPermissions.Callback geoCb; private String geoOrigin;

  private WebView webView;
  private FrameLayout root;
  private ValueCallback<Uri[]> fileCallback;
  private File camFile;
  private int camCb = -1, pendingCamCb = -1, pendingNotifCb = -1;
  private PermissionRequest pendingWebPerm;
  private WebView printView;
  private NativeBridge bridge;
  private boolean pageReady = false;
  private String pendingRoute;
  private int mapCb = -1;
  private String mapPack;

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    root = new FrameLayout(this);
    webView = new WebView(this);
    root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
    setContentView(root);
    cleanCameraCache();

    WebSettings s = webView.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(false);
    s.setJavaScriptCanOpenWindowsAutomatically(false);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    s.setSupportZoom(false);
    s.setBuiltInZoomControls(false);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setSaveFormData(false);
    s.setGeolocationEnabled(true);
    webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
    bridge = new NativeBridge(this);
    webView.addJavascriptInterface(bridge, "NotfallAndroid");
    pendingRoute = routeFrom(getIntent());

    webView.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
        Uri uri = request.getUrl();
        return !("https".equals(uri.getScheme()) && HOST.equals(uri.getHost()));
      }

      @Override public void onPageFinished(WebView view, String url) {
        pageReady = true;
        deliverRoute();
      }

      @Override public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
        // WebView-Prozess wurde beendet (z. B. Speichermangel): App nicht abstuerzen lassen, sondern neu aufbauen.
        runOnUiThread(() -> recreate());
        return true;
      }

      @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (!"https".equals(uri.getScheme()) || !HOST.equals(uri.getHost())) {
          return response(403, "text/plain", new ByteArrayInputStream("Blocked".getBytes(StandardCharsets.UTF_8)));
        }
        String path = uri.getPath();
        if (path == null || path.equals("/")) path = "/index.html";
        if (path.contains("..") || path.contains("\\")) return response(403, "text/plain", new ByteArrayInputStream(new byte[0]));
        try {
          String name = path.substring(1);
          InputStream in = getAssets().open("www/" + name);
          return response(200, mime(name), in);
        } catch (IOException e) {
          return response(404, "text/plain", new ByteArrayInputStream(new byte[0]));
        }
      }
    });

    webView.setWebChromeClient(new WebChromeClient() {
      @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        fileCallback = callback;
        try {
          Intent chooser = params.createIntent();
          chooser.addCategory(Intent.CATEGORY_OPENABLE);
          startActivityForResult(chooser, REQ_PICK);
          return true;
        } catch (Exception e) {
          fileCallback = null;
          Toast.makeText(MainActivity.this, "Dateiauswahl nicht verfügbar", Toast.LENGTH_LONG).show();
          return false;
        }
      }

      // Standort nur fuer die eigene Oberflaeche und nur auf Knopfdruck („Standort bestimmen“)
      @Override public void onGeolocationPermissionsShowPrompt(String origin, android.webkit.GeolocationPermissions.Callback callback) {
        Uri o = Uri.parse(origin);
        if (!HOST.equals(o.getHost())) { callback.invoke(origin, false, false); return; }
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) { callback.invoke(origin, true, false); return; }
        geoCb = callback; geoOrigin = origin;
        requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, PERM_GEO);
      }

      @Override public void onPermissionRequest(final PermissionRequest req) {
        runOnUiThread(() -> {
          boolean video = false;
          for (String r : req.getResources()) if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) video = true;
          if (!video || !HOST.equals(req.getOrigin().getHost())) { req.deny(); return; }
          if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            req.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
          } else {
            if (pendingWebPerm != null) pendingWebPerm.deny();
            pendingWebPerm = req;
            requestPermissions(new String[]{Manifest.permission.CAMERA}, PERM_WEBCAM);
          }
        });
      }
    });

    webView.loadUrl(BASE + "index.html");
  }

  // ---------- Hilfen ----------
  private WebResourceResponse response(int status, String mime, InputStream in) {
    HashMap<String, String> h = new HashMap<>();
    h.put("Cache-Control", "no-store");
    return new WebResourceResponse(mime, "UTF-8", status, status == 200 ? "OK" : "Error", h, in);
  }

  private String mime(String p) {
    if (p.endsWith(".html")) return "text/html";
    if (p.endsWith(".js")) return "application/javascript";
    if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
    if (p.endsWith(".svg")) return "image/svg+xml";
    if (p.endsWith(".css")) return "text/css";
    if (p.endsWith(".png")) return "image/png";
    return "application/octet-stream";
  }

  /** Ergebnis asynchroner Native-Aufrufe an JS zurueckgeben. */
  void resolve(final int id, final String json) {
    runOnUiThread(() -> {
      if (webView == null) return;
      webView.evaluateJavascript("window.__nativeResult&&window.__nativeResult(" + id + "," + JSONObject.quote(json) + ")", null);
    });
  }

  private void cleanCameraCache() {
    File[] fs = new File(getCacheDir(), "cam").listFiles();
    if (fs != null) for (File f : fs) //noinspection ResultOfMethodCallIgnored
      f.delete();
  }

  void applyBars(int color, boolean darkIcons) {
    Window w = getWindow();
    w.setStatusBarColor(color);
    w.setNavigationBarColor(color);
    root.setBackgroundColor(color);
    webView.setBackgroundColor(color);
    View d = w.getDecorView();
    int f = d.getSystemUiVisibility();
    int mask = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
    d.setSystemUiVisibility(darkIcons ? (f | mask) : (f & ~mask));
  }

  void applySecure(boolean on) {
    if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
    else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
  }

  // ---------- Oeffnen aus einer Benachrichtigung (z. B. Probealarm) ----------
  private static String routeFrom(Intent i) {
    if (i == null) return null;
    String r = i.getStringExtra("route");
    return r != null && r.matches("#/[A-Za-z0-9/_?=&.-]{1,120}") ? r : null;
  }

  @Override protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    String r = routeFrom(intent);
    if (r != null) { pendingRoute = r; deliverRoute(); }
  }

  private void deliverRoute() {
    if (!pageReady || pendingRoute == null || webView == null) return;
    String r = pendingRoute;
    pendingRoute = null;
    webView.evaluateJavascript("window.__openRoute&&window.__openRoute(" + JSONObject.quote(r) + ")", null);
  }

  // ---------- Kartenimport (MBTiles) ----------
  void startMapImport(int cb, String pack) {
    mapCb = cb;
    mapPack = pack;
    try {
      Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
      startActivityForResult(i, REQ_MAP);
    } catch (Exception e) {
      resolve(cb, "{\"ok\":false,\"error\":\"Dateiauswahl nicht verfügbar\"}");
    }
  }

  private void finishMapImport(int cb, String pack, Uri uri) {
    new Thread(() -> {
      try (InputStream in = getContentResolver().openInputStream(uri)) {
        if (in == null) throw new IOException("Datei nicht lesbar");
        JSONObject meta = bridge.maps().importMbtiles(in, new File(getCacheDir(), "import.mbtiles"), pack, (done, total) ->
            runOnUiThread(() -> webView.evaluateJavascript("window.__mapProgress&&window.__mapProgress(" + done + "," + total + ")", null)));
        JSONObject o = new JSONObject();
        o.put("ok", true);
        o.put("meta", meta);
        resolve(cb, o.toString());
      } catch (Throwable t) {
        bridge.maps().delete(pack);
        try {
          JSONObject o = new JSONObject();
          o.put("ok", false);
          o.put("error", t.getMessage() == null ? "Import fehlgeschlagen" : t.getMessage());
          resolve(cb, o.toString());
        } catch (Exception ignored) {}
      }
    }).start();
  }

  // ---------- Kamera ----------
  void startCameraCapture(int cb) {
    if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
      pendingCamCb = cb;
      requestPermissions(new String[]{Manifest.permission.CAMERA}, PERM_CAMERA);
      return;
    }
    launchCamera(cb);
  }

  private void launchCamera(int cb) {
    try {
      File dir = new File(getCacheDir(), "cam");
      //noinspection ResultOfMethodCallIgnored
      dir.mkdirs();
      camFile = File.createTempFile("cap", ".jpg", dir);
      camCb = cb;
      Uri u = FileProvider.getUriForFile(this, getPackageName() + ".files", camFile);
      Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
      i.putExtra(MediaStore.EXTRA_OUTPUT, u);
      i.setClipData(ClipData.newRawUri("", u));
      i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
      startActivityForResult(i, REQ_PHOTO);
    } catch (Exception e) {
      resolve(cb, "{\"ok\":false,\"error\":\"Keine Kamera-App verfügbar\"}");
    }
  }

  void requestNotifPermission(int cb) {
    if (Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
      boolean on = getSystemService(android.app.NotificationManager.class).areNotificationsEnabled();
      resolve(cb, "{\"ok\":" + on + "}");
      return;
    }
    pendingNotifCb = cb;
    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, PERM_NOTIF);
  }

  @Override public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
    super.onRequestPermissionsResult(code, perms, results);
    boolean ok = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
    if (code == PERM_CAMERA) {
      int cb = pendingCamCb;
      pendingCamCb = -1;
      if (ok) launchCamera(cb); else resolve(cb, "{\"ok\":false,\"error\":\"Kamera-Berechtigung fehlt\"}");
    } else if (code == PERM_WEBCAM) {
      if (pendingWebPerm != null) {
        if (ok) pendingWebPerm.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE}); else pendingWebPerm.deny();
        pendingWebPerm = null;
      }
    } else if (code == PERM_GEO) {
      boolean any = false; for (int r : results) if (r == PackageManager.PERMISSION_GRANTED) any = true;
      if (geoCb != null) { geoCb.invoke(geoOrigin, any, false); geoCb = null; geoOrigin = null; }
    } else if (code == PERM_NOTIF) {
      int cb = pendingNotifCb;
      pendingNotifCb = -1;
      resolve(cb, "{\"ok\":" + ok + "}");
    }
  }

  @Override protected void onActivityResult(int req, int res, Intent data) {
    super.onActivityResult(req, res, data);
    if (req == REQ_PICK && fileCallback != null) {
      fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
      fileCallback = null;
    } else if (req == REQ_MAP) {
      int cb = mapCb; String pack = mapPack; mapCb = -1;
      if (res != RESULT_OK || data == null || data.getData() == null) { resolve(cb, "{\"ok\":false,\"error\":\"abgebrochen\"}"); return; }
      finishMapImport(cb, pack, data.getData());
    } else if (req == REQ_PHOTO) {
      final int cb = camCb;
      final File f = camFile;
      camCb = -1;
      camFile = null;
      if (res != RESULT_OK || f == null || f.length() == 0) {
        if (f != null) //noinspection ResultOfMethodCallIgnored
          f.delete();
        resolve(cb, "{\"ok\":false,\"error\":\"abgebrochen\"}");
        return;
      }
      new Thread(() -> {
        try {
          String url = scaleJpeg(f, 1600);
          JSONObject o = new JSONObject();
          o.put("ok", true);
          o.put("dataUrl", url);
          resolve(cb, o.toString());
        } catch (Throwable t) {
          resolve(cb, "{\"ok\":false,\"error\":\"Foto konnte nicht verarbeitet werden\"}");
        } finally {
          //noinspection ResultOfMethodCallIgnored
          f.delete();
        }
      }).start();
    }
  }

  private static String scaleJpeg(File f, int maxSide) throws IOException {
    BitmapFactory.Options o = new BitmapFactory.Options();
    o.inJustDecodeBounds = true;
    BitmapFactory.decodeFile(f.getAbsolutePath(), o);
    int sample = 1;
    while (Math.max(o.outWidth, o.outHeight) / sample > maxSide * 2) sample *= 2;
    BitmapFactory.Options o2 = new BitmapFactory.Options();
    o2.inSampleSize = sample;
    Bitmap b = BitmapFactory.decodeFile(f.getAbsolutePath(), o2);
    if (b == null) throw new IOException("decode");
    int rot = 0;
    try {
      int ori = new ExifInterface(f.getAbsolutePath()).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
      if (ori == ExifInterface.ORIENTATION_ROTATE_90) rot = 90;
      else if (ori == ExifInterface.ORIENTATION_ROTATE_180) rot = 180;
      else if (ori == ExifInterface.ORIENTATION_ROTATE_270) rot = 270;
    } catch (IOException ignored) {}
    float scale = Math.min(1f, (float) maxSide / Math.max(b.getWidth(), b.getHeight()));
    Matrix m = new Matrix();
    m.postScale(scale, scale);
    if (rot != 0) m.postRotate(rot);
    Bitmap out = Bitmap.createBitmap(b, 0, 0, b.getWidth(), b.getHeight(), m, true);
    ByteArrayOutputStream bos = new ByteArrayOutputStream();
    out.compress(Bitmap.CompressFormat.JPEG, 82, bos);
    return "data:image/jpeg;base64," + Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP);
  }

  // ---------- Drucken ----------
  void printHtml(final String title, String html) {
    printView = new WebView(this);
    printView.getSettings().setJavaScriptEnabled(false);
    printView.setWebViewClient(new WebViewClient() {
      @Override public void onPageFinished(WebView view, String url) {
        PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
        pm.print(title, view.createPrintDocumentAdapter(title), new PrintAttributes.Builder().build());
      }
    });
    printView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
  }

  // ---------- Lebenszyklus ----------
  @Override public void onBackPressed() {
    webView.evaluateJavascript("(window.__handleBack?window.__handleBack():false)", v -> {
      if ("true".equals(v)) return;
      if (webView.canGoBack()) webView.goBack(); else finish();
    });
  }

  @Override protected void onPause() {
    webView.evaluateJavascript("window.__flush&&window.__flush()", null);
    super.onPause();
  }

  @Override protected void onDestroy() {
    if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
    webView.destroy();
    super.onDestroy();
  }
}
