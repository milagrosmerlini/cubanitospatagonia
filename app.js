// =====================================================
// Cubanitos Patagonia — Supabase only + Auth admins edit
// + Canal: Presencial / PedidosYa (tabs con precios distintos)
// =====================================================

// =============================
// Config (precios y productos)
// =============================

// PRECIOS POR CANAL (EDITÁ ACÁ)
const PRICES_BY_CHANNEL = {
  presencial: {
    cubanito_comun: 1000,
    cubanito_blanco: 1300,
    cubanito_negro: 1300,
    garrapinadas: 1200,
  },
  pedidosya: {
    cubanito_comun: 1300,
    cubanito_blanco: 1900,
    cubanito_negro: 1900,
    garrapinadas: 1600,
  },
};

const LABELS = {
  cubanito_comun: "Cubanito común",
  cubanito_blanco: "Cubanito choco blanco",
  cubanito_negro: "Cubanito choco negro",
  garrapinadas: "Garrapiñadas",
};

const SKUS = Object.keys(LABELS);

// =============================
// Estado (carrito por canal)
// =============================
let activeChannel = "presencial";

let cartByChannel = {
  presencial: {
    cubanito_comun: 0,
    cubanito_blanco: 0,
    cubanito_negro: 0,
    garrapinadas: 0,
  },
  pedidosya: {
    cubanito_comun: 0,
    cubanito_blanco: 0,
    cubanito_negro: 0,
    garrapinadas: 0,
  },
};

function getCart() {
  return cartByChannel[activeChannel];
}

function setCart(nextCart) {
  cartByChannel[activeChannel] = nextCart;
}

let sales = []; // cache local cargada desde Supabase

// =============================
// Helpers DOM
// =============================
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return Array.from(document.querySelectorAll(sel)); }

function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString("es-AR");
}

