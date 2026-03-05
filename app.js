// =====================================================
// Cubanitos Patagonia - Supabase only
// - Ventas, productos y precios guardados en Supabase
// - Admin por auth + tabla admins
// =====================================================

const DEFAULT_PRODUCTS = [
  { sku: "cubanito_comun", name: "Cubanito comun", unit: "Unidad", prices: { presencial: 1000, pedidosya: 1300 } },
  { sku: "cubanito_blanco", name: "Cubanito choco blanco", unit: "Unidad", prices: { presencial: 1300, pedidosya: 1900 } },
  { sku: "cubanito_negro", name: "Cubanito choco negro", unit: "Unidad", prices: { presencial: 1300, pedidosya: 1900 } },
  { sku: "garrapinadas", name: "Garrapinadas", unit: "Bolsa", prices: { presencial: 1200, pedidosya: 1600 } },
];

const ADMIN_CODE_EMAIL = "admin@cubanitos.app";

let products = [];
let sales = [];
let expenses = [];
let session = null;
let isAdmin = false;
let activeChannel = "presencial";
let activeTab = "cobrar";
let cartByChannel = { presencial: {}, pedidosya: {} };

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
const diffEl = $("#diff");
const mixedArea = $("#mixed-area");
const salesListEl = $("#sales-list");
const kpiTotalEl = $("#kpi-total");
const kpiCashEl = $("#kpi-cash");
const kpiTransferEl = $("#kpi-transfer");
const countsEl = $("#counts");
const cashRealEl = $("#cash-real");
const cashDeltaEl = $("#cash-delta");
const todayMetaEl = $("#today-meta");
const todayTotalEl = $("#today-total");
const todayCountEl = $("#today-count");
const historyListEl = $("#history-list");
const historyDetailEl = $("#history-detail");
const historyTitleEl = $("#history-title");
const histTotalEl = $("#hist-total");
const histCashEl = $("#hist-cash");
const histTransferEl = $("#hist-transfer");
const histCountsEl = $("#hist-counts");
const histSalesEl = $("#hist-sales");
const btnHistoryBack = $("#btn-history-back");
const productsGridEl = $("#products-grid");

// Gastos UI
const btnExpenseAdd = $("#btn-expense-add");
const expenseFormWrapEl = $("#expense-form-wrap");
const expenseDateEl = $("#expense-date");
const expenseProviderEl = $("#expense-provider");
const expenseQtyEl = $("#expense-qty");
const expenseDescEl = $("#expense-desc");
const expenseTaxEl = $("#expense-tax");
const expenseAmountEl = $("#expense-amount");
const expenseMethodEl = $("#expense-method");
const expenseMixedWrapEl = $("#expense-mixed-wrap");
const expensePayCashEl = $("#expense-pay-cash");
const expensePayTransferEl = $("#expense-pay-transfer");
const expensePayPeyaEl = $("#expense-pay-peya");
const expenseMixedDiffEl = $("#expense-mixed-diff");
const btnExpenseSave = $("#btn-expense-save");
const btnExpenseCancel = $("#btn-expense-cancel");
const expenseMsgEl = $("#expense-msg");
const expenseListEl = $("#expense-list");
const expenseKpiTotalEl = $("#expense-kpi-total");
const expenseKpiCountEl = $("#expense-kpi-count");

const EXPENSE_PROVIDERS = ["MAXI", "MATIAS", "PEDIDO YA", "GARRAFAS", "JULIA", "LUGONES"];
const EXPENSE_DESCRIPTIONS = [
  "CUBANITO BAÑADO",
  "CUBANITO COMUN",
  "DULCE DE LECHE",
  "PLAGAS",
  "EXTRACCION",
  "GARRAFA",
  "GASTOS DE COMISION",
];

