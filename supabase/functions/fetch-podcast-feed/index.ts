// @ts-nocheck — Deno edge function, not compiled by project TypeScript
/**
 * Edge Function: fetch-podcast-feed
 *
 * Fetches the Buzzsprout RSS feed, parses the XML, and returns
 * episode data as JSON. Caches the feed for 15 minutes to avoid
 * hammering the RSS endpoint on every page load.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Buzzsprout RSS feed URL
const RSS_FEED_URL = "https://feeds.buzzsprout.com/2324855.rss";

// In-memory cache: stores parsed episodes + timestamp
let cachedData: { episodes: Episode[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Allowed origins for CORS — restrict to known frontends only
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://lassenacademyproto.vercel.app",
];

// Shape of a parsed podcast episode
interface Episode {
  title: string;
  description: string;
  guest: string;
  date: string;
  duration: number; // seconds
  image: string;
  audioUrl: string;
  episodeNumber: number | null;
  slug: string;
}

// Returns CORS headers scoped to the requesting origin (if allowed)
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[1];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

/**
 * Extract the guest name from the episode title.
 * Titles follow the pattern "#NN GUEST NAME - LMA DK".
 * Multi-part episodes have a trailing number (e.g. "LASSE D HANSEN 2")
 * which we strip to get the clean guest name.
 * Falls back to the full title if the pattern doesn't match.
 */
function extractGuest(title: string): string {
  const match = title.match(/^#\d+\s+(.+?)\s*[-–]\s*LMA\s*DK$/i);
  let guest = match ? match[1] : title.replace(/^#\d+\s+/, "").replace(/\s*[-–]\s*LMA\s*DK$/i, "");
  // Strip trailing part number (e.g. "LASSE D HANSEN 2" → "LASSE D HANSEN")
  guest = guest.replace(/\s+\d+$/, "");
  // Title-case the name for readability
  guest = guest
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return guest || title;
}

/**
 * Extract the episode number from the title (e.g. "#03" → 3).
 */
function extractEpisodeNumber(title: string): number | null {
  const match = title.match(/^#(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Generate a URL-friendly slug from the episode title.
 * e.g. "#12 CARS ON WATER - LMA DK" → "12-cars-on-water"
 */
function generateSlug(title: string): string {
  return title
    .replace(/\s*[-–]\s*LMA\s*DK$/i, "") // strip "- LMA DK" suffix
    .replace(/^#/, "")                     // strip leading "#"
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9æøå]+/g, "-")       // non-alphanumeric → hyphens
    .replace(/^-+|-+$/g, "");              // trim leading/trailing hyphens
}

/**
 * Extract the text content of an XML tag from a string.
 * Returns empty string if the tag is not found.
 */
function getTagContent(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

/**
 * Extract an attribute value from an XML tag.
 * e.g. getTagAttribute(xml, "itunes:image", "href")
 */
function getTagAttribute(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i");
  const match = xml.match(regex);
  return match ? match[1] : "";
}

/**
 * Parse the RSS XML string into an array of Episode objects.
 * Uses regex-based extraction since DOMParser is not available
 * in the Supabase Deno edge runtime.
 */
function parseRssFeed(xml: string): Episode[] {
  // Split the XML into individual <item> blocks
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  const episodes: Episode[] = [];
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const title = getTagContent(block, "title");

    // Strip HTML tags, CDATA wrappers, and decode HTML entities from description
    const rawDesc = getTagContent(block, "description");
    const description = rawDesc
      .replace(/<!\[CDATA\[/g, "")
      .replace(/\]\]>/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
      .trim();

    // Parse publication date to ISO string
    const pubDate = getTagContent(block, "pubDate");
    const date = pubDate ? new Date(pubDate).toISOString() : "";

    // Duration in seconds from itunes:duration
    const durationText = getTagContent(block, "itunes:duration");
    const duration = parseInt(durationText, 10) || 0;

    // Episode artwork from itunes:image href attribute
    const image = getTagAttribute(block, "itunes:image", "href");

    // Audio file URL from enclosure url attribute
    const audioUrl = getTagAttribute(block, "enclosure", "url");

    episodes.push({
      title,
      description,
      guest: extractGuest(title),
      date,
      duration,
      image,
      audioUrl,
      episodeNumber: extractEpisodeNumber(title),
      slug: generateSlug(title),
    });
  }

  return episodes;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Return cached data if still fresh
    if (cachedData && Date.now() - cachedData.fetchedAt < CACHE_TTL_MS) {
      return new Response(JSON.stringify({ episodes: cachedData.episodes }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=900",
        },
      });
    }

    // Fetch the RSS feed from Buzzsprout
    const response = await fetch(RSS_FEED_URL, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
    });

    if (!response.ok) {
      throw new Error(`RSS fetch failed with status ${response.status}`);
    }

    const xml = await response.text();
    const episodes = parseRssFeed(xml);

    // Update cache
    cachedData = { episodes, fetchedAt: Date.now() };

    return new Response(JSON.stringify({ episodes }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=900",
      },
    });
  } catch (error) {
    console.error("Error fetching podcast feed:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch podcast feed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