function todayKey(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDayKey(dayKey) {
  const [y, m, d] = dayKey.split("-");
  return `${d}/${m}/${y}`;
}

function nowTime(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function clampQty(q) {
  q = Number(q || 0);
  if (q < 0) q = 0;
  if (q > 999) q = 999;
  return q;
}

function getPrices() {
  return PRICES_BY_CHANNEL[activeChannel];
}

// Promo garrapiñadas: 3 por 3000 (resto sueltas a precio canal)
function garrapinadasSubtotal(qty, unitPrice, channel) {
  qty = clampQty(qty);

  // PedidosYa: NO hay promo
  if (channel === "pedidosya") {
    return { packs: 0, rest: qty, subtotal: qty * unitPrice, savings: 0 };
  }

  // Presencial: promo 3 por 3000
  const packs = Math.floor(qty / 3);
  const rest = qty % 3;
  const subtotal = packs * 3000 + rest * unitPrice;
  const full = qty * unitPrice;
  return { packs, rest, subtotal, savings: full - subtotal };
}

function cartTotal(cartObj, prices) {
  const common = cartObj.cubanito_comun * prices.cubanito_comun;
  const white  = cartObj.cubanito_blanco * prices.cubanito_blanco;
  const dark   = cartObj.cubanito_negro * prices.cubanito_negro;

  const g = garrapinadasSubtotal(cartObj.garrapinadas, prices.garrapinadas);

  return { total: common + white + dark + g.subtotal, garrapinadas: g };
}

function cartHasItems(cartObj) {
  return Object.values(cartObj).some((q) => q > 0);
}

// =============================
// Auth / Admin gating (NO bloquea la app)
// =============================
let session = null;
let isAdmin = false;

const ADMIN_CODE_EMAIL = "admin@cubanitos.app";
const authCodeEl = document.getElementById("auth-code");
const btnLoginCode = document.getElementById("btn-login-code");
const emailArea = document.getElementById("email-area");

const authEmailEl = document.getElementById("auth-email");
const authPassEl = document.getElementById("auth-pass");
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const authMsgEl = document.getElementById("auth-msg");
const authUserEl = document.getElementById("auth-user");
const authBadgeEl = document.getElementById("auth-status-badge");

const editNoteEl = document.getElementById("edit-note");

btnLogin?.addEventListener("click", () => {
  if (emailArea) emailArea.classList.toggle("hidden");
});

btnLoginCode?.addEventListener("click", async () => {
  try {
    setAuthMsg("Entrando con código...");
    const code = (authCodeEl?.value || "").trim();
    if (!code) {
      setAuthMsg("Ingresá un código.");
      return;
    }

    const { error } = await window.supabase.auth.signInWithPassword({
      email: ADMIN_CODE_EMAIL,
      password: code,
    });
    if (error) throw error;

    await applyAuthState();
    sales = await loadSalesFromDB();
    renderAll();
  } catch (e) {
    console.error(e);
    setBadge("Error", "bad");
    setAuthMsg("Código inválido o error al iniciar sesión.");
  }
});

function setAuthMsg(t) {
  if (authMsgEl) authMsgEl.textContent = t || "";
}

function setBadge(text, kind) {
  if (!authBadgeEl) return;
  authBadgeEl.textContent = text;
  authBadgeEl.classList.remove("good", "bad");
  if (kind === "good") authBadgeEl.classList.add("good");
  if (kind === "bad") authBadgeEl.classList.add("bad");
}

function setEditEnabled(enabled) {
  // Solo restringimos acciones "edit"
  const btnSave = document.getElementById("btn-save");
  const btnUndo = document.getElementById("btn-undo");
  const btnReset = document.getElementById("btn-reset-day");

  [btnSave, btnUndo, btnReset].forEach((b) => {
    if (!b) return;
    b.disabled = !enabled;
    b.style.opacity = enabled ? "1" : "0.55";
    b.style.pointerEvents = enabled ? "auto" : "none";
  });

  if (editNoteEl) editNoteEl.style.display = enabled ? "none" : "block";
}

async function refreshSession() {
  const { data } = await window.supabase.auth.getSession();
  session = data?.session || null;
}

async function checkIsAdmin() {
  if (!session?.user) return false;

  const { data, error } = await window.supabase
    .from("admins")
    .select("user_id,name")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return false;
  }
  return !!data;
}

async function applyAuthState() {
  await refreshSession();
  isAdmin = await checkIsAdmin();

  if (session?.user) {
    if (authUserEl) authUserEl.textContent = `Usuario: ${session.user.email}`;
  } else {
    if (authUserEl) authUserEl.textContent = "";
  }

  if (!session?.user) {
    setBadge("Invitado", "bad");
    setAuthMsg("Podés ver todo. Para editar necesitás iniciar sesión como admin.");
    setEditEnabled(false);
    return;
  }

  if (!isAdmin) {
    setBadge("Usuario (no admin)", "bad");
    setAuthMsg("Sesión iniciada, pero NO sos admin. Solo lectura.");
    setEditEnabled(false);
    return;
  }

  setBadge("Admin OK", "good");
  setAuthMsg("Admin ✅ Podés guardar y editar ventas.");
  setEditEnabled(true);
}

btnLogin?.addEventListener("click", async () => {
  try {
    setAuthMsg("Entrando...");
    const email = (authEmailEl?.value || "").trim();
    const password = authPassEl?.value || "";

    const { error } = await window.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    await applyAuthState();
    sales = await loadSalesFromDB();
    renderAll();
  } catch (e) {
    console.error(e);
    setBadge("Error", "bad");
    setAuthMsg(e?.message || "Error al iniciar sesión");
  }
});

btnLogout?.addEventListener("click", async () => {
  try {
    await window.supabase.auth.signOut();
    session = null;
    isAdmin = false;
    await applyAuthState();
    renderAll();
  } catch (e) {
    console.error(e);
    setBadge("Error", "bad");
    setAuthMsg("Error al cerrar sesión");
  }
});

// =============================
// Supabase persistence
// =============================
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
    channel: r.channel || "presencial", // fallback por compat
    items: r.items || [],
    totals: {
      total: Number(r.total),
      cash: Number(r.cash),
      transfer: Number(r.transfer),
    },
  }));
}

async function insertSaleToDB(sale) {
  if (!session?.user) throw new Error("Tenés que iniciar sesión");
  if (!isAdmin) throw new Error("No sos admin");

  const payload = {
    id: sale.id,
    day: sale.dayKey,
    time: sale.time,
    channel: sale.channel,            // <— NUEVO
    items: sale.items,
    total: sale.totals.total,
    cash: sale.totals.cash,
    transfer: sale.totals.transfer,
  };

  const { error } = await window.supabase.from("sales").insert(payload);
  if (error) throw error;
}

