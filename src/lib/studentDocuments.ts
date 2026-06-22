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

function entityConfig(entity: StudentDocumentEntity) {
  return entity === "smp"
    ? {
        name: "SMP Ma'arif NU Sariwangi",
        shortName: "SMP",
        cardTitle: "KARTU SISWA",
        personLabel: "Siswa",
        logoUrl: smpLogoUrl,
        primary: [6, 95, 70] as const,
        accent: [217, 174, 75] as const,
      }
    : {
        name: "Pondok Pesantren An-Nur Mageung",
        shortName: "AN",
        cardTitle: "KARTU SANTRI",
        personLabel: "Santri",
        logoUrl: pesantrenLogoUrl,
        primary: [6, 95, 70] as const,
        accent: [217, 174, 75] as const,
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
  });
}

function addLogoPlaceholder(doc: PdfDoc, x: number, y: number, size: number, shortName: string) {
  doc.setFillColor(255, 255, 255);
  doc.circle(x + size / 2, y + size / 2, size / 2, "F");
  doc.setTextColor(6, 95, 70);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size > 14 ? 12 : 8);
  doc.text(shortName, x + size / 2, y + size / 2 + 2, { align: "center" });
}

function addPhotoPlaceholder(doc: PdfDoc, x: number, y: number, w: number, h: number) {
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(x, y, w, h, 2, 2, "F");
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("FOTO", x + w / 2, y + h / 2 + 1, { align: "center" });
}

function imageFormat(dataUrl: string) {
  return dataUrl.includes("image/png") ? "PNG" : "JPEG";
}

function addLabeledText(
  doc: PdfDoc,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(label, x, y);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(value || "-", x, y + 3.8, { maxWidth });
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

  doc.setFillColor(...config.primary);
  doc.rect(0, 0, cardWidth, cardHeight, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(4, 4, cardWidth - 8, cardHeight - 8, 3, 3, "F");
  doc.setFillColor(...config.primary);
  doc.roundedRect(4, 4, cardWidth - 8, 14, 3, 3, "F");
  doc.rect(4, 11, cardWidth - 8, 7, "F");

  if (logo) doc.addImage(logo, imageFormat(logo), 7, 6, 10, 10);
  else addLogoPlaceholder(doc, 7, 6, 10, config.shortName);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(config.cardTitle, 19, 10.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  doc.text(config.name, 19, 14.3);

  if (photo) doc.addImage(photo, imageFormat(photo), 7, 22, 20, 25);
  else addPhotoPlaceholder(doc, 7, 22, 20, 25);

  doc.addImage(qr, imageFormat(qr), 65, 31, 14, 14);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text("Kode Akses", 72, 47.5, { align: "center" });

  addLabeledText(doc, "Nama", student.nama, 31, 24, 31);
  addLabeledText(doc, student.nomorIndukLabel, student.nomorInduk, 31, 33, 31);
  addLabeledText(doc, entity === "smp" ? "Kelas" : "Angkatan", String(student.kelas || student.tahunMasuk || "-"), 31, 42, 31);

  doc.setFillColor(...config.accent);
  doc.roundedRect(7, 49, cardWidth - 14, 3, 1, 1, "F");
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

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, cardWidth, cardHeight, "F");
  doc.setDrawColor(...config.primary);
  doc.setLineWidth(0.8);
  doc.roundedRect(3, 3, cardWidth - 6, cardHeight - 6, 3, 3, "S");

  if (logo) doc.addImage(logo, imageFormat(logo), 7, 7, 12, 12);
  else addLogoPlaceholder(doc, 7, 7, 12, config.shortName);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("INFORMASI AKSES", 22, 10.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.text("Scan QR untuk cek pembayaran dan record.", 22, 14.5);

  doc.addImage(qr, imageFormat(qr), 7, 24, 20, 20);
  addLabeledText(doc, "Kode Akses", student.kodeUnik, 31, 25, 46);
  addLabeledText(doc, "Nama Wali", student.namaWali || "-", 31, 34, 46);
  addLabeledText(doc, "Kontak Wali", student.noHpWali || "-", 31, 43, 46);

  doc.setFillColor(...config.primary);
  doc.rect(3, 49, cardWidth - 6, 2, "F");
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
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(label, x, y);
  doc.setTextColor(15, 23, 42);
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

  doc.setFillColor(...config.primary);
  doc.rect(0, 0, 210, 34, "F");
  if (logo) doc.addImage(logo, imageFormat(logo), 14, 8, 18, 18);
  else addLogoPlaceholder(doc, 14, 8, 18, config.shortName);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`BIODATA ${config.personLabel.toUpperCase()}`, 38, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(config.name, 38, 22);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 45, 182, 215, 4, 4, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 45, 182, 215, 4, 4, "S");

  if (photo) doc.addImage(photo, imageFormat(photo), 24, 58, 35, 45);
  else addPhotoPlaceholder(doc, 24, 58, 35, 45);

  doc.addImage(qr, imageFormat(qr), 151, 58, 32, 32);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text("Kode akses cek pembayaran dan record", 167, 95, { align: "center", maxWidth: 48 });

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(student.nama, 68, 63, { maxWidth: 78 });
  doc.setFontSize(10);
  doc.setTextColor(...config.primary);
  doc.text(`${student.nomorIndukLabel}: ${student.nomorInduk}`, 68, 77);
  doc.text(`Status: ${student.status || "aktif"}`, 68, 85);

  doc.setDrawColor(203, 213, 225);
  doc.line(24, 115, 186, 115);
  doc.setTextColor(15, 23, 42);
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

  doc.setFillColor(...config.accent);
  doc.roundedRect(24, 238, 162, 8, 2, 2, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Dokumen biodata ini digenerate dari dashboard administrasi.", 105, 243.3, {
    align: "center",
  });

  doc.save(`biodata-${safeFilename(student.nama)}.pdf`);
}
