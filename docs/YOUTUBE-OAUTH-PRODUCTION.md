# Panduan rilis OAuth YouTube Gaul FM

Dokumen ini dipakai ketika integrasi YouTube pada panel admin akan dipindahkan dari domain pengembangan ke domain produksi.

## Kondisi pengembangan saat ini

- Panel: `https://admingaul.duckdns.org/`
- Callback OAuth: `https://admingaul.duckdns.org/api/youtube/oauth/callback`
- Google Cloud project: gunakan project GaulFM yang sama dengan konfigurasi yang sekarang.
- OAuth client: buat client Web application khusus bernama `Gaul FM Admin YouTube`. Jangan memakai client Supabase agar rotasi secret dan callback admin tidak mengganggu login pengguna.
- Scope: `https://www.googleapis.com/auth/youtube.force-ssl`.
- Token OAuth disimpan terenkripsi di server. Stream key tidak dikirim ke browser.

Domain `https://insightradio.duckdns.org/` tetap dipakai Icecast. Subdomain DuckDNS `admingaul` meneruskan seluruh path ke Next.js admin.

## Persiapan sebelum rilis produksi

1. Tentukan domain final, misalnya `admin.radiogaulfmsmg.com`, dan arahkan DNS A record ke `40.81.231.250`.
2. Pasang atau perbarui sertifikat TLS yang valid dan aktifkan perpanjangan otomatis.
3. Lindungi panel admin dengan login dan pembatasan hak operator sebelum OAuth produksi diaktifkan. OAuth YouTube memberikan kemampuan mengubah judul, membuat, mengikat, dan mengontrol siaran channel.
4. Di Google Cloud Console, aktifkan YouTube Data API v3 dan gunakan OAuth client Web application khusus admin.
5. Tambahkan callback produksi yang persis sama, termasuk skema dan path:

   ```text
   https://admin.radiogaulfmsmg.com/api/youtube/oauth/callback
   ```

6. Selama migrasi, pertahankan callback DuckDNS. Hapus callback lama hanya setelah alur produksi berhasil diuji.
7. Jika aplikasi masih berstatus Testing, tambahkan akun pemilik channel sebagai test user. Untuk penggunaan operasional, selesaikan consent screen, kebijakan privasi, domain terverifikasi, dan proses verifikasi Google yang berlaku.

## Environment server

Simpan nilai berikut hanya di `admin/.env.local` pada server. Jangan memakai prefix `NEXT_PUBLIC_` dan jangan memasukkan file ini ke Git.

```env
YOUTUBE_OAUTH_CLIENT_ID=...
YOUTUBE_OAUTH_CLIENT_SECRET=...
YOUTUBE_OAUTH_REDIRECT_URI=https://admin.radiogaulfmsmg.com/api/youtube/oauth/callback
YOUTUBE_TOKEN_ENCRYPTION_KEY=...
```

Buat encryption key dengan 32 byte acak yang dienkode base64. Simpan cadangannya di pengelola rahasia. Kehilangan key ini membuat refresh token yang tersimpan tidak dapat dibaca dan akun harus dihubungkan ulang.

Setelah environment berubah, rebuild dan restart `radio-admin`. Jangan menyalin refresh token, client secret, atau encryption key ke log, issue, chat, atau respons API.

## Urutan uji pra-rilis

1. Buka panel melalui domain HTTPS produksi, bukan alamat IP dan bukan port 3001.
2. Pastikan status awal menunjukkan OAuth dikonfigurasi tetapi akun belum terhubung.
3. Hubungkan akun Google yang memiliki channel Gaul FM dan periksa nama channel yang kembali ke panel.
4. Buat siaran uji dengan privasi **Tidak Publik**, waktu beberapa menit ke depan, Auto-start aktif, dan stream yang benar.
5. Pastikan siaran muncul di YouTube Studio dan judul dapat diperbarui dari panel.
6. Aktifkan pengiriman server, lalu pastikan urutannya: vMix online, FFmpeg mengirim data, status stream YouTube aktif, dan broadcast berpindah ke live.
7. Uji Auto-stop dan periksa arsip hasil siaran.
8. Pastikan API panel tidak pernah mengembalikan stream key, access token, refresh token, client secret, atau encryption key.
9. Uji dari akun operator yang berwenang dan pastikan pengguna tanpa hak tidak dapat membuka kontrol YouTube.
10. Setelah semua lulus, ubah privasi ke Public hanya untuk satu siaran terkontrol sebelum rilis penuh.

## Migrasi dan rollback

- Simpan backup konfigurasi Nginx, `.env.local`, build `.next`, dan file token terenkripsi sebelum migrasi.
- Perbarui redirect URI Google Cloud dan environment server sebagai satu perubahan terkoordinasi.
- Jika callback gagal, kembalikan domain/callback sebelumnya dan build admin terakhir. Token terenkripsi lama tetap dapat digunakan selama client OAuth serta encryption key tidak berubah.
- Jangan menghapus OAuth client lama sebelum siaran produksi pertama selesai dan refresh token terbukti bertahan setelah restart server.
- Setelah stabil, cabut callback DuckDNS dan credential pengembangan yang tidak dipakai.

## Pemeriksaan berkala

- Periksa masa berlaku sertifikat HTTPS dan renewal timer.
- Pantau error `invalid_grant`, quota YouTube API, serta kegagalan refresh token.
- Audit daftar operator dan OAuth clients setiap rilis.
- Rotasi client secret dan encryption key melalui prosedur terjadwal. Rotasi encryption key memerlukan koneksi ulang akun kecuali token lama didekripsi lalu dienkripsi ulang secara aman.
