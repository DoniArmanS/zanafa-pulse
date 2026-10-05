-- Skema awal Zanafa Pulse. Mengikuti class diagram (Dokumentasi/Diagram)
-- ditambah kolom kode, penerbit, tahun, sampul pada buku (keputusan produk no. 1).

CREATE TABLE cabang (
    id          SERIAL PRIMARY KEY,
    nama        TEXT NOT NULL UNIQUE,
    alamat      TEXT NOT NULL DEFAULT '',
    no_telepon  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE kategori (
    id         SERIAL PRIMARY KEY,
    nama       TEXT NOT NULL UNIQUE,
    deskripsi  TEXT NOT NULL DEFAULT ''
);

-- Kelas User (Staff dan Manager). Staff terikat satu cabang, Manager tidak.
CREATE TABLE pengguna (
    id             SERIAL PRIMARY KEY,
    username       TEXT NOT NULL,
    password_hash  TEXT NOT NULL,
    nama           TEXT NOT NULL,
    role           TEXT NOT NULL CHECK (role IN ('staff', 'manager')),
    id_cabang      INTEGER REFERENCES cabang (id),
    status         BOOLEAN NOT NULL DEFAULT TRUE,
    dibuat         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT staff_punya_cabang CHECK (role = 'manager' OR id_cabang IS NOT NULL)
);
CREATE UNIQUE INDEX pengguna_username_unik ON pengguna (lower(username));

CREATE TABLE buku (
    id            SERIAL PRIMARY KEY,
    kode          TEXT NOT NULL CHECK (kode ~ '^[A-Za-z0-9-]{3,20}$'),
    judul         TEXT NOT NULL,
    pengarang     TEXT NOT NULL,
    penerbit      TEXT NOT NULL,
    tahun         INTEGER NOT NULL CHECK (tahun BETWEEN 1900 AND 2100),
    harga         NUMERIC(12, 2) NOT NULL CHECK (harga > 0),
    stok_minimum  INTEGER NOT NULL DEFAULT 5 CHECK (stok_minimum >= 0),
    sampul        TEXT,
    id_kategori   INTEGER NOT NULL REFERENCES kategori (id),
    status        BOOLEAN NOT NULL DEFAULT TRUE,
    dibuat        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX buku_kode_unik ON buku (lower(kode));

-- Stok = perpotongan Buku x Cabang: satu baris per buku per cabang.
CREATE TABLE stok (
    id              SERIAL PRIMARY KEY,
    id_buku         INTEGER NOT NULL REFERENCES buku (id),
    id_cabang       INTEGER NOT NULL REFERENCES cabang (id),
    jumlah          INTEGER NOT NULL DEFAULT 0 CHECK (jumlah >= 0),
    tanggal_update  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_buku, id_cabang)
);

-- Audit trail: tidak ikut terhapus (ON DELETE RESTRICT), lihat Penjelasan Class Diagram relasi 5.
-- jumlah = selisih (sesudah - sebelum).
CREATE TABLE riwayat_stok (
    id            BIGSERIAL PRIMARY KEY,
    id_stok       INTEGER NOT NULL REFERENCES stok (id) ON DELETE RESTRICT,
    id_pengguna   INTEGER NOT NULL REFERENCES pengguna (id),
    jenis         TEXT NOT NULL CHECK (jenis IN ('tambah', 'kurang', 'koreksi', 'judul_baru')),
    jumlah        INTEGER NOT NULL,
    stok_sebelum  INTEGER NOT NULL CHECK (stok_sebelum >= 0),
    stok_sesudah  INTEGER NOT NULL CHECK (stok_sesudah >= 0),
    tanggal       TIMESTAMPTZ NOT NULL DEFAULT now(),
    keterangan    TEXT NOT NULL DEFAULT '' CHECK (char_length(keterangan) <= 140)
);
CREATE INDEX riwayat_stok_per_stok ON riwayat_stok (id_stok, tanggal DESC);
CREATE INDEX riwayat_stok_tanggal ON riwayat_stok (tanggal DESC);

CREATE TABLE notifikasi (
    id           SERIAL PRIMARY KEY,
    id_stok      INTEGER NOT NULL REFERENCES stok (id),
    id_riwayat   BIGINT REFERENCES riwayat_stok (id) ON DELETE CASCADE,
    pesan        TEXT NOT NULL,
    tanggal      TIMESTAMPTZ NOT NULL DEFAULT now(),
    status_kirim BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE laporan (
    id              SERIAL PRIMARY KEY,
    id_pengguna     INTEGER NOT NULL REFERENCES pengguna (id),
    jenis_laporan   TEXT NOT NULL,
    periode_awal    DATE,
    periode_akhir   DATE,
    tanggal_dibuat  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sesi login. Yang disimpan hanya hash token; token asli hanya ada di cookie pengguna.
CREATE TABLE sesi (
    token_hash   TEXT PRIMARY KEY,
    id_pengguna  INTEGER NOT NULL REFERENCES pengguna (id) ON DELETE CASCADE,
    kedaluwarsa  TIMESTAMPTZ NOT NULL,
    dibuat       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sesi_kedaluwarsa ON sesi (kedaluwarsa);
