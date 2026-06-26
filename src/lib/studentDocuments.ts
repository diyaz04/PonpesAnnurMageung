import { pesantrenLogoUrl, smpLogoUrl } from "./brandLogos";

type PdfDoc = InstanceType<typeof import("jspdf").jsPDF>;

export type StudentDocumentEntity = "pesantren" | "smp";

export type StudentDocumentData = {
  nama: string;
  nomorInduk: string;
  nomorIndukLabel: string;
  kodeUnik: string;
  jenisKelamin: string;
  tahunMasuk: number | string;
  tanggalLahir?: string | null;
  kelas?: string | null;
  alamat?: string | null;
  namaWali?: string | null;
  noHpWali?: string | null;
  fotoUrl?: string | null;
  status?: string | null;
};

const cardWidth = 85.6;
const cardHeight = 54;

// Palette C — Sage Mint Modern
const C = {
  deepest:  [16, 43, 30]   as const,  // #102B1E
  dark:     [30, 92, 64]   as const,  // #1E5C40
  mid:      [46, 138, 90]  as const,  // #2E8A5A
  bright:   [61, 184, 114] as const,  // #3DB872
  light:    [125, 212, 164] as const, // #7DD4A4
  pale:     [192, 237, 213] as const, // #C0EDD5
  palest:   [235, 249, 242] as const, // #EBF9F2
  white:    [255, 255, 255] as const,
  slate:    [120, 144, 156] as const,
  ink:      [15, 23, 42]   as const,
};

