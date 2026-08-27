import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from "@capacitor-community/sqlite";

declare global {
  interface Window {
    CubanitosNativeStorage?: {
      ready: () => Promise<void>;
      flush: () => Promise<void>;
      createBackup: () => Promise<{ uri: string; filename: string }>;
      createAutomaticBackup: () => Promise<{ uri: string; filename: string }>;
      openUpdate: (url: string) => Promise<{ needsInstallPermission?: boolean }>;
      isNative: boolean;
    };
  }
}

const DB_NAME = "cubanitos_patagonia_local";
const TABLE = "app_kv";
const isCubanitosKey = (key: string) => String(key || "").startsWith("cubanitos_");
let db: SQLiteDBConnection | null = null;
let writeChain: Promise<void> = Promise.resolve();

function enqueueWrite(task: () => Promise<void>) {
  writeChain = writeChain.then(task).catch((error) => {
    console.error("No se pudo respaldar el dato local en SQLite.", error);
  });
  return writeChain;
}

async function openDatabase() {
  if (!Capacitor.isNativePlatform()) return;
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const consistency = await sqlite.checkConnectionsConsistency();
  if (!consistency.result) await sqlite.closeAllConnections();
  db = await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);
  await db.open();
  await db.execute(`CREATE TABLE IF NOT EXISTS ${TABLE} (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL);`);

  const stored = await db.query(`SELECT key, value FROM ${TABLE};`);
  for (const row of stored.values || []) {
    const key = String(row?.key || "");
    if (!isCubanitosKey(key) || localStorage.getItem(key) != null) continue;
    localStorage.setItem(key, String(row?.value || ""));
  }
}

function mirrorLocalStorageToSQLite() {
  if (!db) return;
  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;
  const nativeClear = Storage.prototype.clear;

  Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
    nativeSetItem.call(this, key, value);
    if (this !== localStorage || !isCubanitosKey(key) || !db) return;
    const savedKey = String(key);
    const savedValue = String(value);
    void enqueueWrite(async () => {
      await db?.run(
        `INSERT INTO ${TABLE} (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
        [savedKey, savedValue, new Date().toISOString()]
      );
    });
  };

  Storage.prototype.removeItem = function patchedRemoveItem(key: string) {
    nativeRemoveItem.call(this, key);
    if (this !== localStorage || !isCubanitosKey(key) || !db) return;
    void enqueueWrite(async () => { await db?.run(`DELETE FROM ${TABLE} WHERE key = ?;`, [String(key)]); });
  };

  Storage.prototype.clear = function patchedClear() {
    nativeClear.call(this);
    if (this !== localStorage || !db) return;
    void enqueueWrite(async () => { await db?.execute(`DELETE FROM ${TABLE};`); });
  };
}

const boot = (async () => {
  try {
    await openDatabase();
    mirrorLocalStorageToSQLite();
  } catch (error) {
    // La PWA conserva su funcionamiento habitual si SQLite no está disponible.
    console.error("SQLite nativo no pudo inicializarse.", error);
  }
})();

async function writeJsonBackup(filename: string, type: "manual" | "automatic", directory: Directory) {
  await boot;
  await writeChain;
  const payload = {
    format: "cubanitos-backup",
    version: 1,
    type,
    createdAt: new Date().toISOString(),
    app: "Cubanitos Patagonia",
    values: Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
        .filter((key): key is string => Boolean(key && isCubanitosKey(key)))
        .map((key) => [key, localStorage.getItem(key)])
    ),
  };
  const result = await Filesystem.writeFile({
    path: filename,
    data: JSON.stringify(payload, null, 2),
    directory,
    encoding: Encoding.UTF8,
    recursive: true,
  });
  return { uri: result.uri, filename };
}

// La copia automática se reemplaza en cada venta: conserva siempre el último
// estado completo sin llenar el teléfono con un archivo por cada operación.
async function createAutomaticBackup() {
  // Directory.Data pertenece a la app y Android permite escribir ahÃ­ sin pedir
  // permisos de archivos. Es la copia que protege las ventas cada vez que se guardan.
  return writeJsonBackup("respaldo-automatico-cubanitos-patagonia.json", "automatic", Directory.Data);
}

async function createBackup() {
  const filename = `respaldo-cubanitos-patagonia-${new Date().toISOString().slice(0, 10)}.json`;
  // El respaldo manual tambiÃ©n se crea primero dentro de la app para evitar
  // restricciones de Android. Luego se abre el selector del celular para guardarlo
  // o enviarlo por WhatsApp, Drive, etc.
  const result = await writeJsonBackup(filename, "manual", Directory.Data);
  await Share.share({
    title: "Respaldo Cubanitos Patagonia",
    dialogTitle: "Guardar o compartir respaldo JSON",
    files: [result.uri],
  });
  return result;
}

async function openUpdate(url: string) {
  if (!Capacitor.isNativePlatform()) return;
  const safeUrl = String(url || "").trim();
  if (!/^https:\/\//i.test(safeUrl)) throw new Error("La actualización no tiene una URL segura.");
  const updater = (Capacitor.Plugins as any)?.CubanitosUpdater;
  if (!updater?.downloadAndInstall) throw new Error("El actualizador nativo no está disponible.");
  return updater.downloadAndInstall({ url: safeUrl });
}

window.CubanitosNativeStorage = {
  ready: () => boot,
  flush: async () => { await boot; await writeChain; },
  createBackup,
  createAutomaticBackup,
  openUpdate,
  isNative: Capacitor.isNativePlatform(),
};
