package de.notfall.familie;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.util.ArrayList;
import java.util.List;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Lokaler Schluessel-Wert-Speicher. Jede Datei wird mit einem im Android Keystore
 * liegenden AES-256-GCM-Schluessel verschluesselt (Schluessel verlaesst das Geraet nie).
 * Der Dateiname dient als zusaetzliche authentifizierte Information (AAD).
 */
final class SecureStore {
  private static final String ALIAS = "notfall_master_v1";
  private static final int VERSION = 1;
  private final File dir;
  private SecretKey key;

  SecureStore(Context c) {
    dir = new File(c.getFilesDir(), "store");
    //noinspection ResultOfMethodCallIgnored
    dir.mkdirs();
  }

  private synchronized SecretKey key() throws GeneralSecurityException, IOException {
    if (key != null) return key;
    KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
    ks.load(null);
    if (ks.containsAlias(ALIAS)) {
      key = (SecretKey) ks.getKey(ALIAS, null);
    } else {
      KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
      kg.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
          .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
          .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
          .setKeySize(256)
          .build());
      key = kg.generateKey();
    }
    return key;
  }

  static String check(String name) {
    if (name == null || name.isEmpty() || name.length() > 120 || !name.matches("[A-Za-z0-9_.-]+") || name.contains("..")) {
      throw new IllegalArgumentException("Ungueltiger Speichername");
    }
    return name;
  }

  private File file(String name) { return new File(dir, check(name) + ".bin"); }

  synchronized boolean put(String name, String value) {
    File target = file(name);
    File tmp = new File(dir, check(name) + ".tmp");
    try {
      Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
      c.init(Cipher.ENCRYPT_MODE, key());
      c.updateAAD(name.getBytes(StandardCharsets.UTF_8));
      byte[] iv = c.getIV();
      byte[] ct = c.doFinal(value.getBytes(StandardCharsets.UTF_8));
      try (FileOutputStream out = new FileOutputStream(tmp)) {
        out.write(VERSION);
        out.write(iv.length);
        out.write(iv);
        out.write(ct);
        out.getFD().sync();
      }
      if (target.exists() && name.equals("db")) {
        File bak = new File(dir, "db.bak");
        //noinspection ResultOfMethodCallIgnored
        bak.delete();
        //noinspection ResultOfMethodCallIgnored
        target.renameTo(bak);
      }
      if (!tmp.renameTo(target)) {
        // Fallback: ueberschreiben
        //noinspection ResultOfMethodCallIgnored
        target.delete();
        if (!tmp.renameTo(target)) return false;
      }
      return true;
    } catch (Exception e) {
      //noinspection ResultOfMethodCallIgnored
      tmp.delete();
      return false;
    }
  }

  synchronized String get(String name) {
    String v = read(file(name), name);
    if (v == null && name.equals("db")) v = read(new File(dir, "db.bak"), name);
    return v;
  }

  private String read(File f, String name) {
    if (!f.exists()) return null;
    try {
      byte[] all = new byte[(int) f.length()];
      try (FileInputStream in = new FileInputStream(f)) {
        int off = 0;
        while (off < all.length) {
          int n = in.read(all, off, all.length - off);
          if (n < 0) break;
          off += n;
        }
      }
      if (all.length < 3 || all[0] != VERSION) return null;
      int ivLen = all[1] & 0xff;
      Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
      c.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, all, 2, ivLen));
      c.updateAAD(name.getBytes(StandardCharsets.UTF_8));
      byte[] pt = c.doFinal(all, 2 + ivLen, all.length - 2 - ivLen);
      return new String(pt, StandardCharsets.UTF_8);
    } catch (Exception e) {
      return null;
    }
  }

  synchronized boolean delete(String name) {
    File f = file(name);
    boolean ok = !f.exists() || f.delete();
    if (name.equals("db")) {
      //noinspection ResultOfMethodCallIgnored
      new File(dir, "db.bak").delete();
    }
    return ok;
  }

  synchronized List<String> list(String prefix) {
    List<String> out = new ArrayList<>();
    String[] names = dir.list();
    if (names == null) return out;
    for (String n : names) {
      if (!n.endsWith(".bin")) continue;
      String base = n.substring(0, n.length() - 4);
      if (prefix == null || base.startsWith(prefix)) out.add(base);
    }
    return out;
  }

  synchronized void wipeAll() {
    String[] names = dir.list();
    if (names == null) return;
    for (String n : names) {
      //noinspection ResultOfMethodCallIgnored
      new File(dir, n).delete();
    }
  }
}
