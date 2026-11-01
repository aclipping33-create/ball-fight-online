# LAN 2.7.0 — satu HP server Termux

Tanpa PC, VPS, akun cloud atau aktivasi berbayar. Instalasi awal memerlukan internet/data. **Offline satu HTML tidak memerlukan Termux.** LAN dua HP memerlukan satu proses Node authoritative; halaman creator room bukan server simulasi.

**Semua 12 hero tersedia di LAN; server menangani domain/Beta, resurrection, parry/evasion dan damage. Tidak ada batas waktu pertandingan.**

## Instalasi
Pasang Termux dari kanal resmi https://termux.dev/ (misalnya F-Droid), bukan APK dari situs acak. Unduh source ZIP `Ball-Fight-Online12-2.7.0-Source.zip` ke Download.

```sh
pkg update
pkg install nodejs-lts unzip
termux-setup-storage
mkdir -p ~/ball-fight-online12
unzip -o ~/storage/downloads/Ball-Fight-Online12-2.7.0-Source.zip -d ~/ball-fight-online12
cd ~/ball-fight-online12
npm install --omit=dev --ignore-scripts --no-audit --no-fund
termux-wake-lock
npm start
```
Paket ZIP memiliki file proyek langsung pada root. Jika nama file unduhan berubah, sesuaikan. Install dependencies di home Termux, **bukan /sdcard**, karena aturan izin/symlink Android. Engine hasil build sudah disertakan; runtime LAN tidak membutuhkan Acorn/Wrangler atau compiler.

Harus muncul `Ball Fight SERVER-AUTHORITATIVE 2.7.0 — port 3000`. Jangan menutup sesi server.

## Hubungkan pemain
1. Semua HP berada pada Wi-Fi/hotspot yang sama. Catat IP asli **HP yang menjalankan Node** dari Settings Wi-Fi/hotspot, misalnya `192.168.43.1` (contoh, bukan selalu IP yang benar).
2. Buka APK 2.7.0, atau buka `http://IP-ASLI:3000` pada browser kedua HP. Main via HTTP lokal ini menghindari larangan mixed-content HTTPS → WebSocket LAN.
3. Multiplayer → LAN, isi `IP-ASLI:3000` pada **IP Server Host**. Jangan memasukkan URL Workers atau `127.0.0.1` pada HP tamu.
4. Host memilih **PARTY 1V1** atau **BOSS co-op 1–4**, buat room, bagikan kode. Semua pilih hero dan tekan SIAP; host mulai.
5. Berpindah Party ↔ Boss: keluar room dulu, pilih mode, buat room baru. Jaringan tim PvP 2v2 belum tersedia di revamp ini.

APK 2.7.0 dan HTML/web protokol 5 kompatibel. APK/backend lama protokol 4 atau 3 tidak kompatibel.

## Android dan troubleshooting
- Izinkan notifikasi Termux dan aktivitas latar belakang/tanpa optimasi baterai. `termux-wake-lock` membantu, **bukan jaminan** Android tidak membunuh server. Server boleh sekaligus bermain jika HP cukup kuat.
- Jangan matikan hotspot otomatis. Panas, baterai dan aplikasi lain bisa memengaruhi performa. Jika Node berhenti, semua klien kehilangan simulasi—tidak berpindah ke guest.
- Uji `http://IP-ASLI:3000/health` dari HP tamu: harus `version:2.7.0`, `protocol:5`, `heroCount:12`, `authority:server`, modes `1v1,boss`.
- Gagal akses health: cek IP/port, proses Node dan AP/client isolation Wi-Fi; coba hotspot lain. Jangan membuka port router publik untuk LAN.
- `Cannot find module ws`: ulangi instalasi di direktori proyek. Port terpakai: hentikan server lama atau gunakan `PORT=3002 npm start`, lalu semua pemain memakai port 3002.
- Ubah gambar/config: edit `assets/heroes/`, jalankan `npm run assets` (memerlukan dependencies build), restart Node dan reload. Mengedit source tidak mengubah APK yang sudah dipasang.
- Menyalakan lagi: `cd ~/ball-fight-online12 && termux-wake-lock && npm start`. Hentikan dengan Ctrl+C dan `termux-wake-unlock` setelah selesai.

Node dan dua browser lokal sudah diuji; **Termux/HP Android fisik belum diuji langsung**. Tidak dijanjikan kapasitas room/FPS/baterai tanpa batas.