const authCodeEl = $("#auth-code");
const btnLoginCode = $("#btn-login-code");
const btnLogin = $("#btn-login");
const btnLogout = $("#btn-logout");
const authEmailEl = $("#auth-email");
const authPassEl = $("#auth-pass");
const emailArea = $("#email-area");
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
  return products.map((p) => p.sku);
}
function getProduct(sku) {
  return products.find((p) => p.sku === sku) || null;
}
function getPrice(channel, sku) {
  return Number(getProduct(sku)?.prices?.[channel] ?? 0);
}
function getLabel(sku) {
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

function fillSelectOptions(selectEl, list) {
  if (!selectEl) return;
  selectEl.innerHTML = list.map((v) => `<option value="${v}">${v}</option>`).join("");
}

function resetExpenseForm() {
  if (expenseDateEl) expenseDateEl.value = todayKey();
  if (expenseProviderEl && expenseProviderEl.options.length) expenseProviderEl.selectedIndex = 0;
  if (expenseQtyEl) expenseQtyEl.value = "";
  if (expenseDescEl && expenseDescEl.options.length) expenseDescEl.selectedIndex = 0;
  if (expenseTaxEl) expenseTaxEl.value = "";
  if (expenseAmountEl) expenseAmountEl.value = "";
  if (expenseMethodEl) expenseMethodEl.value = "efectivo";
  if (expensePayCashEl) expensePayCashEl.value = "";
  if (expensePayTransferEl) expensePayTransferEl.value = "";
  if (expensePayPeyaEl) expensePayPeyaEl.value = "";
  if (expenseMixedWrapEl) expenseMixedWrapEl.classList.add("hidden");
  if (expenseMixedDiffEl) expenseMixedDiffEl.textContent = "";
}

async function loadProductsFromDB() {
  const { data, error } = await window.supabase
    .from("products")
    .select("sku,name,unit,price_presencial,price_pedidosya,created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return null;
  }

  const list = (data || []).map((r) => ({
    sku: String(r.sku || "").trim(),
    name: String(r.name || r.sku),
    unit: String(r.unit || "Unidad"),
    prices: {
      presencial: Number(r.price_presencial || 0),
      pedidosya: Number(r.price_pedidosya || 0),
    },
  })).filter((p) => !!p.sku);
  const preferred = ["cubanito_comun", "cubanito_blanco", "cubanito_negro", "garrapinadas"];
  list.sort((a, b) => {
    const ia = preferred.indexOf(a.sku);
    const ib = preferred.indexOf(b.sku);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.name.localeCompare(b.name, "es");
  });
  return list;
}

async function upsertProductToDB(p) {
  const payload = {
    sku: p.sku,
    name: p.name,
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
    return [];
  }

  return (data || []).map((r) => ({
    id: r.id,
    dayKey: String(r.day),
    time: r.time,
    channel: r.channel || "presencial",
    items: r.items || [],
    totals: { total: Number(r.total), cash: Number(r.cash), transfer: Number(r.transfer) },
  }));
}

async function loadExpensesFromDB() {
  const { data, error } = await window.supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return (data || []).map((r) => ({
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
  let { error } = await window.supabase.from("expenses").insert(payload);
  if (!error) return;
  // compatibilidad: si la tabla no tiene columnas de split, reintenta sin ellas
  if (String(error.message || "").toLowerCase().includes("pay_")) {
    const { pay_cash, pay_transfer, pay_peya, ...fallback } = payload;
    const retry = await window.supabase.from("expenses").insert(fallback);
    if (!retry.error) return;
    throw retry.error;
  }
  throw error;
}

async function insertSaleToDB(sale) {
  if (!session?.user) throw new Error("Tenes que iniciar sesion");
  if (!isAdmin) throw new Error("No sos admin");

  const payload = {
    id: sale.id,
    day: sale.dayKey,
    time: sale.time,
    channel: sale.channel,
    items: sale.items,
    total: sale.totals.total,
    cash: sale.totals.cash,
    transfer: sale.totals.transfer,
  };

  let { error } = await window.supabase.from("sales").insert(payload);
  if (!error) return;

  // Compatibilidad: algunas bases viejas no tienen columna channel en sales
  if (String(error.message || "").toLowerCase().includes("channel")) {
    const { channel, ...payloadWithoutChannel } = payload;
    const retry = await window.supabase.from("sales").insert(payloadWithoutChannel);
    if (!retry.error) return;
    throw retry.error;
  }

  throw error;
}

async function deleteSaleById(id) {
  if (!session?.user || !isAdmin) throw new Error("Solo admin");
  const { error } = await window.supabase.from("sales").delete().eq("id", id);
  if (error) throw error;
}

async function deleteDaySales(dayKey) {
  if (!session?.user || !isAdmin) throw new Error("Solo admin");
  const { error } = await window.supabase.from("sales").delete().eq("day", dayKey);
  if (error) throw error;
}

async function deleteExpenseById(id) {
  if (!session?.user || !isAdmin) throw new Error("Solo admin");
  const { error } = await window.supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

async function refreshSession() {
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
  const btnSave = $("#btn-save");
  const btnUndo = $("#btn-undo");
  const btnReset = $("#btn-reset-day");

  [btnSave, btnUndo, btnReset].forEach((b) => {
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

  if (editNoteEl) editNoteEl.style.display = enabled ? "none" : "block";
  if (catalogLockNoteEl) catalogLockNoteEl.style.display = enabled ? "none" : "block";
}

async function applyAuthState() {
  await refreshSession();
  isAdmin = await checkIsAdmin();

  if (authUserEl) authUserEl.textContent = session?.user ? `Usuario: ${session.user.email}` : "";

  if (!session?.user) {
    setBadge("Invitado", "bad");
    setAuthMsg("Podes ver todo. Para editar necesitas iniciar sesion como admin.");
    setEditEnabled(false);
    return;
  }

  if (!isAdmin) {
    setBadge("Usuario (no admin)", "bad");
    setAuthMsg("Sesion iniciada, pero no sos admin. Solo lectura.");
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

function goTo(tab) {
  activeTab = tab;
  $$(".panel").forEach((p) => p.classList.remove("show"));
  document.getElementById(`tab-${tab}`)?.classList.add("show");
  closeMenu();
  applyPedidosYaTheme();
}
function openMenu() {
  if (!menuEl || !menuBtn) return;
  menuEl.classList.add("show");
  menuEl.setAttribute("aria-hidden", "false");
  menuBtn.setAttribute("aria-expanded", "true");
}
function closeMenu() {
  if (!menuEl || !menuBtn) return;
  menuEl.classList.remove("show");
  menuEl.setAttribute("aria-hidden", "true");
  menuBtn.setAttribute("aria-expanded", "false");
}
function toggleMenu() {
  menuEl?.classList.contains("show") ? closeMenu() : openMenu();
}

if (menuBtn && menuEl && menuWrap) {
  menuBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMenu();
  });
  menuEl.addEventListener("click", (e) => e.stopPropagation());
  $$(".menuItem").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      goTo(item.dataset.go);
    });
  });
  document.addEventListener("click", (e) => {
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
              <h2>${p.name}</h2>
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
    for (const inp of $$('[data-price-edit]')) {
      const sku = inp.getAttribute("data-sku");
      const channel = inp.getAttribute("data-price-edit");
      const p = getProduct(sku);
      if (!p || !channel) continue;
      p.prices[channel] = Math.max(0, Number(inp.value || 0));
    }

    for (const p of products) await upsertProductToDB(p);
    renderProductsGrid();
    renderAll();
    setCatalogMsg("Precios guardados en Supabase.");
  } catch (e) {
    console.error(e);
    setCatalogMsg("Error guardando precios en Supabase.");
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

    const { error } = await window.supabase.auth.signInWithPassword({
      email: ADMIN_CODE_EMAIL,
      password: code,
    });
    if (error) throw error;

    await applyAuthState();
    renderAll();
  } catch (e) {
    console.error(e);
    setBadge("Error", "bad");
    setAuthMsg("Codigo invalido o error al iniciar sesion.");
  }
});

btnLogin?.addEventListener("click", async () => {
  if (emailArea?.classList.contains("hidden")) {
    emailArea.classList.remove("hidden");
    setAuthMsg("Completa email y contrasena, y toca de nuevo Entrar con email.");
    return;
  }

  try {
    setAuthMsg("Entrando...");
    const email = (authEmailEl?.value || "").trim();
    const password = authPassEl?.value || "";
    if (!email || !password) return setAuthMsg("Completa email y contrasena.");

    const { error } = await window.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await applyAuthState();
    renderAll();
  } catch (e) {
    console.error(e);
    setBadge("Error", "bad");
    setAuthMsg(e?.message || "Error al iniciar sesion");
  }
});

btnLogout?.addEventListener("click", async () => {
  try {
    await window.supabase.auth.signOut();
    await applyAuthState();
    renderAll();
  } catch (e) {
    console.error(e);
    setAuthMsg("Error al cerrar sesion.");
  }
});

function setActiveChannel(ch) {
  if (!["presencial", "pedidosya"].includes(ch)) return;
  activeChannel = ch;
  if (transferLabelEl) transferLabelEl.textContent = ch === "pedidosya" ? "PeYa" : "Transferencia";
  tabPresencial?.classList.toggle("active", ch === "presencial");
  tabPedidosYa?.classList.toggle("active", ch === "pedidosya");
  applyPedidosYaTheme();
  if (saveMsgEl) saveMsgEl.textContent = "";
  renderProductsGrid();
  renderCart();
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
const getPayMode = () => payModeEls.find((r) => r.checked)?.value || "cash";

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
    const text = `Promo garrapinadas: ${garrapinadas.packs}x(3 por $3000)` +
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

  if (!cartHasItems(cart)) return (saveMsgEl.textContent = "No hay productos cargados.");
  if (!session?.user) return (saveMsgEl.textContent = "Inicia sesion para guardar ventas.");
  if (!isAdmin) return (saveMsgEl.textContent = "Tu usuario no tiene permiso admin para guardar ventas.");

  let cash = Number(cashEl?.value || 0);
  let transfer = Number(transferEl?.value || 0);
  if (mode === "cash") {
    cash = total;
    transfer = 0;
  } else if (mode === "transfer") {
    cash = 0;
    transfer = total;
  } else if (cash + transfer !== total) {
    return (saveMsgEl.textContent = "En mixto, efectivo + transferencia debe dar exacto.");
  }

  const sale = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    dayKey: todayKey(),
    time: nowTime(),
    channel: activeChannel,
    items: Object.entries(cart)
      .filter(([, q]) => Number(q) > 0)
      .map(([sku, q]) => ({ sku, qty: Number(q), unitPrice: getPrice(activeChannel, sku) })),
    totals: { total, cash, transfer },
  };

  try {
    await insertSaleToDB(sale);
    sales.push(sale);
    clearActiveCart();
    saveMsgEl.textContent = "Venta guardada en Supabase.";
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
    sales = sales.filter((s) => s.dayKey !== key);
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
    sales = sales.filter((s) => s.id !== last.id);
    renderAll();
  } catch (e) {
    console.error(e);
    alert("Error deshaciendo en Supabase.");
  }
});

const salesByDay = (dayKey) => sales.filter((s) => s.dayKey === dayKey);
const salesToday = () => salesByDay(todayKey());

function renderSaleCard(s) {
  const itemsText = s.items.map((it) => `${getLabel(it.sku)} x ${it.qty}`).join(" · ");
  const channelTag = s.channel ? ` · ${s.channel === "pedidosya" ? "PedidosYa" : "Presencial"}` : "";
  const payText =
    s.totals.cash > 0 && s.totals.transfer > 0
      ? `Mixto ($${money(s.totals.cash)} + $${money(s.totals.transfer)})`
      : s.totals.cash > 0
      ? `Efectivo ($${money(s.totals.cash)})`
      : `Transferencia ($${money(s.totals.transfer)})`;

  return `
    <div class="sale" data-sale-id="${s.id}">
      <div class="sale-top">
        <div><strong>${s.time}</strong> <span class="muted tiny">· ${payText}${channelTag}</span></div>
        <div><strong>$${money(s.totals.total)}</strong></div>
      </div>
      <div class="sale-items">${itemsText}</div>
      <div class="actions" style="margin-top:8px;">
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
  const counts = {};
  for (const sku of getSkus()) counts[sku] = 0;

  for (const s of list) {
    total += s.totals.total;
    cash += s.totals.cash;
    transfer += s.totals.transfer;
    for (const it of s.items || []) {
      if (counts[it.sku] == null) counts[it.sku] = 0;
      counts[it.sku] += Number(it.qty || 0);
    }
  }

  return { total, cash, transfer, counts, list };
}

function renderSalesList() {
  if (!salesListEl) return;
  const list = salesToday().slice().reverse();
  salesListEl.innerHTML = list.length ? list.map(renderSaleCard).join("") : `<div class="muted tiny">Todavia no hay ventas guardadas hoy.</div>`;
}

function renderCaja() {
  if (!kpiTotalEl || !kpiCashEl || !kpiTransferEl || !countsEl) return;
  const { total, cash, transfer, counts } = calcTotalsForDay(todayKey());
  kpiTotalEl.textContent = `$${money(total)}`;
  kpiCashEl.textContent = `$${money(cash)}`;
  kpiTransferEl.textContent = `$${money(transfer)}`;

  countsEl.innerHTML = Object.keys(counts)
    .map((sku) => `<div class="count"><div>${getLabel(sku)}</div><div><strong>${counts[sku]}</strong></div></div>`)
    .join("");

  const real = Number(cashRealEl?.value || 0);
  if (!cashRealEl?.value) {
    if (cashDeltaEl) cashDeltaEl.textContent = "-";
    cashDeltaEl?.classList.remove("good", "bad");
    return;
  }

  const delta = real - cash;
  if (delta === 0) {
    if (cashDeltaEl) cashDeltaEl.textContent = "OK";
    cashDeltaEl?.classList.add("good");
    cashDeltaEl?.classList.remove("bad");
  } else {
    const label = delta < 0 ? "Falta" : "Sobra";
    if (cashDeltaEl) cashDeltaEl.textContent = `${label}: $${money(Math.abs(delta))}`;
    cashDeltaEl?.classList.remove("good");
    cashDeltaEl?.classList.add("bad");
  }
}

cashRealEl?.addEventListener("input", renderCaja);

function renderTodaySummary() {
  const dk = todayKey();
  const { total, list } = calcTotalsForDay(dk);
  if (todayMetaEl) todayMetaEl.textContent = `Fecha: ${formatDayKey(dk)}`;
  if (todayTotalEl) todayTotalEl.textContent = `$${money(total)}`;
  if (todayCountEl) todayCountEl.textContent = String(list.length);
}

function renderHistory() {
  if (!historyListEl) return;
  const dayKeys = Array.from(new Set(sales.map((s) => s.dayKey))).sort().reverse();

  if (!dayKeys.length) {
    historyListEl.innerHTML = `<div class="muted tiny">Todavia no hay historial.</div>`;
    return;
  }

  historyListEl.innerHTML = dayKeys
    .map((dk) => {
      const { total, cash, transfer, list } = calcTotalsForDay(dk);
      return `<div class="historyRow" data-day="${dk}"><div><div><strong>${formatDayKey(dk)}</strong></div><div class="historyMeta">${list.length} venta(s) · Efectivo $${money(cash)} · Transf $${money(transfer)}</div></div><div><strong>$${money(total)}</strong></div></div>`;
    })
    .join("");

  $$(".historyRow").forEach((row) => row.addEventListener("click", () => openHistoryDay(row.dataset.day)));
}

function openHistoryDay(dayKey) {
  if (!historyDetailEl || !historyListEl) return;
  const { total, cash, transfer, counts, list } = calcTotalsForDay(dayKey);

  if (historyTitleEl) historyTitleEl.textContent = `Historial - ${formatDayKey(dayKey)}`;
  if (histTotalEl) histTotalEl.textContent = `$${money(total)}`;
  if (histCashEl) histCashEl.textContent = `$${money(cash)}`;
  if (histTransferEl) histTransferEl.textContent = `$${money(transfer)}`;

  if (histCountsEl) {
    histCountsEl.innerHTML = Object.keys(counts)
      .map((sku) => `<div class="count"><div>${getLabel(sku)}</div><div><strong>${counts[sku]}</strong></div></div>`)
      .join("");
  }

  if (histSalesEl) {
    histSalesEl.innerHTML = list.slice().reverse().map(renderSaleCard).join("") || `<div class="muted tiny">No hay ventas en esta fecha.</div>`;
  }

  historyDetailEl.classList.remove("hidden");
  historyListEl.classList.add("hidden");
}

btnHistoryBack?.addEventListener("click", () => {
  historyDetailEl?.classList.add("hidden");
  historyListEl?.classList.remove("hidden");
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

function renderExpenseMixedDiff() {
  if (!expenseMixedDiffEl || !expenseAmountEl) return;
  if (expenseMethodEl?.value !== "mixto") {
    expenseMixedDiffEl.textContent = "";
    return;
  }
  const total = Number(expenseAmountEl.value || 0);
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
        <div class="sale-items">${e.description} · Cant: ${e.qty} · IVA+Ing.Br: $${money(Number(e.iva||0)+Number(e.iibb||0))}${
          e.method==="mixto" ? ` · Mix: Ef $${money(e.pay_cash)} / Tr $${money(e.pay_transfer)} / PeYa $${money(e.pay_peya)}` : ""
        }</div>
        <div class="actions" style="margin-top:8px;">
          <button class="btn danger ghost tinyBtn" data-delete-expense="${e.id}" type="button">Eliminar gasto</button>
        </div>
      </div>
    `).join("")
    : `<div class="muted tiny">Todavia no hay gastos cargados este mes.</div>`;
}

