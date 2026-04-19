# cubanitospatagonia app
link: https://milagrosmerlini.github.io/cubanitospatagonia/

## Supabase (migracion recomendada)
Si la caja inicial aparece en `0` o sin historial al abrir desde otro dispositivo/navegador, ejecutar en SQL Editor:

- `APP_CUBANITOS_PATAGONIA/supabase/04_cash_adjustments.sql`
- Si falla guardado de gastos por columnas faltantes (`time`, `method`, `pay_*`), ejecutar:
  - `APP_CUBANITOS_PATAGONIA/supabase/07_expenses_schema_patch.sql`
- Si falla guardado de promos personalizadas (mensaje de migracion faltante), ejecutar:
  - `APP_CUBANITOS_PATAGONIA/supabase/08_product_promotions_schema_patch.sql`
- Si queres usar promos mixtas con nombre (ej: 6 comunes + 6 bañados), ejecutar:
  - `APP_CUBANITOS_PATAGONIA/supabase/09_custom_promotions.sql`

Luego abrir una vez la app en `Go Live` con usuario admin para que sincronice a nube el historial local existente.
