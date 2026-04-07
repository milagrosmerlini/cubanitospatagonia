# cubanitospatagonia app
link: https://milagrosmerlini.github.io/cubanitospatagonia/

## Supabase (migracion recomendada)
Si la caja inicial aparece en `0` o sin historial al abrir desde otro dispositivo/navegador, ejecutar en SQL Editor:

- `APP_CUBANITOS_PATAGONIA/supabase/04_cash_adjustments.sql`
- Si falla guardado de gastos por columnas faltantes (`time`, `method`, `pay_*`), ejecutar:
  - `APP_CUBANITOS_PATAGONIA/supabase/07_expenses_schema_patch.sql`

Luego abrir una vez la app en `Go Live` con usuario admin para que sincronice a nube el historial local existente.
