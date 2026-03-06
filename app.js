// =====================================================
// Cubanitos Patagonia - Supabase only
// - Ventas, productos y precios guardados en Supabase
// - Sin cartel de acceso
// =====================================================

const DEFAULT_PRODUCTS = [
  { sku: "cubanito_comun", name: "Cubanito comun", unit: "Unidad", prices: { presencial: 1000, pedidosya: 1300 } },
  { sku: "cubanito_negro", name: "Cubanito choco negro", unit: "Unidad", prices: { presencial: 1300, pedidosya: 1900 } },
  { sku: "cubanito_blanco", name: "Cubanito choco blanco", unit: "Unidad", prices: { presencial: 1300, pedidosya: 1900 } },
  { sku: "garrapinadas", name: "Garrapiñadas", unit: "Bolsa", prices: { presencial: 1200, pedidosya: 1600 } },
];

const ADMIN_CODE_EMAIL = "admin@cubanitos.app";

let products = [];
let sales = [];
let expenses = [];
let session = null;
let isAdmin = false;
const FORCE_GUEST_KEY = "cubanitos_force_guest";
const ACTIVE_TAB_KEY = "cubanitos_active_tab";
const LS_PRODUCTS_KEY = "cubanitos_products_cache";
const LS_SALES_KEY = "cubanitos_sales_cache";
const LS_EXPENSES_KEY = "cubanitos_expenses_cache";
const LS_CASH_ADJUST_BY_DAY_KEY = "cubanitos_cash_adjust_by_day";
const LS_CARRYOVER_BY_MONTH_KEY = "cubanitos_carryover_by_month";
const LS_PEYA_LIQ_LIST_KEY = "cubanitos_peya_liq_list";
const LS_HAS_PEYA_LIQ_TABLE_KEY = "cubanitos_has_peya_liq_table";
let forceGuestMode = false;
let activeChannel = "presencial";
let activeTab = "cobrar";
let cartByChannel = { presencial: {}, pedidosya: {} };
let cashAdjustByDay = {};
let carryoverByMonth = {};
let peyaLiquidations = [];
let salesTodayExpanded = false;
let historyExpanded = false;
let historyDaySalesExpanded = false;
let currentHistoryDayKey = "";
let hasPeyaLiqTable = true;

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const money = (n) => Number(n || 0).toLocaleString("es-AR");
const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const formatDayKey = (k) => {
  const [y, m, d] = k.split("-");
  return `${d}/${m}/${y}`;
};
const nowTime = (d = new Date()) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const clampQty = (q) => Math.max(0, Math.min(999, Number(q || 0)));
const cartHasItems = (c) => Object.values(c).some((q) => Number(q || 0) > 0);

const totalEl = $("#total");
const summaryTitleEl = $("#summary-title");
const promoLineEl = $("#promo-line");
const transferLabelEl = $("#transfer-label");
const pedidosyaDiscountBoxEl = $("#pedidosya-discount-box");
const pedidosyaDiscountEl = $("#pedidosya-discount");
const pedidosyaDiscountAmountEl = $("#pedidosya-discount-amount");
const pedidosyaFinalTotalEl = $("#pedidosya-final-total");
const saveMsgEl = $("#save-msg");
const cashEl = $("#cash");
const transferEl = $("#transfer");
const saleDateEl = $("#sale-date");
const diffEl = $("#diff");
const mixedArea = $("#mixed-area");
const salesListEl = $("#sales-list");
const btnSalesMoreEl = $("#btn-sales-more");
const salesMoreWrapEl = $("#sales-more-wrap");
const btnSalesLessTopEl = $("#btn-sales-less-top");
const salesLessTopWrapEl = $("#sales-less-top-wrap");
const kpiTotalEl = $("#kpi-total");
const kpiCashEl = $("#kpi-cash");
const kpiTransferEl = $("#kpi-transfer");
const kpiPeyaEl = $("#kpi-peya");
const kpiTotalNoteEl = $("#kpi-total-note");
const cajaDateEl = $("#caja-date");
const countsEl = $("#counts");
const cashInitialEl = $("#cash-initial");
const cashRealEl = $("#cash-real");
const cashDeltaEl = $("#cash-delta");
const btnCashAdjustSaveEl = $("#btn-cash-adjust-save");
const cashAdjustMsgEl = $("#cash-adjust-msg");
const todayMetaEl = $("#today-meta");
const todayTotalEl = $("#today-total");
const todayCountEl = $("#today-count");
const salesMonthInputEl = $("#sales-month-input");
const monthTotalEl = $("#month-total");
const monthCashEl = $("#month-cash");
const monthTransferEl = $("#month-transfer");
const monthPeyaEl = $("#month-peya");
const monthQtyComunEl = $("#month-qty-comun");
const monthQtyNegroEl = $("#month-qty-negro");
const monthQtyBlancoEl = $("#month-qty-blanco");
const cajaMonthInputEl = $("#caja-month-input");
const cajaMonthTotalEl = $("#caja-month-total");
const cajaMonthCashEl = $("#caja-month-cash");
const cajaMonthTransferEl = $("#caja-month-transfer");
const cajaMonthPeyaEl = $("#caja-month-peya");
const carryoverCashEl = $("#carryover-cash");
const carryoverTransferEl = $("#carryover-transfer");
const carryoverPeyaEl = $("#carryover-peya");
const btnCarryoverSaveEl = $("#btn-carryover-save");
const carryoverMsgEl = $("#carryover-msg");
const peyaLiqRangeEl = $("#peya-liq-range");
const peyaLiqAmountEl = $("#peya-liq-amount");
const btnPeyaLiqSaveEl = $("#btn-peya-liq-save");
const peyaLiqMsgEl = $("#peya-liq-msg");
const peyaLiqHistoryEl = $("#peya-liq-history");
const historyListEl = $("#history-list");
const historyMoreWrapEl = $("#history-more-wrap");
const btnHistoryMoreEl = $("#btn-history-more");
const historyLessTopWrapEl = $("#history-less-top-wrap");
const btnHistoryLessTopEl = $("#btn-history-less-top");
const historyMoreWrapBottomEl = $("#history-more-wrap-bottom");
const btnHistoryMoreBottomEl = $("#btn-history-more-bottom");
const historyDetailEl = $("#history-detail");
const historyTitleEl = $("#history-title");
const histTotalEl = $("#hist-total");
const histCashEl = $("#hist-cash");
const histTransferEl = $("#hist-transfer");
const histPeyaEl = $("#hist-peya");
const histQtyComunEl = $("#hist-qty-comun");
const histQtyNegroEl = $("#hist-qty-negro");
const histQtyBlancoEl = $("#hist-qty-blanco");
const histSalesListEl = $("#hist-sales-list");
const histSalesMoreWrapEl = $("#hist-sales-more-wrap");
const btnHistSalesMoreEl = $("#btn-hist-sales-more");
const btnHistoryBack = $("#btn-history-back");
const productsGridEl = $("#products-grid");

// Gastos UI
const btnExpenseAdd = $("#btn-expense-add");
const expenseFormWrapEl = $("#expense-form-wrap");
const expenseDateEl = $("#expense-date");
const expenseProviderEl = $("#expense-provider");
const expenseQtyEl = $("#expense-qty");
const expenseDescEl = $("#expense-desc");
const expenseUnitPriceEl = $("#expense-unit-price");
const expenseUnitPriceFieldEl = $("#expense-unit-price-field");
const expenseQtyFieldEl = $("#expense-qty-field");
const expenseDirectAmountFieldEl = $("#expense-direct-amount-field");
const expenseDirectAmountEl = $("#expense-direct-amount");
const expenseSettlementRangeFieldEl = $("#expense-settlement-range-field");
const expenseSettlementRangeEl = $("#expense-settlement-range");
const expenseMethodEl = $("#expense-method");
const expenseMixedWrapEl = $("#expense-mixed-wrap");
const expensePayCashEl = $("#expense-pay-cash");
const expensePayTransferEl = $("#expense-pay-transfer");
const expensePayPeyaEl = $("#expense-pay-peya");
const expenseMixedDiffEl = $("#expense-mixed-diff");
const btnExpenseAddItem = $("#btn-expense-add-item");
const expenseSubtotalEl = $("#expense-subtotal");
const expenseTotalEl = $("#expense-total");
const expenseItemsPreviewEl = $("#expense-items-preview");
const btnExpenseSave = $("#btn-expense-save");
const btnExpenseCancel = $("#btn-expense-cancel");
const expenseMsgEl = $("#expense-msg");
const expenseListEl = $("#expense-list");
const expenseKpiTotalEl = $("#expense-kpi-total");
const expenseKpiCountEl = $("#expense-kpi-count");

const EXPENSE_PROVIDERS = [
  "MAXI",
  "PEDIDO YA",
  "MATIAS",
  "ERICA",
  "JULIA",
  "LUZ AZUL",
  "PLASTICOS BLANCOS",
  "SEÑORA",
  "CONTADOR",
  "ARCA",
  "MUNICIPALIDAD",
  "LUGONES",
  "GARRAFAS DON BOSCO",
];
const EXPENSE_DESCRIPTIONS = [
  "CUBANITO COMUN",
  "CUBANITO CHOCOLATE NEGRO",
  "CUBANITO CHOCOLATE BLANCO"
];
const PROVIDER_RULES = {
  MAXI: { descriptions: ["CUBANITO COMUN", "CUBANITO CHOCOLATE NEGRO", "CUBANITO CHOCOLATE BLANCO"], mode: "items" },
  "PEDIDO YA": { descriptions: ["SERVICIOS DE PEDIDO YA", "IMPUESTOS", "CARGOS OPERATIVOS", "COBROS FUERA DE PEYA"], mode: "direct", settlement: true },
  MATIAS: { descriptions: ["EXTRACCION"], mode: "direct" },
  ERICA: { descriptions: ["EXTRACCION"], mode: "direct" },
  JULIA: { descriptions: ["DULCE DE LECHE"], mode: "items" },
  "LUZ AZUL": { descriptions: ["DULCE DE LECHE"], mode: "items" },
  "PLASTICOS BLANCOS": { descriptions: ["BOLSAS GARRAPINADAS", "BOLSAS CAMISETAS", "SERVILLETAS", "GUANTES"], mode: "direct" },
  SENORA: { descriptions: ["GARRAPINADAS"], mode: "direct" },
  CONTADOR: { descriptions: ["HONORARIOS"], mode: "direct" },
  ARCA: { descriptions: ["IMPUESTO MONOTRIBUTO"], mode: "direct" },
  MUNICIPALIDAD: { descriptions: ["IMPUESTO SEGURIDAD E HIGIENE"], mode: "direct" },
  LUGONES: { descriptions: ["CONTROL DE PLAGAS"], mode: "direct" },
  "GARRAFAS DON BOSCO": { descriptions: ["CARGA DE GARRAFA"], mode: "direct" },
};
const ADD_NEW_SELECT_VALUE = "__add_new__";
const MAX_EXPENSE_DESC_LEN = 120;
const LS_EXPENSE_PROVIDERS_KEY = "cubanitos_expense_providers";
const LS_EXPENSE_DESCRIPTIONS_KEY = "cubanitos_expense_descriptions";
let expenseProviders = [];
let expenseDescriptions = [];
let expenseDraftItems = [];

const authCodeEl = $("#auth-code");
const authCodeToggleEl = $("#auth-code-toggle");
const btnLoginCode = $("#btn-login-code");
const btnLogin = $("#btn-login");
const btnLogout = $("#btn-logout");
const authMsgEl = $("#auth-msg");
const authUserEl = $("#auth-user");
const authBadgeEl = $("#auth-status-badge");
const editNoteEl = $("#edit-note");

const catalogLockNoteEl = $("#catalog-lock-note");
const priceEditorListEl = $("#price-editor-list");
const catalogMsgEl = $("#catalog-msg");
const btnSavePrices = $("#btn-save-prices");
const btnAddProduct = $("#btn-add-product");

const tabPresencial = $("#tab-presencial");
const tabPedidosYa = $("#tab-pedidosya");

let pedidosyaDiscountPct = 0;

function getSkus() {
  const rank = { cubanito_comun: 1, cubanito_negro: 2, cubanito_blanco: 3, garrapinadas: 4 };
  return products
    .slice()
    .sort((a, b) => (rank[a.sku] || 999) - (rank[b.sku] || 999))
    .map((p) => p.sku);
}
function getProduct(sku) {
  return products.find((p) => p.sku === sku) || null;
}
function getPrice(channel, sku) {
  return Number(getProduct(sku)?.prices?.[channel] ?? 0);
}
function getLabel(sku) {
  if (sku === "cubanito_negro") return "Cubanito choco negro";
  if (sku === "cubanito_blanco") return "Cubanito choco blanco";
  return getProduct(sku)?.name || sku;
}
function getCart() {
  return cartByChannel[activeChannel];
}
function setCart(c) {
  cartByChannel[activeChannel] = c;
}
function ensureCartKeys() {
  const skus = getSkus();
  for (const ch of ["presencial", "pedidosya"]) {
    const c = cartByChannel[ch] || {};
    for (const sku of skus) if (c[sku] == null) c[sku] = 0;
    cartByChannel[ch] = c;
  }
}
function clearActiveCart() {
  const next = { ...(cartByChannel[activeChannel] || {}) };
  for (const k of Object.keys(next)) next[k] = 0;
  cartByChannel[activeChannel] = next;
}

function slugifySku(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function setCatalogMsg(t) {
  if (catalogMsgEl) catalogMsgEl.textContent = t || "";
}
function setAuthMsg(t) {
  if (authMsgEl) authMsgEl.textContent = t || "";
}
function setExpenseMsg(t) {
  if (expenseMsgEl) expenseMsgEl.textContent = t || "";
}
function setCashAdjustMsg(t) {
  if (cashAdjustMsgEl) cashAdjustMsgEl.textContent = t || "";
}
function setCarryoverMsg(t) {
  if (carryoverMsgEl) carryoverMsgEl.textContent = t || "";
}
function setPeyaLiqMsg(t) {
  if (peyaLiqMsgEl) peyaLiqMsgEl.textContent = t || "";
}

function loadListCache(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveListCache(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list || [])); } catch {}
}

