package com.cubanitos.patagonia;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "CubanitosUpdater")
public class CubanitosUpdaterPlugin extends Plugin {
    private final ExecutorService downloader = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String rawUrl = call.getString("url", "").trim();
        if (!rawUrl.startsWith("https://")) {
            call.reject("La URL de actualización no es segura.");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settings = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            getActivity().startActivity(settings);
            JSObject result = new JSObject();
            result.put("needsInstallPermission", true);
            call.resolve(result);
            return;
        }

        downloader.execute(() -> downloadAndOpenInstaller(rawUrl, call));
    }

    private void downloadAndOpenInstaller(String rawUrl, PluginCall call) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(rawUrl).openConnection();
            connection.setConnectTimeout(20000);
            connection.setReadTimeout(30000);
            connection.setRequestProperty("Accept", "application/vnd.android.package-archive");
            connection.connect();
            if (connection.getResponseCode() < 200 || connection.getResponseCode() >= 300) {
                throw new IllegalStateException("No se pudo descargar la actualización.");
            }

            File updatesDir = new File(getContext().getExternalFilesDir("updates"), "");
            if (!updatesDir.exists() && !updatesDir.mkdirs()) {
                throw new IllegalStateException("No se pudo preparar la actualización.");
            }
            File tempFile = new File(updatesDir, "CubanitosPatagonia.tmp");
            File apkFile = new File(updatesDir, "CubanitosPatagonia.apk");

            try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(tempFile)) {
                byte[] buffer = new byte[8192];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                output.flush();
            }
            if (apkFile.exists() && !apkFile.delete()) throw new IllegalStateException("No se pudo reemplazar la actualización anterior.");
            if (!tempFile.renameTo(apkFile)) throw new IllegalStateException("No se pudo preparar la actualización.");

            getActivity().runOnUiThread(() -> {
                try {
                    Uri uri = FileProvider.getUriForFile(
                        getContext(),
                        getContext().getPackageName() + ".fileprovider",
                        apkFile
                    );
                    Intent installer = new Intent(Intent.ACTION_VIEW)
                        .setDataAndType(uri, "application/vnd.android.package-archive")
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getActivity().startActivity(installer);
                    call.resolve();
                } catch (Exception error) {
                    call.reject("No se pudo abrir el instalador.", error);
                }
            });
        } catch (Exception error) {
            call.reject("No se pudo descargar la actualización.", error);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }
}
