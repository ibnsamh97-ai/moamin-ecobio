/* ينسخ ملفات المنصة إلى app/www ليحزمها Capacitor داخل التطبيق،
   فيعمل التطبيق دون الحاجة إلى تحميل الواجهة من الإنترنت. */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(APP, "..");
const WWW = join(APP, "www");

rmSync(WWW, { recursive: true, force: true });
mkdirSync(WWW, { recursive: true });
for (const d of ["css", "js", "vendor", "assets"]) cpSync(join(SITE, d), join(WWW, d), { recursive: true });
for (const f of ["manifest.webmanifest", "privacy.html"]) if (existsSync(join(SITE, f))) cpSync(join(SITE, f), join(WWW, f));

let html = readFileSync(join(SITE, "index.html"), "utf8");
// داخل التطبيق لا نحتاج عامل الخدمة الخاص بالويب
html = html.replace(/<script src="js\/pwa\.js"><\/script>\s*/, "");
html = html.replace("<html ", '<html data-app="1" ');
writeFileSync(join(WWW, "index.html"), html);
const pkg = JSON.parse(readFileSync(join(APP, "package.json"), "utf8"));
writeFileSync(join(WWW, "app-version.json"), JSON.stringify({ version: pkg.version, built: new Date().toISOString() }));
console.log("www جاهز:", WWW);
