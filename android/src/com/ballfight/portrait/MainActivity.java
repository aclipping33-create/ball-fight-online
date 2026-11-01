package com.ballfight.portrait;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Bundled, offline-first game. No JS/native bridge and no downloaded executable code. */
public final class MainActivity extends Activity {
    private static final String HOST = "127.0.0.1";
    private static final int PORT = 18473;
    private static final String HOME = "http://127.0.0.1:18473/game.html?app=2700";
    private WebView web;
    private FrameLayout root;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(244, 240, 230));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(244, 240, 230));
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        WebView.setWebContentsDebuggingEnabled(false);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        // Local app origin is HTTP loopback, intercepted in-process. Cleartext LAN WS is
        // permitted by the manifest; cloud health/WS remain HTTPS/WSS in the game.
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (isAppUri(u)) return serve(request);
                return null; // Explicit LAN/cloud connections use Android's network stack.
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (isAppUri(u)) return false;
                if (request.isForMainFrame() && ("https".equals(u.getScheme()) || "http".equals(u.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                }
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Passive helper for lifecycle only; no privileged JS interface is exposed.
                view.evaluateJavascript("window.__ballFightNative=true;", null);
            }
        });
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                Insets cutout = insets.getInsets(WindowInsets.Type.displayCutout());
                v.setPadding(cutout.left, cutout.top, cutout.right, cutout.bottom);
                return insets;
            });
        }
        immersive();
        web.loadUrl(HOME);
    }

    private boolean isAppUri(Uri u) {
        return "http".equals(u.getScheme()) && HOST.equals(u.getHost()) && u.getPort() == PORT;
    }

    private WebResourceResponse plain(int status, String reason, String text) {
        Map<String,String> headers = new HashMap<>();
        headers.put("Cache-Control", "no-store");
        return new WebResourceResponse("text/plain", "UTF-8", status, reason, headers,
                new ByteArrayInputStream(text.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    }

    private WebResourceResponse serve(WebResourceRequest request) {
        String path = request.getUrl().getPath();
        if (path == null || "/".equals(path)) path = "/game.html";
        if (path.contains("..") || path.contains("\\") || path.indexOf('\0') >= 0) return plain(403,"Forbidden","Forbidden");
        if (!"GET".equals(request.getMethod()) && !"HEAD".equals(request.getMethod())) return plain(405,"Method Not Allowed","Method not allowed");
        InputStream input = null;
        try {
            input = getAssets().open("www" + path);
            long size = input.available(), start = 0, end = size - 1;
            int status = 200;
            String range = null;
            for (Map.Entry<String,String> h : request.getRequestHeaders().entrySet()) if ("range".equalsIgnoreCase(h.getKey())) range = h.getValue();
            if (range != null) {
                Matcher match = Pattern.compile("bytes=(\\d*)-(\\d*)").matcher(range);
                if (!match.matches() || (match.group(1).isEmpty() && match.group(2).isEmpty())) { input.close(); return plain(416,"Range Not Satisfiable","Invalid range"); }
                if (match.group(1).isEmpty()) start = Math.max(0, size - Long.parseLong(match.group(2)));
                else { start = Long.parseLong(match.group(1)); if (!match.group(2).isEmpty()) end = Long.parseLong(match.group(2)); }
                end = Math.min(end,size-1);
                if (start < 0 || start > end || start >= size) { input.close(); return plain(416,"Range Not Satisfiable","Invalid range"); }
                long skipped = 0;
                while (skipped < start) { long step = input.skip(start-skipped); if (step <= 0) { if (input.read() < 0) throw new IOException("Unexpected EOF"); step=1; } skipped += step; }
                status = 206;
            }
            String lower = path.toLowerCase(Locale.ROOT);
            String mime = lower.endsWith(".html")?"text/html":lower.endsWith(".js")?"text/javascript":lower.endsWith(".json")?"application/json":lower.endsWith(".png")?"image/png":lower.endsWith(".webp")?"image/webp":(lower.endsWith(".jpg")||lower.endsWith(".jpeg"))?"image/jpeg":lower.endsWith(".mp3")?"audio/mpeg":lower.endsWith(".svg")?"image/svg+xml":"application/octet-stream";
            Map<String,String> headers = new HashMap<>();
            headers.put("Cache-Control","no-store");
            headers.put("X-Content-Type-Options","nosniff");
            headers.put("Accept-Ranges","bytes");
            headers.put("Content-Length",Long.toString(Math.max(0,end-start+1)));
            if (status==206) headers.put("Content-Range","bytes "+start+"-"+end+"/"+size);
            InputStream body = new LimitedStream(input,Math.max(0,end-start+1));
            if ("HEAD".equals(request.getMethod())) { body.close(); body = new ByteArrayInputStream(new byte[0]); }
            return new WebResourceResponse(mime,mime.startsWith("text/")||"application/json".equals(mime)?"UTF-8":null,status,status==206?"Partial Content":"OK",headers,body);
        } catch (Exception error) {
            if(input!=null)try{input.close();}catch(IOException ignored){}
            return plain(404,"Not Found","Bundled asset not found");
        }
    }

    private static final class LimitedStream extends FilterInputStream {
        private long remaining;
        LimitedStream(InputStream in,long count){super(in);remaining=count;}
        @Override public int read() throws IOException { if(remaining<=0)return -1;int b=super.read();if(b>=0)remaining--;return b; }
        @Override public int read(byte[] b,int off,int len) throws IOException { if(remaining<=0)return -1;int n=in.read(b,off,(int)Math.min(len,remaining));if(n>0)remaining-=n;return n; }
    }

    private void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if(controller!=null){controller.hide(WindowInsets.Type.systemBars());controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);}
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }
    @Override public void onWindowFocusChanged(boolean focus){super.onWindowFocusChanged(focus);if(focus)immersive();}
    @Override protected void onPause(){
        if(web!=null){web.evaluateJavascript("if(typeof audioCtx!=='undefined'&&audioCtx)audioCtx.suspend();",null);web.onPause();web.pauseTimers();}
        super.onPause();
    }
    @Override protected void onResume(){
        super.onResume();if(web!=null){web.resumeTimers();web.onResume();web.evaluateJavascript("if(typeof audioCtx!=='undefined'&&audioCtx)audioCtx.resume();if(typeof AssetPack!=='undefined'&&AssetPack)AssetPack.syncBgm();",null);}immersive();
    }
    @Override public void onBackPressed(){
        if(web==null){super.onBackPressed();return;}
        String js="(function(){try{var m=document.getElementById('modal-settings');if(m&&!m.classList.contains('hidden')){closeSettings();return true;}if(typeof lanMoveActive!=='undefined'&&lanMoveActive){lanStopMovementTest();return true;}if(typeof lanInRoom!=='undefined'&&lanInRoom){closeLANRoom();return true;}if(document.body.classList.contains('in-battle')){backToLobby();return true;}if(typeof currentView!=='undefined'&&currentView!=='screen-main-menu'){if(typeof closeLANRoom==='function')closeLANRoom();showView('screen-main-menu');return true;}}catch(e){}return false;})()";
        web.evaluateJavascript(js,value->{if(!"true".equals(value)&&!isFinishing())new AlertDialog.Builder(this).setTitle("Keluar dari Ball Fight?").setMessage("Progres koin dan rank yang sudah tersimpan tetap ada di aplikasi.").setPositiveButton("KELUAR",(d,w)->finish()).setNegativeButton("BATAL",null).show();});
    }
    @Override protected void onDestroy(){if(web!=null){root.removeView(web);web.destroy();web=null;}super.onDestroy();}
}
