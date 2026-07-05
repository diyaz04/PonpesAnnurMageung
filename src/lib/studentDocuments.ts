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

type RGB = [number, number, number];
const C: Record<string, RGB> = {
  white: [255, 255, 255],
  ink: [15, 23, 42],
  slate: [100, 116, 139],
  line: [226, 232, 240],
  paper: [248, 250, 252],
};

type EntityCardConfig = {
  name: string;
  shortName: string;
  cardTitle: string;
  personLabel: string;
  logoUrl: string;
  primary: RGB;
  secondary: RGB;
  accent: RGB;
  accent2: RGB;
  pale: RGB;
  paper: RGB;
};

const fill = (doc: PdfDoc, color: RGB) => doc.setFillColor(color[0], color[1], color[2]);
const text = (doc: PdfDoc, color: RGB) => doc.setTextColor(color[0], color[1], color[2]);
const draw = (doc: PdfDoc, color: RGB) => doc.setDrawColor(color[0], color[1], color[2]);

function entityConfig(entity: StudentDocumentEntity): EntityCardConfig {
  return entity === "smp"
    ? {
        name: "SMP Ma'arif NU Sariwangi",
        shortName: "SMP",
        cardTitle: "KARTU SISWA",
        personLabel: "Siswa",
        logoUrl: smpLogoUrl,
        primary: [21, 45, 92],
        secondary: [37, 99, 235],
        accent: [14, 165, 233],
        accent2: [250, 204, 21],
        pale: [224, 242, 254],
        paper: [248, 250, 252],
      }
    : {
        name: "Pondok Pesantren An-Nur Mageung",
        shortName: "AN",
        cardTitle: "KARTU SANTRI",
        personLabel: "Santri",
        logoUrl: pesantrenLogoUrl,
        primary: [6, 78, 59],
        secondary: [17, 94, 89],
        accent: [212, 175, 55],
        accent2: [37, 99, 235],
        pale: [236, 253, 245],
        paper: [255, 251, 235],
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
    color: { dark: "#102B1E", light: "#FFFFFF" },
  });
}

function imageFormat(dataUrl: string) {
  return dataUrl.includes("image/png") ? "PNG" : "JPEG";
}

function addBackgroundPattern(doc: PdfDoc, config: EntityCardConfig) {
  fill(doc, config.paper);
  doc.roundedRect(0, 0, cardWidth, cardHeight, 3, 3, "F");

  fill(doc, config.pale);
  doc.circle(cardWidth - 8, 4, 17, "F");
  doc.circle(cardWidth - 24, cardHeight + 2, 18, "F");

  draw(doc, config.pale);
  doc.setLineWidth(0.35);
  for (let x = -8; x < cardWidth; x += 8) {
    doc.line(x, cardHeight - 1, x + 21, 20);
  }
}

function addLogoMark(
  doc: PdfDoc,
  config: EntityCardConfig,
  logo: string | null,
  x: number,
  y: number,
  size: number,
) {
  fill(doc, C.white);
  doc.circle(x + size / 2, y + size / 2, size / 2, "F");
  draw(doc, config.accent);
  doc.setLineWidth(0.45);
  doc.circle(x + size / 2, y + size / 2, size / 2, "S");

  if (logo) {
    doc.addImage(logo, imageFormat(logo), x + 1.6, y + 1.6, size - 3.2, size - 3.2);
    return;
  }

  text(doc, config.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size > 10 ? 6.2 : 5.2);
  doc.text(config.shortName, x + size / 2, y + size / 2 + 1.6, { align: "center" });
}