function loadObjectCache(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveObjectCache(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value || {})); } catch {}
}

function fillSelectOptions(selectEl, list, includeAddNew = false) {
  if (!selectEl) return;
  const base = list.map((v) => `<option value="${v}">${v}</option>`).join("");
  const add = includeAddNew ? `<option value="${ADD_NEW_SELECT_VALUE}">+ Agregar opción...</option>` : "";
  selectEl.innerHTML = base + add;
}

function loadDynamicList(base, key) {
  try {
    const raw = localStorage.getItem(key);
    const extra = raw ? JSON.parse(raw) : [];
    const merged = [...base, ...(Array.isArray(extra) ? extra : [])]
      .map((x) => String(x || "").trim().toUpperCase())
      .filter(Boolean);
    return Array.from(new Set(merged));
  } catch {
    return [...base];
  }
}

function saveDynamicList(key, list) {
  localStorage.setItem(key, JSON.stringify(Array.from(new Set(list))));
}

function sanitizeProviderList(list) {
  const banned = new Set(["GARRAFAS"]);
  return Array.from(
    new Set(
      list
        .map((v) => (String(v || "").trim().toUpperCase() === "SENOR" ? "SEÑORA" : v))
        .filter((v) => !banned.has(String(v || "").trim().toUpperCase()))
    )
  );
}

function refreshExpenseSelects() {
  fillSelectOptions(expenseProviderEl, expenseProviders, true);
  fillSelectOptions(expenseDescEl, expenseDescriptions, true);
}

function addExpenseSelectOption(kind) {
  const isProvider = kind === "provider";
  const promptText = isProvider ? "Nuevo proveedor:" : "Nueva descripción:";
  const value = String(prompt(promptText) || "").trim().toUpperCase();
  if (!value) return null;

  if (isProvider) {
    const normalizedProvider = value === "SENOR" ? "SEÑORA" : value;
    if (!expenseProviders.includes(normalizedProvider)) expenseProviders.push(normalizedProvider);
    expenseProviders = sanitizeProviderList(expenseProviders);
    saveDynamicList(LS_EXPENSE_PROVIDERS_KEY, expenseProviders);
    refreshExpenseSelects();
    if (expenseProviderEl) expenseProviderEl.value = normalizedProvider;
  } else {
    if (!expenseDescriptions.includes(value)) expenseDescriptions.push(value);
    saveDynamicList(LS_EXPENSE_DESCRIPTIONS_KEY, expenseDescriptions);
    refreshExpenseSelects();
    if (expenseDescEl) expenseDescEl.value = value;
  }
  return value;
}

function getExpenseProviderRule() {
  const key = String(expenseProviderEl?.value || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return PROVIDER_RULES[key] || null;
}

function getExpenseInputMode() {
  return getExpenseProviderRule()?.mode || "items";
}

function applyExpenseProviderRules() {
  const rule = getExpenseProviderRule();
  if (rule?.descriptions?.length) {
    fillSelectOptions(expenseDescEl, rule.descriptions, false);
  } else {
    fillSelectOptions(expenseDescEl, expenseDescriptions, true);
  }

  const directMode = getExpenseInputMode() === "direct";
  expenseUnitPriceFieldEl?.classList.toggle("hidden", directMode);
  expenseQtyFieldEl?.classList.toggle("hidden", directMode);
  expenseDirectAmountFieldEl?.classList.toggle("hidden", !directMode);
  const showSettlement = Boolean(rule?.settlement);
  expenseSettlementRangeFieldEl?.classList.toggle("hidden", !showSettlement);
  if (expenseDescEl && expenseDescEl.options.length) expenseDescEl.selectedIndex = 0;
}

function getExpenseCurrentSubtotal() {
  if (getExpenseInputMode() === "direct") {
    return Math.max(0, Number(expenseDirectAmountEl?.value || 0));
  }
  const qty = Math.max(0, Number(expenseQtyEl?.value || 0));
  const unitPrice = Math.max(0, Number(expenseUnitPriceEl?.value || 0));
  return qty * unitPrice;
}

function getExpenseTotal() {
  const itemsTotal = expenseDraftItems.reduce((acc, it) => acc + Number(it.amount || 0), 0);
  return itemsTotal + getExpenseCurrentSubtotal();
}

function renderExpenseTotals() {
  const subtotal = getExpenseCurrentSubtotal();
  const total = getExpenseTotal();
  if (expenseSubtotalEl) expenseSubtotalEl.textContent = `$${money(subtotal)}`;
  if (expenseTotalEl) expenseTotalEl.textContent = `$${money(total)}`;
  if (expenseItemsPreviewEl) {
    if (!expenseDraftItems.length) expenseItemsPreviewEl.textContent = "Sin items agregados.";
    else expenseItemsPreviewEl.textContent = `Items agregados: ${expenseDraftItems.length}`;
  }
}

function resetExpenseForm() {
  if (expenseDateEl) expenseDateEl.value = todayKey();
  if (expenseProviderEl && expenseProviderEl.options.length) expenseProviderEl.selectedIndex = 0;
  if (expenseUnitPriceEl) expenseUnitPriceEl.value = "";
  if (expenseQtyEl) expenseQtyEl.value = "";
  if (expenseDirectAmountEl) expenseDirectAmountEl.value = "";
  if (expenseSettlementRangeEl) expenseSettlementRangeEl.value = "";
  expenseSettlementRangeEl?._flatpickr?.clear();
  if (expenseDescEl && expenseDescEl.options.length) expenseDescEl.selectedIndex = 0;
  if (expenseMethodEl) expenseMethodEl.value = "efectivo";
  if (expensePayCashEl) expensePayCashEl.value = "";
  if (expensePayTransferEl) expensePayTransferEl.value = "";
  if (expensePayPeyaEl) expensePayPeyaEl.value = "";
  expenseDraftItems = [];
  applyExpenseProviderRules();
  renderExpenseTotals();
  if (expenseMixedWrapEl) expenseMixedWrapEl.classList.add("hidden");
  if (expenseMixedDiffEl) expenseMixedDiffEl.textContent = "";
}

function initSettlementRangePicker() {
  if (!expenseSettlementRangeEl || typeof window.flatpickr !== "function") return;
  window.flatpickr(expenseSettlementRangeEl, {
    mode: "range",
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    locale: window.flatpickr.l10ns.es || "default",
    allowInput: false,
    clickOpens: true,
  });
}

function getSettlementRange() {
  const fp = expenseSettlementRangeEl?._flatpickr;
  if (!fp || !Array.isArray(fp.selectedDates) || fp.selectedDates.length < 2) return null;
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const [a, b] = fp.selectedDates;
  const from = fmt(a);
  const to = fmt(b);
  return from <= to ? { from, to } : { from: to, to: from };
}

function initPeyaLiquidationRangePicker() {
  if (!peyaLiqRangeEl || typeof window.flatpickr !== "function") return;
  window.flatpickr(peyaLiqRangeEl, {
    mode: "range",
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    locale: window.flatpickr.l10ns.es || "default",
    allowInput: false,
    clickOpens: true,
  });
}

function getPeyaLiqRange() {
  const fp = peyaLiqRangeEl?._flatpickr;
  if (!fp || !Array.isArray(fp.selectedDates) || fp.selectedDates.length < 2) return null;
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const [a, b] = fp.selectedDates;
  const from = fmt(a);
  const to = fmt(b);
  return from <= to ? { from, to } : { from: to, to: from };
}

async function loadProductsFromDB() {
  const { data, error } = await window.supabase
    .from("products")
    .select("sku,name,unit,price_presencial,price_pedidosya,created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    const fallback = loadListCache(LS_PRODUCTS_KEY);
    return fallback.length ? fallback : null;
  }

  const list = (data || []).map((r) => {
    const sku = String(r.sku || "").trim();
    const baseName = sku === "cubanito_negro"
      ? "Cubanito choco negro"
      : sku === "cubanito_blanco"
      ? "Cubanito choco blanco"
      : String(r.name || r.sku);
    return {
      sku,
      name: sku === "garrapinadas" ? "Garrapiñadas" : baseName,
      unit: String(r.unit || "Unidad"),
      prices: {
        presencial: Number(r.price_presencial || 0),
        pedidosya: Number(r.price_pedidosya || 0),
      },
    };
  }).filter((p) => !!p.sku);
  const preferred = ["cubanito_comun", "cubanito_blanco", "cubanito_negro", "garrapinadas"];
  list.sort((a, b) => {
    const ia = preferred.indexOf(a.sku);
    const ib = preferred.indexOf(b.sku);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.name.localeCompare(b.name, "es");
  });
  saveListCache(LS_PRODUCTS_KEY, list);
  return list;
}

async function upsertProductToDB(p) {
  const payload = {
    sku: p.sku,
    name: p.sku === "garrapinadas" ? "Garrapiñadas" : p.name,
    unit: p.unit || "Unidad",
    price_presencial: Number(p.prices?.presencial || 0),
    price_pedidosya: Number(p.prices?.pedidosya || 0),
  };
  const { error } = await window.supabase.from("products").upsert(payload, { onConflict: "sku" });
  if (error) throw error;
}

async function loadSalesFromDB() {
  const { data, error } = await window.supabase
    .from("sales")
    .select("*")
    .order("day", { ascending: true })
    .order("time", { ascending: true });

  if (error) {
    console.error(error);
    return loadListCache(LS_SALES_KEY);
  }

  const cacheById = new Map(loadListCache(LS_SALES_KEY).map((s) => [String(s.id), s]));
  const list = (data || []).map((r) => ({
    id: r.id,
    dayKey: String(r.day),
    time: r.time,
    channel: r.channel || "presencial",
    items: r.items || [],
    totals: {
      total: Number(r.total),
      cash: Number(r.cash),
      transfer: Number(r.transfer),
      peya: Number(r.peya ?? cacheById.get(String(r.id))?.totals?.peya ?? 0),
    },
  }));
  saveListCache(LS_SALES_KEY, list);
  return list;
}

async function loadExpensesFromDB() {
  const { data, error } = await window.supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return loadListCache(LS_EXPENSES_KEY);
  }

  const list = (data || []).map((r) => ({
    id: r.id,
    date: String(r.date || ""),
    provider: String(r.provider || ""),
    qty: Number(r.qty || 0),
    description: String(r.description || ""),
    iva: Number(r.iva || 0),
    iibb: Number(r.iibb || 0),
    amount: Number(r.amount || 0),
    method: String(r.method || "efectivo"),
    pay_cash: Number(r.pay_cash || 0),
    pay_transfer: Number(r.pay_transfer || 0),
    pay_peya: Number(r.pay_peya || 0),
  }));
  saveListCache(LS_EXPENSES_KEY, list);
  return list;
}

async function loadPeyaLiquidationsFromDB() {
  if (!hasPeyaLiqTable) return loadListCache(LS_PEYA_LIQ_LIST_KEY);
  const { data, error } = await window.supabase
    .from("peya_liquidations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (String(error.code || "") === "PGRST205" || msg.includes("could not find the table")) {
      hasPeyaLiqTable = false;
      try { localStorage.setItem(LS_HAS_PEYA_LIQ_TABLE_KEY, "0"); } catch {}
      return loadListCache(LS_PEYA_LIQ_LIST_KEY);
    }
    console.error(error);
    return loadListCache(LS_PEYA_LIQ_LIST_KEY);
  }
  hasPeyaLiqTable = true;
  try { localStorage.setItem(LS_HAS_PEYA_LIQ_TABLE_KEY, "1"); } catch {}

  const list = (data || []).map((r) => ({
    id: String(r.id),
    month: String(r.month || ""),
    from: String(r.from_date || ""),
    to: String(r.to_date || ""),
    amount: Number(r.amount || 0),
    created_at: String(r.created_at || ""),
  }));
  saveListCache(LS_PEYA_LIQ_LIST_KEY, list);
  return list;
}

async function insertPeyaLiquidationToDB(row) {
  if (!hasPeyaLiqTable) throw new Error("missing_peya_liq_table");
  const payload = {
    id: row.id,
    month: row.month,
    from_date: row.from,
    to_date: row.to,
    amount: row.amount,
  };
  const { error } = await window.supabase.from("peya_liquidations").insert(payload);
  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (String(error.code || "") === "PGRST205" || msg.includes("could not find the table")) {
      hasPeyaLiqTable = false;
      try { localStorage.setItem(LS_HAS_PEYA_LIQ_TABLE_KEY, "0"); } catch {}
      throw new Error("missing_peya_liq_table");
    }
    throw error;
  }
}

async function insertExpenseToDB(expense) {
  if (!session?.user) throw new Error("Tenes que iniciar sesion");
  if (!isAdmin) throw new Error("No sos admin");
  const payload = {
    id: expense.id,
    date: expense.date,
    provider: expense.provider,
    qty: expense.qty,
    description: expense.description,
    iva: expense.iva,
    iibb: expense.iibb,
    amount: expense.amount,
    method: expense.method,
    pay_cash: expense.pay_cash,
    pay_transfer: expense.pay_transfer,
    pay_peya: expense.pay_peya,
  };
  const variants = [];
  variants.push(payload);
  const { pay_cash, pay_transfer, pay_peya, ...withoutSplit } = payload;
  variants.push(withoutSplit);

  let lastError = null;
  for (const base of variants) {
    const descBase = String(base.description || "");
    const candidates = [
      descBase,
      safeExpenseDescription(descBase.slice(0, 80)).value,
      safeExpenseDescription(descBase.slice(0, 60)).value,
      safeExpenseDescription(descBase.slice(0, 40)).value,
      safeExpenseDescription(descBase.slice(0, 24)).value,
    ];

    for (const desc of candidates) {
      const attemptPayload = { ...base, description: desc };
      const { error } = await window.supabase.from("expenses").insert(attemptPayload);
      if (!error) return;
      lastError = error;
      const msg = String(error.message || "").toLowerCase();
      const canRetryLen = msg.includes("too long") || msg.includes("value too long") || msg.includes("character varying");
      const canRetrySplit = msg.includes("pay_");
      if (!canRetryLen && !canRetrySplit) break;
    }
  }

  throw lastError || new Error("No se pudo guardar el gasto.");
}

