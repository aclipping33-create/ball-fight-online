# Ball Fight! 2.7.0 — Online12 + tanpa timer pertandingan

## Unduhan

| File | Isi |
|---|---|
| `Ball-Fight-Online12-2.7.0.apk` | Game Android dengan game/audio/gambar di dalam APK; bisa offline |
| `Ball-Fight-Online12-2.7.0-Assets.zip` | 36 MP3, 60 gambar hero, 12 config, 3 gambar arena/menu + manifest/panduan |
| `Ball-Fight-Online12-2.7.0-Source.zip` | Source web, server LAN/Worker, source Android, seluruh aset, alat build, tes dan panduan HP |
| `Ball-Fight-Online12-2.7.0.html` | Versi satu file dengan 99 media tertanam |

## Perubahan

1. **Tidak ada batas waktu pertandingan**, offline maupun LAN/Online. Party tidak lagi berhenti pada 60 detik atau membandingkan HP%, Boss offline tidak lagi mengalahkan pemain karena 180 detik, dan room server tidak lagi dipaksa DRAW setelah 20 menit. KO/objektif tetap mengakhiri match; Party tetap first-to-three/BO5.
2. **Cooldown dan durasi skill tetap ada.** Countdown ronde, intermission, domain Fasiam 3 detik, Absolute Evasion Paradox 3 detik, telegraph/pola boss dan timeout koneksi bukan timer match dan tidak dihapus.
3. **Seluruh 12 hero LAN/Online**, termasuk Fasiam Slicer, Fosa Voldigold, Paradox. Bukan hanya opsi hero dibuka: domain/companion Beta/HP bersama/cancel, sword windup/revive/CD, parry/Flow/critical/Evasion diproses server dan disinkronkan ke klien. Boss co-op 1–4 juga didukung.
4. Fosa Venuzdon­oa masuk damage standings tepat sekali; Perfect Parry tetap mengalahkan pedangnya. Ranking total damage seluruh pemain tetap descending dan TOP DAMAGE.
5. **APK offline-bundled** dengan package lama `com.ballfight.portrait`, versionCode 2700. Signature v1/v2/v3 + zipalign lulus; key rilis sebelumnya dipakai untuk kompatibilitas update jika signer/package aplikasi lama sama.
6. **ZIP aset editable terpisah**, bukan runtime ZIP importer. MP3 diekspor dari profil SFX berlapis asli; volume/mute/fallback tetap ada. 75 file gambar/config lama byte-identik dengan 2.6. Fasiam/Fosa/Paradox tetap memakai animasi Canvas asli secara default; untuk overlay reskin aktifkan `customSprites: true` di config.
7. Paradox tetap basic otomatis, tidak mempunyai Dash/tombol BASIC/Zero Zone. Nerf basic Amat dan kit lain dari 2.6 dipertahankan. Tidak ada ekonomi/unlock/pembelian baru.

## Penting: server jaringan wajib diperbarui

**Client dan backend harus 2.7.0 / protocol 5 / heroCount 12 / authority server.** APK/backend lama protokol 4 tidak kompatibel. Source dan panduan deploy dari HP disertakan; **Worker akun pengguna belum dideploy** oleh sesi ini. Tidak mengklaim URL server lama sudah diperbarui.

- Offline langsung main tanpa backend.
- LAN: Wi-Fi/hotspot sama, satu perangkat Node/Termux tetap menyala, masukkan IP lokal host. APK bukan server.
- Online: URL HTTPS Worker yang benar, bukan IP LAN. Deploy game/engine/aset lengkap ke layanan yang sama.
- Gambar/audio tidak dimasukkan ke paket room. Browser mengambil aset dari deployment; APK memakai bundle lokal sehingga perlu APK baru dengan aset seragam untuk reskin bersama.
- Gratis mengikuti kuota/CPU/request/storage layanan. Tidak dijanjikan unlimited, gratis selamanya atau tanpa lag. Tidak perlu mengaktifkan layanan berbayar untuk memakai APK offline.

## Cara edit aset

Ekstrak Source.zip, kemudian gabungkan isi Assets.zip ke root proyek. Ganti nama file slot yang sama, pertahankan format yang didukung. Jalankan build lalu buat ulang HTML/deployment/APK; mengedit ZIP/folder Download **tidak** mengubah APK terpasang.

Lihat `ASET_12_HERO.md`, `android/README.md`, `DEPLOY_GRATIS_DARI_HP.md`, `LAN_TERMUX_HP.md`. Disediakan workflow build APK manual via browser HP/cloud runner, tetapi workflow tersebut belum dijalankan pada akun pengguna. Key rilis, password dan token **tidak** disertakan. APK rebuild dengan key berbeda tidak bisa menimpa APK rilis ini.

## Pengujian yang selesai

- **109 grup mekanik** lulus; termasuk seluruh 144 pasangan hero, native kit dan scope tanpa timer.
- **12 uji browser Evasion + 19 regresi browser** lulus.
- **7 uji jaringan lama + 9 uji Online12** memakai HTTP/WebSocket Node sungguhan. Empat browser simultan co-op Fasiam/Fosa/Paradox/Amat; update/combat browser sengaja dibuat melempar error agar terbukti server-only.
- **9 uji bundle APK** melalui origin app lokal tiruan; offline Party berjalan melewati 60 detik dan Boss melewati 180 detik; tidak ada request luar.
- **36 MP3** berhasil di-decode, tidak kosong/clipping pada pemeriksaan waveform; playback custom/volume/mute teruji.
- **15 kasus waveform SFX**, **3 uji recovery adapter Worker**, **1.800 snapshot enam hero lama** identik setelah metadata tampilan/protokol baru dinormalisasi.
- Tiga HTML folder identik, build idempoten, 75 file visual/config lama utuh, isi aset APK cocok, signature/zipalign APK lulus.
- Worker **dry-run bundling** berhasil, bukan deployment publik.

**Belum diuji:** pemasangan APK/perangkat atau emulator Android, lifecycle native, speaker fisik, panas/baterai, Wi-Fi/internet publik antar-HP, kuota/akun cloud pengguna dan human balance. Pengujian Chromium/emulasi touch bukan jaminan semua Android atau semua kondisi jaringan.