function entityConfig(entity: StudentDocumentEntity) {
  return entity === "smp"
    ? {
        name: "SMP Ma'arif NU Sariwangi",
        shortName: "SMP",
        cardTitle: "KARTU SISWA",
        personLabel: "Siswa",
        logoUrl: smpLogoUrl,
        primary: C.deepest,
        accent: C.bright,
      }
    : {
        name: "Pondok Pesantren An-Nur Mageung",
        shortName: "AN",
        cardTitle: "KARTU SANTRI",
        personLabel: "Santri",
        logoUrl: pesantrenLogoUrl,
        primary: C.deepest,
        accent: C.bright,
      };
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function imageToDataUrl(url?: string | null) {
  if (!url) return null;
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function qrToDataUrl(value: string) {
  const QRCode = await import("qrcode");
  return QRCode.toDataURL(value || "-", {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
    color: { dark: "#102B1E", light: "#EBF9F2" },
  });
}

function imageFormat(dataUrl: string) {
  return dataUrl.includes("image/png") ? "PNG" : "JPEG";
}

// ─── Front card ───────────────────────────────────────────────────────────────
async function addCardFront(
  doc: PdfDoc,
  entity: StudentDocumentEntity,
  student: StudentDocumentData,
  assets?: { logo?: string | null; photo?: string | null; qr?: string },
) {
  const config = entityConfig(entity);
  const logo  = assets?.logo  ?? (await imageToDataUrl(config.logoUrl));
  const photo = assets?.photo ?? (await imageToDataUrl(student.fotoUrl));
  const qr    = assets?.qr    ?? (await qrToDataUrl(student.kodeUnik));

  // ── white base ──
  doc.setFillColor(...C.white);
  doc.roundedRect(0, 0, cardWidth, cardHeight, 3, 3, "F");

  // ── dark green header band ──
  doc.setFillColor(...C.deepest);
  doc.roundedRect(0, 0, cardWidth, 16, 3, 3, "F");
  doc.rect(0, 13, cardWidth, 3, "F"); // square off bottom of rounded rect

  // ── logo circle in header ──
  doc.setFillColor(...C.bright);
  doc.circle(8.5, 8, 5.5, "F");
  if (logo) {
    doc.addImage(logo, imageFormat(logo), 3.5, 3, 10, 10);
  } else {
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.text(config.shortName, 8.5, 9, { align: "center" });
  }

  // ── card type + institution name ──
  doc.setTextColor(...C.light);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text(config.cardTitle, 17, 7);

  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.text(config.name, 17, 12);

  // ── subtle left accent stripe ──
  doc.setFillColor(...C.bright);
  doc.roundedRect(3, 18, 1.5, cardHeight - 22, 0.5, 0.5, "F");

  // ── photo box ──
  const photoX = 7, photoY = 19, photoW = 18, photoH = 24;
  doc.setFillColor(...C.palest);
  doc.roundedRect(photoX, photoY, photoW, photoH, 2, 2, "F");
  doc.setDrawColor(...C.pale);
  doc.setLineWidth(0.3);
  doc.roundedRect(photoX, photoY, photoW, photoH, 2, 2, "S");
  if (photo) {
    doc.addImage(photo, imageFormat(photo), photoX, photoY, photoW, photoH);
  } else {
    doc.setTextColor(...C.mid);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.text("FOTO", photoX + photoW / 2, photoY + photoH / 2 + 1, { align: "center" });
  }

  // ── info rows (center column) ──
  const infoX = 29;
  const rows: [string, string][] = [
    ["Nama", student.nama],
    [student.nomorIndukLabel, student.nomorInduk],
    [entity === "smp" ? "Kelas" : "Angkatan", String(student.kelas || student.tahunMasuk || "-")],
    ["J. Kelamin", student.jenisKelamin === "L" ? "Laki-laki" : student.jenisKelamin === "P" ? "Perempuan" : student.jenisKelamin],
  ];
  let rowY = 21;
  rows.forEach(([label, value]) => {
    doc.setTextColor(...C.slate);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.text(label, infoX, rowY);
    doc.setTextColor(...C.deepest);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(label === "Nama" ? 7.5 : 7);
    doc.text(value || "-", infoX, rowY + 3.2, { maxWidth: 32 });
    rowY += label === "Nama" ? 11 : 9.5;
  });

  // ── QR code — bottom-right corner ──
  const qrSize = 14;
  const qrX = cardWidth - qrSize - 4;
  const qrY = cardHeight - qrSize - 6;
  doc.setFillColor(...C.palest);
  doc.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 1.5, 1.5, "F");
  doc.setDrawColor(...C.pale);
  doc.setLineWidth(0.3);
  doc.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 1.5, 1.5, "S");
  doc.addImage(qr, imageFormat(qr), qrX, qrY, qrSize, qrSize);
  doc.setTextColor(...C.slate);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.8);
  doc.text("Kode Akses", qrX + qrSize / 2 - 0.5, cardHeight - 1.2, { align: "center" });

  // ── footer gradient stripe (5 segments) ──
  const stripeColors = [C.deepest, C.dark, C.mid, C.bright, C.light];
  const segW = (cardWidth - 6) / stripeColors.length;
  stripeColors.forEach((col, i) => {
    doc.setFillColor(...col);
    const rx = i === 0 ? 1 : 0;
    const lx = i === stripeColors.length - 1 ? 1 : 0;
    if (rx || lx) {
      doc.roundedRect(3 + i * segW, cardHeight - 3, segW, 2.5, rx, lx, "F");
    } else {
      doc.rect(3 + i * segW, cardHeight - 3, segW, 2.5, "F");
    }
  });
}