async function insertSaleToDB(sale) {
  const payload = {
    id: sale.id,
    day: sale.dayKey,
    time: sale.time,
    channel: sale.channel,
    items: sale.items,
    total: sale.totals.total,
    cash: sale.totals.cash,
    transfer: sale.totals.transfer,
    peya: Number(sale.totals.peya || 0),
  };

  let { error } = await window.supabase.from("sales").insert(payload);
  if (!error) return;
  if (String(error.message || "").toLowerCase().includes("peya")) {
    const { peya, ...fallback } = payload;
    const retry = await window.supabase.from("sales").insert(fallback);
    if (!retry.error) return;
    error = retry.error;
  }
  if (String(error.message || "").toLowerCase().includes("channel")) {
    throw new Error("Falta la columna channel en sales. Actualiza la tabla en Supabase para guardar Presencial/PedidosYa correctamente.");
  }
  throw error;
}

async function updateSaleInDB(sale) {
  if (!session?.user || !isAdmin) throw new Error("Solo admin");
  const payload = {
    day: sale.dayKey,
    time: sale.time,
    channel: sale.channel,
    items: sale.items,
    total: sale.totals.total,
    cash: sale.totals.cash,
    transfer: sale.totals.transfer,
    peya: Number(sale.totals.peya || 0),
  };
  let { error } = await window.supabase.from("sales").update(payload).eq("id", sale.id);
  if (!error) return;
  if (String(error.message || "").toLowerCase().includes("peya")) {
    const { peya, ...fallback } = payload;
    const retry = await window.supabase.from("sales").update(fallback).eq("id", sale.id);
    if (!retry.error) return;
    error = retry.error;
  }
  throw error;
}

async function updateExpenseInDB(expense) {
  if (!session?.user || !isAdmin) throw new Error("Solo admin");
  const payload = {
    date: expense.date,
    provider: expense.provider,
    qty: expense.qty,
    description: expense.description,
    iva: expense.iva,
    iibb: expense.iibb,
    amount: expense.amount,
    method: expense.method,
    pay_cash: expense.pay_cash,
    pay_transfer: expense.pay_transfer,
    pay_peya: expense.pay_peya,
  };
  const variants = [];
  variants.push(payload);
  const { pay_cash, pay_transfer, pay_peya, ...withoutSplit } = payload;
  variants.push(withoutSplit);

  let lastError = null;
  for (const base of variants) {
    const descBase = String(base.description || "");
    const candidates = [
      descBase,
      safeExpenseDescription(descBase.slice(0, 80)).value,
      safeExpenseDescription(descBase.slice(0, 60)).value,
      safeExpenseDescription(descBase.slice(0, 40)).value,
      safeExpenseDescription(descBase.slice(0, 24)).value,
    ];

    for (const desc of candidates) {
      const attemptPayload = { ...base, description: desc };
      const { error } = await window.supabase.from("expenses").update(attemptPayload).eq("id", expense.id);
      if (!error) return;
      lastError = error;
      const msg = String(error.message || "").toLowerCase();
      const canRetryLen = msg.includes("too long") || msg.includes("value too long") || msg.includes("character varying");
      const canRetrySplit = msg.includes("pay_");
      if (!canRetryLen && !canRetrySplit) break;
    }
  }

  throw lastError || new Error("No se pudo editar el gasto.");
}

async function deleteSaleById(id) {
  if (!session?.user || !isAdmin) throw new Error("Solo admin");
  const { error } = await window.supabase.from("sales").delete().eq("id", id);
  if (error) throw error;
  saveListCache(LS_SALES_KEY, loadListCache(LS_SALES_KEY).filter((s) => s.id !== id));
}

async function deleteDaySales(dayKey) {
  if (!session?.user || !isAdmin) throw new Error("Solo admin");
  const { error } = await window.supabase.from("sales").delete().eq("day", dayKey);
  if (error) throw error;
  saveListCache(LS_SALES_KEY, loadListCache(LS_SALES_KEY).filter((s) => s.dayKey !== dayKey));
}

async function deleteExpenseById(id) {
  if (!session?.user || !isAdmin) throw new Error("Solo admin");
  const { error } = await window.supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
  saveListCache(LS_EXPENSES_KEY, loadListCache(LS_EXPENSES_KEY).filter((e) => e.id !== id));
}

async function refreshSession() {
  if (forceGuestMode) {
    session = null;
    return;
  }
  const { data } = await window.supabase.auth.getSession();
  session = data?.session || null;
}

async function checkIsAdmin() {
  if (!session?.user) return false;
  const { data, error } = await window.supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return false;
  }
  return !!data;
}

function setBadge(text, kind) {
  if (!authBadgeEl) return;
  authBadgeEl.textContent = text;
  authBadgeEl.classList.remove("good", "bad");
  if (kind === "good") authBadgeEl.classList.add("good");
  if (kind === "bad") authBadgeEl.classList.add("bad");
}

function setEditEnabled(enabled) {
  const btnUndo = $("#btn-undo");
  const btnReset = $("#btn-reset-day");
  const menuGastos = document.querySelector('.menuItem[data-go="gastos"]');
  const menuEditar = document.querySelector('.menuItem[data-go="editar"]');
  const tabGastos = document.getElementById("tab-gastos");
  const tabEditar = document.getElementById("tab-editar");

  [btnUndo, btnReset].forEach((b) => {
    if (!b) return;
    b.disabled = !enabled;
    b.style.opacity = enabled ? "1" : "0.55";
    b.style.pointerEvents = enabled ? "auto" : "none";
  });

  [btnSavePrices, btnAddProduct, ...$$("#tab-editar input")].forEach((el) => {
    if (!el) return;
    el.disabled = !enabled;
    el.style.opacity = enabled ? "1" : "0.75";
  });

  [btnExpenseAdd, btnExpenseSave, btnExpenseCancel, ...$$("#tab-gastos input"), ...$$("#tab-gastos select")].forEach((el) => {
    if (!el) return;
    el.disabled = !enabled;
    el.style.opacity = enabled ? "1" : "0.75";
  });

  if (menuGastos) menuGastos.style.display = enabled ? "" : "none";
  if (menuEditar) menuEditar.style.display = enabled ? "" : "none";
  if (tabGastos) tabGastos.style.display = enabled ? "" : "none";
  if (tabEditar) tabEditar.style.display = enabled ? "" : "none";
  if (!enabled && activeTab === "gastos") goTo("cobrar");
  if (!enabled && activeTab === "editar") goTo("cobrar");

  if (editNoteEl) {
    const hasText = String(editNoteEl.textContent || "").trim().length > 0;
    editNoteEl.style.display = !enabled && hasText ? "block" : "none";
  }
  if (catalogLockNoteEl) {
    const hasText = String(catalogLockNoteEl.textContent || "").trim().length > 0;
    catalogLockNoteEl.style.display = !enabled && hasText ? "block" : "none";
  }
}

async function applyAuthState() {
  await refreshSession();
  isAdmin = await checkIsAdmin();
  applyAuthUi();
}

function applyAuthUi() {
  if (authUserEl) authUserEl.textContent = session?.user ? `Usuario: ${session.user.email}` : "";

  if (!session?.user) {
    setBadge("Invitado", "bad");
    setAuthMsg("Invitado: podes guardar ventas. Gastos y edicion solo admin.");
    setEditEnabled(false);
    return;
  }

  if (!isAdmin) {
    setBadge("Usuario (no admin)", "bad");
    setAuthMsg("Usuario no admin: podes guardar ventas. Gastos y edicion solo admin.");
    setEditEnabled(false);
    return;
  }

  setBadge("Admin OK", "good");
  setAuthMsg("Admin OK. Podes guardar ventas y editar catalogo.");
  setEditEnabled(true);
}

const menuBtn = $("#menu-btn");
const menuEl = $("#menu");
const menuWrap = $(".menuWrap");
let lastTouchAt = 0;

function isGhostClick() {
  return Date.now() - lastTouchAt < 450;
}

function goTo(tab) {
  if (!isAdmin && (tab === "gastos" || tab === "editar")) tab = "cobrar";
  activeTab = tab;
  $$(".panel").forEach((p) => p.classList.remove("show"));
  document.getElementById(`tab-${tab}`)?.classList.add("show");
  try { localStorage.setItem(ACTIVE_TAB_KEY, tab); } catch {}
  closeMenu();
  applyPedidosYaTheme();
}
function openMenu() {
  if (!menuEl || !menuBtn) return;
  menuEl.classList.add("show");
  menuEl.setAttribute("aria-hidden", "false");
  menuEl.inert = false;
  menuBtn.setAttribute("aria-expanded", "true");
}
function closeMenu() {
  if (!menuEl || !menuBtn) return;
  // Evita foco dentro de un contenedor oculto para no disparar warning de aria-hidden.
  if (menuEl.contains(document.activeElement)) menuBtn.focus();
  menuEl.classList.remove("show");
  menuEl.setAttribute("aria-hidden", "true");
  menuEl.inert = true;
  menuBtn.setAttribute("aria-expanded", "false");
}
function toggleMenu() {
  menuEl?.classList.contains("show") ? closeMenu() : openMenu();
}

