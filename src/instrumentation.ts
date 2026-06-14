export async function register() {
  const { assertPersistentDatabase } = await import("./lib/persistence");
  assertPersistentDatabase();
}
