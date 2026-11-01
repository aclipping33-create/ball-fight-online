# Ball Fight! Online12 2.7.0

**12 hero offline + LAN/Online · tanpa batas waktu pertandingan · APK offline-bundled · audio/tekstur editable**

## Main dari HP

- Pasang **Ball-Fight-Online12-2.7.0.apk** yang dibagikan terpisah. Android minimum API 23 (Android 6), System WebView yang memadai. Game, 36 MP3 dan gambar tersimpan di APK; offline tidak membuka website dan tidak perlu server.
- Alternatif: **Ball-Fight-Online12-2.7.0.html** mandiri, 99 media ter-embed. Buka lewat browser yang mendukung file HTML lokal.
- Party: first-to-three/BO5. Boss: lima bos, offline atau co-op LAN/Online 1–4 pemain. Classic 1v1/FFA/team auto-combat tetap tersedia. Tidak menambah team PvP jaringan.
- Semua batas waktu menang/kalah dihapus: Party 60 detik, Boss offline 180 detik, cap room 20 menit. Pertandingan berakhir lewat KO/objektif. Countdown awal ronde, intermission, cooldown, durasi ULT/domain, telegraph/pola bos serta timeout koneksi tetap ada.

## Semua hero kini online

Mathemathing, Blade Dancer, Goshiki, Fakhmolitionator, Gravitated/Gravity, Deadbibi, Bane, Dummies, Amat, **Fasiam Slicer, Fosa Voldigold, Paradox**.

Bukan sekadar membuka tombol: server menjalankan kit asli. Snapshot membawa domain/Beta/HP bersama Fasiam dan cancel ULT; telegraph pedang/CD/kebangkitan Fosa; parry/Flow/critical/Absolute Evasion Paradox. Klien hanya mengirim input dan merender. Damage standings seluruh pemain tetap diurutkan; damage pedang Fosa dicatat tepat sekali.

**Wajib server baru:** health `version=2.7.0`, `protocol=5`, `heroCount=12`, `authority=server`. Backend protokol 4/versi 2.6 tidak kompatibel. Server cloud pengguna belum dideploy dari sesi ini. Lihat [deploy via HP](DEPLOY_GRATIS_DARI_HP.md) atau [LAN Termux](LAN_TERMUX_HP.md).

APK adalah klien, **bukan server Node di dalam APK**. Untuk LAN tetap perlu satu perangkat menjalankan Node/Termux dan IP lokal host. Online memakai URL HTTPS Worker; bukan IP LAN. Tidak membutuhkan PC/VPS untuk memainkan APK atau mengelola deployment melalui HP. Kuota gratis tidak berarti unlimited/bebas lag.

## Edit audio dan tekstur

Ekstrak **Ball-Fight-Online12-2.7.0-Assets.zip** ke root source ini, bukan folder aplikasi yang sudah dipasang. ZIP berisi `audio/`, `assets/heroes/`, `textures/`, manifest dan panduan. Tidak ada importer ZIP runtime.

- 36 MP3: `hit_<hero-id-lowercase>.mp3`, `skill_...`, `ultimate_...`.
- 12 folder hero × 5 gambar + 12 `config.json`, ditambah 3 gambar arena/menu.
- Fasiam/Fosa/Paradox memakai Canvas animasi bawaan. Aktifkan `customSprites: true` di config jika ingin overlay gambar kustom. File gambar default tetap dipertahankan; config tidak mengubah damage/HP.
- Dummies tetap basic-only; file skill/ultimate hanya slot template edit, bukan kemampuan baru.
- Volume/mute dan fallback SFX sintetis tetap tersedia. Lihat [ASET_12_HERO.md](ASET_12_HERO.md).

Art web dilayani deployment bersama, **tidak ditransfer dalam paket room**. APK memakai bundle lokal; semua pemain APK perlu build aset yang sama agar reskin seragam. Mengedit ZIP di Download tidak mengubah APK terpasang.

## Source dan build

```sh
npm ci
npm run build              # bangun 3 HTML yang identik + engine authoritative
npm run build:standalone   # satu HTML dengan media tertanam
npm run prepare:worker    # siapkan public/ untuk Worker
npm run sync:android      # regenerasi android/assets/www/
npm start                 # server LAN default port 3000
```

Sumber kanonis: `source/game-base.html`; fragmen Party/Chaos/Boss dan `hero-fasiam.js`, `hero-duelists.js`; adaptasi jaringan `online12-world.js`, `online12-client.js`, `shared/world-api.js`, `shared/room-session.mjs`, `client-authority.js`, `network-chaos.js`. Jangan hanya mengedit HTML keluaran. Build berulang idempoten.

Build APK native opsional: [android/README.md](android/README.md). Ada workflow manual `.github/workflows/build-apk.yml` agar rebuild bisa diminta lewat browser HP, menggunakan runner cloud Linux. Workflow disediakan, **belum dijalankan pada akun pengguna**; ketersediaan/kuota layanan bergantung akun. Signing key rilis tidak dibagikan. APK custom dengan key berbeda tidak bisa menimpa APK rilis ini.

## Pengujian rilis

```sh
npm test                         # 109 grup mekanik
npm run test:parity               # 1800 snapshot 6 hero lama, metadata baru dinormalisasi
npx playwright install chromium  # browser QA pada lingkungan yang mendukung Chromium
node tests/evasion-browser.cjs
node tests/chaos-browser.cjs
TEST_PORT=3011 node tests/chaos-network.cjs # perlu server: PORT=3011 npm start
node tests/online12-network.cjs    # self-contained server uji port 3012 + 4 peers
node tests/audio-chaos.cjs
node android/test-bundle.cjs      # sesudah sync:android
npx wrangler deploy --dry-run
```

Hasil rilis ada di `verification/release-checks.json`. QA mencakup browser desktop dengan emulasi touch/portrait, koneksi Node WebSocket sungguhan, 4 peer co-op, MP3 decode/playback, signature/zipalign APK. **Belum diuji instalasi APK/perangkat Android fisik, speaker, panas/baterai, internet publik antar-HP, dan deployment/kuota akun cloud pengguna.** Tidak mengklaim nol lag, unlimited, atau balance sempurna.
