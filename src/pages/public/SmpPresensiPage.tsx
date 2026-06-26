import {
  Camera,
  CameraOff,
  CheckCircle2,
  ChevronRight,
  Clock,
  KeyRound,
  Loader2,
  LogOut,
  Scan,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { smpLogoUrl } from "../../lib/brandLogos";
import { supabase } from "../../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
type Siswa = {
  id: string;
  nis: string;
  nama_lengkap: string;
  kelas: string | null;
  foto_url: string | null;
  status: string;
};

type WajahData = {
  id: string;
  siswa_id: string;
  descriptor: number[] | number[][];
  foto_url: string | null;
  aktif: boolean;
  siswa?: { nama_lengkap: string; kelas: string | null; nis: string };
};

type PresensiRow = {
  id: string;
  siswa_id: string;
  tanggal: string;
  jam_masuk: string | null;
  status: string;
  metode: string;
  siswa?: { nama_lengkap: string; nis: string; kelas: string | null };
};

type ScanResult = {
  nama: string;
  kelas: string;
  nis: string;
  waktu: string;
  status: "success" | "already" | "notfound";
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function euclid(a: number[], b: number[]) {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
}
function flatDescriptor(v: number[] | number[][]): number[][] {
  return Array.isArray(v[0]) ? (v as number[][]) : [v as number[]];
}

const CLEANUP_KEY = "smp_presensi_last_cleanup";
const CLEANUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

async function runWeeklyCleanup() {
  const lastRaw = localStorage.getItem(CLEANUP_KEY);
  const last = lastRaw ? Number(lastRaw) : 0;
  if (Date.now() - last < CLEANUP_INTERVAL_MS) return;

  try {
    const { data } = await supabase
      .from("smp_wajah_data")
      .select("id, foto_url")
      .not("foto_url", "is", null);

    if (!data || data.length === 0) {
      localStorage.setItem(CLEANUP_KEY, String(Date.now()));
      return;
    }

    const paths = (data as { id: string; foto_url: string }[])
      .map((row) => row.foto_url.replace(/^\//, ""))
      .filter(Boolean);

    if (paths.length > 0) {
      await supabase.storage.from("siswa-foto").remove(paths);
      await supabase
        .from("smp_wajah_data")
        .update({ foto_url: null })
        .not("foto_url", "is", null);
    }

    localStorage.setItem(CLEANUP_KEY, String(Date.now()));
  } catch {
    // abaikan
  }
}

// ─── Access Gate ──────────────────────────────────────────────────────────────
function AccessGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  function tryUnlock() {
    if (code === "admin123") {
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-green-950 px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-green-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-green-800/60 blur-3xl" />
      </div>
      <div className="absolute inset-0 bg-hero-grid bg-[size:48px_48px] opacity-20" />

      <div
        className={[
          "relative z-10 w-full max-w-sm transition-all duration-300",
          shake ? "animate-[shake_0.4s_ease]" : "",
        ].join(" ")}
      >
        <style>{`
          @keyframes shake {
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-10px)}
            40%{transform:translateX(10px)}
            60%{transform:translateX(-6px)}
            80%{transform:translateX(6px)}
          }
        `}</style>

        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-3 rounded-3xl bg-green-400/20 blur-xl" />
            <img
              src={smpLogoUrl}
              alt="SMP Ma'arif NU"
              className="relative h-20 w-20 rounded-2xl border-2 border-green-400/30 bg-white object-contain p-2 shadow-2xl"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-300/70">
              SMP Ma'arif NU Sariwangi
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-white">
              Presensi Digital
            </h1>
            <p className="mt-1 text-sm text-white/50">
              Sistem absensi berbasis face recognition
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-green-400/20">
              <KeyRound className="text-green-400" size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Masukkan Kode Akses</p>
              <p className="text-xs text-white/40">Diperlukan untuk membuka halaman</p>
            </div>
          </div>

          <input
            type="password"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(false); }}
            onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            placeholder="Kode akses..."
            autoFocus
            className={[
              "w-full rounded-xl border bg-white/5 px-4 py-3.5 text-sm text-white placeholder-white/30 outline-none transition-all",
              error
                ? "border-red-400/60 focus:border-red-400"
                : "border-white/15 focus:border-green-400/50 focus:ring-2 focus:ring-green-500/20",
            ].join(" ")}
          />

          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-400">
              <XCircle size={13} />
              Kode akses salah. Coba lagi.
            </p>
          )}

          <button
            onClick={tryUnlock}
            className="mt-4 w-full rounded-xl bg-green-500 py-3.5 text-sm font-bold text-green-950 transition hover:-translate-y-0.5 hover:bg-green-200 active:translate-y-0"
          >
            Buka Halaman Presensi
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-white/30">
          Hubungi admin sekolah jika tidak memiliki kode akses
        </p>
      </div>
    </div>
  );
}

