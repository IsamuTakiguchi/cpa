import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { hideSplash, initPlatform } from "./native/init";
import "./index.css";

// Web 版は Service Worker 登録、ネイティブはステータスバー等の初期化
initPlatform();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// 最初の描画のあとで起動画面を閉じる
requestAnimationFrame(() => requestAnimationFrame(() => void hideSplash()));
