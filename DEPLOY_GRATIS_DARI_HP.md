# Online 2.7.0 — deploy dari HP, tanpa PC/VPS

**Status paket:** backend Node dan dua browser lokal sudah diuji; bundling Workers dry-run berhasil. **Belum dideploy ke akun Cloudflare/GitHub pengguna.** Jangan menganggap URL lama sudah menjalankan revamp ini.

- Offline satu HTML tidak membutuhkan langkah ini.
- Online membutuhkan **HTML/web 2.7.0 + Worker protocol 5**. APK lama/backend 2.1 protocol 3 tidak kompatibel. APK 2.7.0 baru dibundel offline dan memakai protokol 5 yang sama.
- Worker menjalankan simulasi server; creator room tidak harus menjadi mesin server. Termux untuk upload/deploy awal saja, tidak harus hidup selama pertandingan Online setelah Worker berhasil berjalan.
- Workers/Durable Objects/hosting gratis memiliki kuota dan batas CPU/request/storage/build. Periksa panel serta ketentuan akun sendiri; tidak dijanjikan unlimited, gratis selamanya atau bebas lag. Jika kuota habis, layanan bisa berhenti/menolak request. Jangan menyalakan paket berbayar jika tidak ingin ditagih.

**Semua 12 hero kini tersedia online, termasuk Fasiam/Fosa/Paradox. Pertandingan tanpa batas waktu; cooldown/skill/telegraph tetap berjalan.**

## 1. Unggah source lengkap ke repo melalui HP
Gunakan akun dan repo milik sendiri. Jangan kirim password, token API, private key atau kode login ke chat.

Unduh `Ball-Fight-Online12-2.7.0-Source.zip` ke Download. Pasang Termux dari kanal resmi https://termux.dev/ .

```sh
pkg update
pkg install git gh unzip
termux-setup-storage
gh auth login --hostname github.com --git-protocol https --web
gh auth setup-git
mkdir -p ~/proyek-game
cd ~/proyek-game
gh repo clone USERNAME/NAMA-REPO ball-fight
cd ball-fight
unzip -o ~/storage/downloads/Ball-Fight-Online12-2.7.0-Source.zip -d .
git status
```
Ganti `USERNAME/NAMA-REPO` dengan repo yang benar. ZIP ini berisi proyek langsung pada root, bukan HTML saja. Jangan mengunggah ZIP sebagai satu file dan berharap Worker otomatis mengekstraknya; gunakan isi hasil ekstraksi.

Tinjau file yang akan dikirim (jangan sertakan rahasia), lalu:
```sh
git add .
git commit -m "Online12 tanpa batas waktu 2.7.0 protocol 5"
git push
```

## 2. Workers Builds dari browser HP
Di dashboard Cloudflare buka Workers, hubungkan repo tersebut melalui integrasi Git. Mode desktop browser dapat membantu.

- Root proyek: folder berisi `package.json`, `worker.js`, `wrangler.toml` (root ZIP).
- Node yang memenuhi proyek: **20 atau lebih baru**, disarankan versi LTS yang didukung build.
- Install dependencies: `npm ci --ignore-scripts --omit=optional`.
- Build: **`npm run prepare:worker`**.
- Deploy: **`npx wrangler deploy`**.

`prepare:worker` membangun ketiga HTML dan engine, lalu menyiapkan `public/` berisi aset bersama. `wrangler.toml` mendefinisikan binding **ROOMS → RoomRelay**, Durable Object SQLite migration dan binding **ASSETS**. Jangan mengganti Worker dengan Pages statis atau hanya mengunggah HTML: itu tidak menjalankan server authoritative.

Nama Worker di konfigurasi harus cocok dengan proyek yang dideploy. Jika ingin mempertahankan APK/backend lama, gunakan **deployment/nama Worker terpisah** untuk 2.7.0; jangan menimpa layanan lama yang masih dipakai. Ikuti wizard akun untuk izin/binding jika diminta. Jangan memasukkan token langsung ke source. Dashboard dapat berubah; jika build menolak SQLite Durable Objects pada konfigurasi akun, periksa dokumentasi/limit akun saat itu—jangan mengaktifkan paket berbayar tanpa persetujuan.

Alternatif jika Node/Wrangler bisa berjalan pada Termux milikmu: install dependencies di home Termux, `npm run prepare:worker`, `npx wrangler login`, lalu `npx wrangler deploy`. Dukungan biner Wrangler/Android bergantung lingkungan, sehingga integrasi build cloud di atas lebih disarankan. Tidak perlu memaksa binary Linux PC berjalan pada Android.

## 3. Verifikasi setelah deploy, jangan hanya melihat status hijau
Buka `https://NAMA-WORKER.SUBDOMAIN.workers.dev/health`:
```json
{"version":"2.7.0","protocol":5,"heroCount":12,"authority":"server","modes":["1v1","boss"]}
```
Health dapat memiliki field lain. Pastikan juga `heroCount:12`; bila masih protocol 4/3, deployment yang berjalan masih lama.

Buka URL HTTPS game pada dua browser HP. Multiplayer → **Online**, masukkan URL HTTPS Worker (bukan IP LAN); buat/join kode room, pilih hero, semua SIAP, host mulai. Tes terpisah:
- **Party 1v1**: rintangan Chaos, gerak kedua pemain, skill, ronde/intermission/first-to-three.
- **Boss**: buat room baru mode Boss, pilih salah satu lima bos, uji warning/peluru/HP/hasil ranking.

Gunakan halaman game dari deployment yang sama agar tekstur dilayani bersama. **Tidak mengirim artwork lewat paket room.** Refresh kedua browser setelah deploy untuk menghindari client lama. Room protokol lama dipisahkan dengan prefix `online12-v5:`.

## 4. Hal yang masih harus dicoba di perangkatmu
Internet antar-HP, stabilitas Wi-Fi/data, latensi, kuota Workers, FPS/panas/baterai dan playtest balance bos belum diverifikasi dari akun/perangkat pengguna. Pengujian lokal dan dry-run bukan bukti deployment internet sukses. Jika ada error, catat pesan build/health tanpa membagikan rahasia; jangan menjanjikan atau mengharapkan “tanpa lag”.