if (menuBtn && menuEl && menuWrap) {
  menuEl.inert = true;
  const safePreventDefault = (e) => {
    if (e?.cancelable) e.preventDefault();
  };
  const onMenuToggle = (e) => {
    safePreventDefault(e);
    e.stopPropagation();
    toggleMenu();
  };
  const onMenuItemTap = (e) => {
    safePreventDefault(e);
    e.stopPropagation();
    const item = e.currentTarget;
    item.classList.add("is-pressed");
    setTimeout(() => {
      item.classList.remove("is-pressed");
      goTo(item.dataset.go);
    }, 110);
  };

  menuBtn.addEventListener("touchstart", (e) => {
    lastTouchAt = Date.now();
    onMenuToggle(e);
  }, { passive: false });
  menuBtn.addEventListener("click", (e) => {
    if (isGhostClick()) return;
    onMenuToggle(e);
  });

  menuEl.addEventListener("click", (e) => e.stopPropagation());
  $$(".menuItem").forEach((item) => {
    item.addEventListener("touchstart", (e) => {
      lastTouchAt = Date.now();
      onMenuItemTap(e);
    }, { passive: false });
    item.addEventListener("click", (e) => {
      if (isGhostClick()) return;
      onMenuItemTap(e);
    });
  });
  document.addEventListener("pointerdown", (e) => {
    if (!menuWrap.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

function garrapinadasSubtotal(qty, unitPrice, channel) {
  qty = clampQty(qty);
  if (channel === "pedidosya") return { packs: 0, rest: qty, subtotal: qty * unitPrice, savings: 0 };
  const packs = Math.floor(qty / 3);
  const rest = qty % 3;
  const subtotal = packs * 3000 + rest * unitPrice;
  const full = qty * unitPrice;
  return { packs, rest, subtotal, savings: full - subtotal };
}

function cartTotal(cartObj, channel = activeChannel) {
  let total = 0;
  let g = { packs: 0, rest: 0, subtotal: 0, savings: 0 };

  for (const sku of getSkus()) {
    const qty = Number(cartObj[sku] || 0);
    const unit = getPrice(channel, sku);
    if (sku === "garrapinadas") {
      g = garrapinadasSubtotal(qty, unit, channel);
      total += g.subtotal;
    } else {
      total += qty * unit;
    }
  }

  return { total, garrapinadas: g };
}

function getCheckoutTotals(cartObj = getCart(), channel = activeChannel) {
  const base = cartTotal(cartObj, channel);
  const subtotal = Number(base.total || 0);
  if (channel !== "pedidosya") {
    return { subtotal, discountPct: 0, discountAmount: 0, total: subtotal, garrapinadas: base.garrapinadas };
  }

  const discountPct = Math.max(0, Math.min(100, Number(pedidosyaDiscountPct || 0)));
  const discountAmount = Math.round((subtotal * discountPct) / 100);
  const total = Math.max(0, subtotal - discountAmount);
  return { subtotal, discountPct, discountAmount, total, garrapinadas: base.garrapinadas };
}

function renderProductsGrid() {
  if (!productsGridEl) return;
  const skus = getSkus();

  if (!skus.length) {
    productsGridEl.innerHTML = `<div class="card" style="grid-column:1/-1;"><strong>No hay productos.</strong><p class="muted tiny">Cargalos en Supabase (tabla products).</p></div>`;
    return;
  }

  productsGridEl.innerHTML = skus
    .map((sku) => {
      const p = getProduct(sku);
      const price = getPrice(activeChannel, sku);
      const promo = sku === "garrapinadas" && activeChannel === "presencial" ? `<p class="hint" data-promo="garrapinadas">Promo: 3 por $3000</p>` : "";
      return `
        <div class="card product" data-sku="${sku}">
          <div class="row">
            <div>
              <h2>${getLabel(sku)}</h2>
              <p class="muted">$${money(price)}</p>
              ${promo}
            </div>
            <div class="pill">${p.unit || "Unidad"}</div>
          </div>
          <div class="counter">
            <button class="btn ghost" data-action="dec" type="button">-</button>
            <input class="qty" type="number" inputmode="numeric" min="0" step="1" value="0" data-qty="${sku}" />
            <button class="btn ghost" data-action="inc" type="button">+</button>
          </div>
        </div>
      `;
    })
    .join("");

  renderCart();
}

productsGridEl?.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const card = e.target.closest(".product");
  const sku = card?.dataset?.sku;
  const action = btn.getAttribute("data-action");
  if (!sku || !action) return;

  const cart = { ...getCart() };
  if (action === "inc") cart[sku] = clampQty((cart[sku] || 0) + 1);
  if (action === "dec") cart[sku] = clampQty((cart[sku] || 0) - 1);
  setCart(cart);
  if (saveMsgEl) saveMsgEl.textContent = "";
  renderCart();
});

productsGridEl?.addEventListener("input", (e) => {
  const input = e.target.closest(".qty");
  if (!input) return;
  const sku = input.dataset.qty;
  const cart = { ...getCart() };
  cart[sku] = clampQty(input.value);
  setCart(cart);
  renderCart();
});

function renderEdit() {
  if (!priceEditorListEl) return;
  if (!products.length) {
    priceEditorListEl.innerHTML = `<div class="muted tiny">No hay productos.</div>`;
    return;
  }

  priceEditorListEl.innerHTML = products
    .map(
      (p) => `
    <div class="priceEditorRow" data-sku="${p.sku}">
      <div class="priceEditorName"><strong>${p.name}</strong><div class="muted tiny">${p.unit || "Unidad"}</div></div>
      <div class="editPrices">
        <label class="field"><span>Presencial</span><input type="number" min="0" step="50" data-price-edit="presencial" data-sku="${p.sku}" value="${p.prices.presencial}" /></label>
        <label class="field"><span>PedidosYa</span><input type="number" min="0" step="50" data-price-edit="pedidosya" data-sku="${p.sku}" value="${p.prices.pedidosya}" /></label>
      </div>
    </div>`
    )
    .join("");
}

btnSavePrices?.addEventListener("click", async () => {
  if (!isAdmin) return setCatalogMsg("Solo admin puede editar precios.");
  try {
    let changed = 0;
    for (const inp of $$('[data-price-edit]')) {
      const sku = inp.getAttribute("data-sku");
      const channel = inp.getAttribute("data-price-edit");
      const p = getProduct(sku);
      if (!p || !channel) continue;
      const nextValue = Math.max(0, Number(inp.value || 0));
      if (Number(p.prices[channel] || 0) !== nextValue) changed += 1;
      p.prices[channel] = nextValue;
    }

    const payload = products.map((p) => ({
      sku: p.sku,
      name: p.sku === "garrapinadas" ? "Garrapiñadas" : p.name,
      unit: p.unit || "Unidad",
      price_presencial: Number(p.prices?.presencial || 0),
      price_pedidosya: Number(p.prices?.pedidosya || 0),
    }));
    const { error } = await window.supabase.from("products").upsert(payload, { onConflict: "sku" });
    if (error) throw error;

    saveListCache(LS_PRODUCTS_KEY, products);
    renderProductsGrid();
    renderAll();
    setCatalogMsg(changed > 0 ? `Precios guardados (${changed} cambios).` : "No habia cambios para guardar.");
  } catch (e) {
    console.error(e);
    setCatalogMsg(`Error guardando precios: ${e?.message || "sin detalle"}`);
  }
});

btnAddProduct?.addEventListener("click", async () => {
  if (!isAdmin) return setCatalogMsg("Solo admin puede agregar productos.");

  const name = String($("#new-product-name")?.value || "").trim();
  const unit = String($("#new-product-unit")?.value || "Unidad").trim() || "Unidad";
  const pp = Math.max(0, Number($("#new-price-presencial")?.value || 0));
  const py = Math.max(0, Number($("#new-price-pedidosya")?.value || 0));

  if (!name) return setCatalogMsg("Pone un nombre.");

  const base = slugifySku(name);
  if (!base) return setCatalogMsg("El nombre no genera un SKU valido.");

  let sku = base;
  let n = 2;
  while (getProduct(sku)) {
    sku = `${base}_${n}`;
    n += 1;
  }

  const newProduct = { sku, name, unit, prices: { presencial: pp, pedidosya: py } };

  try {
    await upsertProductToDB(newProduct);
    products.push(newProduct);
    saveListCache(LS_PRODUCTS_KEY, products);
    ensureCartKeys();
    renderAll();
    $("#new-product-name").value = "";
    $("#new-product-unit").value = "";
    $("#new-price-presencial").value = "";
    $("#new-price-pedidosya").value = "";
    setCatalogMsg("Producto guardado en Supabase.");
  } catch (e) {
    console.error(e);
    setCatalogMsg("Error agregando producto en Supabase.");
  }
});

btnLoginCode?.addEventListener("click", async () => {
  try {
    setAuthMsg("Entrando con codigo...");
    const code = (authCodeEl?.value || "").trim();
    if (!code) return setAuthMsg("Ingresa un codigo.");

    // Si venimos de "Salir", desactiva invitado forzado antes de loguear.
    forceGuestMode = false;
    try { localStorage.removeItem(FORCE_GUEST_KEY); } catch {}

    const loginPromise = window.supabase.auth.signInWithPassword({
      email: ADMIN_CODE_EMAIL,
      password: code,
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout al iniciar sesion")), 10000)
    );
    const { data, error } = await Promise.race([loginPromise, timeoutPromise]);
    if (error) throw error;

    if (data?.session) session = data.session;
    isAdmin = await checkIsAdmin();
    applyAuthUi();
    renderAll();
    if (isAdmin) goTo("cobrar");
  } catch (e) {
    console.error(e);
    try {
      const fallback = await window.supabase.auth.getSession();
      if (fallback?.data?.session) {
        session = fallback.data.session;
        isAdmin = await checkIsAdmin();
        applyAuthUi();
        renderAll();
        if (isAdmin) goTo("cobrar");
        return;
      }
    } catch {}
    setBadge("Error", "bad");
    setAuthMsg("No se pudo iniciar sesion. Probá de nuevo.");
  }
});

authCodeToggleEl?.addEventListener("click", () => {
  if (!authCodeEl) return;
  const show = authCodeEl.type === "password";
  authCodeEl.type = show ? "text" : "password";
  authCodeToggleEl.setAttribute("aria-pressed", show ? "true" : "false");
  authCodeToggleEl.setAttribute("aria-label", show ? "Ocultar código" : "Mostrar código");
});

authCodeEl?.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  btnLoginCode?.click();
});

btnLogin?.addEventListener("click", async () => {});

btnLogout?.addEventListener("click", async () => {
  try {
    // Salida local inmediata (no depende de red)
    forceGuestMode = true;
    try { localStorage.setItem(FORCE_GUEST_KEY, "1"); } catch {}
    session = null;
    isAdmin = false;
    setBadge("Invitado", "bad");
    setAuthMsg("Invitado: podes guardar ventas. Gastos y edicion solo admin.");
    setEditEnabled(false);
    renderAll();
    goTo("cobrar");

    // No forzamos signOut remoto para no bloquear el siguiente login.
  } catch (e) {
    console.error(e);
    setAuthMsg("Se aplico salida local. Si sigue abierta en servidor, se cerrará al recargar.");
  }
});

function setActiveChannel(ch) {
  if (!["presencial", "pedidosya"].includes(ch)) return;
  activeChannel = ch;
  if (transferLabelEl) transferLabelEl.textContent = "Transferencia";
  tabPresencial?.classList.toggle("active", ch === "presencial");
  tabPedidosYa?.classList.toggle("active", ch === "pedidosya");
  syncPayModeByChannel();
  const cashMode = payModeEls.find((r) => r.value === "cash");
  if (cashMode) cashMode.checked = true;
  applyPedidosYaTheme();
  if (saveMsgEl) saveMsgEl.textContent = "";
  renderProductsGrid();
  renderCart();
  applyPayMode();
}

function applyPedidosYaTheme() {
  // Fondo rojo solo cuando el panel de Cobrar esta visible y el canal es PedidosYa.
  const cobrarVisible = document.getElementById("tab-cobrar")?.classList.contains("show");
  const enable = Boolean(cobrarVisible) && activeChannel === "pedidosya";
  document.body.classList.toggle("pedidosya-mode", enable);
}

tabPresencial?.addEventListener("click", () => setActiveChannel("presencial"));
tabPedidosYa?.addEventListener("click", () => setActiveChannel("pedidosya"));

const payModeEls = Array.from(document.querySelectorAll('input[name="paymode"]'));
const payModePeyaInputEl = document.querySelector('input[name="paymode"][value="peya"]');
const payModePeyaChipEl = payModePeyaInputEl?.closest("label");
const getPayMode = () => payModeEls.find((r) => r.checked)?.value || "cash";

function syncPayModeByChannel() {
  const showPeya = activeChannel === "pedidosya";
  payModePeyaChipEl?.classList.toggle("hidden", !showPeya);
  if (!showPeya && getPayMode() === "peya") {
    const transferMode = payModeEls.find((r) => r.value === "transfer");
    if (transferMode) transferMode.checked = true;
  }
}

function renderSplitDiff() {
  const { total } = getCheckoutTotals(getCart(), activeChannel);
  const cash = Number(cashEl?.value || 0);
  const transfer = Number(transferEl?.value || 0);
  const diff = cash + transfer - total;

  if (!cartHasItems(getCart())) {
    if (diffEl) diffEl.textContent = "-";
    diffEl?.classList.remove("good", "bad");
    return;
  }

  if (diff === 0) {
    if (diffEl) diffEl.textContent = "OK";
    diffEl?.classList.add("good");
    diffEl?.classList.remove("bad");
  } else {
    const label = diff < 0 ? "Falta" : "Sobra";
    if (diffEl) diffEl.textContent = `${label}: $${money(Math.abs(diff))}`;
    diffEl?.classList.remove("good");
    diffEl?.classList.add("bad");
  }
}

function applyPayMode() {
  const mode = getPayMode();
  const cart = getCart();
  const { total } = getCheckoutTotals(cart, activeChannel);

  if (mixedArea) mixedArea.classList.toggle("hidden", mode !== "mixed");

  if (!cartHasItems(cart)) {
    if (mode !== "mixed") {
      if (cashEl) cashEl.value = "0";
      if (transferEl) transferEl.value = "0";
    }
    if (diffEl) {
      diffEl.textContent = "-";
      diffEl.classList.remove("good", "bad");
    }
    return;
  }

  if (mode === "cash") {
    if (cashEl) cashEl.value = String(total);
    if (transferEl) transferEl.value = "0";
  } else if (mode === "transfer") {
    if (cashEl) cashEl.value = "0";
    if (transferEl) transferEl.value = String(total);
  } else if (mode === "peya") {
    if (cashEl) cashEl.value = "0";
    if (transferEl) transferEl.value = "0";
  } else {
    renderSplitDiff();
  }
}

payModeEls.forEach((r) => r.addEventListener("change", () => applyPayMode()));
cashEl?.addEventListener("input", () => {
  if (getPayMode() === "mixed") renderSplitDiff();
});
transferEl?.addEventListener("input", () => {
  if (getPayMode() === "mixed") renderSplitDiff();
});

pedidosyaDiscountEl?.addEventListener("input", () => {
  pedidosyaDiscountPct = Math.max(0, Math.min(100, Number(pedidosyaDiscountEl.value || 0)));
  pedidosyaDiscountEl.value = String(pedidosyaDiscountPct);
  renderCart();
});

function renderCart() {
  const cart = getCart();
  for (const sku of getSkus()) {
    const el = document.querySelector(`[data-qty="${sku}"]`);
    if (el) el.value = String(cart[sku] || 0);
  }

  const { subtotal, total, discountPct, discountAmount, garrapinadas } = getCheckoutTotals(cart, activeChannel);
  if (totalEl) totalEl.textContent = `$${money(subtotal)}`;
  if (summaryTitleEl) summaryTitleEl.textContent = activeChannel === "pedidosya" ? "Subtotal" : "Total";

  if (pedidosyaDiscountBoxEl) pedidosyaDiscountBoxEl.classList.toggle("hidden", activeChannel !== "pedidosya");
  if (pedidosyaDiscountAmountEl) pedidosyaDiscountAmountEl.textContent = `$${money(discountAmount)}`;
  if (pedidosyaFinalTotalEl) pedidosyaFinalTotalEl.textContent = `$${money(total)}`;
  if (pedidosyaDiscountEl && Number(pedidosyaDiscountEl.value || 0) !== discountPct) {
    pedidosyaDiscountEl.value = String(discountPct);
  }

  if (activeChannel === "presencial" && (cart.garrapinadas || 0) > 0 && garrapinadas.packs > 0) {
    const text = `Promo garrapiñadas: ${garrapinadas.packs}x(3 por $3000)` +
      (garrapinadas.rest ? ` + ${garrapinadas.rest} suelta(s)` : "") +
      (garrapinadas.savings > 0 ? ` · Ahorras $${money(garrapinadas.savings)}` : "");
    if (promoLineEl) promoLineEl.textContent = text;
  } else if (promoLineEl) {
    promoLineEl.textContent = "";
  }

  applyPayMode();
}

$("#btn-save")?.addEventListener("click", async () => {
  const cart = getCart();
  const { total } = getCheckoutTotals(cart, activeChannel);
  const mode = getPayMode();
  const saleDayKey = String(saleDateEl?.value || todayKey()).trim();

  if (!cartHasItems(cart)) return (saveMsgEl.textContent = "No hay productos cargados.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(saleDayKey)) return (saveMsgEl.textContent = "Fecha invalida.");
  if (mode === "peya" && activeChannel !== "pedidosya") return (saveMsgEl.textContent = "PeYa solo esta disponible en PedidosYa.");
  let cash = Number(cashEl?.value || 0);
  let transfer = Number(transferEl?.value || 0);
  let peya = 0;
  if (mode === "cash") {
    cash = total;
    transfer = 0;
    peya = 0;
  } else if (mode === "transfer") {
    cash = 0;
    transfer = total;
    peya = 0;
  } else if (mode === "peya") {
    cash = 0;
    transfer = 0;
    peya = total;
  } else if (cash + transfer !== total) {
    return (saveMsgEl.textContent = "En mixto, efectivo + transferencia debe dar exacto.");
  }

  const sale = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    dayKey: saleDayKey,
    time: nowTime(),
    channel: activeChannel,
    items: Object.entries(cart)
      .filter(([, q]) => Number(q) > 0)
      .map(([sku, q]) => ({ sku, qty: Number(q), unitPrice: getPrice(activeChannel, sku) })),
    totals: { total, cash, transfer, peya },
  };

  try {
    await insertSaleToDB(sale);
    try {
      sales = await loadSalesFromDB();
    } catch {
      sales.push(sale);
      saveListCache(LS_SALES_KEY, sales);
    }
    clearActiveCart();
    salesTodayExpanded = false;
    saveMsgEl.textContent = `Venta guardada (${formatDayKey(saleDayKey)}).`;
    renderAll();
  } catch (e) {
    console.error(e);
    saveMsgEl.textContent = `Error guardando en Supabase: ${e?.message || "sin detalle"}`;
  }
});

$("#btn-clear")?.addEventListener("click", () => {
  clearActiveCart();
  if (saveMsgEl) saveMsgEl.textContent = "";
  renderAll();
});

$("#btn-reset-day")?.addEventListener("click", async () => {
  if (!session?.user || !isAdmin) return alert("Solo admin puede reiniciar el dia.");
  const key = todayKey();
  try {
    await deleteDaySales(key);
    sales = await loadSalesFromDB();
    renderAll();
  } catch (e) {
    console.error(e);
    alert("Error reiniciando en Supabase.");
  }
});

$("#btn-undo")?.addEventListener("click", async () => {
  if (!session?.user || !isAdmin) return alert("Solo admin puede deshacer ventas.");
  const key = todayKey();
  const todayList = sales.filter((s) => s.dayKey === key);
  if (!todayList.length) return;

  const last = todayList.slice().sort((a, b) => a.time.localeCompare(b.time)).pop();
  try {
    await deleteSaleById(last.id);
    sales = await loadSalesFromDB();
    salesTodayExpanded = false;
    renderAll();
  } catch (e) {
    console.error(e);
    alert("Error deshaciendo en Supabase.");
  }
});

const salesByDay = (dayKey) => sales.filter((s) => s.dayKey === dayKey);
const salesToday = () => salesByDay(todayKey());
const monthKeyNow = () => todayKey().slice(0, 7);

function renderSaleCard(s) {
  const itemsText = s.items.map((it) => `${getLabel(it.sku)} x ${it.qty}`).join(" · ");
  const channelTag = s.channel ? ` · ${s.channel === "pedidosya" ? "PedidosYa" : "Presencial"}` : "";
  const peyaAmount = Number(s?.totals?.peya || 0);
  const payText =
    s.totals.cash > 0 && (s.totals.transfer > 0 || peyaAmount > 0)
      ? `Mixto ($${money(s.totals.cash)} + $${money(s.totals.transfer + peyaAmount)})`
      : s.totals.cash > 0
      ? `Efectivo ($${money(s.totals.cash)})`
      : peyaAmount > 0
      ? `PeYa ($${money(peyaAmount)})`
      : `Transferencia ($${money(s.totals.transfer)})`;

  return `
    <div class="sale" data-sale-id="${s.id}">
      <div class="sale-top">
        <div><strong>${s.time}</strong> <span class="muted tiny">· ${payText}${channelTag}</span></div>
        <div><strong>$${money(s.totals.total)}</strong></div>
      </div>
      <div class="sale-items">${itemsText}</div>
      <div class="actions" style="margin-top:8px;">
        <button class="btn ghost tinyBtn" data-edit-sale="${s.id}" type="button">Editar venta</button>
        <button class="btn danger ghost tinyBtn" data-delete-sale="${s.id}" type="button">Eliminar venta</button>
      </div>
    </div>
  `;
}

function calcTotalsForDay(dayKey) {
  const list = salesByDay(dayKey);
  let total = 0;
  let cash = 0;
  let transfer = 0;
  let peya = 0;
  const counts = {};
  for (const sku of getSkus()) counts[sku] = 0;

  for (const s of list) {
    total += Number(s?.totals?.total || 0);
    cash += Number(s?.totals?.cash || 0);
    transfer += Number(s?.totals?.transfer || 0);
    peya += Number(s?.totals?.peya || 0);
    for (const it of s.items || []) {
      if (counts[it.sku] == null) counts[it.sku] = 0;
      counts[it.sku] += Number(it.qty || 0);
    }
  }

  return { total, cash, transfer, peya, counts, list };
}

function renderSalesList() {
  if (!salesListEl) return;
  const list = salesToday().slice().reverse();
  if (!list.length) {
    salesListEl.innerHTML = `<div class="muted tiny">Todavia no hay ventas guardadas hoy.</div>`;
    if (salesMoreWrapEl) salesMoreWrapEl.classList.add("hidden");
    if (salesLessTopWrapEl) salesLessTopWrapEl.classList.add("hidden");
    return;
  }

  const visibleList = salesTodayExpanded ? list : list.slice(0, 1);
  salesListEl.innerHTML = visibleList.map(renderSaleCard).join("");
  const canExpand = list.length > 1;
  if (salesMoreWrapEl) salesMoreWrapEl.classList.remove("hidden");
  if (salesLessTopWrapEl) salesLessTopWrapEl.classList.toggle("hidden", !canExpand || !salesTodayExpanded);
  if (btnSalesMoreEl) {
    btnSalesMoreEl.textContent = salesTodayExpanded ? "Ver menos" : "Ver mas";
    btnSalesMoreEl.disabled = !canExpand;
  }
}

btnSalesMoreEl?.addEventListener("click", () => {
  salesTodayExpanded = !salesTodayExpanded;
  renderSalesList();
});
btnSalesLessTopEl?.addEventListener("click", () => {
  salesTodayExpanded = false;
  renderSalesList();
});

function renderCaja() {
  if (!kpiTotalEl || !kpiCashEl || !kpiTransferEl || !kpiPeyaEl) return;
  const day = todayKey();
  const { counts, list } = calcTotalsForDay(day);
  let cash = 0;
  let transfer = 0;
  let peya = 0;

  for (const s of list) {
    cash += Number(s?.totals?.cash || 0);
    transfer += Number(s?.totals?.transfer || 0);
    peya += Number(s?.totals?.peya || 0);
  }
  const baseTotal = cash + transfer + peya;
  const initial = Math.max(0, Number(cashInitialEl?.value || 0));
  const realCounted = Number(cashRealEl?.value || 0);
  const hasReal = Boolean(cashRealEl?.value);
  const realNet = realCounted - initial;
  const deltaPreview = realNet - cash;
  const savedAdjust = cashAdjustByDay[day];
  const hasSavedAdjust = savedAdjust != null && Number.isFinite(Number(savedAdjust.delta));
  const appliedDelta = hasSavedAdjust ? Number(savedAdjust.delta) : 0;
  const total = baseTotal + appliedDelta;

  if (cajaDateEl) cajaDateEl.textContent = `Caja - Fecha: ${formatDayKey(day)}`;
  kpiTotalEl.textContent = `$${money(total)}`;
  kpiCashEl.textContent = `$${money(cash)}`;
  kpiTransferEl.textContent = `$${money(transfer)}`;
  kpiPeyaEl.textContent = `$${money(peya)}`;
  if (kpiTotalNoteEl) {
    if (!hasSavedAdjust) {
      if (!hasReal) kpiTotalNoteEl.textContent = "Sin ajuste por caja real.";
      else if (deltaPreview === 0) kpiTotalNoteEl.textContent = "Diferencia calculada: OK (falta guardar).";
      else if (deltaPreview > 0) kpiTotalNoteEl.textContent = `Sobrante detectado: +$${money(deltaPreview)} (falta guardar).`;
      else kpiTotalNoteEl.textContent = `Faltante detectado: -$${money(Math.abs(deltaPreview))} (falta guardar).`;
    } else if (appliedDelta === 0) kpiTotalNoteEl.textContent = "Ajuste guardado: sin diferencia.";
    else if (appliedDelta > 0) kpiTotalNoteEl.textContent = `Ajuste guardado por sobrante: +$${money(appliedDelta)}`;
    else kpiTotalNoteEl.textContent = `Ajuste guardado por faltante: -$${money(Math.abs(appliedDelta))}`;
  }

  if (countsEl) {
    countsEl.innerHTML = Object.keys(counts)
      .map((sku) => `<div class="count"><div>${getLabel(sku)}</div><div><strong>${counts[sku]}</strong></div></div>`)
      .join("");
  }

  const real = Number(cashRealEl?.value || 0);
  if (!cashRealEl?.value) {
    if (cashDeltaEl) cashDeltaEl.textContent = "-";
    cashDeltaEl?.classList.remove("good", "bad");
    return;
  }

  const cashDelta = (real - initial) - cash;
  if (cashDelta === 0) {
    if (cashDeltaEl) cashDeltaEl.textContent = "OK";
    cashDeltaEl?.classList.add("good");
    cashDeltaEl?.classList.remove("bad");
  } else {
    const label = cashDelta < 0 ? "Faltante" : "Sobrante";
    if (cashDeltaEl) cashDeltaEl.textContent = `${label}: $${money(Math.abs(cashDelta))}`;
    cashDeltaEl?.classList.remove("good");
    cashDeltaEl?.classList.add("bad");
  }
}

function saveCashAdjustForToday() {
  const day = todayKey();
  const initial = Math.max(0, Number(cashInitialEl?.value || 0));
  if (!cashRealEl?.value) {
    setCashAdjustMsg("Ingresa el efectivo real contado para guardar.");
    return;
  }
  const real = Number(cashRealEl.value || 0);
  const { list } = calcTotalsForDay(day);
  let cash = 0;
  for (const s of list) cash += Number(s?.totals?.cash || 0);
  const delta = (real - initial) - cash;

  cashAdjustByDay[day] = { initial, real, delta, savedAt: new Date().toISOString() };
  saveObjectCache(LS_CASH_ADJUST_BY_DAY_KEY, cashAdjustByDay);
  setCashAdjustMsg("Ajuste guardado.");
  renderCaja();
}

cashInitialEl?.addEventListener("input", () => {
  setCashAdjustMsg("Cambios en caja real sin guardar.");
  renderCaja();
});
cashRealEl?.addEventListener("input", () => {
  setCashAdjustMsg("Cambios en caja real sin guardar.");
  renderCaja();
});
btnCashAdjustSaveEl?.addEventListener("click", saveCashAdjustForToday);

function renderTodaySummary() {
  const dk = todayKey();
  const { total, list } = calcTotalsForDay(dk);
  if (todayMetaEl) todayMetaEl.textContent = `Fecha: ${formatDayKey(dk)}`;
  if (todayTotalEl) todayTotalEl.textContent = `$${money(total)}`;
  if (todayCountEl) todayCountEl.textContent = String(list.length);
}

function renderMonthlySales() {
  if (!salesMonthInputEl || !monthTotalEl || !monthCashEl || !monthTransferEl || !monthPeyaEl) return;
  const month = String(salesMonthInputEl.value || monthKeyNow());
  if (!salesMonthInputEl.value) salesMonthInputEl.value = month;

  let cash = 0;
  let transfer = 0;
  let peya = 0;
  let qtyComun = 0;
  let qtyNegro = 0;
  let qtyBlanco = 0;
  for (const s of sales) {
    if (!String(s.dayKey || "").startsWith(`${month}-`)) continue;
    cash += Number(s?.totals?.cash || 0);
    transfer += Number(s?.totals?.transfer || 0);
    peya += Number(s?.totals?.peya || 0);
    for (const it of s.items || []) {
      const qty = Number(it?.qty || 0);
      if (it?.sku === "cubanito_comun") qtyComun += qty;
      if (it?.sku === "cubanito_negro") qtyNegro += qty;
      if (it?.sku === "cubanito_blanco") qtyBlanco += qty;
    }
  }
  const total = cash + transfer + peya;

  monthTotalEl.textContent = `$${money(total)}`;
  monthCashEl.textContent = `$${money(cash)}`;
  monthTransferEl.textContent = `$${money(transfer)}`;
  monthPeyaEl.textContent = `$${money(peya)}`;
  if (monthQtyComunEl) monthQtyComunEl.textContent = String(qtyComun);
  if (monthQtyNegroEl) monthQtyNegroEl.textContent = String(qtyNegro);
  if (monthQtyBlancoEl) monthQtyBlancoEl.textContent = String(qtyBlanco);
}

function renderCajaMonthly() {
  if (!cajaMonthInputEl || !cajaMonthTotalEl || !cajaMonthCashEl || !cajaMonthTransferEl || !cajaMonthPeyaEl) return;
  const month = String(cajaMonthInputEl.value || monthKeyNow());
  if (!cajaMonthInputEl.value) cajaMonthInputEl.value = month;

  let cashSales = 0;
  let transferSales = 0;
  let peyaSales = 0;
  for (const s of sales) {
    if (!String(s.dayKey || "").startsWith(`${month}-`)) continue;
    cashSales += Number(s?.totals?.cash || 0);
    transferSales += Number(s?.totals?.transfer || 0);
    peyaSales += Number(s?.totals?.peya || 0);
  }

  let cashExpenses = 0;
  let transferExpenses = 0;
  let peyaExpenses = 0;
  for (const e of expenses) {
    if (!String(e.date || "").startsWith(`${month}-`)) continue;
    const split = expenseSplitPayments(e);
    cashExpenses += Number(split.cash || 0);
    transferExpenses += Number(split.transfer || 0);
    peyaExpenses += Number(split.peya || 0);
  }

  const carry = carryoverByMonth[month] || { cash: 0, transfer: 0, peya: 0 };
  const peyaLiqAmount = peyaLiquidations
    .filter((x) => String(x.month) === month)
    .reduce((acc, x) => acc + Number(x.amount || 0), 0);
  const cash = Number(carry.cash || 0) + (cashSales - cashExpenses);
  const transfer = Number(carry.transfer || 0) + (transferSales - transferExpenses);
  const peya = Number(carry.peya || 0) + (peyaSales - peyaExpenses) + peyaLiqAmount;
  const total = cash + transfer + peya;

  cajaMonthTotalEl.textContent = `$${money(total)}`;
  cajaMonthCashEl.textContent = `$${money(cash)}`;
  cajaMonthTransferEl.textContent = `$${money(transfer)}`;
  cajaMonthPeyaEl.textContent = `$${money(peya)}`;
}

function syncCarryoverInputs() {
  const month = String(cajaMonthInputEl?.value || monthKeyNow());
  const carry = carryoverByMonth[month] || { cash: 0, transfer: 0, peya: 0 };
  if (carryoverCashEl) carryoverCashEl.value = String(Number(carry.cash || 0));
  if (carryoverTransferEl) carryoverTransferEl.value = String(Number(carry.transfer || 0));
  if (carryoverPeyaEl) carryoverPeyaEl.value = String(Number(carry.peya || 0));
}

function syncPeyaLiqInputs() {
  if (peyaLiqAmountEl) peyaLiqAmountEl.value = "";
  const fp = peyaLiqRangeEl?._flatpickr;
  if (fp) {
    fp.clear();
  } else if (peyaLiqRangeEl) {
    peyaLiqRangeEl.value = "";
  }
}

function renderPeyaLiqHistory() {
  if (!peyaLiqHistoryEl) return;
  const month = String(cajaMonthInputEl?.value || monthKeyNow());
  const rows = peyaLiquidations
    .filter((x) => String(x.month) === month)
    .slice()
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  if (!rows.length) {
    peyaLiqHistoryEl.innerHTML = `<div class="muted tiny">Todavia no hay liquidaciones PeYa para ${month}.</div>`;
    return;
  }

  peyaLiqHistoryEl.innerHTML = rows.map((r) => `
    <div class="sale">
      <div class="sale-top">
        <div><strong>${r.month}</strong> <span class="muted tiny">· ${formatDayKey(r.from)} a ${formatDayKey(r.to)}</span></div>
        <div><strong>$${money(r.amount)}</strong></div>
      </div>
    </div>
  `).join("");
}

function renderHistory() {
  if (!historyListEl) return;
  const existingDayKeys = Array.from(new Set(sales.map((s) => s.dayKey)));
  const dayKeys = buildContinuousDayKeys(existingDayKeys);

  if (!dayKeys.length) {
    historyListEl.innerHTML = `<div class="historyRow"><div><div><strong>${formatDayKey(todayKey())}</strong></div><div class="historyMeta">0 venta(s) · Efectivo $0 · Transf $0 · PeYa $0</div></div><div><strong>$0</strong></div></div>`;
    historyMoreWrapEl?.classList.add("hidden");
    historyLessTopWrapEl?.classList.add("hidden");
    historyMoreWrapBottomEl?.classList.add("hidden");
    return;
  }

  const visibleDayKeys = historyExpanded ? dayKeys : dayKeys.slice(0, 1);
  historyListEl.innerHTML = visibleDayKeys
    .map((dk) => {
      const { total, cash, transfer, list } = calcTotalsForDay(dk);
      const peya = list.reduce((acc, s) => acc + Number(s?.totals?.peya || 0), 0);
      return `<div class="historyRow" data-day="${dk}"><div><div><strong>${formatDayKey(dk)}</strong></div><div class="historyMeta">${list.length} venta(s) · Efectivo $${money(cash)} · Transf $${money(transfer)} · PeYa $${money(peya)}</div></div><div><strong>$${money(total)}</strong></div></div>`;
    })
    .join("");

  $$(".historyRow").forEach((row) => row.addEventListener("click", () => openHistoryDay(row.dataset.day)));
  const canExpand = dayKeys.length > 0;
  historyMoreWrapEl?.classList.toggle("hidden", !canExpand || historyExpanded);
  historyLessTopWrapEl?.classList.toggle("hidden", !canExpand || !historyExpanded);
  historyMoreWrapBottomEl?.classList.toggle("hidden", !canExpand || !historyExpanded);
  if (btnHistoryMoreEl) btnHistoryMoreEl.textContent = "Ver mas";
  if (btnHistoryMoreBottomEl) btnHistoryMoreBottomEl.textContent = "Ver menos";
}

function openHistoryDay(dayKey) {
  if (!historyDetailEl || !historyListEl) return;
  if (!dayKey) return;
  const { list } = calcTotalsForDay(dayKey);
  let cash = 0;
  let transfer = 0;
  let peya = 0;
  let qtyComun = 0;
  let qtyNegro = 0;
  let qtyBlanco = 0;
  for (const s of list) {
    cash += Number(s?.totals?.cash || 0);
    transfer += Number(s?.totals?.transfer || 0);
    peya += Number(s?.totals?.peya || 0);
    for (const it of s.items || []) {
      const qty = Number(it?.qty || 0);
      if (it?.sku === "cubanito_comun") qtyComun += qty;
      if (it?.sku === "cubanito_negro") qtyNegro += qty;
      if (it?.sku === "cubanito_blanco") qtyBlanco += qty;
    }
  }
  const total = cash + transfer + peya;

  if (historyTitleEl) historyTitleEl.textContent = `Historial - ${formatDayKey(dayKey)}`;
  if (histTotalEl) histTotalEl.textContent = `$${money(total)}`;
  if (histCashEl) histCashEl.textContent = `$${money(cash)}`;
  if (histTransferEl) histTransferEl.textContent = `$${money(transfer)}`;
  if (histPeyaEl) histPeyaEl.textContent = `$${money(peya)}`;
  if (histQtyComunEl) histQtyComunEl.textContent = String(qtyComun);
  if (histQtyNegroEl) histQtyNegroEl.textContent = String(qtyNegro);
  if (histQtyBlancoEl) histQtyBlancoEl.textContent = String(qtyBlanco);
  currentHistoryDayKey = dayKey;
  historyDaySalesExpanded = false;
  renderHistoryDaySales();

  historyDetailEl.classList.remove("hidden");
  historyListEl.classList.add("hidden");
  historyMoreWrapEl?.classList.add("hidden");
  historyLessTopWrapEl?.classList.add("hidden");
  historyMoreWrapBottomEl?.classList.add("hidden");
}

function renderHistoryDaySales() {
  if (!histSalesListEl) return;
  const dayList = salesByDay(currentHistoryDayKey).slice().reverse();
  if (!dayList.length) {
    histSalesListEl.innerHTML = `<div class="muted tiny">No hay ventas cargadas para este dia.</div>`;
    histSalesMoreWrapEl?.classList.add("hidden");
    return;
  }
  const visible = historyDaySalesExpanded ? dayList : dayList.slice(0, 1);
  histSalesListEl.innerHTML = visible.map(renderSaleCard).join("");
  const canExpand = dayList.length > 1;
  histSalesMoreWrapEl?.classList.toggle("hidden", !canExpand);
  if (btnHistSalesMoreEl) btnHistSalesMoreEl.textContent = historyDaySalesExpanded ? "Ver menos" : "Ver mas";
}

btnHistoryMoreEl?.addEventListener("click", () => {
  historyExpanded = !historyExpanded;
  renderHistory();
});
btnHistoryMoreBottomEl?.addEventListener("click", () => {
  historyExpanded = false;
  renderHistory();
});
btnHistoryLessTopEl?.addEventListener("click", () => {
  historyExpanded = false;
  renderHistory();
});
btnHistSalesMoreEl?.addEventListener("click", () => {
  historyDaySalesExpanded = !historyDaySalesExpanded;
  renderHistoryDaySales();
});

btnHistoryBack?.addEventListener("click", () => {
  historyDetailEl?.classList.add("hidden");
  historyListEl?.classList.remove("hidden");
  renderHistory();
});

function excelSerialFromYMD(y, m, d) {
  const utc = Date.UTC(y, m - 1, d);
  const epoch = Date.UTC(1899, 11, 30);
  return Math.floor((utc - epoch) / 86400000);
}

function excelSerialFromDayKey(dayKey) {
  const [y, m, d] = dayKey.split("-").map(Number);
  return excelSerialFromYMD(y, m, d);
}

function monthNameEsUpper(month) {
  const names = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
  ];
  return names[Number(month) - 1] || "";
}