// ─── Back card ────────────────────────────────────────────────────────────────
async function addCardBack(
  doc: PdfDoc,
  entity: StudentDocumentEntity,
  student: StudentDocumentData,
  assets?: { logo?: string | null; qr?: string },
) {
  const config = entityConfig(entity);
  const logo = assets?.logo ?? (await imageToDataUrl(config.logoUrl));
  const qr   = assets?.qr   ?? (await qrToDataUrl(student.kodeUnik));

  // ── white base ──
  doc.setFillColor(...C.white);
  doc.roundedRect(0, 0, cardWidth, cardHeight, 3, 3, "F");

  // ── header band ──
  doc.setFillColor(...C.dark);
  doc.roundedRect(0, 0, cardWidth, 14, 3, 3, "F");
  doc.rect(0, 11, cardWidth, 3, "F");

  // ── logo in header ──
  doc.setFillColor(...C.bright);
  doc.circle(7.5, 7, 4.5, "F");
  if (logo) {
    doc.addImage(logo, imageFormat(logo), 3, 2.5, 9, 9);
  } else {
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    doc.text(config.shortName, 7.5, 8, { align: "center" });
  }

  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("INFORMASI AKSES", 15, 7);
  doc.setTextColor(...C.light);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.text("Scan QR untuk cek pembayaran dan record.", 15, 11.5);

  // ── QR code (left) ──
  const qrSize = 20;
  doc.setFillColor(...C.palest);
  doc.roundedRect(4, 17, qrSize + 2, qrSize + 2, 2, 2, "F");
  doc.setDrawColor(...C.pale);
  doc.setLineWidth(0.3);
  doc.roundedRect(4, 17, qrSize + 2, qrSize + 2, 2, 2, "S");
  doc.addImage(qr, imageFormat(qr), 5, 18, qrSize, qrSize);

  // ── kode unik chip ──
  const chipX = 29, chipY = 17;
  doc.setFillColor(...C.palest);
  doc.setDrawColor(...C.pale);
  doc.setLineWidth(0.4);
  doc.roundedRect(chipX, chipY, 53, 9, 1.5, 1.5, "FD");
  doc.setTextColor(...C.mid);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.text("KODE UNIK", chipX + 2, chipY + 3.2);
  doc.setTextColor(...C.deepest);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(student.kodeUnik, chipX + 2, chipY + 7.2);

  // ── wali info rows ──
  const infoRows: [string, string][] = [
    ["Nama Wali",    student.namaWali  || "-"],
    ["Kontak Wali",  student.noHpWali  || "-"],
  ];
  let ry = 31;
  infoRows.forEach(([label, value]) => {
    doc.setTextColor(...C.slate);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.text(label, 29, ry);
    doc.setTextColor(...C.deepest);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(value, 29, ry + 3.5, { maxWidth: 53 });
    ry += 10;
  });

  // ── footer bar ──
  doc.setFillColor(...C.deepest);
  doc.roundedRect(0, cardHeight - 7, cardWidth, 7, 3, 3, "F");
  doc.rect(0, cardHeight - 10, cardWidth, 3, "F");
  doc.setTextColor(255, 255, 255, 0.6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.text(
    `${config.name} — Tasikmalaya`,
    cardWidth / 2,
    cardHeight - 3,
    { align: "center" },
  );
}

// ─── Asset preloader ──────────────────────────────────────────────────────────
async function preloadAssets(entity: StudentDocumentEntity, student: StudentDocumentData) {
  const config = entityConfig(entity);
  const [logo, photo, qr] = await Promise.all([
    imageToDataUrl(config.logoUrl),
    imageToDataUrl(student.fotoUrl),
    qrToDataUrl(student.kodeUnik),
  ]);
  return { logo, photo, qr };
}

// ─── Public exports ───────────────────────────────────────────────────────────
export async function downloadStudentCard(
  entity: StudentDocumentEntity,
  student: StudentDocumentData,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [cardWidth, cardHeight] });
  const assets = await preloadAssets(entity, student);
  await addCardFront(doc, entity, student, assets);
  doc.addPage([cardWidth, cardHeight], "landscape");
  await addCardBack(doc, entity, student, assets);
  doc.save(`kartu-${safeFilename(student.nama)}.pdf`);
}

export async function downloadAllStudentCards(
  entity: StudentDocumentEntity,
  students: StudentDocumentData[],
) {
  if (!students.length) return;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [cardWidth, cardHeight] });
  const config = entityConfig(entity);
  const logo = await imageToDataUrl(config.logoUrl);

  for (let index = 0; index < students.length; index += 1) {
    const student = students[index];
    const [photo, qr] = await Promise.all([
      imageToDataUrl(student.fotoUrl),
      qrToDataUrl(student.kodeUnik),
    ]);
    if (index > 0) doc.addPage([cardWidth, cardHeight], "landscape");
    await addCardFront(doc, entity, student, { logo, photo, qr });
    doc.addPage([cardWidth, cardHeight], "landscape");
    await addCardBack(doc, entity, student, { logo, qr });
  }

  doc.save(`semua-kartu-${entity}.pdf`);
}

// ─── Biodata A4 ───────────────────────────────────────────────────────────────
function addInfoRow(doc: PdfDoc, label: string, value: string, x: number, y: number, width = 155) {
  doc.setTextColor(...C.slate);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(label, x, y);
  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(value || "-", x + 42, y, { maxWidth: width - 42 });
}

