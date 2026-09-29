# Dokumentasi D4 V2

| Dokumen | Isi |
|---|---|
| [PROMPT-D4-REDESIGN.md](PROMPT-D4-REDESIGN.md) | Brief redesign: kritik asistensi K1–K9, arah visual, pola, rencana Figma, DoD, dan penyesuaian saat eksekusi (§13) |
| [UI-D4-001.md](UI-D4-001.md) | Interaction & Component Guideline: token, tipografi, pola wajib, menu ⋮ per fitur, navigasi, responsif, aksesibilitas |
| [API-D4-001.md](API-D4-001.md) | Endpoint Contract: struktur, izin, format error, 14 endpoint, aturan body, seeder |
| [CHANGELOG-D4-V2.md](CHANGELOG-D4-V2.md) | Perubahan V1 → V2 dan pemetaan ke kritik K1–K9 |
| [drafts/](drafts/README.md) | Teks siap tempel untuk Docmost dan Planka (belum diterapkan) |

## Figma

File **D4 V2**: https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F (tim student)

Dibuat sebagai file baru karena file PISD tim hanya bisa dibaca oleh akun ini. File pertama (`bpUIPDcmpjGbYzg0JuZnPH`) tidak bisa diakses lagi, jadi semua isi dibangun ulang di file ini. Isi saat ini:

- Variable collection **D4 V2 Tokens** (warna) dan text style `D4/*`.
- Board **00 Foundations & Components** dengan component set Button, Status Badge, Source Chip, Row Action Trigger, Menu Item, Toast, Metric Card, Form Field, Sidebar (6 varian menu aktif), Topbar, dan Pagination.
- Frame layar 01–34 di page `D4`, 7 baris per fitur, dengan 9 prototype link (⋮ → menu → Detail/History/Create, Save → Success Toast). Kode pembangunnya ada di plugin lokal [`figma-plugin/d4-v2-builder`](../../figma-plugin/d4-v2-builder/README.md), jadi frame bisa dibangun ulang di file lain.

Setelah frame selesai, file ini dapat disalin ke page `D4` di file PISD oleh anggota tim yang punya akses edit.