function buildContinuousDayKeys(dayKeys) {
  if (!dayKeys.length) return [];
  const sortedAsc = dayKeys.slice().sort();
  const parse = (k) => {
    const [y, m, d] = String(k).split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const out = [];
  let cur = parse(sortedAsc[0]);
  const last = parse(sortedAsc[sortedAsc.length - 1]);
  while (cur <= last) {
    out.push(fmt(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out.sort().reverse();
}

function calcDayForTemplate(daySales) {
  const out = {
    comunes: 0,
    banados: 0,
    otro: 0,
    efectivo: 0,
    transferencia: 0,
    pedidosya: 0,
    ventasPresencial: 0,
  };

  for (const s of daySales) {
    const channel = s.channel || "presencial";
    for (const it of s.items || []) {
      if (it.sku === "cubanito_comun") out.comunes += Number(it.qty || 0);
      else if (it.sku === "cubanito_blanco" || it.sku === "cubanito_negro") out.banados += Number(it.qty || 0);
      else out.otro += Number(it.qty || 0);
    }

    if (channel === "pedidosya") {
      out.pedidosya += Number(s.totals?.total || 0);
    } else {
      out.efectivo += Number(s.totals?.cash || 0);
      out.transferencia += Number(s.totals?.transfer || 0);
      out.ventasPresencial += Number(s.totals?.total || 0);
    }
  }
  return out;
}

function calcMonthForTemplate(year, month) {
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}-`;
  const byDay = new Map();

  const monthly = {
    transferencia: 0,
    efectivo: 0,
    pedidosya: 0,
    total: 0,
    comunes: 0,
    banados: 0,
  };

  for (const s of sales) {
    if (!String(s.dayKey || "").startsWith(monthPrefix)) continue;
    if (!byDay.has(s.dayKey)) byDay.set(s.dayKey, []);
    byDay.get(s.dayKey).push(s);
  }

  for (const [dayKey, daySales] of byDay.entries()) {
    const d = calcDayForTemplate(daySales);
    monthly.transferencia += d.transferencia;
    monthly.efectivo += d.efectivo;
    monthly.pedidosya += d.pedidosya;
    monthly.total += d.ventasPresencial + d.pedidosya;
    monthly.comunes += d.comunes;
    monthly.banados += d.banados;
  }

  return { byDay, monthly };
}

function expensesByMonth(year, month) {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  return expenses.filter((e) => String(e.date || "").startsWith(prefix));
}

function expenseSplitPayments(e) {
  const amount = Number(e.amount || 0);
  const cash = Number(e.pay_cash || 0);
  const transfer = Number(e.pay_transfer || 0);
  const peya = Number(e.pay_peya || 0);

  if (e.method === "mixto") return { cash, transfer, peya };
  if (e.method === "efectivo") return { cash: amount, transfer: 0, peya: 0 };
  if (e.method === "transferencia") return { cash: 0, transfer: amount, peya: 0 };
  if (e.method === "peya") return { cash: 0, transfer: 0, peya: amount };
  return { cash, transfer, peya };
}

function setCellNumberPreserveStyle(ws, addr, value) {
  const n = Number(value || 0);
  if (ws[addr]) {
    // Si la celda tiene formula, no la pisamos (el Excel decide el calculo)
    if (ws[addr].f) return;
    ws[addr].t = "n";
    ws[addr].v = n;
    delete ws[addr].w;
    return;
  }
  ws[addr] = { t: "n", v: n };
}

$("#btn-export")?.addEventListener("click", async () => {
  const [year, month] = todayKey().split("-").map(Number);
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}-`;
  const monthSales = sales.filter((s) => String(s.dayKey || "").startsWith(monthPrefix));
  if (!monthSales.length) return alert("No hay ventas cargadas para este mes.");
  if (!window.XLSX) return alert("Falta libreria XLSX.");

  try {
    const monthName = monthNameEsUpper(month);
    const { byDay, monthly } = calcMonthForTemplate(year, month);
    const monthExpenses = expensesByMonth(year, month);

    const daysInMonth = new Date(year, month, 0).getDate();
    const rows = [];
    rows.push([`CUBANITOS PATAGONIA - VENTAS ${monthName} ${year}`]);
    rows.push([]);
    rows.push(["DIA", "COMUNES", "BAÑADOS", "OTRO", "EFECTIVO", "TRANSFERENCIA", "PEDIDOS YA", "VENTAS PRESENCIAL", "TOTAL DIA"]);

    for (let d = 1; d <= daysInMonth; d++) {
      const dayKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const daySales = byDay.get(dayKey) || [];
      const v = calcDayForTemplate(daySales);
      const totalDia = v.ventasPresencial + v.pedidosya;
      rows.push([
        dayKey,
        v.comunes,
        v.banados,
        v.otro,
        v.efectivo,
        v.transferencia,
        v.pedidosya,
        v.ventasPresencial,
        totalDia,
      ]);
    }

    rows.push([]);
    rows.push(["RESUMEN MENSUAL"]);
    rows.push(["Transferencia", monthly.transferencia]);
    rows.push(["Efectivo", monthly.efectivo]);
    rows.push(["PedidosYa", monthly.pedidosya]);
    rows.push(["Total mes", monthly.total]);
    rows.push([]);
    rows.push(["CONSUMO CUBANITOS"]);
    rows.push(["Comunes", monthly.comunes]);
    rows.push(["Bañados", monthly.banados]);

    // Hoja de gastos del mes
    const expenseRows = [];
    expenseRows.push([`CUBANITOS PATAGONIA - GASTOS ${monthName} ${year}`]);
    expenseRows.push([]);
    expenseRows.push([
      "FECHA",
      "ABONO",
      "RUBRO",
      "PROVEEDOR",
      "CANTIDAD",
      "DESCRIPCION",
      "$ c/IVA+Ing.Br",
      "EFECTIVO",
      "TRANSFERENCIA",
      "PEYA WALLET",
    ]);

    const orderedExpenses = monthExpenses
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    let expTotal = 0;
    let expCash = 0;
    let expTransfer = 0;
    let expPeya = 0;

    for (const e of orderedExpenses) {
      const split = expenseSplitPayments(e);
      const tax = Number(e.iva || 0) + Number(e.iibb || 0);
      const totalWithTax = Number(e.amount || 0) + tax;
      expTotal += totalWithTax;
      expCash += split.cash;
      expTransfer += split.transfer;
      expPeya += split.peya;

      expenseRows.push([
        formatDayKey(e.date),
        "C",
        e.description || "",
        e.provider || "",
        Number(e.qty || 0),
        e.description || "",
        totalWithTax,
        split.cash,
        split.transfer,
        split.peya,
      ]);
    }

    expenseRows.push([]);
    expenseRows.push(["RESUMEN GASTOS", "", "", "", "", "", expTotal, expCash, expTransfer, expPeya]);

    const ws = window.XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 13 },
      { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 12 },
    ];

    const wse = window.XLSX.utils.aoa_to_sheet(expenseRows);
    wse["!cols"] = [
      { wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 20 }, { wch: 10 },
      { wch: 55 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
    ];

    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, `VENTAS ${monthName}`);
    window.XLSX.utils.book_append_sheet(wb, wse, `GASTOS ${monthName}`);

    const out = window.XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CUBANITOS_VENTAS_${year}-${String(month).padStart(2, "0")}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
    alert(e?.message || "Error exportando Excel de plantilla.");
  }
});

