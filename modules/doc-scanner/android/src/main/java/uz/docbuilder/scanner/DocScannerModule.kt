package uz.docbuilder.scanner

import android.app.Activity
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val SCAN_REQUEST_CODE = 4821

// react-native-document-scanner-plugin o'rniga: u joriy oynani React kontekstidan oladi va release
// build'da u null bo'lib qolardi. Expo modullari oynani o'z hayot tsiklidan oladi, natija esa
// OnActivityResult orqali qaytadi.
class DocScannerModule : Module() {
  private var pendingPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("DocScanner")

    // Natija: skanerlangan sahifalar rasmlarining URI'lari. Bekor qilinsa bo'sh ro'yxat.
    AsyncFunction("scan") { pageLimit: Int, promise: Promise ->
      if (pendingPromise != null) {
        promise.reject(CodedException("ERR_BUSY", "Skaner allaqachon ochiq", null))
        return@AsyncFunction
      }
      val activity = appContext.throwingActivity

      val options = GmsDocumentScannerOptions.Builder()
        .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
        .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
        .setGalleryImportAllowed(true)
      if (pageLimit > 0) options.setPageLimit(pageLimit)

      pendingPromise = promise
      GmsDocumentScanning.getClient(options.build())
        .getStartScanIntent(activity)
        .addOnSuccessListener { intentSender ->
          try {
            activity.startIntentSenderForResult(intentSender, SCAN_REQUEST_CODE, null, 0, 0, 0)
          } catch (e: Exception) {
            pendingPromise = null
            promise.reject(CodedException("ERR_START", e.message ?: "Skaner ochilmadi", e))
          }
        }
        .addOnFailureListener { e ->
          pendingPromise = null
          promise.reject(CodedException("ERR_UNAVAILABLE", e.message ?: "Skaner mavjud emas", e))
        }
    }.runOnQueue(Queues.MAIN)

    OnActivityResult { _, (requestCode, resultCode, data) ->
      if (requestCode != SCAN_REQUEST_CODE) return@OnActivityResult
      val promise = pendingPromise ?: return@OnActivityResult
      pendingPromise = null

      if (resultCode != Activity.RESULT_OK) {
        promise.resolve(emptyList<String>())
        return@OnActivityResult
      }
      val result = GmsDocumentScanningResult.fromActivityResultIntent(data)
      promise.resolve(result?.pages?.map { it.imageUri.toString() } ?: emptyList<String>())
    }
  }
}
