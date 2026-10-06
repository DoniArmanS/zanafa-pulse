DROP INDEX IF EXISTS notifikasi_belum_terkirim;
ALTER TABLE notifikasi
    DROP COLUMN IF EXISTS galat_terakhir,
    DROP COLUMN IF EXISTS percobaan;