function expensesCurrentMonth() {
  const [y, m] = todayKey().split("-").map(Number);
  const prefix = `${y}-${String(m).padStart(2, "0")}-`;
  return expenses.filter((e) => String(e.date || "").startsWith(prefix));
}

function paymentMethodLabel(method) {
  if (method === "transferencia") return "Transferencia";
  if (method === "peya") return "PeYa";
  if (method === "mixto") return "Mixto";
  return "Efectivo";
}

function safeExpenseDescription(text) {
  const raw = String(text || "").trim();
  if (raw.length <= MAX_EXPENSE_DESC_LEN) return { value: raw, trimmed: false };
  return { value: `${raw.slice(0, MAX_EXPENSE_DESC_LEN - 3)}...`, trimmed: true };
}

function renderExpenseMixedDiff() {
  if (!expenseMixedDiffEl) return;
  if (expenseMethodEl?.value !== "mixto") {
    expenseMixedDiffEl.textContent = "";
    return;
  }
  const total = getExpenseTotal();
  const cash = Number(expensePayCashEl?.value || 0);
  const transfer = Number(expensePayTransferEl?.value || 0);
  const peya = Number(expensePayPeyaEl?.value || 0);
  const diff = cash + transfer + peya - total;
  if (Math.abs(diff) < 0.01) {
    expenseMixedDiffEl.textContent = "OK";
  } else {
    const lbl = diff < 0 ? "Falta" : "Sobra";
    expenseMixedDiffEl.textContent = `${lbl}: $${money(Math.abs(diff))}`;
  }
}

