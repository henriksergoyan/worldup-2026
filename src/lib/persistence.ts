/** Warn at startup if production SQLite is not on a persistent volume path. */
export function assertPersistentDatabase(): void {
  if (process.env.NODE_ENV !== "production") return;

  const url = process.env.DATABASE_URL ?? "";
  const persistent =
    url.includes("/var/data") ||
    url.includes("/data/") ||
    url.startsWith("file:/data");

  if (!persistent) {
    console.error(
      "[worldcup-2026] WARNING: DATABASE_URL does not point to a persistent disk path.",
      "Predictions and admin data may be LOST on redeploy.",
      `Current: ${url}`,
    );
  } else {
    console.info(`[worldcup-2026] Database persisted at ${url}`);
  }
}
