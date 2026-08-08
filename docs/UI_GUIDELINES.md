# UI Guidelines

Direction:

> Editorial athletic event platform with disciplined information hierarchy, restrained
> visual treatment, and a credible Indonesian event-operations character.

## Design Reference

- `docs/design-reference/VirtualRun_Mockup.pdf` adalah visual reference utama untuk arah UI.
- Implementasi mengikuti karakter, hierarchy, dan pola layout PDF, tetapi bukan pixel-perfect copy.
- Business rules, accessibility, dan data nyata dari sistem memiliki prioritas lebih tinggi daripada
  kesamaan visual dengan mockup.
- Jangan membuat sponsor, testimonial, metric, peserta, BIB, upload, certificate, atau action palsu
  hanya untuk menyamai mockup.

## Bahasa

- Bahasa UI utama: Bahasa Indonesia.
- Copy harus natural, langsung, dan profesional.
- Hindari headline kosong dan bahasa motivasional generik.
- Tampilkan deadline dengan tanggal, jam, dan WIB.

## Visual

- Primary brand color dapat dikonfigurasi per event.
- Identitas utama memakai aset logo resmi di `frontend/public/assets/logo`: varian
  `BEARD NEW LOGO BLACK.png` pada latar terang dan `BEARD NEW LOGO WHITE.png` pada latar gelap.
- Neutral color bersih dengan border tipis.
- Radius konsisten sekitar 8-12px.
- Shadow hanya untuk layer mengambang seperti dialog atau menu.
- Jangan memakai gradient dekoratif, glassmorphism, neon glow, random blob, fake sponsor,
  fake testimonial, atau fake metrics.
- Jangan menaruh semua section ke rounded card.

## Typography

- Font utama seluruh web adalah Montserrat melalui `next/font/google` dan token Tailwind
  `font-sans`.
- Gunakan hierarchy jelas.
- Hero-scale type hanya untuk hero sebenarnya.
- Komponen admin memakai heading ringkas dan padat.
- Letter spacing tetap `0`.
- Jangan scale font berdasarkan viewport width.

## Mobile

- Mobile-first.
- Layout publik menggunakan lebar viewport penuh dengan gutter responsif: 16px pada mobile,
  24px pada tablet, dan 32px pada desktop.
- Touch target minimal 44px.
- Form satu kolom pada mobile.
- Label selalu terlihat.
- Datepicker memakai komponen custom `DatePickerInput`, bukan native date input browser. Value yang
  dikirim tetap format `YYYY-MM-DD` melalui hidden input agar kontrak server action tidak berubah.
- Table admin dapat berubah menjadi structured list.
- Jangan menyembunyikan informasi penting.
- Upload flow harus memiliki progress, preview, retry, dan error state saat fiturnya
  dibangun.

## Accessibility

- Semantic HTML.
- Keyboard navigation.
- Focus state terlihat.
- Kontras warna cukup.
- Label terhubung dengan input.
- Error validation dapat dipahami screen reader.
- Status tidak hanya dikomunikasikan lewat warna.
- Respect `prefers-reduced-motion`.

## Design Tokens

Token berada di `src/app/globals.css` dan `tailwind.config.ts`:

- Background dan neutral: `background`, `surface`, `surface-muted`.
- Text dan border: `foreground`, `foreground-muted`, `border`.
- Brand/action: `primary` teal, `primary-hover`, `navy`, `navy-muted`, `action` orange,
  `action-hover`.
- Semantic: `success`, `warning`, `danger`, `info`.
- Legacy aliases `brand`, `ink`, `paper`, `line`, dan `muted` tetap ada untuk transisi.
- Radius utama memakai `--radius-app` 8px; shadow hanya ringan untuk panel/layer yang perlu
  elevasi.

## Implemented Slice Notes

- Homepage `/` memakai sistem Hallmark editorial-athletic dengan macrostructure `Marquee Hero`:
  banner event nyata memenuhi fold, display face `Oswald` dipasangkan dengan
  Montserrat, daftar event berperilaku seperti catalogue board tanpa nested card, cara kerja
  memakai urutan SVG editorial, dan manfaat platform disajikan sebagai daftar operasional.
  Token khusus landing berada di root `tokens.css`; token tersebut tidak mengganti typography
  body maupun layout dashboard.
- Route `/` adalah homepage platform VirtualRun dengan komposisi editorial mengikuti reference:
  hero berbasis banner event, jumlah peserta per event dari data nyata, carousel event pilihan
  ketika jumlah event melebihi kapasitas tiga card, cara kerja dengan ilustrasi SVG, fitur
  platform, CTA, public header tanpa action autentikasi, dan footer navy. Homepage tidak
  menampilkan metrik negara/KM, testimonial kosong, social media palsu, atau card marketing yang
  tidak memiliki dukungan data.
- Halaman teknis dipindahkan ke `/dev/foundation` dan hanya untuk development.
- Public header/footer mengikuti arah PDF: header putih, nav ringkas, CTA ke event yang benar-benar
  tersedia, dan footer navy tanpa social media palsu.
- Daftar event publik `/events` memakai macrostructure `Catalogue`: header inventori ringkas,
  jumlah event nyata, dan grid image-forward tiga kolom pada desktop. Card memakai banner,
  kategori, status, periode pendaftaran, jumlah peserta nyata, dan tautan detail tanpa shadow
  atau rounded-card berlebihan.
