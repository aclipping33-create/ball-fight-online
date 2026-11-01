# Paket audio + tekstur editable — Online12 2.7.0

Paket ini untuk **mengedit lalu membangun ulang**, bukan ZIP yang diimpor saat game berjalan. Ekstrak Assets.zip ke root Source.zip sehingga `audio/`, `assets/` dan `textures/` menyatu dengan folder proyek yang sudah ada. Backup dahulu.

## Isi tepat

- **36 MP3** mono, 44.1 kHz, 128 kbps: 3 slot × 12 hero.
- **60 gambar hero**: 12 × `ball.webp`, `basic.webp`, `skill.webp`, `ultimate.webp`, `trail.webp`.
- **12 config JSON** hero.
- **3 gambar** `textures/arena/floor.webp`, `textures/arena/wall.webp`, `textures/menu/background.webp`.
- `assets/manifest.js` dan panduan ini. Total 111 file aset terindeks (99 media + 12 config).

Gambar/config tetap identik dengan rilis 2.6. Audio baru merupakan hasil render profil SFX berlapis bawaan ke MP3, bukan rekaman/lagu/suara manusia. Profil noise/filter/resonansi dan fallback prosedural tetap ada pada source `audio-impact.js` + profil hero dalam `hero-duelists.js`. Jika perlu regenerasi MP3: pasang Playwright/Chromium dan Python `lameenc`, jalankan server lokal lalu `TEST_BASE=http://127.0.0.1:3011 node export-audio.cjs`. Ini alat developer, bukan syarat untuk main.

## Nama file audio

Gunakan ID huruf kecil tanpa spasi:

`fosavoldigold`, `paradox`, `fasiamslicer`, `goshiki`, `dummies`, `bladedancer`, `mathemathing`, `gravity`, `bane`, `fakhmolitionator`, `deadbibi`, `amat`.

Contoh:
```
audio/hit_fasiamslicer.mp3
audio/skill_fasiamslicer.mp3
audio/ultimate_fasiamslicer.mp3
```

Pertahankan nama/format MP3 agar loader mendeteksi. Slot `hit` adalah kejadian hit/damage milik sistem aset; bukan jaminan satu suara untuk setiap peluru/basic yang meleset. SFX khusus parry/counter/revive dan pola bos tetap bisa dimainkan secara prosedural sesuai kejadian. Volume/mute berlaku. Bila file custom tidak ada/gagal atau belum siap, audio prosedural lokal tetap menjadi fallback; di jaringan event khusus diturunkan dari perubahan state server.

Dummies tidak memperoleh skill/ULT: kedua MP3 slotnya hanya template yang dapat diedit, tidak mengubah kit. Tidak ada BGM eksternal baru; BGM bawaan tetap ada.

## Gambar per hero

```
assets/heroes/FasiamSlicer/
  ball.webp
  basic.webp
  skill.webp
  ultimate.webp
  trail.webp
  config.json
```

Gunakan nama folder/slot yang sudah ada. WebP paling mudah; PNG/JPG juga didukung. Jika berpindah ekstensi, hapus file slot lama agar tidak ganda. Gunakan transparansi untuk efek/trail. Jangan menambah ID/nama hero hanya untuk reskin.

Config mengatur `scale`, `opacity`, warna dan durasi visual trail. Tidak mengubah statistik/peraturan server. Fasiam/Fosa/Paradox memiliki animasi Canvas native (split/senjata/domain/telegraph), dan config bawaan `customSprites: false` menjaga gambar asli tersebut. Ubah ke `true` untuk overlay tekstur kustom. Mengganti gambar tidak mengganti bentuk hitbox/domain; itu sengaja otoritatif dari server.

## Sesudah edit

```sh
npm ci
npm run build
npm run build:standalone
npm run prepare:worker
npm run sync:android
```

Pilih output yang perlu:
- HTML mandiri baru: gunakan hasil `build:standalone`.
- Web LAN: restart Node dan reload semua browser. Nama file baru memerlukan manifest/build baru.
- Web Online: deploy seluruh source/aset ke Worker yang sama, reload kedua klien.
- APK: sync lalu compile/sign APK baru; lihat `android/README.md` dan workflow cloud manual dari HP.

**ZIP/folder ini tidak dibaca APK yang sudah terpasang.** Semua pemain APK perlu bundle baru yang sama. Art/audio web diunduh dari deployment bersama; tidak dikirim dalam snapshot room. Signing key/password/token tidak disertakan dan jangan ditaruh dalam paket aset.
