import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const allowedEntities = ["pesantren", "smp"] as const;
const allowedRoles = ["admin", "bendahara", "guru"] as const;

type ManagedEntity = (typeof allowedEntities)[number];
type ManagedRole = (typeof allowedRoles)[number];

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let createdUserId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Supabase function environment is not configured.");
    }

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const nama = String(body.nama || "").trim();
    const noHp = String(body.no_hp || "").trim();
    const mataPelajaran = String(body.mata_pelajaran || "").trim();
    const entitas = String(body.entitas || "").trim() as ManagedEntity;
    const role = String(body.role || "").trim() as ManagedRole;

    if (!allowedEntities.includes(entitas)) {
      return jsonResponse({ error: "Entitas tidak valid." }, 400);
    }

    if (!allowedRoles.includes(role)) {
      return jsonResponse({ error: "Role tidak valid." }, 400);
    }

    if (!email || !password || !nama) {
      return jsonResponse(
        { error: "Email, password, dan nama wajib diisi." },
        400,
      );
    }

    const [ppRequester, smpRequester] = await Promise.all([
      adminClient
        .from("pp_profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle(),
      adminClient
        .from("smp_profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    const isSuperadmin =
      ppRequester.data?.role === "superadmin" ||
      smpRequester.data?.role === "superadmin";

    if (!isSuperadmin) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const profileTable = entitas === "smp" ? "smp_profiles" : "pp_profiles";
    const profileTables =
      role === "bendahara"
        ? (["pp_profiles", "smp_profiles"] as const)
        : ([profileTable] as const);

    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nama,
          entitas: role === "bendahara" ? "keuangan" : entitas,
          role,
        },
      });

    if (createError || !created.user) {
      throw createError || new Error("Failed to create user.");
    }

    createdUserId = created.user.id;

    for (const tableName of profileTables) {
      const { error: profileError } = await adminClient.from(tableName).upsert({
        id: createdUserId,
        role,
        nama,
      });

      if (profileError) {
        throw profileError;
      }
    }

    if (role === "guru") {
      if (entitas === "smp") {
        const { error: guruError } = await adminClient.from("smp_guru").insert({
          user_id: createdUserId,
          nama_lengkap: nama,
          no_hp: noHp || null,
          mata_pelajaran: mataPelajaran || null,
        });

        if (guruError) {
          throw guruError;
        }
      } else {
        const { error: guruError } = await adminClient.from("pp_asatidz").insert({
          user_id: createdUserId,
          nama_lengkap: nama,
          no_hp: noHp || null,
        });

        if (guruError) {
          throw guruError;
        }
      }
    }

    return jsonResponse({
      user_id: createdUserId,
      role,
      entitas: role === "bendahara" ? "keuangan" : entitas,
    });
  } catch (error) {
    if (createdUserId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supabaseUrl && serviceRoleKey) {
          const adminClient = createClient(supabaseUrl, serviceRoleKey);
          await adminClient.auth.admin.deleteUser(createdUserId);
        }
      } catch {
        // Best-effort cleanup only.
      }
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      500,
    );
  }
});
