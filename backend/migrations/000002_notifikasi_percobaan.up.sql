-- Catatan percobaan kirim email (Notifikasi.catatKegagalan): supaya email yang gagal
-- bisa dicoba ulang beberapa kali saja, dan alasannya bisa dilihat tim.
ALTER TABLE notifikasi
    ADD COLUMN percobaan       INTEGER NOT NULL DEFAULT 0 CHECK (percobaan >= 0),
    ADD COLUMN galat_terakhir  TEXT;

CREATE INDEX notifikasi_belum_terkirim ON notifikasi (id) WHERE NOT status_kirim;