function addPhotoFrame(doc: PdfDoc, photo: string | null, config: EntityCardConfig) {
  const photoX = 5.8;
  const photoY = 21.2;
  const photoW = 21.2;
  const photoH = 27.4;

  fill(doc, [210, 214, 222]);
  doc.roundedRect(photoX + 1, photoY + 1.1, photoW, photoH, 2.5, 2.5, "F");
  fill(doc, C.white);
  doc.roundedRect(photoX, photoY, photoW, photoH, 2.8, 2.8, "F");
  draw(doc, config.accent);
  doc.setLineWidth(0.55);
  doc.roundedRect(photoX, photoY, photoW, photoH, 2.8, 2.8, "S");

  if (photo) {
    doc.addImage(photo, imageFormat(photo), photoX + 1.2, photoY + 1.2, photoW - 2.4, photoH - 2.4);
    return;
  }

  fill(doc, config.pale);
  doc.roundedRect(photoX + 1.2, photoY + 1.2, photoW - 2.4, photoH - 2.4, 2, 2, "F");
  text(doc, config.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.text("FOTO", photoX + photoW / 2, photoY + photoH / 2 + 1, { align: "center" });
}

async function addCardFront(
  doc: PdfDoc,
  entity: StudentDocumentEntity,
  student: StudentDocumentData,
  assets?: { logo?: string | null; photo?: string | null; qr?: string },
) {
  const config = entityConfig(entity);
  const logo = assets?.logo ?? (await imageToDataUrl(config.logoUrl));
  const photo = assets?.photo ?? (await imageToDataUrl(student.fotoUrl));
  const qr = assets?.qr ?? (await qrToDataUrl(student.kodeUnik));

  addBackgroundPattern(doc, config);

  fill(doc, config.primary);
  doc.roundedRect(0, 0, cardWidth, 17.6, 3, 3, "F");
  doc.rect(0, 14, cardWidth, 4, "F");
  fill(doc, config.secondary);
  doc.circle(cardWidth - 2, 2, 22, "F");
  fill(doc, config.accent);
  doc.roundedRect(0, 15.8, cardWidth, 2, 0, 0, "F");

  addLogoMark(doc, config, logo, 4.2, 3, 11.8);

  text(doc, config.accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.7);
  doc.text(config.cardTitle, 18.3, 7.2);

  text(doc, C.white);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.6);
  doc.text(config.name, 18.3, 12.2, { maxWidth: 47 });

  fill(doc, config.pale);
  doc.circle(cardWidth - 11.2, 26.4, 15, "F");
  addLogoMark(doc, config, logo, cardWidth - 17.2, 20.4, 12);

  addPhotoFrame(doc, photo, config);

  const infoX = 30.2;
  text(doc, config.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.7);
  const nameLines = doc.splitTextToSize(student.nama || "-", 36).slice(0, 2);
  doc.text(nameLines, infoX, 24.3);

  const details: [string, string][] = [
    [student.nomorIndukLabel, student.nomorInduk],
    [entity === "smp" ? "Kelas" : "Kelas/Angkatan", String(student.kelas || student.tahunMasuk || "-")],
    ["J. Kelamin", student.jenisKelamin === "L" ? "Laki-laki" : student.jenisKelamin === "P" ? "Perempuan" : student.jenisKelamin],
  ];

  let rowY = 24.5 + nameLines.length * 4.2 + 2;
  details.forEach(([label, value]) => {
    text(doc, C.slate);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.8);
    doc.text(label.toUpperCase(), infoX, rowY);
    text(doc, C.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    doc.text(value || "-", infoX, rowY + 3.3, { maxWidth: 34 });
    rowY += 7.7;
  });

  const qrSize = 13.2;
  const qrX = cardWidth - qrSize - 4.8;
  const qrY = cardHeight - qrSize - 6.3;
  fill(doc, C.white);
  doc.roundedRect(qrX - 1.2, qrY - 1.2, qrSize + 2.4, qrSize + 2.4, 2, 2, "F");
  draw(doc, config.accent);
  doc.setLineWidth(0.3);
  doc.roundedRect(qrX - 1.2, qrY - 1.2, qrSize + 2.4, qrSize + 2.4, 2, 2, "S");
  doc.addImage(qr, imageFormat(qr), qrX, qrY, qrSize, qrSize);
  text(doc, C.slate);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.4);
  doc.text("Kode Akses", qrX + qrSize / 2, cardHeight - 1.6, { align: "center" });

  fill(doc, config.primary);
  doc.roundedRect(3.5, cardHeight - 4.4, 47, 2.6, 1.3, 1.3, "F");
  fill(doc, config.accent);
  doc.roundedRect(51.8, cardHeight - 4.4, 30, 2.6, 1.3, 1.3, "F");
}

