# Gaul FM Semarang — Web Admin Dashboard

Dashboard admin & broadcaster Gaul FM Semarang berbasis **Next.js 16.2 App Router** (Turbopack, React 19, TypeScript strict, Tailwind CSS v4).

## Fitur Utama

- **Overview Dashboard (`/`)**: Monitoring instan lagu aktif, DJ on-air, status listener, dan jadwal siaran hari ini.
- **Streaming Orchestrator (`/streams`)**: Pusat kendali ingest studio terpusat:
  - Tab vMix (Visual Studio): RTMP Ingest URL, Stream Key `gaulfm`, resolusi rekomendasi, dan status WHEP WebRTC.
  - Tab RadioBOSS / SAM Broadcaster: Icecast Server IP `40.81.231.250`, Port `8000`, Mount `/gaulfm`, Bitrate `128 kbps`.
  - Tab YouTube Live: Direct Copy Engine untuk restream cloud otomatis tanpa membebani bandwidth studio lokal.
  - Fitur Salin Satu Klik dengan fallback aman untuk konteks HTTP (`document.execCommand('copy')`).
- **Live Chat Moderation (`/chat`)**: Moderasi pesan live pendengar, pin komentar ke *On Air*, sembunyikan pesan (*Hide*), dan broadcast pesan resmi *Studio*.
- **Now Playing Manager (`/now-playing`)**: Panel kendali penyiar untuk mengupdate judul lagu, cover album, dan penyiar aktif secara real-time.
- **Master Jadwal Siaran (`/schedule`)**: Manajemen CRUD jadwal siaran mingguan 7 hari (Senin–Minggu).
- **Sinkronisasi Berita (`/news`)**: Sinkronisasi artikel berita WordPress dan editor berita.
- **Banner Promosi (`/banners`)**: Manajemen karusel banner promo mobile app.
- **Database Pendengar (`/users`)**: Tabel data pendengar terdaftar dan ekspor Excel spreadsheet (`.xlsx`) via SheetJS.

## Menjalankan di Lokal

```bash
cd admin
npm install
npm run dev      # Berjalan di http://localhost:3000
npm run build    # Build produksi Next.js
npm run lint     # Pemeriksaan ESLint Next.js
```

## Deployment Server Azure Cloud (`40.81.231.250`)

Web Admin di-hosting di VM Azure menggunakan **PM2**:

- **Host**: `40.81.231.250`
- **User**: `azureuser`
- **SSH Key Path**: `C:\Users\WORKPLUS\Downloads\icecast-server_key.pem`
- **PM2 Process**: `radio-admin` (Port `3001`)
- **Akses Publik**: `http://40.81.231.250:3001/`

### Cara Push / Deploy Update ke Server SSH

Jalankan perintah ini langsung dari terminal lokal (PowerShell/Bash):

```powershell
ssh -i "C:\Users\WORKPLUS\Downloads\icecast-server_key.pem" -o StrictHostKeyChecking=no azureuser@40.81.231.250 "cd /home/azureuser/radio-multiplatform && git pull origin master && cd admin && npm run build && pm2 restart radio-admin"
```

### Perintah PM2 di Server

```bash
pm2 status                  # Cek status proses
pm2 restart radio-admin     # Restart dashboard Next.js
pm2 logs radio-admin        # Pantau log live dashboard
```
