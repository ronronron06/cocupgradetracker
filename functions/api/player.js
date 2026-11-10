// Cloudflare Pages Function: GET /api/player?tag=%23ABC123
// Secret needed: COC_TOKEN (Settings > Variables and Secrets). Never put the token in index.html.
// Optional: COC_API_BASE (default is the RoyaleAPI proxy, so create your key with IP 45.79.218.79)
const json = (o, s = 200, h = {}) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: { "content-type": "application/json; charset=utf-8", ...h },
  });

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams.get("tag") || "";
  const tag = q.trim().toUpperCase().replace(/^#/, "").replace(/O/g, "0");
  if (!/^[0289PYLQGRJCUV]{3,12}$/.test(tag)) return json({ error: "Invalid player tag" }, 400);
  if (!env.COC_TOKEN) return json({ error: "COC_TOKEN secret is not set" }, 500);

  const base = env.COC_API_BASE || "https://cocproxy.royaleapi.dev/v1";
  let r;
  try {
    r = await fetch(`${base}/players/%23${tag}`, {
      headers: { Authorization: `Bearer ${env.COC_TOKEN}`, Accept: "application/json" },
    });
  } catch (e) {
    return json({ error: "Could not reach the CoC API" }, 502);
  }

  let p;
  try { p = await r.json(); } catch (e) { return json({ error: "Bad response from CoC API" }, 502); }

  if (!r.ok) {
    const msg =
      r.status === 404 ? "Player not found" :
      r.status === 403 ? "API key rejected (check key IP / token)" :
      r.status === 429 ? "Rate limited, try again soon" :
      p.message || p.reason || "CoC API error";
    return json({ error: msg }, r.status === 404 ? 404 : 502);
  }

  const lg = p.leagueTier || p.league || null;
  const icon = (o) => o && (o.small || o.medium || o.url) || "";
  return json(
    {
      name: p.name,
      th: p.townHallLevel,
      thw: p.townHallWeaponLevel || 0,
      xp: p.expLevel,
      tr: p.trophies,
      btr: p.builderBaseTrophies || 0,
      ws: p.warStars || 0,
      role: p.role || "",
      clan: p.clan ? { n: p.clan.name, b: icon(p.clan.badgeUrls) } : null,
      lg: lg ? icon(lg.iconUrls) : "",
      lgn: lg ? lg.name : "",
      heroes: (p.heroes || [])
        .filter((h) => h.village === "home")
        .map((h) => ({ n: h.name, l: h.level, m: h.maxLevel })),
    },
    200,
    { "cache-control": "public, max-age=60" }
  );
}