export async function downloadStudentBiodata(
  entity: StudentDocumentEntity,
  student: StudentDocumentData,
) {
  const config = entityConfig(entity);
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const [logo, photo, qr] = await Promise.all([
    imageToDataUrl(config.logoUrl),
    imageToDataUrl(student.fotoUrl),
    qrToDataUrl(student.kodeUnik),
  ]);

  // header
  doc.setFillColor(...C.deepest);
  doc.rect(0, 0, 210, 34, "F");
  // accent stripe
  doc.setFillColor(...C.bright);
  doc.rect(0, 30, 210, 4, "F");

  if (logo) doc.addImage(logo, imageFormat(logo), 14, 8, 18, 18);
  else {
    doc.setFillColor(...C.bright);
    doc.circle(23, 17, 9, "F");
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(config.shortName, 23, 19, { align: "center" });
  }

  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`BIODATA ${config.personLabel.toUpperCase()}`, 38, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(config.name, 38, 22);

  // body card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 45, 182, 215, 4, 4, "F");
  doc.setDrawColor(...C.pale);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, 45, 182, 215, 4, 4, "S");

  // left accent stripe on body card
  doc.setFillColor(...C.bright);
  doc.roundedRect(14, 45, 3, 215, 2, 2, "F");

  if (photo) doc.addImage(photo, imageFormat(photo), 24, 58, 35, 45);
  else {
    doc.setFillColor(...C.palest);
    doc.roundedRect(24, 58, 35, 45, 2, 2, "F");
    doc.setDrawColor(...C.pale);
    doc.roundedRect(24, 58, 35, 45, 2, 2, "S");
    doc.setTextColor(...C.mid);
    doc.setFontSize(8);
    doc.text("FOTO", 41.5, 82, { align: "center" });
  }

  // QR
  doc.setFillColor(...C.palest);
  doc.roundedRect(149, 56, 36, 36, 2, 2, "F");
  doc.setDrawColor(...C.pale);
  doc.roundedRect(149, 56, 36, 36, 2, 2, "S");
  doc.addImage(qr, imageFormat(qr), 151, 58, 32, 32);
  doc.setTextColor(...C.slate);
  doc.setFontSize(7.5);
  doc.text("Kode akses cek pembayaran dan record", 167, 97, { align: "center", maxWidth: 48 });

  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(student.nama, 68, 63, { maxWidth: 78 });
  doc.setFontSize(10);
  doc.setTextColor(...C.dark);
  doc.text(`${student.nomorIndukLabel}: ${student.nomorInduk}`, 68, 77);
  doc.text(`Status: ${student.status || "aktif"}`, 68, 85);

  doc.setDrawColor(...C.pale);
  doc.setLineWidth(0.5);
  doc.line(24, 115, 186, 115);
  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Data Lengkap", 24, 127);

  const rows: [string, string][] = [
    [student.nomorIndukLabel, student.nomorInduk],
    ["Nama Lengkap", student.nama],
    ["Jenis Kelamin", student.jenisKelamin === "L" ? "Laki-laki" : student.jenisKelamin === "P" ? "Perempuan" : student.jenisKelamin],
    [entity === "smp" ? "Kelas" : "Angkatan", String(student.kelas || student.tahunMasuk || "-")],
    ["Tahun Masuk", String(student.tahunMasuk || "-")],
    ["Tanggal Lahir", formatDate(student.tanggalLahir)],
    ["Nama Wali", student.namaWali || "-"],
    ["No. HP Wali", student.noHpWali || "-"],
    ["Alamat", student.alamat || "-"],
    ["Kode Akses", student.kodeUnik],
  ];

  let y = 140;
  rows.forEach(([label, value]) => {
    addInfoRow(doc, label, value, 24, y, 158);
    y += label === "Alamat" ? 16 : 10;
  });

  // footer chip
  doc.setFillColor(...C.palest);
  doc.setDrawColor(...C.pale);
  doc.setLineWidth(0.4);
  doc.roundedRect(24, 238, 162, 8, 2, 2, "FD");
  doc.setTextColor(...C.dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Dokumen biodata ini digenerate dari dashboard administrasi.", 105, 243.3, {
    align: "center",
  });

  doc.save(`biodata-${safeFilename(student.nama)}.pdf`);
}