document.addEventListener("click", async (e) => {
  const saleBtn = e.target.closest("[data-delete-sale]");
  if (saleBtn) {
    if (!session?.user || !isAdmin) return alert("Solo admin puede eliminar ventas.");
    const id = saleBtn.getAttribute("data-delete-sale");
    if (!id) return;
    const ok = confirm("¿Eliminar esta venta?");
    if (!ok) return;
    try {
      await deleteSaleById(id);
      sales = sales.filter((s) => s.id !== id);
      renderAll();
    } catch (err) {
      console.error(err);
      alert(`Error eliminando venta: ${err?.message || "sin detalle"}`);
    }
    return;
  }

  const expenseBtn = e.target.closest("[data-delete-expense]");
  if (expenseBtn) {
    if (!session?.user || !isAdmin) return alert("Solo admin puede eliminar gastos.");
    const id = expenseBtn.getAttribute("data-delete-expense");
    if (!id) return;
    const ok = confirm("¿Eliminar este gasto?");
    if (!ok) return;
    try {
      await deleteExpenseById(id);
      expenses = expenses.filter((x) => x.id !== id);
      renderAll();
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
expenseAmountEl?.addEventListener("input", renderExpenseMixedDiff);
expensePayCashEl?.addEventListener("input", renderExpenseMixedDiff);
expensePayTransferEl?.addEventListener("input", renderExpenseMixedDiff);
expensePayPeyaEl?.addEventListener("input", renderExpenseMixedDiff);

btnExpenseSave?.addEventListener("click", async () => {
  if (!session?.user) return setExpenseMsg("Inicia sesion para guardar gastos.");
  if (!isAdmin) return setExpenseMsg("Solo admin puede guardar gastos.");

  const date = String(expenseDateEl?.value || "").trim();
  const provider = String(expenseProviderEl?.value || "").trim();
  const qty = Math.max(0, Number(expenseQtyEl?.value || 0));
  const description = String(expenseDescEl?.value || "").trim();
  const tax = Math.max(0, Number(expenseTaxEl?.value || 0));
  const amount = Math.max(0, Number(expenseAmountEl?.value || 0));
  const method = String(expenseMethodEl?.value || "efectivo");
  const payCash = Math.max(0, Number(expensePayCashEl?.value || 0));
  const payTransfer = Math.max(0, Number(expensePayTransferEl?.value || 0));
  const payPeya = Math.max(0, Number(expensePayPeyaEl?.value || 0));

  if (!date) return setExpenseMsg("Completa la fecha.");
  if (!provider) return setExpenseMsg("Selecciona proveedor.");
  if (!description) return setExpenseMsg("Selecciona descripcion.");
  if (amount <= 0) return setExpenseMsg("Ingresa un monto total mayor a 0.");
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
    iva: tax,
    iibb: 0,
    amount,
    method,
    pay_cash: method === "mixto" ? payCash : method === "efectivo" ? amount : 0,
    pay_transfer: method === "mixto" ? payTransfer : method === "transferencia" ? amount : 0,
    pay_peya: method === "mixto" ? payPeya : method === "peya" ? amount : 0,
  };

  try {
    await insertExpenseToDB(expense);
    expenses.push(expense);
    renderExpenses();
    setExpenseMsg("Gasto guardado.");
    resetExpenseForm();
    if (expenseFormWrapEl) expenseFormWrapEl.classList.add("hidden");
  } catch (e) {
    console.error(e);
    setExpenseMsg(`Error guardando gasto: ${e?.message || "sin detalle"}`);
  }
});

function renderAll() {
  renderProductsGrid();
  renderCart();
  renderSalesList();
  renderCaja();
  renderTodaySummary();
  renderExpenses();
  renderEdit();
  if (historyListEl && !historyListEl.classList.contains("hidden")) renderHistory();
}

(async function init() {
  try {
    fillSelectOptions(expenseProviderEl, EXPENSE_PROVIDERS);
    fillSelectOptions(expenseDescEl, EXPENSE_DESCRIPTIONS);
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
    ensureCartKeys();
    setActiveChannel("presencial");
    renderAll();
    goTo("cobrar");

    window.supabase.auth.onAuthStateChange(async (_event, newSession) => {
      session = newSession;
      await applyAuthState();
      sales = await loadSalesFromDB();
      expenses = await loadExpensesFromDB();
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
