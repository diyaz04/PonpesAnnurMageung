import { ArrowLeft, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Article = {
  id: string;
  judul: string;
  thumbnail_url: string | null;
  konten: string | null;
  excerpt: string | null;
  tanggal: string | null;
  created_at: string;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1400&q=80";

function formatDate(value?: string | null) {
  if (!value) return "Tanggal menyusul";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function PesantrenArticlePage() {
  const { id } = useParams();
  const location = useLocation();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const isSmp = location.pathname.startsWith("/smp/");
  const entitas = isSmp ? "smp" : "pesantren";
  const backPath = isSmp ? "/smp#berita" : "/#berita";
  const brandName = isSmp ? "SMP Ma'arif NU Sariwangi" : "An-Nur Mageung";

  useEffect(() => {
    async function loadArticle() {
      if (!id) return;
      setLoading(true);
      const { data } = await supabase
        .from("lp_berita")
        .select("id, judul, thumbnail_url, konten, excerpt, tanggal, created_at")
        .eq("entitas", entitas)
        .eq("id", id)
        .maybeSingle();

      setArticle((data as Article | null) || null);
      setLoading(false);
    }

    loadArticle();
  }, [entitas, id]);

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="border-b border-emerald-900/10 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link
            to={backPath}
            className="inline-flex items-center text-sm font-semibold text-emerald-900"
          >
            <ArrowLeft className="mr-2" size={17} />
            Kembali ke Berita
          </Link>
          <span className="text-sm font-semibold text-gray-700">
            {brandName}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        {loading ? (
          <div className="rounded bg-white p-8 text-sm text-gray-600 shadow-soft">
            Memuat artikel...
          </div>
        ) : article ? (
          <article className="overflow-hidden rounded bg-white shadow-soft">
            <img
              src={article.thumbnail_url || fallbackImage}
              alt={article.judul}
              className="aspect-[16/9] w-full object-cover"
            />
            <div className="p-6 sm:p-8">
              <p className="inline-flex items-center text-sm font-medium text-emerald-800">
                <CalendarDays className="mr-2" size={17} />
                {formatDate(article.tanggal || article.created_at)}
              </p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight text-gray-950 sm:text-4xl">
                {article.judul}
              </h1>
              {article.excerpt ? (
                <p className="mt-4 text-lg leading-8 text-gray-600">
                  {article.excerpt}
                </p>
              ) : null}
              <div className="mt-8 whitespace-pre-line text-base leading-8 text-gray-700">
                {article.konten || "Konten artikel belum tersedia."}
              </div>
            </div>
          </article>
        ) : (
          <div className="rounded bg-white p-8 text-sm text-gray-600 shadow-soft">
            Artikel tidak ditemukan.
          </div>
        )}
      </main>
    </div>
  );
}
