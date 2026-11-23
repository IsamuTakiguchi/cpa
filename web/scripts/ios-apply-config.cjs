#!/usr/bin/env node
/**
 * app.config.ts の内容を iOS の Xcode プロジェクトへ反映する。
 * `npx cap sync ios` の後に自動で実行される（web/package.json の "capacitor:sync:after"）。
 * 手で実行する場合: `node scripts/ios-apply-config.cjs`（web/ で）
 *
 * 反映するもの:
 * - Bundle ID（PRODUCT_BUNDLE_IDENTIFIER）
 * - iPad 対応（features.ipad → TARGETED_DEVICE_FAMILY）
 * - Info.plist: 表示名・日本語・ライトモード固定・画面の向き・暗号化の申告
 */
const fs = require("node:fs");
const path = require("node:path");

const webDir = path.resolve(__dirname, "..");
const iosApp = path.join(webDir, "ios", "App");
const pbxPath = path.join(iosApp, "App.xcodeproj", "project.pbxproj");
const plistPath = path.join(iosApp, "App", "Info.plist");

function loadAppConfig() {
  const ts = require("typescript");
  const src = fs.readFileSync(path.join(webDir, "app.config.ts"), "utf8");
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", out)(mod, mod.exports, require);
  return mod.exports.appConfig;
}

function escapeXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function plistValue(v) {
  if (typeof v === "boolean") return v ? "<true/>" : "<false/>";
  if (Array.isArray(v)) return `<array>\n${v.map((x) => `\t\t<string>${escapeXml(x)}</string>`).join("\n")}\n\t</array>`;
  return `<string>${escapeXml(v)}</string>`;
}

/** トップレベル dict のキーを設定（あれば置換、なければ末尾に追加）。値は文字列・真偽値・文字列配列のみ対応 */
function setPlistKey(xml, key, value) {
  const valueRe = `(?:<string>[^<]*</string>|<true/>|<false/>|<array>[\\s\\S]*?</array>|<array/>)`;
  const re = new RegExp(`(<key>${key.replace(/[~]/g, "\\$&")}</key>\\s*)${valueRe}`);
  if (re.test(xml)) return xml.replace(re, `$1${plistValue(value)}`);
  const end = xml.lastIndexOf("</dict>");
  return `${xml.slice(0, end)}\t<key>${key}</key>\n\t${plistValue(value)}\n${xml.slice(end)}`;
}

function main() {
  if (!fs.existsSync(pbxPath) || !fs.existsSync(plistPath)) {
    console.log("[ios-apply-config] ios プロジェクトがありません（npx cap add ios を先に実行）。スキップします。");
    return;
  }
  const cfg = loadAppConfig();
  const ipad = !!cfg.features.ipad;

  // ---- project.pbxproj ----
  let pbx = fs.readFileSync(pbxPath, "utf8");
  const before = pbx;
  pbx = pbx.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${cfg.appId};`);
  pbx = pbx.replace(/TARGETED_DEVICE_FAMILY = [^;]+;/g, `TARGETED_DEVICE_FAMILY = ${ipad ? '"1,2"' : "1"};`);
  if (pbx !== before) fs.writeFileSync(pbxPath, pbx);

  // ---- Info.plist ----
  let plist = fs.readFileSync(plistPath, "utf8");
  plist = setPlistKey(plist, "CFBundleDisplayName", cfg.displayName);
  plist = setPlistKey(plist, "CFBundleDevelopmentRegion", "ja");
  plist = setPlistKey(plist, "CFBundleLocalizations", ["ja"]);
  // 画面はライトテーマのみなので、システムのダイアログやキーボードもライトに固定
  plist = setPlistKey(plist, "UIUserInterfaceStyle", "Light");
  // iPhone は縦向きのみ（横向きではレイアウトがノッチにかかるため）
  plist = setPlistKey(plist, "UISupportedInterfaceOrientations", ["UIInterfaceOrientationPortrait"]);
  // iPad は全方向（マルチタスク対応の条件）
  plist = setPlistKey(plist, "UISupportedInterfaceOrientations~ipad", [
    "UIInterfaceOrientationPortrait",
    "UIInterfaceOrientationPortraitUpsideDown",
    "UIInterfaceOrientationLandscapeLeft",
    "UIInterfaceOrientationLandscapeRight",
  ]);
  // HTTPS 以外の独自暗号は使っていない（輸出コンプライアンスの質問を省略）
  plist = setPlistKey(plist, "ITSAppUsesNonExemptEncryption", false);
  fs.writeFileSync(plistPath, plist);

  console.log(`[ios-apply-config] Bundle ID=${cfg.appId} / iPad=${ipad ? "on" : "off"} / 表示名=${cfg.displayName} を反映しました`);
}

main();