async function addCardBack(
  doc: PdfDoc,
  entity: StudentDocumentEntity,
  student: StudentDocumentData,
  assets?: { logo?: string | null; qr?: string },
) {
  const config = entityConfig(entity);
  const logo = assets?.logo ?? (await imageToDataUrl(config.logoUrl));
  const qr = assets?.qr ?? (await qrToDataUrl(student.kodeUnik));

  addBackgroundPattern(doc, config);

  fill(doc, config.primary);
  doc.roundedRect(0, 0, cardWidth, 14.5, 3, 3, "F");
  doc.rect(0, 11.5, cardWidth, 3, "F");
  fill(doc, config.accent);
  doc.roundedRect(0, 13, cardWidth, 2, 0, 0, "F");
  addLogoMark(doc, config, logo, 4, 2.4, 9.5);

  text(doc, C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("VALIDASI & AKSES DATA", 16, 6.6);
  text(doc, config.accent);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.text("Scan QR untuk cek pembayaran, record, dan biodata.", 16, 11);

  const qrSize = 22;
  fill(doc, C.white);
  doc.roundedRect(5, 18, qrSize + 3, qrSize + 3, 2.4, 2.4, "F");
  draw(doc, config.accent);
  doc.setLineWidth(0.3);
  doc.roundedRect(5, 18, qrSize + 3, qrSize + 3, 2.4, 2.4, "S");
  doc.addImage(qr, imageFormat(qr), 6.5, 19.5, qrSize, qrSize);

  const chipX = 32;
  const chipY = 18.2;
  fill(doc, C.white);
  draw(doc, config.accent);
  doc.setLineWidth(0.4);
  doc.roundedRect(chipX, chipY, 48.5, 10, 2, 2, "FD");
  text(doc, C.slate);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.text("KODE UNIK", chipX + 2.3, chipY + 3.4);
  text(doc, config.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.text(student.kodeUnik || "-", chipX + 2.3, chipY + 7.8, { maxWidth: 42 });

  const infoRows: [string, string][] = [
    ["Nama Wali", student.namaWali || "-"],
    ["Kontak Wali", student.noHpWali || "-"],
    ["Alamat", student.alamat || "-"],
  ];
  let ry = 33;
  infoRows.forEach(([label, value]) => {
    text(doc, C.slate);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.9);
    doc.text(label.toUpperCase(), chipX, ry);
    text(doc, C.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.1);
    const lines = doc.splitTextToSize(value, 46).slice(0, label === "Alamat" ? 2 : 1);
    doc.text(lines, chipX, ry + 3.3);
    ry += label === "Alamat" ? 10 : 7.6;
  });

  fill(doc, config.primary);
  doc.roundedRect(0, cardHeight - 7, cardWidth, 7, 3, 3, "F");
  doc.rect(0, cardHeight - 9, cardWidth, 3, "F");
  text(doc, C.white);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.text(`${config.name} - Tasikmalaya`, cardWidth / 2, cardHeight - 3, {
    align: "center",
  });
}

async function preloadAssets(entity: StudentDocumentEntity, student: StudentDocumentData) {
  const config = entityConfig(entity);
  const [logo, photo, qr] = await Promise.all([
    imageToDataUrl(config.logoUrl),
    imageToDataUrl(student.fotoUrl),
    qrToDataUrl(student.kodeUnik),
  ]);
  return { logo, photo, qr };
}

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

function addInfoRow(doc: PdfDoc, label: string, value: string, x: number, y: number, width = 155) {
  text(doc, C.slate);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(label, x, y);
  text(doc, C.ink);
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

  fill(doc, config.primary);
  doc.rect(0, 0, 210, 34, "F");
  fill(doc, config.accent);
  doc.rect(0, 30, 210, 4, "F");

  addLogoMark(doc, config, logo, 14, 8, 18);

  text(doc, C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`BIODATA ${config.personLabel.toUpperCase()}`, 38, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(config.name, 38, 22);

  fill(doc, C.paper);
  doc.roundedRect(14, 45, 182, 215, 4, 4, "F");
  draw(doc, C.line);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, 45, 182, 215, 4, 4, "S");

  fill(doc, config.accent);
  doc.roundedRect(14, 45, 3, 215, 2, 2, "F");

  if (photo) doc.addImage(photo, imageFormat(photo), 24, 58, 35, 45);
  else {
    fill(doc, config.pale);
    doc.roundedRect(24, 58, 35, 45, 2, 2, "F");
    draw(doc, C.line);
    doc.roundedRect(24, 58, 35, 45, 2, 2, "S");
    text(doc, config.primary);
    doc.setFontSize(8);
    doc.text("FOTO", 41.5, 82, { align: "center" });
  }

  fill(doc, C.white);
  doc.roundedRect(149, 56, 36, 36, 2, 2, "F");
  draw(doc, config.accent);
  doc.roundedRect(149, 56, 36, 36, 2, 2, "S");
  doc.addImage(qr, imageFormat(qr), 151, 58, 32, 32);
  text(doc, C.slate);
  doc.setFontSize(7.5);
  doc.text("Kode akses cek pembayaran dan record", 167, 97, { align: "center", maxWidth: 48 });

  text(doc, C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(student.nama, 68, 63, { maxWidth: 78 });
  doc.setFontSize(10);
  text(doc, config.primary);
  doc.text(`${student.nomorIndukLabel}: ${student.nomorInduk}`, 68, 77);
  doc.text(`Status: ${student.status || "aktif"}`, 68, 85);

  draw(doc, C.line);
  doc.setLineWidth(0.5);
  doc.line(24, 115, 186, 115);
  text(doc, C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Data Lengkap", 24, 127);

  const rows: [string, string][] = [
    [student.nomorIndukLabel, student.nomorInduk],
    ["Nama Lengkap", student.nama],
    ["Jenis Kelamin", student.jenisKelamin === "L" ? "Laki-laki" : student.jenisKelamin === "P" ? "Perempuan" : student.jenisKelamin],
    [entity === "smp" ? "Kelas" : "Kelas/Angkatan", String(student.kelas || student.tahunMasuk || "-")],
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

  fill(doc, config.pale);
  draw(doc, C.line);
  doc.setLineWidth(0.4);
  doc.roundedRect(24, 238, 162, 8, 2, 2, "FD");
  text(doc, config.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Dokumen biodata ini digenerate dari dashboard administrasi.", 105, 243.3, {
    align: "center",
  });

  doc.save(`biodata-${safeFilename(student.nama)}.pdf`);
}
