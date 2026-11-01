# APK bundled Online12 2.7.0

Pemain HP cukup memasang **Ball-Fight-Online12-2.7.0.apk**; tidak perlu Android SDK/PC. Game, 36 MP3 dan semua gambar disimpan dalam APK, bukan URL website. APK adalah klien, bukan server Node.

- Package `com.ballfight.portrait`, versionCode **2700**, versionName **2.7.0**.
- min API 23 / Android 6; target API 35. Android System WebView harus memadai.
- Portrait, no JavaScript/native privileged bridge; app-local loopback origin diintersep langsung dalam WebView, bukan server TCP eksternal.
- Offline tanpa internet. LAN membutuhkan IP host Node/Termux; Online membutuhkan HTTPS Worker **2.7.0 / protocol 5 / 12 hero**.
- APK rilis ditandatangani dengan key rilis sebelumnya. Jika package dan signer aplikasi lama sama, update kompatibel; tidak semua APK pihak lain dengan nama sama kompatibel. Fingerprint publik di `VERIFICATION.json`.
- Tidak ada key/password/token di Source.zip atau Assets.zip. Aset di folder Download tidak otomatis mengubah APK terpasang.

## Rebuild dari source

Dari root source:
```sh
npm ci
npm run sync:android
```

Lalu gunakan Linux/JDK 21 + Android SDK 35, build-tools 35.0.1 (atau kompatibel):
```sh
export ANDROID_JAR="$ANDROID_HOME/platforms/android-35/android.jar"
export BUILD_TOOLS="$ANDROID_HOME/build-tools/35.0.1"
# Opsional: export APK_KEYSTORE=/path/key-milikmu.jks
# Atur APK_STORE_PASSWORD secara rahasia, jangan masukkan nilainya ke repo/chat.
bash android/build-apk.sh
```

Default tanpa key: script membuat key lokal baru (alias `ballfight`) di `android/signing/` yang diabaikan Git. Simpan dengan aman bila ingin APK custom berikutnya saling meng-update. **Key baru tidak bisa menimpa APK rilis ini**; uninstall menyebabkan hilangnya pengaturan aplikasi. Jangan uninstall aplikasi utama tanpa backup/keputusan sadar. Untuk distribusi custom terpisah, developer dapat mengganti package/entrypoint secara konsisten.

Script SDK Linux bukan janji bisa dijalankan langsung di HP ARM/Termux. Untuk main APK siap instal tidak diperlukan langkah build sama sekali.

## Rebuild memakai browser HP + cloud runner (opsional)

Source menyertakan `.github/workflows/build-apk.yml` dengan trigger manual:
1. Ekstrak/upload isi source ke repo milikmu, termasuk folder `.github`, bukan upload ZIP saja.
2. Edit/ganti file audio atau tekstur, commit/push.
3. Aktifkan Actions pada repo bila perlu → **Build editable Ball Fight APK** → **Run workflow**.
4. Unduh artifact **Ball-Fight-Online12-APK**, ekstrak APK-nya lewat HP.

Workflow memakai Linux runner, membangun game + engine, menjalankan tes mekanik, sync bundle lalu sign. Workflow ini **belum dijalankan pada akun pengguna**, dan tergantung dukungan/kuota layanan akun; tidak menjanjikan unlimited/gratis selamanya. Tidak perlu mengaktifkan layanan berbayar untuk sekadar memakai APK rilis.

Opsional secret repo untuk key milikmu yang stabil: `APK_SIGNING_KEY_BASE64` (JKS base64, alias `ballfight`) dan `APK_STORE_PASSWORD`. Jangan commit key/password. Tanpa secret, tiap run menghasilkan key baru dan tidak dapat memperbarui APK rilis atau artifact run sebelumnya. Kunci rilis yang digunakan dalam sesi ini tidak dibagikan.

## Verifikasi

Rilis diperiksa signature v1/v2/v3 dan zipalign. `node android/test-bundle.cjs` menguji file bundle dari origin tiruan di Chromium: 12 hero, 36 MP3, tanpa request luar, Fasiam/Paradox native, Party lewat 60 detik dan Boss lewat 180 detik.

**Bukan pengujian instalasi APK di perangkat/emulator Android.** Instalasi, lifecycle Android, speaker, panas/baterai dan jaringan antar-HP fisik belum diuji.
