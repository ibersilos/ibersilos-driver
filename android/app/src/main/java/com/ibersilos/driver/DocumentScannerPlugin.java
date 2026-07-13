package com.ibersilos.driver;

import android.app.Activity;
import android.content.Intent;
import android.util.Base64;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

@CapacitorPlugin(name = "DocumentScanner")
public class DocumentScannerPlugin extends Plugin {

    private static final int REQUEST_SCAN = 10201;
    private PluginCall savedCall;

    @PluginMethod
    public void scan(PluginCall call) {
        call.setKeepAlive(true);
        savedCall = call;

        GmsDocumentScannerOptions options = new GmsDocumentScannerOptions.Builder()
            .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
            .setGalleryImportAllowed(false)
            .setPageLimit(1)
            .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
            .build();

        GmsDocumentScanning.getClient(options)
            .getStartScanIntent(getActivity())
            .addOnSuccessListener(intentSender -> {
                try {
                    getActivity().startIntentSenderForResult(intentSender, REQUEST_SCAN, null, 0, 0, 0);
                } catch (Exception e) {
                    call.setKeepAlive(false);
                    call.reject("Errore avvio scanner: " + e.getMessage());
                }
            })
            .addOnFailureListener(e -> {
                call.setKeepAlive(false);
                call.reject("Scanner non disponibile: " + e.getMessage());
            });
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_SCAN) return;

        PluginCall call = savedCall;
        savedCall = null;
        if (call == null) return;
        call.setKeepAlive(false);

        if (resultCode == Activity.RESULT_OK) {
            GmsDocumentScanningResult scanResult = GmsDocumentScanningResult.fromActivityResultIntent(data);
            if (scanResult != null && scanResult.getPages() != null && !scanResult.getPages().isEmpty()) {
                android.net.Uri uri = scanResult.getPages().get(0).getImageUri();
                try {
                    InputStream is = getActivity().getContentResolver().openInputStream(uri);
                    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                    byte[] chunk = new byte[8192];
                    int read;
                    while ((read = is.read(chunk)) != -1) buffer.write(chunk, 0, read);
                    String b64 = Base64.encodeToString(buffer.toByteArray(), Base64.NO_WRAP);
                    JSObject ret = new JSObject();
                    ret.put("dataUrl", "data:image/jpeg;base64," + b64);
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject("Errore lettura immagine: " + e.getMessage());
                }
            } else {
                call.reject("Nessuna pagina scansionata");
            }
        } else {
            call.reject("Scansione annullata");
        }
    }
}