// ─── Main Presensi Page ───────────────────────────────────────────────────────
export default function SmpPresensiPage() {
  const [unlocked, setUnlocked] = useState(() => {
    return sessionStorage.getItem("smp_presensi_unlocked") === "1";
  });

  function handleUnlock() {
    sessionStorage.setItem("smp_presensi_unlocked", "1");
    setUnlocked(true);
  }

  function handleLock() {
    sessionStorage.removeItem("smp_presensi_unlocked");
    setUnlocked(false);
  }

  if (!unlocked) return <AccessGate onUnlock={handleUnlock} />;
  return <PresensiApp onLock={handleLock} />;
}

// ─── Presensi App ─────────────────────────────────────────────────────────────
function PresensiApp({ onLock }: { onLock: () => void }) {
  const [tanggal] = useState(new Date().toISOString().slice(0, 10));
  const [jamSekarang, setJamSekarang] = useState(new Date());

  // Face API state
  const [faceapi, setFaceapi] = useState<any>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);

  // Camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);

  // Data
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [wajah, setWajah] = useState<WajahData[]>([]);
  const [presensi, setPresensi] = useState<PresensiRow[]>([]);
  const [todayIds, setTodayIds] = useState<Set<string>>(new Set());

  // Scan state
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [faceBox, setFaceBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  // Status message
  const [statusMsg, setStatusMsg] = useState("");

  const tanggalLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const jamLabel = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(jamSekarang);

  useEffect(() => {
    const timer = window.setInterval(() => setJamSekarang(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load data
  async function loadData() {
    const [siswaR, wajahR, presensiR] = await Promise.all([
      supabase.from("smp_siswa").select("id,nis,nama_lengkap,kelas,foto_url,status").eq("status", "aktif").order("nama_lengkap"),
      supabase.from("smp_wajah_data").select("id,siswa_id,descriptor,foto_url,aktif,siswa:smp_siswa(nama_lengkap,kelas,nis)").eq("aktif", true),
      supabase.from("smp_presensi").select("*, siswa:smp_siswa(nama_lengkap,nis,kelas)").eq("tanggal", tanggal).order("jam_masuk", { ascending: false }),
    ]);
    setSiswa((siswaR.data || []) as Siswa[]);
    setWajah((wajahR.data || []) as unknown as WajahData[]);
    const rows = (presensiR.data || []) as PresensiRow[];
    setPresensi(rows);
    setTodayIds(new Set(rows.map((r) => r.siswa_id)));
  }

  useEffect(() => {
    loadData();
    runWeeklyCleanup();
  }, [tanggal]);

  // Load face models
  async function loadModels() {
    if (modelsReady) return true;
    setModelLoading(true);
    setStatusMsg("Memuat model AI... mohon tunggu.");
    try {
      const api = await import("face-api.js");
      const tryLoad = async (url: string) => {
        await Promise.all([
          api.nets.ssdMobilenetv1.loadFromUri(url),
          api.nets.faceLandmark68Net.loadFromUri(url),
          api.nets.faceRecognitionNet.loadFromUri(url),
        ]);
      };
      try {
        await tryLoad("/models");
      } catch {
        await tryLoad("https://justadudewhohacks.github.io/face-api.js/models");
      }
      setFaceapi(api);
      setModelsReady(true);
      setStatusMsg("Model siap. Kamera bisa diaktifkan.");
      setModelLoading(false);
      return true;
    } catch {
      setStatusMsg("Gagal memuat model. Periksa koneksi internet.");
      setModelLoading(false);
      return false;
    }
  }

  // Start camera
  async function startCamera() {
    const ok = await loadModels();
    if (!ok) return;
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      setStatusMsg("Kamera aktif. Arahkan wajah ke kamera.");
    } catch {
      setStatusMsg("Izin kamera ditolak atau tidak tersedia.");
    }
    setCameraLoading(false);
  }

  function stopCamera() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    setScanning(false);
    setFaceBox(null);
    setConfidence(null);
    setStatusMsg("");
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (!cameraOn) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [cameraOn]);

  function drawOverlay(detection: any, videoEl: HTMLVideoElement, canvasEl: HTMLCanvasElement) {
    const { x, y, width, height } = detection.box;
    const scaleX = canvasEl.width / videoEl.videoWidth;
    const scaleY = canvasEl.height / videoEl.videoHeight;
    setFaceBox({ x: x * scaleX, y: y * scaleY, w: width * scaleX, h: height * scaleY });
  }

  async function detectFace() {
    if (!faceapi || !videoRef.current || !videoRef.current.videoWidth) return null;
    const det = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (det && canvasRef.current) {
      drawOverlay(det.detection, videoRef.current, canvasRef.current);
      setConfidence(det.detection.score);
    } else {
      setFaceBox(null);
      setConfidence(null);
    }
    return det ? Array.from(det.descriptor as Float32Array) : null;
  }

  // ── SCAN ──────────────────────────────────────────────────────────────────
  function startScan() {
    if (!cameraOn || !faceapi) {
      setStatusMsg("Aktifkan kamera terlebih dahulu.");
      return;
    }
    if (wajah.length === 0) {
      setStatusMsg("Belum ada data wajah terdaftar. Hubungi admin untuk enrollment.");
      return;
    }
    setScanning(true);
    setStatusMsg("Scanning wajah real-time...");
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(async () => {
      const desc = await detectFace();
      if (!desc) return;

      let best: { id: string; score: number; data: WajahData } | null = null;
      for (const item of wajah) {
        for (const stored of flatDescriptor(item.descriptor)) {
          const score = euclid(desc, stored);
          if (!best || score < best.score) best = { id: item.siswa_id, score, data: item };
        }
      }

      if (!best || best.score > 0.55) {
        setStatusMsg(`Wajah tidak dikenali (jarak: ${best ? best.score.toFixed(2) : "—"})`);
        return;
      }

      const s = best.data.siswa;
      const alreadyToday = todayIds.has(best.id);

      if (alreadyToday) {
        setStatusMsg(`${s?.nama_lengkap || "Siswa"} sudah presensi hari ini.`);
        return;
      }

      const { error } = await supabase.from("smp_presensi").upsert(
        {
          siswa_id: best.id,
          tanggal,
          jam_masuk: new Date().toISOString(),
          metode: "face_recognition",
          status: "hadir",
        },
        { onConflict: "siswa_id,tanggal" },
      );

      if (!error) {
        const waktu = new Intl.DateTimeFormat("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date());

        const result: ScanResult = {
          nama: s?.nama_lengkap || "Siswa",
          kelas: s?.kelas || "-",
          nis: s?.nis || "-",
          waktu,
          status: "success",
        };

        setScanResults((prev) => [result, ...prev.slice(0, 9)]);
        setTodayIds((prev) => new Set([...prev, best!.id]));
        setStatusMsg(`✓ ${result.nama} — ${result.waktu}`);
        loadData();
      }
    }, 1200);
  }

  function stopScan() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setScanning(false);
    setFaceBox(null);
    setStatusMsg("Scan dihentikan.");
  }

  // Stats
  const totalSiswaHadir = todayIds.size;
  const totalSiswa = siswa.length;
  const pct = totalSiswa > 0 ? Math.round((totalSiswaHadir / totalSiswa) * 100) : 0;

  return (
    <div className="min-h-screen bg-green-950 text-white">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 right-0 h-[500px] w-[500px] rounded-full bg-green-500/8 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-green-800/40 blur-3xl" />
        <div className="absolute inset-0 bg-hero-grid bg-[size:48px_48px] opacity-15" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-green-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/smp" className="flex items-center gap-3">
            <img
              src={smpLogoUrl}
              alt="SMP"
              className="h-9 w-9 rounded-xl border border-white/15 bg-white object-contain p-1"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="leading-tight">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-green-300/70">SMP Ma'arif NU</p>
              <p className="text-sm font-bold text-white">Presensi Digital</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 sm:flex items-center gap-1.5">
              <Clock size={12} className="shrink-0" />
              <span>{tanggalLabel}</span>
              <span className="mx-1 text-white/20">·</span>
              <span className="font-mono font-semibold text-white/70 tabular-nums">{jamLabel}</span>
            </span>
            <button
              onClick={onLock}
              title="Kunci halaman"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut size={14} />
              <span className="hidden sm:block">Kunci</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        {/* Stats Row — hanya hadir & total siswa */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { icon: UserCheck, label: "Hadir Hari Ini", value: String(totalSiswaHadir), sub: `dari ${totalSiswa} siswa`, color: "text-emerald-400" },
            { icon: Users, label: "Total Siswa Aktif", value: String(totalSiswa), sub: "siswa aktif", color: "text-blue-400" },
            { icon: CheckCircle2, label: "Kehadiran", value: `${pct}%`, sub: "hari ini", color: "text-purple-400" },
          ].map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className={`mb-2 ${color}`}>
                <Icon size={20} />
              </div>
              <p className={`font-display text-2xl font-bold ${color}`}>{value}</p>
              <p className="mt-0.5 text-xs font-semibold text-white">{label}</p>
              <p className="text-[11px] text-white/40">{sub}</p>
            </div>
          ))}
        </div>

        {/* Main grid: kamera kiri, panel kanan */}
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          {/* Camera Panel */}
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-white">
                <Scan size={18} className="text-green-400" />
                Kamera Presensi
              </h2>
              <p className="mt-0.5 text-xs text-white/40">
                Wajah akan dideteksi otomatis setiap 1.2 detik
              </p>
            </div>

            <div className="relative bg-green-950">
              <div className="relative aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                <canvas
                  ref={canvasRef}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  width={1280}
                  height={720}
                  style={{ transform: "scaleX(-1)" }}
                />

                {faceBox && (
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      left: `${(faceBox.x / 1280) * 100}%`,
                      top: `${(faceBox.y / 720) * 100}%`,
                      width: `${(faceBox.w / 1280) * 100}%`,
                      height: `${(faceBox.h / 720) * 100}%`,
                    }}
                  >
                    <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-green-500" />
                    <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-green-500" />
                    <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-green-500" />
                    <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-green-500" />
                    {confidence !== null && (
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-green-500 px-2.5 py-0.5 text-[11px] font-bold text-green-950">
                        {Math.round(confidence * 100)}%
                      </span>
                    )}
                  </div>
                )}

                {!cameraOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-green-950">
                    <CameraOff size={40} className="text-white/20" />
                    <p className="text-sm text-white/40">Kamera belum aktif</p>
                  </div>
                )}

                {scanning && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="h-32 w-32 animate-ping rounded-full border-2 border-green-400/30" />
                  </div>
                )}
              </div>

              {statusMsg && (
                <div className="border-t border-white/5 bg-green-950/80 px-4 py-2.5 text-center text-sm text-white/70">
                  {modelLoading && <Loader2 size={14} className="mr-2 inline animate-spin" />}
                  {statusMsg}
                </div>
              )}
            </div>

            {/* Camera controls */}
            <div className="flex flex-wrap items-center gap-2 p-5">
              {!cameraOn ? (
                <button
                  onClick={startCamera}
                  disabled={cameraLoading || modelLoading}
                  className="flex items-center gap-2 rounded-xl bg-green-500 px-5 py-2.5 text-sm font-bold text-green-950 disabled:opacity-60"
                >
                  {cameraLoading || modelLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Camera size={16} />
                  )}
                  {cameraLoading ? "Membuka..." : modelLoading ? "Memuat Model..." : "Aktifkan Kamera"}
                </button>
              ) : (
                <>
                  {!scanning ? (
                    <button
                      onClick={startScan}
                      className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-400"
                    >
                      <Scan size={16} />
                      Mulai Scan Otomatis
                    </button>
                  ) : (
                    <button
                      onClick={stopScan}
                      className="flex items-center gap-2 rounded-xl bg-red-500/20 px-5 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-500/30"
                    >
                      <X size={16} />
                      Stop Scan
                    </button>
                  )}
                  <button
                    onClick={stopCamera}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/60 transition hover:bg-white/10"
                  >
                    <CameraOff size={16} className="inline mr-1.5" />
                    Matikan
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Panel: scan results + daftar hadir hari ini */}
          <div className="flex flex-col gap-5">
            {/* Scan results terbaru */}
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
              <div className="border-b border-white/10 px-5 py-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  Hasil Scan Terbaru
                </h3>
              </div>
              <div className="divide-y divide-white/5">
                {scanResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                    <Scan size={28} className="text-white/15" />
                    <p className="text-sm text-white/30">Belum ada scan.</p>
                    <p className="text-xs text-white/20">Aktifkan kamera & mulai scan</p>
                  </div>
                ) : (
                  scanResults.map((result, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-500/15">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{result.nama}</p>
                        <p className="text-xs text-white/40">{result.kelas} · {result.nis}</p>
                      </div>
                      <span className="shrink-0 text-xs font-mono text-white/40">{result.waktu}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Cara penggunaan */}
              <div className="m-4 rounded-2xl border border-green-400/20 bg-green-500/8 p-3.5">
                <p className="text-xs font-semibold text-green-300">Cara Penggunaan:</p>
                <ol className="mt-1.5 space-y-1 text-xs text-white/50">
                  <li className="flex gap-2"><span className="font-bold text-green-400/60">1.</span> Aktifkan kamera</li>
                  <li className="flex gap-2"><span className="font-bold text-green-400/60">2.</span> Klik "Mulai Scan Otomatis"</li>
                  <li className="flex gap-2"><span className="font-bold text-green-400/60">3.</span> Arahkan wajah ke kamera</li>
                  <li className="flex gap-2"><span className="font-bold text-green-400/60">4.</span> Presensi tercatat otomatis</li>
                </ol>
              </div>
            </div>

            {/* Daftar hadir hari ini */}
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden flex-1">
              <div className="border-b border-white/10 px-5 py-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <UserCheck size={16} className="text-green-400" />
                  Sudah Hadir Hari Ini
                </h3>
                <p className="mt-0.5 text-xs text-white/40">{tanggalLabel}</p>
              </div>

              {/* Progress bar */}
              <div className="border-b border-white/10 px-5 py-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/60">{totalSiswaHadir} dari {totalSiswa} siswa</span>
                  <span className="text-xs font-bold text-green-400">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-300 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                {presensi.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Users size={28} className="text-white/15" />
                    <p className="text-sm text-white/30">Belum ada yang hadir</p>
                  </div>
                ) : (
                  presensi.map((rec) => (
                    <div key={rec.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-500/15">
                        <CheckCircle2 size={15} className="text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{rec.siswa?.nama_lengkap || "—"}</p>
                        <p className="text-xs text-white/40">{rec.siswa?.kelas || "-"} · {rec.siswa?.nis || "-"}</p>
                      </div>
                      <span className="shrink-0 text-xs font-mono text-white/40">
                        {rec.jam_masuk
                          ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(rec.jam_masuk))
                          : "—"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer link */}
        <div className="mt-8 text-center">
          <Link
            to="/smp"
            className="inline-flex items-center gap-1.5 text-xs text-white/30 transition hover:text-white/60"
          >
            Kembali ke Beranda SMP
            <ChevronRight size={14} />
          </Link>
        </div>
      </main>
    </div>
  );
}
