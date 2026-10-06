// Package email mengirim email lewat SMTP memakai pustaka bawaan Go (net/smtp).
// Pengaturannya dibaca dari environment: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_PENGIRIM.
package email

import (
	"bytes"
	"crypto/tls"
	"errors"
	"fmt"
	"mime"
	"mime/quotedprintable"
	"net"
	"net/mail"
	"net/smtp"
	"os"
	"strings"
	"time"
)

// ErrBelumDiatur: SMTP_HOST kosong, jadi email memang tidak dikirim.
var ErrBelumDiatur = errors.New("SMTP belum diatur (SMTP_HOST kosong)")

func env(kunci, bawaan string) string {
	if v := strings.TrimSpace(os.Getenv(kunci)); v != "" {
		return v
	}
	return bawaan
}

func Kirim(kepada []string, subjek, teks string) error {
	host := env("SMTP_HOST", "")
	if host == "" {
		return ErrBelumDiatur
	}
	if len(kepada) == 0 {
		return errors.New("belum ada alamat penerima (isi EMAIL_OWNER)")
	}
	dari := env("EMAIL_PENGIRIM", "Zanafa Pulse <no-reply@zanafa.local>")
	pengirim, err := mail.ParseAddress(dari)
	if err != nil {
		return fmt.Errorf("EMAIL_PENGIRIM tidak valid: %w", err)
	}
	langsungTLS := env("SMTP_SECURE", "false") == "true" // port 465

	// batas waktu supaya server SMTP yang lambat tidak menggantung
	alamat := net.JoinHostPort(host, env("SMTP_PORT", "587"))
	pemanggil := &net.Dialer{Timeout: 8 * time.Second}
	amanTLS := &tls.Config{ServerName: host}
	var sambungan net.Conn
	if langsungTLS {
		sambungan, err = tls.DialWithDialer(pemanggil, "tcp", alamat, amanTLS)
	} else {
		sambungan, err = pemanggil.Dial("tcp", alamat)
	}
	if err != nil {
		return err
	}
	defer sambungan.Close()
	_ = sambungan.SetDeadline(time.Now().Add(20 * time.Second))

	klien, err := smtp.NewClient(sambungan, host)
	if err != nil {
		return err
	}
	if !langsungTLS {
		if ada, _ := klien.Extension("STARTTLS"); ada {
			if err := klien.StartTLS(amanTLS); err != nil {
				return err
			}
		}
	}
	if user := env("SMTP_USER", ""); user != "" {
		if err := klien.Auth(smtp.PlainAuth("", user, os.Getenv("SMTP_PASS"), host)); err != nil {
			return err
		}
	}
	if err := klien.Mail(pengirim.Address); err != nil {
		return err
	}
	for _, p := range kepada {
		if err := klien.Rcpt(p); err != nil {
			return err
		}
	}
	penulis, err := klien.Data()
	if err != nil {
		return err
	}
	if _, err := penulis.Write(susun(dari, kepada, subjek, teks)); err != nil {
		return err
	}
	if err := penulis.Close(); err != nil {
		return err
	}
	return klien.Quit()
}

func susun(dari string, kepada []string, subjek, teks string) []byte {
	var surat bytes.Buffer
	kepala := func(nama, nilai string) { surat.WriteString(nama + ": " + nilai + "\r\n") }
	kepala("From", dari)
	kepala("To", strings.Join(kepada, ", "))
	kepala("Subject", mime.QEncoding.Encode("utf-8", subjek))
	kepala("Date", time.Now().Format(time.RFC1123Z))
	kepala("MIME-Version", "1.0")
	kepala("Content-Type", "text/plain; charset=utf-8")
	kepala("Content-Transfer-Encoding", "quoted-printable")
	surat.WriteString("\r\n")
	isi := quotedprintable.NewWriter(&surat)
	_, _ = isi.Write([]byte(strings.ReplaceAll(teks, "\n", "\r\n")))
	_ = isi.Close()
	return surat.Bytes()
}