async function deleteSaleById(id) {
  if (!session?.user) throw new Error("Tenés que iniciar sesión");
  if (!isAdmin) throw new Error("No sos admin");

  const { error } = await window.supabase.from("sales").delete().eq("id", id);
  if (error) throw error;
}

async function deleteDaySales(dayKey) {
  if (!session?.user) throw new Error("Tenés que iniciar sesión");
  if (!isAdmin) throw new Error("No sos admin");

  const { error } = await window.supabase.from("sales").delete().eq("day", dayKey);
  if (error) throw error;
}

// =============================
// UI refs
// =============================
const totalEl = $("#total");
const promoLineEl = $("#promo-line");
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

// ===== Tabs Canal (Presencial / PedidosYa) =====
const tabPresencial = $("#tab-presencial");
const tabPedidosYa = $("#tab-pedidosya");

// =============================
// Menú hamburguesa + tabs (pantallas)
// =============================
const menuBtn = document.getElementById("menu-btn");
const menuEl = document.getElementById("menu");
const menuWrap = document.querySelector(".menuWrap");

function goTo(tab) {
  $$(".panel").forEach((p) => p.classList.remove("show"));
  const target = document.getElementById(`tab-${tab}`);
  if (target) target.classList.add("show");
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
  if (!menuEl) return;
  menuEl.classList.contains("show") ? closeMenu() : openMenu();
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

// =============================
// Canal: handlers + render
// =============================
function setActiveChannel(ch) {
  if (!PRICES_BY_CHANNEL[ch]) return;
  activeChannel = ch;

  tabPresencial?.classList.toggle("active", ch === "presencial");
  tabPedidosYa?.classList.toggle("active", ch === "pedidosya");

  // al cambiar canal: mostramos precios del canal y restauramos su carrito
  saveMsgEl.textContent = "";
  renderPrices();
  renderCart();
}

tabPresencial?.addEventListener("click", () => setActiveChannel("presencial"));
tabPedidosYa?.addEventListener("click", () => setActiveChannel("pedidosya"));

// =============================
// Render precios (según canal activo)
// =============================
function renderPrices() {
  const prices = getPrices();
  $$("[data-price]").forEach((span) => {
    const sku = span.getAttribute("data-price");
    span.textContent = money(prices[sku] ?? 0);
  });
}

// =============================
// Pago: modo simple vs mixto
// =============================
const payModeEls = Array.from(document.querySelectorAll('input[name="paymode"]'));

function getPayMode() {
  const checked = payModeEls.find((r) => r.checked);
  return checked ? checked.value : "cash";
}

function renderSplitDiff() {
  const cart = getCart();
  const { total } = cartTotal(cart, getPrices());

  const cash = Number(cashEl?.value || 0);
  const transfer = Number(transferEl?.value || 0);
  const diff = cash + transfer - total;

  if (!cartHasItems(cart)) {
    diffEl.textContent = "—";
    diffEl.classList.remove("good", "bad");
    return;
  }

  if (diff === 0) {
    diffEl.textContent = "OK";
    diffEl.classList.add("good");
    diffEl.classList.remove("bad");
  } else {
    const label = diff < 0 ? "Falta" : "Sobra";
    diffEl.textContent = `${label}: $${money(Math.abs(diff))}`;
    diffEl.classList.remove("good");
    diffEl.classList.add("bad");
  }
}

function applyPayMode() {
  const mode = getPayMode();
  const cart = getCart();
  const { total } = cartTotal(cart, getPrices());

  if (mixedArea) {
    if (mode === "mixed") mixedArea.classList.remove("hidden");
    else mixedArea.classList.add("hidden");
  }

  if (!cartHasItems(cart)) {
    if (mode !== "mixed") {
      if (cashEl) cashEl.value = "0";
      if (transferEl) transferEl.value = "0";
    }
    if (diffEl) {
      diffEl.textContent = "—";
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

payModeEls.forEach((r) =>
  r.addEventListener("change", () => {
    saveMsgEl.textContent = "";
    applyPayMode();
  })
);

cashEl?.addEventListener("input", () => { if (getPayMode() === "mixed") renderSplitDiff(); });
transferEl?.addEventListener("input", () => { if (getPayMode() === "mixed") renderSplitDiff(); });

// =============================
// Render carrito + total (canal activo)
// =============================
function renderCart() {
  const cart = getCart();

  for (const sku of SKUS) {
    const el = document.querySelector(`[data-qty="${sku}"]`);
    if (el) el.value = String(cart[sku]);
  }

  const { total, garrapinadas } = cartTotal(cart, getPrices());
  totalEl.textContent = `$${money(total)}`;

  if (garrapinadas.packs > 0) {
    const text =
      `Promo garrapiñadas: ${garrapinadas.packs}×(3 por $3000)` +
      (garrapinadas.rest ? ` + ${garrapinadas.rest} suelta(s)` : "") +
      (garrapinadas.savings > 0 ? ` · Ahorrás $${money(garrapinadas.savings)}` : "");
    promoLineEl.textContent = text;
  } else {
    promoLineEl.textContent = "";
  }

  applyPayMode();
}

// =============================
// Controles + / - (afecta canal activo)
// =============================
$$(".product").forEach((card) => {
  card.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const sku = card.getAttribute("data-sku");
    const action = btn.getAttribute("data-action");
    if (!sku || !action) return;

    const cart = { ...getCart() };

    if (action === "inc") cart[sku] = clampQty(cart[sku] + 1);
    if (action === "dec") cart[sku] = clampQty(cart[sku] - 1);

    setCart(cart);
    saveMsgEl.textContent = "";
    renderCart();
  });
});

$$(".qty").forEach((input) => {
  input.addEventListener("input", () => {
    const sku = input.dataset.qty;
    let val = Number(input.value || 0);

    if (val < 0) val = 0;
    if (val > 999) val = 999;

    const cart = { ...getCart() };
    cart[sku] = val;
    setCart(cart);

    renderCart();
  });
});

// =============================
// Guardar / limpiar (guarda canal)
// =============================
$("#btn-save").addEventListener("click", async () => {
  const cart = getCart();
  const prices = getPrices();

  const { total } = cartTotal(cart, prices);
  const mode = getPayMode();

  if (!cartHasItems(cart)) {
    saveMsgEl.textContent = "No hay productos cargados.";
    return;
  }

  if (!session?.user || !isAdmin) {
    saveMsgEl.textContent = "Solo admin puede guardar ventas. Entrá en Sesión.";
    return;
  }

  let cash = Number(cashEl?.value || 0);
  let transfer = Number(transferEl?.value || 0);

  if (mode === "cash") {
    cash = total; transfer = 0;
  } else if (mode === "transfer") {
    cash = 0; transfer = total;
  } else {
    if (cash + transfer !== total) {
      saveMsgEl.textContent = "En mixto, efectivo + transferencia debe dar EXACTO el total.";
      return;
    }
  }

  const dayKey = todayKey();
  const time = nowTime();

  const items = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([sku, q]) => ({ sku, qty: q, unitPrice: prices[sku] }));

  const sale = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    dayKey,
    time,
    channel: activeChannel, // <— NUEVO
    items,
    totals: { total, cash, transfer },
  };

  try {
    await insertSaleToDB(sale);
    sales.push(sale);
  } catch (e) {
    console.error(e);
    saveMsgEl.textContent = "Error guardando en la nube (revisá RLS/admin/columna channel).";
    return;
  }

  // limpiar SOLO el canal activo
  const empty = {
    cubanito_comun: 0,
    cubanito_blanco: 0,
    cubanito_negro: 0,
    garrapinadas: 0,
  };
  cartByChannel[activeChannel] = { ...empty };

  saveMsgEl.textContent = "Venta guardada ✅";
  renderAll();
});

