# Actualizaciones Android

En Supabase Storage crear un bucket público llamado `appupdates`.

Para publicar una actualización, subir el APK con este nombre:

`CubanitosPatagonia.apk`

Luego subir `latest.json` de esta carpeta en:

`cubanitos-patagonia/latest.json`

La APK consulta ese archivo al abrirse. Solo muestra el aviso cuando `versionCode` es mayor a la versión instalada.
