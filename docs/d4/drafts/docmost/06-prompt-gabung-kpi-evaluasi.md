# Prompt · Gabungkan FR-D4-001 dan FR-D4-002 di Docmost

**Dipakai di:** Claude yang tersambung ke MCP Docmost (di komputer Anda sendiri).
**Cara pakai:** salin seluruh blok di bawah ini (dari `---- MULAI ----` sampai `---- SELESAI ----`) ke Claude tersebut.
**Catatan:** prompt ini menulis perubahan sebagai **usulan yang menunggu persetujuan PO**. Status itu baru diganti setelah PO menyetujui.

---- MULAI ----

Kamu membantu Squad D4 (Performance & Training Development) di proyek HRMS PT Andima Transportindo. Tugasmu: memperbarui requirement resmi di Docmost agar fitur **Performance Evaluation (FR-D4-001)** dan **KPI Scorecard (FR-D4-002)** digabung menjadi satu fitur dan satu menu.

## Latar belakang (kenapa digabung)

1. Evaluasi kinerja sudah tidak punya angka sendiri. Angkanya diambil dari total KPI Scorecard pada periode yang sama, dan evaluasi baru bisa disimpan setelah KPI Scorecard periode itu selesai.
2. Penilai harus membuka dua menu dan mengisi dua form untuk karyawan dan bulan yang sama.
3. Ada dua catatan yang isinya tumpang tindih: "Catatan / rekomendasi atasan" di KPI dan "Catatan evaluasi" di evaluasi.
4. FR-D4-001 tidak mendefinisikan skala atau kriteria angka, sehingga skor 1–5 terpisah di evaluasi tidak punya dasar.

## Aturan kerja (wajib)

1. **Baca dulu, jangan mengarang.** Buka dan baca halaman FR-D4-001, FR-D4-002, US-D4-001, US-D4-002, SD-D4-001, FR-D4-004, FR-D4-006, dan FR-D4-007 di space HRMS (parent Functional Requirement D4, page id `01a0a3ee-2e27-7c77-b268-5eb9c2576a94`; FR-D4-002 slug `LkehEZA51e`). Kutip teks yang akan diubah. Jika ada informasi yang tidak ditemukan, tulis sebagai **Open Decision**, jangan diisi sendiri.
2. **Jangan menghapus halaman atau isi lama.** FR-D4-002 tidak dihapus; ditandai sebagai digabung. Isi lama yang diganti dipindah ke bagian "Riwayat perubahan" di halaman yang sama.
3. **Tunjukkan dulu, tulis kemudian.** Sebelum menulis apa pun ke Docmost, tampilkan daftar perubahan per halaman (teks lama → teks baru) lalu **tunggu saya menjawab "ya"**. Jangan menulis tanpa jawaban itu.
4. **Status usulan.** Di tabel metadata setiap halaman yang diubah: naikkan Version (misalnya 1.x → 2.0), isi Date dengan tanggal hari ini, dan set Status menjadi **"Draft – menunggu persetujuan PO"**.
5. Jangan mengubah halaman milik squad lain, halaman "Test Write Access (boleh dihapus)", atau halaman di luar D4.
6. Setelah selesai, berikan ringkasan: halaman yang diubah, link-nya, dan daftar Open Decision.

## Perubahan yang diminta

### A. FR-D4-001 → menjadi "Penilaian Kinerja (KPI & Evaluasi)"

Pertahankan ID **FR-D4-001**. Ubah judul menjadi **"Penilaian Kinerja (KPI & Evaluasi)"** dan perbarui isinya:

**Tujuan.** Atasan atau HR menilai kinerja karyawan per periode (bulan) dalam satu form: angka dari 5 Core KPI sesuai jabatan, ditambah catatan evaluasi kualitatif.

**Field form (satu form, satu tombol Simpan):**

| Field | Aturan |
|---|---|
| Karyawan | Wajib. Tidak boleh akun penilai sendiri |
| Posisi, Departemen | Otomatis dari data karyawan (D3), read-only |
| Periode | Wajib, format bulan (YYYY-MM) |
| Tanggal penilaian | Wajib, tidak boleh melebihi hari ini |
| Penilai | Otomatis dari akun yang login, read-only |
| KPI jabatan | Otomatis dari posisi karyawan (katalog KPI Scorecard V5.1), read-only |
| Tabel 5 Core KPI | Per baris: nama KPI dan bobot (read-only dari katalog), target, realisasi (teks bebas), skor 1–5 (bilangan bulat, dipilih penilai), skor terbobot (otomatis = bobot × skor), komentar per indikator (opsional) |
| Total KPI | Otomatis = jumlah skor terbobot, 2 desimal |
| Catatan evaluasi | **Wajib**. Kekuatan, hal yang perlu diperbaiki, rekomendasi pelatihan |
| Bukti / referensi | Opsional (nomor dokumen atau tautan) |