$("#btn-clear").addEventListener("click", () => {
  const empty = {
    cubanito_comun: 0,
    cubanito_blanco: 0,
    cubanito_negro: 0,
    garrapinadas: 0,
  };
  cartByChannel[activeChannel] = { ...empty };
  saveMsgEl.textContent = "";
  renderAll();
});

// =============================
// Ventas: reset día / deshacer (solo admin)
// =============================
$("#btn-reset-day").addEventListener("click", async () => {
  if (!session?.user || !isAdmin) {
    alert("Solo admin puede reiniciar el día.");
    return;
  }
  const key = todayKey();
  try {
    await deleteDaySales(key);
    sales = sales.filter((s) => s.dayKey !== key);
    renderAll();
  } catch (e) {
    console.error(e);
    alert("Error reiniciando el día en Supabase.");
  }
});

$("#btn-undo").addEventListener("click", async () => {
  if (!session?.user || !isAdmin) {
    alert("Solo admin puede deshacer ventas.");
    return;
  }

  const key = todayKey();
  const todayList = sales.filter((s) => s.dayKey === key);
  if (todayList.length === 0) return;

  const last = todayList.slice().sort((a, b) => a.time.localeCompare(b.time)).pop();

  try {
    await deleteSaleById(last.id);
    sales = sales.filter((s) => s.id !== last.id);
    renderAll();
  } catch (e) {
    console.error(e);
    alert("Error deshaciendo venta en Supabase.");
  }
});

