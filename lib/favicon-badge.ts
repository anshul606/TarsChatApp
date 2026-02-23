/**
 * Favicon Badge Utility
 * Updates the favicon to show unread conversation count
 */

export function updateFaviconBadge(count: number) {
  if (typeof window === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  // Draw base icon (message bubble)
  ctx.fillStyle = "#3b82f6"; // Blue color
  ctx.beginPath();
  ctx.roundRect(4, 6, 24, 18, 4);
  ctx.fill();

  // Draw message lines
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(8, 10, 16, 2);
  ctx.fillRect(8, 14, 12, 2);
  ctx.fillRect(8, 18, 14, 2);

  // Draw badge if count > 0
  if (count > 0) {
    const displayCount = count > 99 ? "99+" : count.toString();
    const badgeSize = displayCount.length > 2 ? 16 : 14;

    // Badge background
    ctx.fillStyle = "#ef4444"; // Red color
    ctx.beginPath();
    ctx.arc(26, 26, badgeSize / 2, 0, 2 * Math.PI);
    ctx.fill();

    // Badge border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Badge text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(displayCount, 26, 26);
  }

  // Update favicon
  const link =
    (document.querySelector("link[rel*='icon']") as HTMLLinkElement) ||
    document.createElement("link");
  link.type = "image/x-icon";
  link.rel = "shortcut icon";
  link.href = canvas.toDataURL();

  if (!document.querySelector("link[rel*='icon']")) {
    document.getElementsByTagName("head")[0].appendChild(link);
  }
}

export function clearFaviconBadge() {
  updateFaviconBadge(0);
}
