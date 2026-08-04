/**
 * Small display helpers shared by the forum UI.
 */

// Extract up to 2 initials from a full name for avatar fallbacks
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Format a timestamp as a human-readable relative string (supports DA/EN)
export function timeAgo(dateStr: string, language: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (language === "da") {
    if (minutes < 1) return "lige nu";
    if (minutes < 60) return `${minutes} min siden`;
    if (hours < 24) return `${hours} ${hours === 1 ? "time" : "timer"} siden`;
    return `${days} ${days === 1 ? "dag" : "dage"} siden`;
  }
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