- Detail event memakai hero fotografi full-width dengan hierarchy display yang sama seperti
  homepage, lalu mempertahankan struktur informasi lama: jadwal, tentang event, benefit dari
  konfigurasi event, race pack, timeline, peraturan, FAQ, kategori/harga, dan form pendaftaran
  sticky. Panel konten memakai rule dan negative space; pada mobile seluruh konten dan form
  kembali menjadi satu kolom.
- CTA registrasi/upload tampil disabled dengan copy jelas karena fitur belum tersedia.
- Admin UI memakai workbench operasional: sidebar navy dengan grup kerja ringkas, topbar
  pencarian global, header halaman bergaris tegas tanpa eyebrow, KPI meter compact, table
  desktop, structured list mobile, filter fungsional, overflow action, dan status inline.
- Copy admin mengikuti model single active admin; jangan tampilkan role lama sebagai informasi
  operasional utama.
- Daftar Event admin mengikuti dashboard operasional padat: KPI total/aktif/draft/arsip dari
  database, filter nama/status/periode server-side, tabel event dengan banner dan jumlah pendaftar
  nyata, pagination, export Excel, panel event mendekati penutupan, ranking registrasi, serta
  aktivitas audit terbaru. Pada viewport kecil tabel berubah menjadi daftar terstruktur.
- Event create memakai dashboard form satu layar dengan informasi event, jadwal, kategori dan
  harga inline, upload banner, benefit, peraturan/FAQ, pengaturan publikasi, live preview, dan
  ringkasan cepat. Event edit memakai workbench operasional: satu panel form utama, section
  berbasis fungsi, rail navigasi, ringkasan status, dan sticky save tanpa card berulang yang
  membuat UX terasa kabur.
- Preview admin memakai public presentation component yang sama; preview bar berada di route admin,
  bukan di public component.
- Public registration memakai shell event yang sama, form mobile-first, checkbox kategori,
  section bernomor, inline error, dan CTA orange yang tegas.
- Confirmation memakai `Confirmation Docket`: hero fotografi event, nomor BIB sebagai anchor,
  ringkasan peserta berbasis garis, progress pendaftaran, preview/download BIB privat, status
  email, dan langkah berikutnya tanpa menyimpan data pribadi di URL. Status asynchronous BIB dan
  email diperbarui otomatis selama masih diproses. Form detail event dan form register mengarah ke
  confirmation yang sama.
- Participant access memakai gaya public landing: access gate fotografi event, form kotak tegas,
  jadwal operasional berbasis garis, dan tetap memakai HttpOnly session tanpa mengubah flow
  autentikasi peserta. BIB page mengikuti typography display dan panel status editorial; preview
  BIB tampil hanya setelah status `READY`.
- Admin BIB Template memakai dashboard global lintas event, filter server-side auto-apply,
  lifecycle draft/publish/archive, editor coordinate/font eksplisit, preview proporsional
  terhadap canvas asli, upload PNG/JPG, dan template versioning tanpa data template palsu.
- Sidebar admin memakai navigasi light dengan grup Dashboard, Event, Hasil Lari, Laporan, dan
  Pengaturan. Menu event-context memakai event yang sedang dibuka atau event terbaru yang dapat
  dikelola, badge Upload Masuk berasal dari jumlah submission `SUBMITTED`, dan desktop sidebar
  dapat diciutkan ke mode ikon. Preferensi collapse disimpan di browser dan setiap ikon navigasi
  tetap memiliki label aksesibel serta tooltip.
- Admin participant list memakai table desktop dan structured list mobile dengan status badge,
  filter server-side, dan data kontak yang dimasked pada list.
- Participant dashboard memakai `Participant Workbench`: hero fotografi event, ringkasan BIB,
  status submission per kategori, progress upload, preview BIB, checklist, bantuan, dan informasi
  event dengan gaya editorial yang konsisten dengan landing page tanpa metrik atau klaim palsu.
- Upload hasil memakai `Upload Ledger`: daftar kategori berbasis baris editorial, form upload
  dengan blok Data Aktivitas, Durasi, dan Bukti, label eksplisit, status submission, catatan
  validator, dan riwayat revisi berbasis timeline/card tegas. Progress upload granular belum
  dibuat karena flow fase ini memakai server action.
- Admin validation queue memakai table desktop dan structured list mobile, filter server-side,
  status badge, warning count, dan link review per submission tanpa konsep claim/reviewer.
- Detail validation menampilkan evidence, deterministic checks, riwayat revisi, riwayat
  validation, serta form keputusan langsung untuk approve, request revisi, atau reject tanpa
  mengekspos internal note ke peserta.
- Validator assignment adalah UI legacy dan disembunyikan dari navigasi utama karena production
  memakai single admin app-level.
- Detail event admin memiliki panel sertifikat untuk upload/preview template PNG per event,
  melihat ringkasan antrean/terkirim/gagal/invalid, dan menyelesaikan event untuk memicu job
  sertifikat.
- Participant submission menampilkan catatan validator yang participant-visible pada dashboard,
  form revisi, dan riwayat.