**Business rule:**
1. Total bobot 5 KPI = 100%. Skor di luar 1–5 atau bukan bilangan bulat ditolak.
2. Sistem **tidak** mengonversi realisasi menjadi skor dan **tidak** memberi label tercapai/tidak tercapai.
3. Hasil penilaian adalah **Total KPI**. Tidak ada skor evaluasi terpisah.
4. Satu penilaian aktif per karyawan per periode. Koreksi disimpan sebagai **revisi baru**; penilaian lama tidak ditimpa atau dihapus.
5. Tidak ada keputusan HR otomatis dari angka.
6. Catatan evaluasi dapat dijadikan sumber Development Requirement dengan source type **Performance context** (FR-D4-004).
7. Hanya HR dan MANAGER yang dapat menulis; EMPLOYEE hanya melihat datanya sendiri.

**Halaman (UI):** satu menu **"Penilaian Kinerja"** dengan Daftar (Karyawan, Posisi, Periode, Total KPI, Catatan singkat, Penilai, Status), Detail (tabel KPI + catatan evaluasi + bukti + data terkait), dan Riwayat per karyawan.

**Acceptance criteria (ganti yang lama):**
1. Penilai dapat menyimpan satu penilaian berisi 5 KPI dan catatan evaluasi dalam satu form.
2. KPI yang tampil selalu sesuai posisi karyawan; penilai tidak dapat memilih KPI jabatan lain.
3. Penilaian ditolak bila bobot ≠ 100%, skor di luar 1–5, catatan kosong, tanggal di masa depan, atau karyawan = penilai sendiri.
4. Penilaian kedua pada periode yang sama hanya tersimpan sebagai revisi eksplisit; riwayat lengkap tetap terlihat.
5. Total KPI tampil di Daftar, Detail, Riwayat, dan People Dashboard dengan angka yang sama.

### B. FR-D4-002 KPI Scorecard → tandai digabung

Jangan hapus halaman ini. Di bagian paling atas, tambahkan kotak catatan:

> **Digabung ke FR-D4-001 "Penilaian Kinerja (KPI & Evaluasi)" sejak versi 2.0.** Katalog KPI V5.1, aturan bobot 100%, skor 1–5, dan perhitungan skor terbobot tetap berlaku dan dirujuk dari FR-D4-001. Halaman ini dipertahankan sebagai referensi katalog KPI.

Set Status menjadi **"Superseded – digabung ke FR-D4-001 (menunggu persetujuan PO)"**. Tabel katalog KPI per position dan catatan versi katalog **tetap dipertahankan**.

### C. Halaman lain yang merujuk dua menu

1. **SD-D4-001 / daftar menu D4:** jumlah menu berubah dari **enam menjadi lima**: Penilaian Kinerja, Competency Gap, Development Requirement, Training Tracking, People Dashboard.
2. **US-D4-001 dan US-D4-002:** tambahkan catatan bahwa kedua user story kini dipenuhi oleh FR-D4-001 versi 2.0. Jangan ubah isi user story-nya.
3. **FR-D4-004 Development Requirement:** sumber "Performance context" merujuk ke penilaian di FR-D4-001 (catatan evaluasi).
4. **FR-D4-006 People Dashboard:** kolom angka cukup satu, yaitu **Total KPI**. Kolom skor evaluasi terpisah (jika ada) dihapus. Kartu evaluasi di profil karyawan menampilkan catatan evaluasi.
5. **FR-D4-007 Keterhubungan data:** source chip "KPI Scorecard" dan "Performance Evaluation" diganti menjadi satu, yaitu "Penilaian Kinerja".

## Open Decision (catat di FR-D4-001 bila belum terjawab di Docmost)

1. Apakah catatan evaluasi tetap wajib bila semua skor KPI ≥ 4?
2. Apakah perlu panduan/rubrik tertulis untuk skor 1–5 per indikator KPI?
3. Penilaian periode lampau memakai KPI posisi saat ini atau posisi pada periode tersebut (butuh riwayat posisi dari D3)?
4. Nama menu final: "Penilaian Kinerja" atau tetap "Performance Evaluation".

Mulai dengan membaca halaman-halaman di atas, lalu tampilkan rencana perubahan per halaman dan tunggu jawaban "ya" dari saya.

---- SELESAI ----

## Setelah prompt dijalankan

1. Kirim link halaman yang berubah ke PO untuk disetujui.
2. Setelah PO setuju, ganti Status di halaman-halaman tersebut menjadi status final, lalu minta implementasi aplikasinya (penggabungan menu di repo `hrms-d4-sandbox`).
3. Perbarui kartu Planka terkait: "Implementasi Performance Evaluation" dan KPI Scorecard digabung atau dirujuk ke kartu baru.
