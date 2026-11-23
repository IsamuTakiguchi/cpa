import UIKit
import Capacitor

/// Capacitor の画面に、アプリ独自の設定を足すためのクラス。
/// SceneDelegate から rootViewController として使う。
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        // アプリ内の自作プラグイン（印刷）を登録
        bridge?.registerPluginInstance(NativePrintPlugin())
        // 画面の左端から右へスワイプで前の画面に戻る（iOS の標準的な戻る操作）
        webView?.allowsBackForwardNavigationGestures = true
    }
}
