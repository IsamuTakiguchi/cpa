import UIKit
import Capacitor

/// 今表示している WebView の内容を iOS の印刷画面（AirPrint）で印刷する。
/// 印刷画面からは PDF として保存・共有もできる。
/// WKWebView では window.print() が動かないため、その代わりに使う。
/// JS 側: web/src/native/share.ts の printPage()
@objc(NativePrintPlugin)
public class NativePrintPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativePrintPlugin"
    public let jsName = "NativePrint"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "printWebView", returnType: CAPPluginReturnPromise)
    ]

    @objc func printWebView(_ call: CAPPluginCall) {
        let jobName = call.getString("jobName") ?? "Document"
        DispatchQueue.main.async {
            guard let webView = self.bridge?.webView else {
                call.reject("WebView が見つかりません")
                return
            }
            let printInfo = UIPrintInfo(dictionary: nil)
            printInfo.outputType = .general
            printInfo.jobName = jobName

            let controller = UIPrintInteractionController.shared
            controller.printInfo = printInfo
            controller.printFormatter = webView.viewPrintFormatter()

            let completion: UIPrintInteractionController.CompletionHandler = { _, completed, error in
                if let error = error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve(["completed": completed])
                }
            }

            if UIDevice.current.userInterfaceIdiom == .pad, let view = self.bridge?.viewController?.view {
                // iPad はポップオーバーで表示（表示位置の指定が必要）
                let rect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
                controller.present(from: rect, in: view, animated: true, completionHandler: completion)
            } else {
                controller.present(animated: true, completionHandler: completion)
            }
        }
    }
}
