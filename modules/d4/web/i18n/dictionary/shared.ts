import type { Dictionary } from "./types";

export const shared = {
  // Header
  "Language": { id: "Bahasa" },
  // DataTable
  "{count} {noun} selected": { id: "{count} {noun} dipilih" },
  "Clear selection": { id: "Hapus pilihan" },
  "Scroll sideways to see all columns": { id: "Geser ke samping untuk melihat semua kolom" },
  "Select all {noun}": { id: "Pilih semua {noun}" },
  "Select all": { id: "Pilih semua" },
  "Select {row}": { id: "Pilih {row}" },
  "Actions": { id: "Aksi" },
  "Just saved": { id: "Baru disimpan" },
  "Showing {first}–{last} of {total} {noun}": { id: "Menampilkan {first}–{last} dari {total} {noun}" },
  "per page": { id: "per halaman" },
  "Rows per page": { id: "Baris per halaman" },
  "Pagination": { id: "Navigasi halaman" },
  "Previous page": { id: "Halaman sebelumnya" },
  "Next page": { id: "Halaman berikutnya" },
  // DataTable nouns (the noun prop)
  "employees": { id: "pegawai" },
  "days": { id: "hari" },
  "requirements": { id: "requirement" },
  "trainings": { id: "training" },
  "requirement dipilih": { en: "selected requirements" },
  "training dipilih": { en: "selected trainings" },
} satisfies Dictionary;