function addCurrentExpenseItem() {
  const description = String(expenseDescEl?.value || "").trim();
  const directMode = getExpenseInputMode() === "direct";
  const qty = directMode ? 1 : Math.max(0, Number(expenseQtyEl?.value || 0));
  const unitPrice = directMode
    ? Math.max(0, Number(expenseDirectAmountEl?.value || 0))
    : Math.max(0, Number(expenseUnitPriceEl?.value || 0));
  const amount = directMode ? unitPrice : qty * unitPrice;

  if (!description || description === ADD_NEW_SELECT_VALUE) {
    setExpenseMsg("Selecciona descripcion.");
    return false;
  }
  if (unitPrice <= 0) {
    setExpenseMsg(directMode ? "Ingresa un monto mayor a 0." : "Ingresa un precio unidad mayor a 0.");
    return false;
  }
  if (qty <= 0) {
    setExpenseMsg("Ingresa una cantidad mayor a 0.");
    return false;
  }

  expenseDraftItems.push({ description, qty, unitPrice, amount });
  if (expenseUnitPriceEl) expenseUnitPriceEl.value = "";
  if (expenseQtyEl) expenseQtyEl.value = "";
  if (expenseDirectAmountEl) expenseDirectAmountEl.value = "";
  if (expenseDescEl && expenseDescEl.options.length) expenseDescEl.selectedIndex = 0;
  setExpenseMsg("Item agregado.");
  renderExpenseTotals();
  renderExpenseMixedDiff();
  return true;
}

function renderExpenses() {
  if (!expenseListEl || !expenseKpiTotalEl || !expenseKpiCountEl) return;
  const monthList = expensesCurrentMonth();
  const total = monthList.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const list = expenses
    .slice()
    .sort((a, b) => {
      const d = String(b.date).localeCompare(String(a.date));
      if (d !== 0) return d;
      return String(b.id || "").localeCompare(String(a.id || ""));
    });

  expenseKpiTotalEl.textContent = `$${money(total)}`;
  expenseKpiCountEl.textContent = String(monthList.length);

  expenseListEl.innerHTML = list.length
    ? list.map((e) => `
      <div class="sale" data-expense-id="${e.id}">
        <div class="sale-top">
          <div><strong>${formatDayKey(e.date)}</strong> <span class="muted tiny">· ${e.provider} · ${paymentMethodLabel(e.method)}</span></div>
          <div><strong>$${money(e.amount)}</strong></div>
        </div>
        <div class="sale-items">${e.description}${
          e.method==="mixto" ? ` · Mix: Ef $${money(e.pay_cash)} / Tr $${money(e.pay_transfer)} / PeYa $${money(e.pay_peya)}` : ""
        }</div>
        <div class="actions" style="margin-top:8px;">
          <button class="btn ghost tinyBtn" data-edit-expense="${e.id}" type="button">Editar gasto</button>
          <button class="btn danger ghost tinyBtn" data-delete-expense="${e.id}" type="button">Eliminar gasto</button>
        </div>
      </div>
    `).join("")
    : `<div class="muted tiny">Todavia no hay gastos cargados este mes.</div>`;
}

document.addEventListener("click", async (e) => {
  const editSaleBtn = e.target.closest("[data-edit-sale]");
  if (editSaleBtn) {
    if (!session?.user || !isAdmin) return alert("Solo admin puede editar ventas.");
    const id = editSaleBtn.getAttribute("data-edit-sale");
    const sale = sales.find((x) => String(x.id) === String(id));
    if (!sale) return;

    const nextChannelRaw = prompt("Canal (presencial/pedidosya):", String(sale.channel || "presencial"));
    if (nextChannelRaw == null) return;
    const nextChannel = String(nextChannelRaw).trim().toLowerCase();
    if (!["presencial", "pedidosya"].includes(nextChannel)) return alert("Canal invalido.");
    const nextItems = [];
    for (const it of sale.items || []) {
      const qtyRaw = prompt(`Cantidad para ${getLabel(it.sku)}:`, String(Number(it.qty || 0)));
      if (qtyRaw == null) return;
      const qty = Math.max(0, Number(qtyRaw || 0));
      if (!Number.isFinite(qty)) return alert("Cantidad invalida.");
      if (qty <= 0) continue;
      nextItems.push({ ...it, qty });
    }
    if (!nextItems.length) return alert("La venta debe tener al menos 1 item con cantidad mayor a 0.");

    const total = nextItems.reduce((acc, it) => acc + Number(it.qty || 0) * Number(it.unitPrice || 0), 0);
    const defaultMethod = Number(sale.totals?.cash || 0) > 0 && (Number(sale.totals?.transfer || 0) > 0 || Number(sale.totals?.peya || 0) > 0)
      ? "mixto"
      : Number(sale.totals?.cash || 0) > 0
      ? "efectivo"
      : Number(sale.totals?.peya || 0) > 0
      ? "peya"
      : "transferencia";
    const payMethodRaw = prompt("Metodo de pago (efectivo/transferencia/peya/mixto):", defaultMethod);
    if (payMethodRaw == null) return;
    const payMethod = String(payMethodRaw).trim().toLowerCase();
    if (!["efectivo", "transferencia", "peya", "mixto"].includes(payMethod)) return alert("Metodo invalido.");

    let nextCash = 0;
    let nextTransfer = 0;
    let nextPeya = 0;
    if (payMethod === "efectivo") {
      nextCash = total;
      nextTransfer = 0;
      nextPeya = 0;
    } else if (payMethod === "transferencia") {
      nextCash = 0;
      nextTransfer = total;
      nextPeya = 0;
    } else if (payMethod === "peya") {
      nextCash = 0;
      nextTransfer = 0;
      nextPeya = total;
    } else {
      const nextCashRaw = prompt("Mixto - Efectivo:", String(Number(sale.totals?.cash || 0)));
      if (nextCashRaw == null) return;
      const nextTransferRaw = prompt("Mixto - Transferencia:", String(Number(sale.totals?.transfer || 0)));
      if (nextTransferRaw == null) return;
      const nextPeyaRaw = prompt("Mixto - PeYa:", String(Number(sale.totals?.peya || 0)));
      if (nextPeyaRaw == null) return;
      nextCash = Math.max(0, Number(nextCashRaw || 0));
      nextTransfer = Math.max(0, Number(nextTransferRaw || 0));
      nextPeya = Math.max(0, Number(nextPeyaRaw || 0));
      if (!Number.isFinite(nextCash) || !Number.isFinite(nextTransfer) || !Number.isFinite(nextPeya)) return alert("Monto invalido.");
      if (Math.abs(nextCash + nextTransfer + nextPeya - total) > 0.01) return alert("En mixto, la suma debe dar el total.");
    }

    const updated = {
      ...sale,
      channel: nextChannel,
      items: nextItems,
      totals: { ...sale.totals, total, cash: nextCash, transfer: nextTransfer, peya: nextPeya },
    };
    try {
      await updateSaleInDB(updated);
      sales = sales.map((x) => (String(x.id) === String(updated.id) ? updated : x));
      saveListCache(LS_SALES_KEY, sales);
      renderAll();
      alert("Venta editada correctamente.");
    } catch (err) {
      console.error(err);
      alert(`Error editando venta: ${err?.message || "sin detalle"}`);
    }
    return;
  }

  const saleBtn = e.target.closest("[data-delete-sale]");
  if (saleBtn) {
    if (!session?.user || !isAdmin) return alert("Solo admin puede eliminar ventas.");
    const id = saleBtn.getAttribute("data-delete-sale");
    if (!id) return;
    const sale = sales.find((s) => String(s.id) === String(id));
    const saleTotal = Number(sale?.totals?.total || 0);
    const ok = confirm(`¿Confirmas eliminar esta venta${sale ? ` de $${money(saleTotal)}` : ""}?\nEsta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      await deleteSaleById(id);
      sales = await loadSalesFromDB();
      salesTodayExpanded = false;
      renderAll();
      alert("Venta eliminada correctamente.");
    } catch (err) {
      console.error(err);
      alert(`Error eliminando venta: ${err?.message || "sin detalle"}`);
    }
    return;
  }

  const editExpenseBtn = e.target.closest("[data-edit-expense]");
  if (editExpenseBtn) {
    if (!session?.user || !isAdmin) return alert("Solo admin puede editar gastos.");
    const id = editExpenseBtn.getAttribute("data-edit-expense");
    const exp = expenses.find((x) => String(x.id) === String(id));
    if (!exp) return;

    const nextDate = prompt("Fecha (YYYY-MM-DD):", String(exp.date || ""));
    if (nextDate == null) return;
    const nextProvider = prompt("Proveedor:", String(exp.provider || ""));
    if (nextProvider == null) return;
    const nextDescription = prompt("Descripcion:", String(exp.description || ""));
    if (nextDescription == null) return;
    const nextQtyRaw = prompt("Cantidad total:", String(Number(exp.qty || 0)));
    if (nextQtyRaw == null) return;
    const nextAmountRaw = prompt("Monto total:", String(Number(exp.amount || 0)));
    if (nextAmountRaw == null) return;
    const nextMethodRaw = prompt("Metodo (efectivo/transferencia/peya/mixto):", String(exp.method || "efectivo"));
    if (nextMethodRaw == null) return;

    const nextQty = Math.max(0, Number(nextQtyRaw || 0));
    const nextAmount = Math.max(0, Number(nextAmountRaw || 0));
    const nextMethod = String(nextMethodRaw).trim().toLowerCase();
    if (!nextDate.trim()) return alert("Fecha invalida.");
    if (!nextProvider.trim()) return alert("Proveedor invalido.");
    if (!nextDescription.trim()) return alert("Descripcion invalida.");
    if (!Number.isFinite(nextQty) || nextQty <= 0) return alert("Cantidad invalida.");
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) return alert("Monto invalido.");
    if (!["efectivo", "transferencia", "peya", "mixto"].includes(nextMethod)) return alert("Metodo invalido.");

    let payCash = 0;
    let payTransfer = 0;
    let payPeya = 0;
    if (nextMethod === "efectivo") payCash = nextAmount;
    else if (nextMethod === "transferencia") payTransfer = nextAmount;
    else if (nextMethod === "peya") payPeya = nextAmount;
    else {
      const cashRaw = prompt("Mixto - Efectivo:", String(Number(exp.pay_cash || 0)));
      if (cashRaw == null) return;
      const transferRaw = prompt("Mixto - Transferencia:", String(Number(exp.pay_transfer || 0)));
      if (transferRaw == null) return;
      const peyaRaw = prompt("Mixto - PeYa:", String(Number(exp.pay_peya || 0)));
      if (peyaRaw == null) return;
      payCash = Math.max(0, Number(cashRaw || 0));
      payTransfer = Math.max(0, Number(transferRaw || 0));
      payPeya = Math.max(0, Number(peyaRaw || 0));
      if (!Number.isFinite(payCash) || !Number.isFinite(payTransfer) || !Number.isFinite(payPeya)) return alert("Montos mixtos invalidos.");
      if (Math.abs(payCash + payTransfer + payPeya - nextAmount) > 0.01) return alert("En mixto, la suma debe dar el monto total.");
    }

    const updated = {
      ...exp,
      date: nextDate.trim(),
      provider: nextProvider.trim().toUpperCase(),
      description: safeExpenseDescription(nextDescription.trim().toUpperCase()).value,
      qty: nextQty,
      amount: nextAmount,
      method: nextMethod,
      pay_cash: payCash,
      pay_transfer: payTransfer,
      pay_peya: payPeya,
    };

    try {
      await updateExpenseInDB(updated);
      expenses = expenses.map((x) => (String(x.id) === String(updated.id) ? updated : x));
      saveListCache(LS_EXPENSES_KEY, expenses);
      renderAll();
      alert("Gasto editado correctamente.");
    } catch (err) {
      console.error(err);
      alert(`Error editando gasto: ${err?.message || "sin detalle"}`);
    }
    return;
  }

  const expenseBtn = e.target.closest("[data-delete-expense]");
  if (expenseBtn) {
    if (!session?.user || !isAdmin) return alert("Solo admin puede eliminar gastos.");
    const id = expenseBtn.getAttribute("data-delete-expense");
    if (!id) return;
    const expense = expenses.find((x) => String(x.id) === String(id));
    const expenseAmount = Number(expense?.amount || 0);
    const ok = confirm(`¿Confirmas eliminar este gasto${expense ? ` de $${money(expenseAmount)}` : ""}?\nEsta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      await deleteExpenseById(id);
      expenses = await loadExpensesFromDB();
      renderAll();
      alert("Gasto eliminado correctamente.");
    } catch (err) {
      console.error(err);
      alert(`Error eliminando gasto: ${err?.message || "sin detalle"}`);
    }
  }
});

