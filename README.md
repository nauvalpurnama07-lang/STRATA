# STRATA

Papan Kanban dan manajemen tugas tim — landing page, autentikasi, dan dashboard dalam satu proyek React.

## Tumpukan teknologi

- **React 19** + **Vite**
- **Tailwind CSS v4** (via plugin `@tailwindcss/vite`, tanpa file `tailwind.config.js` terpisah)
- **React Router v7** untuk navigasi antar halaman

## Menjalankan proyek

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`.

Perintah lain:

```bash
npm run build    # build produksi ke folder dist/
npm run preview  # pratinjau hasil build
npm run lint     # cek kode dengan oxlint
```

## Struktur folder

```
src/
├── main.jsx              # entry point
├── App.jsx                # router + state akun & user yang login
├── index.css              # Tailwind import + keyframes global (wobble kartu, grain, dll)
├── components/
│   ├── icons.jsx           # ikon SVG bersama + logo, dipakai di ketiga halaman
│   ├── Toast.jsx           # notifikasi kecil di pojok layar
│   └── Reveal.jsx          # wrapper scroll-reveal (fade-up + blur) untuk landing page
├── data/
│   └── board.js            # data anggota tim, papan awal, dan akun demo
└── pages/
    ├── LandingPage.jsx      # halaman pemasaran ("/")
    ├── LoginPage.jsx        # masuk & daftar ("/login")
    └── DashboardPage.jsx    # papan Kanban setelah login ("/dashboard")
```

## Alur autentikasi (akun dummy)

Proyek ini **belum terhubung ke backend atau database sungguhan** — status login
disimpan di memori React (`App.jsx`) dan akan ter-reset setiap kali halaman
di-refresh. Ini disengaja untuk keperluan demo/prototipe.

Akun demo yang sudah disiapkan (kata sandi semuanya `Strata2026`):

| Email | Peran |
|---|---|
| ricky@peluncuran.id | Kapten (admin) |
| fajar@peluncuran.id | Anggota |
| dinda@peluncuran.id | Anggota |
| aisyah@peluncuran.id | Viewer |

Keempatnya juga ditampilkan sebagai daftar yang bisa diklik langsung di halaman login.

- **Masuk** — cocokkan email & kata sandi terhadap daftar akun di memori.
- **Daftar** — menambahkan akun baru ke daftar tersebut sebagai Anggota, lalu langsung login.
- **Lanjutkan dengan Google** — disimulasikan (tidak ada OAuth asli); langsung
  login sebagai profil Google contoh (peran Kapten).

### Menghubungkan ke backend sungguhan

Ganti isi `handleLogin`, `handleSignup`, dan `handleGoogleAuth` di `src/App.jsx`
dengan pemanggilan API kamu (misalnya `fetch('/api/login', ...)`), dan ganti
`SEED_ACCOUNTS` di `src/data/board.js` karena daftar akun seharusnya datang
dari server, bukan dari kode sisi klien.

## Rute

| Path          | Halaman         | Keterangan                                  |
|---------------|-----------------|----------------------------------------------|
| `/`           | LandingPage     | Selalu bisa diakses                          |
| `/login`      | LoginPage       | Redirect ke `/dashboard` jika sudah login    |
| `/dashboard`  | DashboardPage   | Redirect ke `/login` jika belum login        |

## Fitur dashboard

- Papan Kanban dengan drag & drop kustom (kartu terangkat dan bergoyang saat diseret)
- Command palette (`Ctrl/Cmd + K`) — cari tugas atau jalankan perintah navigasi
- Panel detail tugas: judul & deskripsi bisa diedit, checklist dengan progress bar
- Mode Presentasi & Bebas (`src/components/presentation/WhiteboardCanvas.jsx`) — kanvas bebas dengan sticky note, balon obrolan, dan bentuk
- AI Helper (`src/components/ai/AIHelper.jsx`) — simulasi asisten yang bisa mengusulkan tugas/template ke papan
- Sidebar bisa diciutkan jadi rel ikon lewat tombol panah di tepi kanan sidebar
- Tampilan Beranda (galeri proyek), Anggota, Profil, dan Pengaturan

## Logika Scrum × Kanban

Peran di proyek ini memakai istilah Scrum (**Kapten** = Scrum Master/Product
Owner, **Anggota** = tim pengembang, **Viewer** = pemangku kepentingan),
diterapkan di atas papan Kanban:

- **Sprint & burndown** (`SprintBar`, `src/data/board.js`): setiap papan punya
  tujuan sprint, story point per kartu, grafik burndown, dan riwayat velocity.
  Kapten bisa mengubah tujuan sprint dan mengakhiri sprint — kartu yang belum
  selesai otomatis kembali ke backlog dan kehilangan status prioritas.
- **Backlog & prioritas**: kolom "Backlog Produk" menampung kartu yang belum
  masuk sprint. Kapten menandai kartu sebagai prioritas lewat ikon bintang;
  hanya Kapten yang bisa menandainya.
- **Batas WIP** (*work in progress*): kolom "Sedang Berjalan" punya batas
  jumlah kartu (`WIP_LIMIT` di `src/data/board.js`). Kalau sudah penuh,
  Anggota tidak bisa memindahkan kartu baru ke situ sampai ada yang selesai —
  Kapten tetap bisa melewati batas ini untuk kasus mendesak.
- **Kunci prioritas untuk Anggota**: Kapten punya sakelar "Batasi anggota ke
  kartu prioritas" di `SprintBar`. Saat aktif, Anggota hanya bisa menyeret
  kartu yang sudah ditandai prioritas (bintang hijau) — kartu lain terlihat
  pudar dengan ikon gerembok dan tidak bisa diseret. Saat nonaktif, semua
  kartu bebas diambil siapa saja.
- **Ambil kartu sendiri**: kartu yang belum punya penanggung jawab menampilkan
  label "Belum diambil". Anggota yang menyeretnya (atau menekan tombol "Ambil
  tugas ini" di panel detail) otomatis menjadi penanggung jawab kartu itu —
  jadi semua Anggota bisa mengambil pekerjaan tanpa menunggu ditugaskan satu
  per satu oleh Kapten.
- **Pembatasan untuk Viewer** (`ViewerBoard`): Viewer hanya melihat ringkasan
  tahap dan progres sprint secara keseluruhan — persentase selesai, jumlah
  kartu per kolom, dan tujuan sprint. Judul kartu, deskripsi, checklist, dan
  penanggung jawab disembunyikan sepenuhnya, termasuk dari pencarian di
  command palette dan dari mode Presentasi/Bebas (keduanya tidak bisa diakses
  Viewer sama sekali).
