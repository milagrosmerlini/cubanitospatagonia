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
let session = null;
let isAdmin = false;
let activeChannel = "presencial";
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

  const { error } = await window.supabase.from("sales").insert(payload);
  if (error) throw error;
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
  $$(".panel").forEach((p) => p.classList.remove("show"));
  document.getElementById(`tab-${tab}`)?.classList.add("show");
  closeMenu();
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
      <div class="priceEditorName"><strong>${p.name}</strong><div class="muted tiny">SKU: ${p.sku} · ${p.unit || "Unidad"}</div></div>
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
  tabPresencial?.classList.toggle("active", ch === "presencial");
  tabPedidosYa?.classList.toggle("active", ch === "pedidosya");
  document.body.classList.toggle("pedidosya-mode", ch === "pedidosya");
  if (saveMsgEl) saveMsgEl.textContent = "";
  renderProductsGrid();
  renderCart();
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
  if (!session?.user || !isAdmin) return (saveMsgEl.textContent = "Solo admin puede guardar ventas.");

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
    saveMsgEl.textContent = "Error guardando venta en Supabase.";
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

  return `<div class="sale"><div class="sale-top"><div><strong>${s.time}</strong> <span class="muted tiny">· ${payText}${channelTag}</span></div><div><strong>$${money(s.totals.total)}</strong></div></div><div class="sale-items">${itemsText}</div></div>`;
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

$("#btn-export")?.addEventListener("click", () => {
  const list = salesToday();
  if (!list.length) return alert("No hay ventas hoy para exportar.");

  const header = ["fecha", "hora", "canal", "total", "efectivo", "transferencia", "items"];
  const key = todayKey();

  const rows = list.map((s) => {
    const items = s.items.map((it) => `${getLabel(it.sku)} x${it.qty}`).join(" | ");
    return [key, s.time, s.channel || "", s.totals.total, s.totals.cash, s.totals.transfer, `"${items.replaceAll('"', '""')}"`].join(",");
  });

  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ventas_${key}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

function renderAll() {
  renderProductsGrid();
  renderCart();
  renderSalesList();
  renderCaja();
  renderTodaySummary();
  renderEdit();
  if (historyListEl && !historyListEl.classList.contains("hidden")) renderHistory();
}

(async function init() {
  try {
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
    ensureCartKeys();
    setActiveChannel("presencial");
    renderAll();
    goTo("cobrar");

    window.supabase.auth.onAuthStateChange(async (_event, newSession) => {
      session = newSession;
      await applyAuthState();
      sales = await loadSalesFromDB();
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