btnExpenseAdd?.addEventListener("click", () => {
  if (expenseFormWrapEl) expenseFormWrapEl.classList.toggle("hidden");
  setExpenseMsg("");
});

btnExpenseCancel?.addEventListener("click", () => {
  if (expenseFormWrapEl) expenseFormWrapEl.classList.add("hidden");
  resetExpenseForm();
  setExpenseMsg("");
});

expenseMethodEl?.addEventListener("change", () => {
  const isMixed = expenseMethodEl.value === "mixto";
  if (expenseMixedWrapEl) expenseMixedWrapEl.classList.toggle("hidden", !isMixed);
  renderExpenseMixedDiff();
});
expenseUnitPriceEl?.addEventListener("input", () => {
  renderExpenseTotals();
  renderExpenseMixedDiff();
});
expenseQtyEl?.addEventListener("input", () => {
  renderExpenseTotals();
  renderExpenseMixedDiff();
});
expenseDirectAmountEl?.addEventListener("input", () => {
  renderExpenseTotals();
  renderExpenseMixedDiff();
});
expensePayCashEl?.addEventListener("input", renderExpenseMixedDiff);
expensePayTransferEl?.addEventListener("input", renderExpenseMixedDiff);
expensePayPeyaEl?.addEventListener("input", renderExpenseMixedDiff);

expenseProviderEl?.addEventListener("change", () => {
  if (expenseProviderEl.value === ADD_NEW_SELECT_VALUE) {
    const added = addExpenseSelectOption("provider");
    if (!added && expenseProviders.length) expenseProviderEl.value = expenseProviders[0];
  }
  applyExpenseProviderRules();
  renderExpenseTotals();
  renderExpenseMixedDiff();
});

expenseDescEl?.addEventListener("change", () => {
  if (expenseDescEl.value !== ADD_NEW_SELECT_VALUE) return;
  const added = addExpenseSelectOption("description");
  if (!added && expenseDescriptions.length) expenseDescEl.value = expenseDescriptions[0];
  renderExpenseTotals();
  renderExpenseMixedDiff();
});

btnExpenseAddItem?.addEventListener("click", () => {
  addCurrentExpenseItem();
});

btnExpenseSave?.addEventListener("click", async () => {
  if (!session?.user) return setExpenseMsg("Inicia sesion para guardar gastos.");
  if (!isAdmin) return setExpenseMsg("Solo admin puede guardar gastos.");
  const date = String(expenseDateEl?.value || "").trim();
  const provider = String(expenseProviderEl?.value || "").trim();
  const providerRule = getExpenseProviderRule();
  const directMode = getExpenseInputMode() === "direct";
  const currentDescription = String(expenseDescEl?.value || "").trim();
  const currentQty = directMode ? 1 : Math.max(0, Number(expenseQtyEl?.value || 0));
  const currentUnitPrice = directMode
    ? Math.max(0, Number(expenseDirectAmountEl?.value || 0))
    : Math.max(0, Number(expenseUnitPriceEl?.value || 0));
  const currentAmount = directMode ? currentUnitPrice : currentQty * currentUnitPrice;
  const method = String(expenseMethodEl?.value || "efectivo");
  const payCash = Math.max(0, Number(expensePayCashEl?.value || 0));
  const payTransfer = Math.max(0, Number(expensePayTransferEl?.value || 0));
  const payPeya = Math.max(0, Number(expensePayPeyaEl?.value || 0));
  const settlementRange = getSettlementRange();

  const items = [...expenseDraftItems];
  if (currentAmount > 0 && currentDescription && currentDescription !== ADD_NEW_SELECT_VALUE) {
    items.push({
      description: currentDescription,
      qty: currentQty,
      unitPrice: currentUnitPrice,
      amount: currentAmount,
    });
  }
  const amount = items.reduce((acc, it) => acc + Number(it.amount || 0), 0);
  const qty = items.reduce((acc, it) => acc + Number(it.qty || 0), 0);
  const baseDescription = items
    .map((it) => (directMode ? `${it.description} $${money(it.amount)}` : `${it.description} x${it.qty} a $${money(it.unitPrice)}`))
    .join(" + ");
  const fullDescription = providerRule?.settlement && settlementRange
    ? `[${formatDayKey(settlementRange.from)} a ${formatDayKey(settlementRange.to)}] ${baseDescription}`
    : baseDescription;
  const { value: description, trimmed: descriptionTrimmed } = safeExpenseDescription(fullDescription);

  if (!date) return setExpenseMsg("Completa la fecha.");
  if (!provider || provider === ADD_NEW_SELECT_VALUE) return setExpenseMsg("Selecciona proveedor.");
  if (providerRule?.settlement) {
    if (!settlementRange) return setExpenseMsg("Selecciona el rango de fechas a liquidar.");
  }
  if (!items.length) return setExpenseMsg("Agrega al menos un item al gasto.");
  if (!description) return setExpenseMsg("Completa descripcion de items.");
  if (method === "mixto") {
    const sum = payCash + payTransfer + payPeya;
    if (Math.abs(sum - amount) > 0.01) return setExpenseMsg("En mixto, efectivo + transferencia + PeYa debe dar el monto total.");
  }

  const expense = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    date,
    provider,
    qty,
    description,
    iva: 0,
    iibb: 0,
    amount,
    method,
    pay_cash: method === "mixto" ? payCash : method === "efectivo" ? amount : 0,
    pay_transfer: method === "mixto" ? payTransfer : method === "transferencia" ? amount : 0,
    pay_peya: method === "mixto" ? payPeya : method === "peya" ? amount : 0,
  };

  try {
    await insertExpenseToDB(expense);
    try {
      expenses = await loadExpensesFromDB();
    } catch {
      expenses.push(expense);
      saveListCache(LS_EXPENSES_KEY, expenses);
    }
    renderExpenses();
    setExpenseMsg(`Gasto guardado. Total: $${money(amount)}${descriptionTrimmed ? " (descripcion resumida)" : ""}`);
    resetExpenseForm();
    if (expenseFormWrapEl) expenseFormWrapEl.classList.remove("hidden");
    renderAll();
  } catch (e) {
    console.error(e);
    setExpenseMsg(`Error guardando gasto: ${e?.message || "sin detalle"}`);
  }
});

salesMonthInputEl?.addEventListener("change", renderMonthlySales);
cajaMonthInputEl?.addEventListener("change", () => {
  syncCarryoverInputs();
  syncPeyaLiqInputs();
  renderCajaMonthly();
  renderPeyaLiqHistory();
});
btnCarryoverSaveEl?.addEventListener("click", () => {
  const month = String(cajaMonthInputEl?.value || monthKeyNow());
  const cash = Math.max(0, Number(carryoverCashEl?.value || 0));
  const transfer = Math.max(0, Number(carryoverTransferEl?.value || 0));
  const peya = Math.max(0, Number(carryoverPeyaEl?.value || 0));
  carryoverByMonth[month] = { cash, transfer, peya };
  saveObjectCache(LS_CARRYOVER_BY_MONTH_KEY, carryoverByMonth);
  setCarryoverMsg(`Caja sobrante guardada para ${month}.`);
  renderCajaMonthly();
});
btnPeyaLiqSaveEl?.addEventListener("click", () => {
  savePeyaLiquidation();
});

async function savePeyaLiquidation() {
  const month = String(cajaMonthInputEl?.value || monthKeyNow());
  const range = getPeyaLiqRange();
  if (!range) {
    setPeyaLiqMsg("Selecciona rango de fechas (desde/hasta).");
    return;
  }
  const amount = Math.max(0, Number(peyaLiqAmountEl?.value || 0));
  const row = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    month,
    from: range.from,
    to: range.to,
    amount,
    created_at: new Date().toISOString(),
  };

  try {
    await insertPeyaLiquidationToDB(row);
    peyaLiquidations = await loadPeyaLiquidationsFromDB();
  } catch (e) {
    if (String(e?.message || "") !== "missing_peya_liq_table") console.error(e);
    peyaLiquidations.push(row);
    saveListCache(LS_PEYA_LIQ_LIST_KEY, peyaLiquidations);
  }

  setPeyaLiqMsg(`Liquidacion PeYa guardada para ${month} (rango ${formatDayKey(range.from)} a ${formatDayKey(range.to)}).`);
  renderCajaMonthly();
  renderPeyaLiqHistory();
  syncPeyaLiqInputs();
}

function renderAll() {
  renderProductsGrid();
  renderCart();
  renderSalesList();
  renderCaja();
  renderTodaySummary();
  renderMonthlySales();
  renderCajaMonthly();
  renderPeyaLiqHistory();
  renderExpenses();
  renderEdit();
  if (historyListEl && !historyListEl.classList.contains("hidden")) renderHistory();
}

(async function init() {
  try {
    try { forceGuestMode = localStorage.getItem(FORCE_GUEST_KEY) === "1"; } catch {}
    try { hasPeyaLiqTable = localStorage.getItem(LS_HAS_PEYA_LIQ_TABLE_KEY) !== "0"; } catch {}
    cashAdjustByDay = loadObjectCache(LS_CASH_ADJUST_BY_DAY_KEY);
    carryoverByMonth = loadObjectCache(LS_CARRYOVER_BY_MONTH_KEY);
    peyaLiquidations = loadListCache(LS_PEYA_LIQ_LIST_KEY);
    initSettlementRangePicker();
    initPeyaLiquidationRangePicker();
    expenseProviders = loadDynamicList(EXPENSE_PROVIDERS, LS_EXPENSE_PROVIDERS_KEY);
    expenseProviders = sanitizeProviderList(expenseProviders);
    expenseDescriptions = loadDynamicList(EXPENSE_DESCRIPTIONS, LS_EXPENSE_DESCRIPTIONS_KEY);
    refreshExpenseSelects();
    resetExpenseForm();

    await applyAuthState();

    const dbProducts = await loadProductsFromDB();
    if (dbProducts && dbProducts.length) {
      products = dbProducts;
    } else {
      products = structuredClone(DEFAULT_PRODUCTS);
      if (isAdmin && dbProducts && dbProducts.length === 0) {
        for (const p of products) await upsertProductToDB(p);
      }
    }

    sales = await loadSalesFromDB();
    expenses = await loadExpensesFromDB();
    peyaLiquidations = await loadPeyaLiquidationsFromDB();
    if (saleDateEl) saleDateEl.value = todayKey();
    if (cajaMonthInputEl) cajaMonthInputEl.value = monthKeyNow();
    syncCarryoverInputs();
    syncPeyaLiqInputs();
    const todayAdjust = cashAdjustByDay[todayKey()];
    if (todayAdjust) {
      if (cashInitialEl) cashInitialEl.value = String(Number(todayAdjust.initial || 0));
      if (cashRealEl) cashRealEl.value = String(Number(todayAdjust.real || 0));
      setCashAdjustMsg("Ajuste de caja real cargado.");
    }
    ensureCartKeys();
    setActiveChannel("presencial");
    let initialTab = "cobrar";
    try { initialTab = localStorage.getItem(ACTIVE_TAB_KEY) || "cobrar"; } catch {}
    goTo(initialTab);
    renderAll();

    window.supabase.auth.onAuthStateChange(async (_event, newSession) => {
      session = newSession;
      await applyAuthState();
      sales = await loadSalesFromDB();
      expenses = await loadExpensesFromDB();
      peyaLiquidations = await loadPeyaLiquidationsFromDB();
      const dbProductsReload = await loadProductsFromDB();
      if (dbProductsReload?.length) {
        products = dbProductsReload;
        ensureCartKeys();
      }
      renderAll();
    });
  } catch (e) {
    console.error(e);
    setAuthMsg("Error inicializando la app.");
  }
})();