// =============================
// Ventas helpers
// =============================
function salesByDay(dayKey) {
  return sales.filter((s) => s.dayKey === dayKey);
}

function salesToday() {
  return salesByDay(todayKey());
}

function renderSaleCard(s) {
  const itemsText = s.items.map((it) => `${LABELS[it.sku]} × ${it.qty}`).join(" · ");
  const channelTag = s.channel ? ` · ${s.channel === "pedidosya" ? "PedidosYa" : "Presencial"}` : "";

  const payText =
    s.totals.cash > 0 && s.totals.transfer > 0
      ? `Mixto ($${money(s.totals.cash)} + $${money(s.totals.transfer)})`
      : s.totals.cash > 0
      ? `Efectivo ($${money(s.totals.cash)})`
      : `Transferencia ($${money(s.totals.transfer)})`;

  return `
    <div class="sale">
      <div class="sale-top">
        <div><strong>${s.time}</strong> <span class="muted tiny">· ${payText}${channelTag}</span></div>
        <div><strong>$${money(s.totals.total)}</strong></div>
      </div>
      <div class="sale-items">${itemsText}</div>
    </div>
  `;
}

// =============================
// Render ventas de HOY
// =============================
function renderSalesList() {
  const list = salesToday().slice().reverse();
  if (list.length === 0) {
    salesListEl.innerHTML = `<div class="muted tiny">Todavía no hay ventas guardadas hoy.</div>`;
    return;
  }
  salesListEl.innerHTML = list.map(renderSaleCard).join("");
}

// =============================
// Caja + Totales por día (suma todo junto, ambos canales)
// =============================
function calcTotalsForDay(dayKey) {
  const list = salesByDay(dayKey);
  let total = 0, cash = 0, transfer = 0;

  const counts = {
    cubanito_comun: 0,
    cubanito_blanco: 0,
    cubanito_negro: 0,
    garrapinadas: 0,
  };

  for (const s of list) {
    total += s.totals.total;
    cash += s.totals.cash;
    transfer += s.totals.transfer;

    for (const it of s.items) {
      if (counts[it.sku] != null) counts[it.sku] += it.qty;
    }
  }
  return { total, cash, transfer, counts, list };
}

function renderCaja() {
  const { total, cash, transfer, counts } = calcTotalsForDay(todayKey());

  kpiTotalEl.textContent = `$${money(total)}`;
  kpiCashEl.textContent = `$${money(cash)}`;
  kpiTransferEl.textContent = `$${money(transfer)}`;

  countsEl.innerHTML = Object.keys(counts)
    .map((sku) => `
      <div class="count">
        <div>${LABELS[sku]}</div>
        <div><strong>${counts[sku]}</strong></div>
      </div>
    `)
    .join("");

  const real = Number(cashRealEl?.value || 0);
  if (!cashRealEl?.value) {
    cashDeltaEl.textContent = "—";
    cashDeltaEl.classList.remove("good", "bad");
    return;
  }

  const delta = real - cash;
  if (delta === 0) {
    cashDeltaEl.textContent = "OK";
    cashDeltaEl.classList.add("good");
    cashDeltaEl.classList.remove("bad");
  } else {
    const label = delta < 0 ? "Falta" : "Sobra";
    cashDeltaEl.textContent = `${label}: $${money(Math.abs(delta))}`;
    cashDeltaEl.classList.remove("good");
    cashDeltaEl.classList.add("bad");
  }
}

cashRealEl?.addEventListener("input", renderCaja);

