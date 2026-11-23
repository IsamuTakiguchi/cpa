#!/usr/bin/env node
/**
 * assets/icon.svg から @capacitor/assets 用の元画像を作る。
 *   assets/icon-only.png（1024×1024・透過なし）… App Store のアイコンは透過不可
 *   assets/splash.png   （2732×2732）……………… 起動画面（背景色の中央に角丸アイコン）
 *   assets/splash-dark.png ………………………………… 同じ画像（ライトモード固定のため）
 * 実行: npm run ios:assets（ルートでも web/ でも可）… この後に capacitor-assets が iOS 用の各サイズを生成する
 * アイコンを変えるときは assets/icon.svg を編集する（他アプリと似ないように色・モチーフを変える）。
 */
const path = require("node:path");
const sharp = require("sharp");
const fs = require("node:fs");
const ts = require("typescript");

const webDir = path.resolve(__dirname, "..");
const a = (f) => path.join(webDir, "assets", f);

function appTheme() {
  const src = fs.readFileSync(path.join(webDir, "app.config.ts"), "utf8");
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", out)(mod, mod.exports, require);
  return mod.exports.appConfig.theme;
}

(async () => {
  const theme = appTheme();
  await sharp(a("icon.svg"), { density: 144 }).resize(1024, 1024).flatten({ background: theme.brand }).removeAlpha().png().toFile(a("icon-only.png"));
  const size = 560;
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${Math.round(size * 0.2237)}" fill="#fff"/></svg>`);
  const icon = await sharp(a("icon-only.png")).resize(size, size).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  await sharp({ create: { width: 2732, height: 2732, channels: 3, background: theme.background } })
    .composite([{ input: icon, gravity: "center" }])
    .flatten({ background: theme.background })
    .removeAlpha()
    .png()
    .toFile(a("splash.png"));
  // アプリはライトモード固定なので、ダーク用の起動画面も同じ画像にする
  fs.copyFileSync(a("splash.png"), a("splash-dark.png"));
  console.log("assets/icon-only.png・splash.png・splash-dark.png を作成しました");
})();
