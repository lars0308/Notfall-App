package de.notfall.familie;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Notfallpass über dem Sperrbildschirm – ohne Entsperren, ohne Zugang zur restlichen App.
 * Zeigt nur die gespeicherten, freigegebenen Angaben. Anrufe öffnen nur die Wählansicht.
 */
public class PassActivity extends Activity {
  private float dp;

  @Override protected void onCreate(Bundle state) {
    super.onCreate(state);
    setShowWhenLocked(true);
    setTurnScreenOn(true);
    dp = getResources().getDisplayMetrics().density;
    getWindow().setStatusBarColor(Color.parseColor("#14080a"));
    getWindow().setNavigationBarColor(Color.parseColor("#14080a"));

    ScrollView sv = new ScrollView(this);
    sv.setBackgroundColor(Color.parseColor("#14080a"));
    LinearLayout col = new LinearLayout(this);
    col.setOrientation(LinearLayout.VERTICAL);
    int pad = px(16);
    col.setPadding(pad, pad, pad, px(32));
    sv.addView(col);

    col.addView(text("NOTFALLPASS", 26, true, "#ffffff"));
    col.addView(text("Angaben für Rettungskräfte. Vom Besitzer freigegeben.", 14, false, "#f1c8ca"));
    col.addView(callButton("112 anrufen", "112", true));

    String json = LockPass.json(this);
    try {
      JSONObject root = new JSONObject(json);
      JSONArray people = root.optJSONArray("people");
      if (people != null) for (int i = 0; i < people.length(); i++) {
        JSONObject p = people.getJSONObject(i);
        LinearLayout card = card();
        String head = p.optString("name") + (p.optString("age").isEmpty() ? "" : ", " + p.optString("age") + " Jahre");
        card.addView(text(head, 22, true, "#ffffff"));
        JSONArray rows = p.optJSONArray("rows");
        if (rows != null) for (int k = 0; k < rows.length(); k++) {
          JSONArray r = rows.getJSONArray(k);
          card.addView(text(r.optString(0), 13, false, "#f1c8ca"));
          card.addView(text(r.optString(1), 18, true, "#ffffff"));
        }
        JSONArray cs = p.optJSONArray("contacts");
        if (cs != null) for (int k = 0; k < cs.length(); k++) {
          JSONObject ct = cs.getJSONObject(k);
          String label = ct.optString("name") + (ct.optString("relation").isEmpty() ? "" : " (" + ct.optString("relation") + ")");
          card.addView(text(label, 15, false, "#ffffff"));
          if (!ct.optString("phone").isEmpty()) card.addView(callButton(ct.optString("phone"), ct.optString("phone"), false));
        }
        col.addView(card);
      }
      String upd = root.optString("updated");
      if (!upd.isEmpty()) col.addView(text("Stand: " + upd, 12, false, "#f1c8ca"));
    } catch (Exception e) {
      col.addView(text("Kein Notfallpass gespeichert.", 16, false, "#ffffff"));
    }
    setContentView(sv);
  }

  private int px(int v) { return Math.round(v * dp); }

  private TextView text(String s, int sp, boolean bold, String color) {
    TextView t = new TextView(this);
    t.setText(s);
    t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
    t.setTextColor(Color.parseColor(color));
    if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
    t.setPadding(0, px(4), 0, px(4));
    return t;
  }

  private LinearLayout card() {
    LinearLayout c = new LinearLayout(this);
    c.setOrientation(LinearLayout.VERTICAL);
    c.setPadding(px(16), px(12), px(16), px(12));
    GradientDrawable bg = new GradientDrawable();
    bg.setColor(Color.parseColor("#241012"));
    bg.setStroke(px(1), Color.parseColor("#6d2a2e"));
    bg.setCornerRadius(px(16));
    c.setBackground(bg);
    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
    lp.topMargin = px(14);
    c.setLayoutParams(lp);
    return c;
  }

  private View callButton(String label, final String number, boolean big) {
    Button b = new Button(this);
    b.setText(label);
    b.setAllCaps(false);
    b.setTextColor(Color.WHITE);
    b.setTextSize(TypedValue.COMPLEX_UNIT_SP, big ? 22 : 18);
    b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
    b.setGravity(Gravity.CENTER);
    GradientDrawable bg = new GradientDrawable();
    bg.setColor(Color.parseColor(big ? "#c62828" : "#321618"));
    bg.setStroke(px(2), Color.parseColor(big ? "#ff5a5f" : "#b0474d"));
    bg.setCornerRadius(px(14));
    b.setBackground(bg);
    b.setMinHeight(px(big ? 64 : 52));
    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
    lp.topMargin = px(10);
    b.setLayoutParams(lp);
    b.setOnClickListener(v -> {
      try { startActivity(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(number)))); } catch (Exception ignored) { }
    });
    return b;
  }
}