// =============================
// Ventas de hoy: fecha + KPIs
// =============================
function renderTodaySummary() {
  const dk = todayKey();
  const { total, list } = calcTotalsForDay(dk);
  if (todayMetaEl) todayMetaEl.textContent = `Fecha: ${formatDayKey(dk)}`;
  if (todayTotalEl) todayTotalEl.textContent = `$${money(total)}`;
  if (todayCountEl) todayCountEl.textContent = String(list.length);
}

// =============================
// Historial
// =============================
function renderHistory() {
  const dayKeys = Array.from(new Set(sales.map((s) => s.dayKey))).sort().reverse();
  if (dayKeys.length === 0) {
    historyListEl.innerHTML = `<div class="muted tiny">Todavía no hay historial.</div>`;
    return;
  }

  historyListEl.innerHTML = dayKeys.map((dk) => {
    const { total, cash, transfer, list } = calcTotalsForDay(dk);
    return `
      <div class="historyRow" data-day="${dk}">
        <div>
          <div><strong>${formatDayKey(dk)}</strong></div>
          <div class="historyMeta">${list.length} venta(s) · Efectivo $${money(cash)} · Transf $${money(transfer)}</div>
        </div>
        <div><strong>$${money(total)}</strong></div>
      </div>
    `;
  }).join("");

  $$(".historyRow").forEach((row) => {
    row.addEventListener("click", () => openHistoryDay(row.dataset.day));
  });
}

function openHistoryDay(dayKey) {
  const { total, cash, transfer, counts, list } = calcTotalsForDay(dayKey);

  historyTitleEl.textContent = `Historial — ${formatDayKey(dayKey)}`;
  histTotalEl.textContent = `$${money(total)}`;
  histCashEl.textContent = `$${money(cash)}`;
  histTransferEl.textContent = `$${money(transfer)}`;

  histCountsEl.innerHTML = Object.keys(counts)
    .map((sku) => `
      <div class="count">
        <div>${LABELS[sku]}</div>
        <div><strong>${counts[sku]}</strong></div>
      </div>
    `)
    .join("");

  histSalesEl.innerHTML = (list.slice().reverse().map(renderSaleCard).join("")) ||
    `<div class="muted tiny">No hay ventas en esta fecha.</div>`;

  historyDetailEl.classList.remove("hidden");
  historyListEl.classList.add("hidden");
}

btnHistoryBack?.addEventListener("click", () => {
  historyDetailEl.classList.add("hidden");
  historyListEl.classList.remove("hidden");
});

// =============================
// Export CSV (hoy)
// =============================
$("#btn-export").addEventListener("click", () => {
  const list = salesToday();
  if (list.length === 0) {
    alert("No hay ventas hoy para exportar.");
    return;
  }

  const header = ["fecha", "hora", "canal", "total", "efectivo", "transferencia", "items"];
  const key = todayKey();

  const rows = list.map((s) => {
    const items = s.items.map((it) => `${LABELS[it.sku]} x${it.qty}`).join(" | ");
    return [
      key,
      s.time,
      s.channel || "",
      s.totals.total,
      s.totals.cash,
      s.totals.transfer,
      `"${items.replaceAll('"', '""')}"`
    ].join(",");
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

// =============================
// Render global
// =============================
function renderAll() {
  renderPrices();
  renderCart();
  renderSalesList();
  renderCaja();
  renderTodaySummary();

  if (historyListEl && !historyListEl.classList.contains("hidden")) {
    renderHistory();
  }
}

// =============================
// Init
// =============================
(async function init() {
  // 1) Pintar TODO ya mismo (sin esperar red)
  setActiveChannel("presencial");  // esto llama renderPrices() y renderCart()
  renderAll();
  goTo("cobrar");

  // 2) Ahora sí: cargar nube + auth
  try {
    sales = await loadSalesFromDB();
  } catch (e) {
    console.error("No pude cargar ventas:", e);
    sales = [];
  }

  try {
    await applyAuthState();
  } catch (e) {
    console.error("No pude aplicar auth:", e);
  }

  // 3) Re-render final con datos reales
  renderAll();

  // 4) Listener sesión
  window.supabase.auth.onAuthStateChange(async (_event, newSession) => {
    session = newSession;
    await applyAuthState();
    renderAll();
  });
})();


