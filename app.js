// =====================================================
// Cubanitos Patagonia — LOCAL ONLY (sin Supabase)
// - Productos + precios + ventas guardados en localStorage
// - Admin local por código (bloqueo simple)
// - Export CSV (hoy) + Backup JSON (todo)
// =====================================================

/** =========================
 * Storage keys + defaults
 * ========================= */
const STORAGE = {
  products: "cp_products_v1",
  sales: "cp_sales_v1",
  adminHash: "cp_admin_code_v1",
  isAdmin: "cp_is_admin_v1",
};

const DEFAULT_PRODUCTS = [
  { sku:"cubanito_comun", name:"Cubanito común", prices:{ presencial:1000, pedidosya:1300 } },
  { sku:"cubanito_blanco", name:"Cubanito choco blanco", prices:{ presencial:1300, pedidosya:1900 } },
  { sku:"cubanito_negro", name:"Cubanito choco negro", prices:{ presencial:1300, pedidosya:1900 } },
  { sku:"garrapinadas", name:"Garrapiñadas", prices:{ presencial:1200, pedidosya:1600 } },
];

/** =========================
 * DOM helpers
 * ========================= */
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));
const money=(n)=>Number(n||0).toLocaleString("es-AR");
const todayKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const formatDayKey=(k)=>{const [y,m,d]=k.split("-");return `${d}/${m}/${y}`;};
const nowTime=(d=new Date())=>`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
const clampQty=(q)=>Math.max(0,Math.min(999,Number(q||0)));
const cartHasItems=(c)=>Object.values(c).some(q=>q>0);

/** =========================
 * Simple hash (para no guardar el code en claro)
 * ========================= */
function simpleHash(str){
  // hash liviano (no criptográfico) suficiente para "bloqueo" local
  let h = 2166136261;
  for(let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h>>>0).toString(16);
}

function getStoredAdminHash(){
  return localStorage.getItem(STORAGE.adminHash) || "";
}
function setStoredAdminHash(code){
  localStorage.setItem(STORAGE.adminHash, simpleHash(code));
}
function getIsAdmin(){
  return localStorage.getItem(STORAGE.isAdmin) === "1";
}
function setIsAdmin(v){
  localStorage.setItem(STORAGE.isAdmin, v ? "1":"0");
}

/** =========================
 * Data: products + sales
 * ========================= */
let products = [];
let sales = [];

function loadProducts(){
  try{
    const raw = localStorage.getItem(STORAGE.products);
    if(!raw){
      products = structuredClone(DEFAULT_PRODUCTS);
      saveProducts();
      return;
    }
    const parsed = JSON.parse(raw);
    products = Array.isArray(parsed) ? parsed : structuredClone(DEFAULT_PRODUCTS);
  }catch{
    products = structuredClone(DEFAULT_PRODUCTS);
  }
}
function saveProducts(){
  localStorage.setItem(STORAGE.products, JSON.stringify(products));
}

function loadSales(){
  try{
    const raw = localStorage.getItem(STORAGE.sales);
    if(!raw){ sales=[]; return; }
    const parsed = JSON.parse(raw);
    sales = Array.isArray(parsed) ? parsed : [];
  }catch{
    sales=[];
  }
}
function saveSales(){
  localStorage.setItem(STORAGE.sales, JSON.stringify(sales));
}

function rebuildSkuIndex(){
  // asegurar forma consistente
  const seen = new Set();
  products = products
    .filter(p=>p && p.sku && p.name && p.prices)
    .map(p=>({
      sku: String(p.sku),
      name: String(p.name),
      prices: {
        presencial: Number(p.prices?.presencial ?? 0),
        pedidosya: Number(p.prices?.pedidosya ?? 0),
      }
    }))
    .filter(p=>{
      if(seen.has(p.sku)) return false;
      seen.add(p.sku);
      return true;
    });
}

function getProduct(sku){
  return products.find(p=>p.sku===sku) || null;
}
function getPrice(channel, sku){
  const p = getProduct(sku);
  return Number(p?.prices?.[channel] ?? 0);
}
function getLabel(sku){
  const p = getProduct(sku);
  return p?.name || sku;
}
function getSkus(){
  return products.map(p=>p.sku);
}

/** =========================
 * Cart per channel
 * ========================= */
let activeChannel = "presencial";
let cartByChannel = { presencial:{}, pedidosya:{} };

function ensureCartKeys(){
  const skus = getSkus();
  for(const ch of ["presencial","pedidosya"]){
    const c = cartByChannel[ch] || {};
    for(const sku of skus){
      if(c[sku]==null) c[sku]=0;
    }
    cartByChannel[ch] = c;
  }
}

const getCart=()=>cartByChannel[activeChannel];
const setCart=(c)=>{cartByChannel[activeChannel]=c;};

/** =========================
 * Promo garrapiñadas
 * ========================= */
function garrapinadasSubtotal(qty,unitPrice,channel){
  qty=clampQty(qty);
  if(channel==="pedidosya") return {packs:0,rest:qty,subtotal:qty*unitPrice,savings:0};
  const packs=Math.floor(qty/3),rest=qty%3,subtotal=packs*3000+rest*unitPrice,full=qty*unitPrice;
  return {packs,rest,subtotal,savings:full-subtotal};
}

function cartTotal(cartObj,channel=activeChannel){
  let total = 0;
  let ginfo = {packs:0,rest:0,subtotal:0,savings:0};
  for(const sku of getSkus()){
    const qty = Number(cartObj[sku]||0);
    const unit = getPrice(channel, sku);
    if(sku === "garrapinadas"){
      ginfo = garrapinadasSubtotal(qty, unit, channel);
      total += ginfo.subtotal;
    }else{
      total += qty * unit;
    }
  }
  return { total, garrapinadas: ginfo };
}

/** =========================
 * UI refs
 * ========================= */
const totalEl=$("#total"),promoLineEl=$("#promo-line"),saveMsgEl=$("#save-msg");
const cashEl=$("#cash"),transferEl=$("#transfer"),diffEl=$("#diff"),mixedArea=$("#mixed-area");
const salesListEl=$("#sales-list");
const kpiTotalEl=$("#kpi-total"),kpiCashEl=$("#kpi-cash"),kpiTransferEl=$("#kpi-transfer");
const countsEl=$("#counts"),cashRealEl=$("#cash-real"),cashDeltaEl=$("#cash-delta");
const todayMetaEl=$("#today-meta"),todayTotalEl=$("#today-total"),todayCountEl=$("#today-count");
const historyListEl=$("#history-list"),historyDetailEl=$("#history-detail"),historyTitleEl=$("#history-title");
const histTotalEl=$("#hist-total"),histCashEl=$("#hist-cash"),histTransferEl=$("#hist-transfer");
const histCountsEl=$("#hist-counts"),histSalesEl=$("#hist-sales"),btnHistoryBack=$("#btn-history-back");

const productsGridEl = $("#products-grid");

// Auth UI
const authCodeEl=$("#auth-code");
const authNewCodeEl=$("#auth-new-code");
const btnLoginCode=$("#btn-login-code");
const btnLogout=$("#btn-logout");
const btnSetCode=$("#btn-set-code");
const authMsgEl=$("#auth-msg");
const authUserEl=$("#auth-user");
const authBadgeEl=$("#auth-status-badge");
const editNoteEl=$("#edit-note");

// Edit UI
const menuEditar = $("#menu-editar");
const editBadge = $("#edit-badge");
const editProductsEl = $("#edit-products");
const editMsgEl = $("#edit-msg");
const btnAddProduct = $("#btn-add-product");
const btnResetDefaults = $("#btn-reset-defaults");

// Backup UI
const btnExportBackup = $("#btn-export-backup");
const backupFile = $("#backup-file");
const btnImportBackup = $("#btn-import-backup");

/** =========================
 * Menu + tabs
 * ========================= */
const menuBtn=$("#menu-btn"),menuEl=$("#menu"),menuWrap=$(".menuWrap");

function goTo(tab){
  $$(".panel").forEach(p=>p.classList.remove("show"));
  document.getElementById(`tab-${tab}`)?.classList.add("show");
  closeMenu();
}
function openMenu(){
  if(!menuEl||!menuBtn) return;
  menuEl.classList.add("show");
  menuEl.setAttribute("aria-hidden","false");
  menuBtn.setAttribute("aria-expanded","true");
}
function closeMenu(){
  if(!menuEl||!menuBtn) return;
  menuEl.classList.remove("show");
  menuEl.setAttribute("aria-hidden","true");
  menuBtn.setAttribute("aria-expanded","false");
}
function toggleMenu(){ menuEl?.classList.contains("show")?closeMenu():openMenu(); }

if(menuBtn&&menuEl&&menuWrap){
  menuBtn.addEventListener("click",(e)=>{e.preventDefault();e.stopPropagation();toggleMenu();});
  menuEl.addEventListener("click",(e)=>e.stopPropagation());
  $$(".menuItem").forEach(item=>{
    item.addEventListener("click",(e)=>{e.stopPropagation();goTo(item.dataset.go);});
  });
  document.addEventListener("click",(e)=>{ if(!menuWrap.contains(e.target)) closeMenu(); });
  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeMenu(); });
}

/** =========================
 * Auth local
 * ========================= */
function setAuthMsg(t){ if(authMsgEl) authMsgEl.textContent=t||""; }

function setBadge(text,kind){
  if(!authBadgeEl) return;
  authBadgeEl.textContent=text;
  authBadgeEl.classList.remove("good","bad");
  if(kind==="good") authBadgeEl.classList.add("good");
  if(kind==="bad") authBadgeEl.classList.add("bad");
}

function setEditEnabled(enabled){
  const btnSave=$("#btn-save"),btnUndo=$("#btn-undo"),btnReset=$("#btn-reset-day");
  [btnSave,btnUndo,btnReset].forEach(b=>{
    if(!b) return;
    b.disabled=!enabled;
    b.style.opacity=enabled?"1":"0.55";
    b.style.pointerEvents=enabled?"auto":"none";
  });
  if(editNoteEl) editNoteEl.style.display=enabled?"none":"block";
}

function applyAuthState(){
  const isAdmin = getIsAdmin();

  // menu Editar visible solo admin
  if(menuEditar) menuEditar.classList.toggle("hidden", !isAdmin);

  // badge tab editar
  if(editBadge){
    editBadge.textContent = isAdmin ? "Admin OK" : "Solo lectura";
    editBadge.classList.toggle("good", isAdmin);
    editBadge.classList.toggle("bad", !isAdmin);
  }

  if(!isAdmin){
    setBadge("Invitado","bad");
    setAuthMsg("Modo local. Para editar/guardar usá el código admin.");
    if(authUserEl) authUserEl.textContent="";
    setEditEnabled(false);
    return;
  }

  setBadge("Admin OK","good");
  setAuthMsg("Admin local ✅ Podés guardar y editar en este dispositivo.");
  if(authUserEl) authUserEl.textContent="Admin local activo (este navegador).";
  setEditEnabled(true);
}

btnLoginCode?.addEventListener("click",()=>{
  const code = (authCodeEl?.value||"").trim();
  if(!code) return setAuthMsg("Ingresá un código.");

  const stored = getStoredAdminHash();
  // si no hay hash guardado, el primer código que pongas se toma como admin (setup inicial)
  if(!stored){
    setStoredAdminHash(code);
    setIsAdmin(true);
    setAuthMsg("Código creado y sesión admin activada ✅");
    applyAuthState();
    renderAll();
    return;
  }

  if(simpleHash(code) === stored){
    setIsAdmin(true);
    setAuthMsg("Sesión admin activada ✅");
    applyAuthState();
    renderAll();
  }else{
    setIsAdmin(false);
    applyAuthState();
    setAuthMsg("Código incorrecto.");
  }
});

btnLogout?.addEventListener("click",()=>{
  setIsAdmin(false);
  applyAuthState();
  renderAll();
});

btnSetCode?.addEventListener("click",()=>{
  if(!getIsAdmin()){
    setAuthMsg("Tenés que estar como admin para cambiar el código.");
    return;
  }
  const newCode = (authNewCodeEl?.value||"").trim();
  if(!newCode) return setAuthMsg("Ingresá un nuevo código.");
  setStoredAdminHash(newCode);
  authNewCodeEl.value="";
  setAuthMsg("Código admin actualizado ✅");
});

/** =========================
 * Channel
 * ========================= */
const tabPresencial=$("#tab-presencial"),tabPedidosYa=$("#tab-pedidosya");

function setActiveChannel(ch){
  if(!["presencial","pedidosya"].includes(ch)) return;
  activeChannel = ch;

  tabPresencial?.classList.toggle("active", ch==="presencial");
  tabPedidosYa?.classList.toggle("active", ch==="pedidosya");
  document.body.classList.toggle("pedidosya-mode", ch==="pedidosya");

  saveMsgEl && (saveMsgEl.textContent="");
  renderProductsGrid();
  renderCart();
}
tabPresencial?.addEventListener("click",()=>setActiveChannel("presencial"));
tabPedidosYa?.addEventListener("click",()=>setActiveChannel("pedidosya"));

/** =========================
 * Render products grid (Cobrar)
 * ========================= */
function renderProductsGrid(){
  if(!productsGridEl) return;

  const skus = getSkus();
  if(skus.length===0){
    productsGridEl.innerHTML = `
      <div class="card" style="grid-column:1/-1;">
        <strong>No hay productos.</strong>
        <p class="muted tiny">Si sos admin, agregalos en Editar.</p>
      </div>
    `;
    return;
  }

  productsGridEl.innerHTML = skus.map(sku=>{
    const p = getProduct(sku);
    const unit = sku==="garrapinadas" ? "Bolsa" : "Unidad";
    const price = getPrice(activeChannel, sku);

    const promo = (sku==="garrapinadas" && activeChannel==="presencial")
      ? `<p class="hint" data-promo="garrapinadas">Promo: 3 por $3000</p>`
      : "";

    return `
      <div class="card product" data-sku="${sku}">
        <div class="row">
          <div>
            <h2>${p.name}</h2>
            <p class="muted">$${money(price)}</p>
            ${promo}
          </div>
          <div class="pill">${unit}</div>
        </div>
        <div class="counter">
          <button class="btn ghost" data-action="dec" type="button">−</button>
          <input class="qty" type="number" inputmode="numeric" min="0" step="1" value="0" data-qty="${sku}" />
          <button class="btn ghost" data-action="inc" type="button">+</button>
        </div>
      </div>
    `;
  }).join("");

  bindProductEvents();
  renderCart();
}

function bindProductEvents(){
  $$(".product").forEach(card=>{
    card.addEventListener("click",(e)=>{
      const btn=e.target.closest("button"); if(!btn) return;
      const sku=card.getAttribute("data-sku");
      const action=btn.getAttribute("data-action");
      if(!sku||!action) return;

      const cart={...getCart()};
      if(action==="inc") cart[sku]=clampQty((cart[sku]||0)+1);
      if(action==="dec") cart[sku]=clampQty((cart[sku]||0)-1);

      setCart(cart);
      saveMsgEl&&(saveMsgEl.textContent="");
      renderCart();
    });
  });

  $$(".qty").forEach(input=>{
    input.addEventListener("input",()=>{
      const sku=input.dataset.qty;
      let val=Number(input.value||0);
      if(val<0) val=0;
      if(val>999) val=999;
      const cart={...getCart()};
      cart[sku]=val;
      setCart(cart);
      renderCart();
    });
  });
}

/** =========================
 * Pay mode
 * ========================= */
const payModeEls=Array.from(document.querySelectorAll('input[name="paymode"]'));
const getPayMode=()=>payModeEls.find(r=>r.checked)?.value||"cash";

function renderSplitDiff(){
  const {total}=cartTotal(getCart(),activeChannel);
  const cash=Number(cashEl?.value||0),transfer=Number(transferEl?.value||0);
  const diff=cash+transfer-total;

  if(!cartHasItems(getCart())){
    diffEl&&(diffEl.textContent="—");
    diffEl?.classList.remove("good","bad");
    return;
  }
  if(diff===0){
    diffEl&&(diffEl.textContent="OK");
    diffEl?.classList.add("good"); diffEl?.classList.remove("bad");
  }else{
    const label=diff<0?"Falta":"Sobra";
    diffEl&&(diffEl.textContent=`${label}: $${money(Math.abs(diff))}`);
    diffEl?.classList.remove("good"); diffEl?.classList.add("bad");
  }
}

function applyPayMode(){
  const mode=getPayMode();
  const cart=getCart();
  const {total}=cartTotal(cart,activeChannel);

  if(mixedArea) mixedArea.classList.toggle("hidden",mode!=="mixed");

  if(!cartHasItems(cart)){
    if(mode!=="mixed"){ cashEl&&(cashEl.value="0"); transferEl&&(transferEl.value="0"); }
    if(diffEl){ diffEl.textContent="—"; diffEl.classList.remove("good","bad"); }
    return;
  }

  if(mode==="cash"){ cashEl&&(cashEl.value=String(total)); transferEl&&(transferEl.value="0"); }
  else if(mode==="transfer"){ cashEl&&(cashEl.value="0"); transferEl&&(transferEl.value=String(total)); }
  else renderSplitDiff();
}

payModeEls.forEach(r=>r.addEventListener("change",()=>{ saveMsgEl&&(saveMsgEl.textContent=""); applyPayMode(); }));
cashEl?.addEventListener("input",()=>{ if(getPayMode()==="mixed") renderSplitDiff(); });
transferEl?.addEventListener("input",()=>{ if(getPayMode()==="mixed") renderSplitDiff(); });

/** =========================
 * Render cart + total
 * ========================= */
function renderCart(){
  const cart=getCart();
  for(const sku of getSkus()){
    const el=document.querySelector(`[data-qty="${sku}"]`);
    if(el) el.value=String(cart[sku]||0);
  }

  const {total,garrapinadas}=cartTotal(cart,activeChannel);
  totalEl&&(totalEl.textContent=`$${money(total)}`);

  if(activeChannel==="presencial" && (cart["garrapinadas"]||0)>0 && garrapinadas.packs>0){
    const text=`Promo garrapiñadas: ${garrapinadas.packs}×(3 por $3000)`+
      (garrapinadas.rest?` + ${garrapinadas.rest} suelta(s)`:"")+
      (garrapinadas.savings>0?` · Ahorrás $${money(garrapinadas.savings)}`:"");
    promoLineEl&&(promoLineEl.textContent=text);
  }else promoLineEl&&(promoLineEl.textContent="");

  applyPayMode();
}

/** =========================
 * Save / clear sale (LOCAL)
 * ========================= */
$("#btn-save")?.addEventListener("click",()=>{
  const cart=getCart();
  const {total}=cartTotal(cart,activeChannel);
  const mode=getPayMode();

  if(!cartHasItems(cart)){
    saveMsgEl&&(saveMsgEl.textContent="No hay productos cargados.");
    return;
  }
  if(!getIsAdmin()){
    saveMsgEl&&(saveMsgEl.textContent="Solo admin puede guardar ventas.");
    return;
  }

  let cash=Number(cashEl?.value||0),transfer=Number(transferEl?.value||0);
  if(mode==="cash"){ cash=total; transfer=0; }
  else if(mode==="transfer"){ cash=0; transfer=total; }
  else{
    if(cash+transfer!==total){
      saveMsgEl&&(saveMsgEl.textContent="En mixto, efectivo + transferencia debe dar EXACTO el total.");
      return;
    }
  }

  const dayKey=todayKey(),time=nowTime();
  const items=Object.entries(cart)
    .filter(([,q])=>Number(q)>0)
    .map(([sku,q])=>({sku,qty:Number(q),unitPrice:getPrice(activeChannel, sku)}));

  const sale={
    id:`${Date.now()}_${Math.random().toString(16).slice(2)}`,
    dayKey,time,channel:activeChannel,items,
    totals:{total,cash,transfer},
  };

  sales.push(sale);
  saveSales();

  // limpiar canal activo
  const next={...cartByChannel[activeChannel]};
  for(const k of Object.keys(next)) next[k]=0;
  cartByChannel[activeChannel]=next;

  saveMsgEl&&(saveMsgEl.textContent="Venta guardada ✅");
  renderAll();
});

$("#btn-clear")?.addEventListener("click",()=>{
  const next={...cartByChannel[activeChannel]};
  for(const k of Object.keys(next)) next[k]=0;
  cartByChannel[activeChannel]=next;
  saveMsgEl&&(saveMsgEl.textContent="");
  renderAll();
});

/** =========================
 * Undo / reset day (LOCAL)
 * ========================= */
$("#btn-reset-day")?.addEventListener("click",()=>{
  if(!getIsAdmin()){ alert("Solo admin puede reiniciar el día."); return; }
  const key=todayKey();
  sales = sales.filter(s=>s.dayKey!==key);
  saveSales();
  renderAll();
});

$("#btn-undo")?.addEventListener("click",()=>{
  if(!getIsAdmin()){ alert("Solo admin puede deshacer ventas."); return; }
  const key=todayKey();
  const todayList=sales.filter(s=>s.dayKey===key);
  if(todayList.length===0) return;
  const last=todayList.slice().sort((a,b)=>a.time.localeCompare(b.time)).pop();
  sales = sales.filter(s=>s.id!==last.id);
  saveSales();
  renderAll();
});

/** =========================
 * Sales helpers + render
 * ========================= */
const salesByDay=(dayKey)=>sales.filter(s=>s.dayKey===dayKey);
const salesToday=()=>salesByDay(todayKey());

function renderSaleCard(s){
  const itemsText=s.items.map(it=>`${getLabel(it.sku)} × ${it.qty}`).join(" · ");
  const channelTag=s.channel?` · ${s.channel==="pedidosya"?"PedidosYa":"Presencial"}`:"";
  const payText=
    s.totals.cash>0 && s.totals.transfer>0 ? `Mixto ($${money(s.totals.cash)} + $${money(s.totals.transfer)})` :
    s.totals.cash>0 ? `Efectivo ($${money(s.totals.cash)})` :
    `Transferencia ($${money(s.totals.transfer)})`;

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

function renderSalesList(){
  if(!salesListEl) return;
  const list=salesToday().slice().reverse();
  salesListEl.innerHTML = list.length
    ? list.map(renderSaleCard).join("")
    : `<div class="muted tiny">Todavía no hay ventas guardadas hoy.</div>`;
}

function calcTotalsForDay(dayKey){
  const list=salesByDay(dayKey);
  let total=0,cash=0,transfer=0;
  const counts={};
  for(const sku of getSkus()) counts[sku]=0;

  for(const s of list){
    total+=s.totals.total;
    cash+=s.totals.cash;
    transfer+=s.totals.transfer;
    for(const it of s.items){
      if(counts[it.sku]==null) counts[it.sku]=0;
      counts[it.sku]+=it.qty;
    }
  }
  return {total,cash,transfer,counts,list};
}

function renderCaja(){
  if(!kpiTotalEl||!kpiCashEl||!kpiTransferEl||!countsEl) return;
  const {total,cash,transfer,counts}=calcTotalsForDay(todayKey());

  kpiTotalEl.textContent=`$${money(total)}`;
  kpiCashEl.textContent=`$${money(cash)}`;
  kpiTransferEl.textContent=`$${money(transfer)}`;

  countsEl.innerHTML=Object.keys(counts).map(sku=>`
    <div class="count">
      <div>${getLabel(sku)}</div>
      <div><strong>${counts[sku]}</strong></div>
    </div>
  `).join("");

  const real=Number(cashRealEl?.value||0);
  if(!cashRealEl?.value){
    cashDeltaEl&&(cashDeltaEl.textContent="—");
    cashDeltaEl?.classList.remove("good","bad");
    return;
  }
  const delta=real-cash;
  if(delta===0){
    cashDeltaEl&&(cashDeltaEl.textContent="OK");
    cashDeltaEl?.classList.add("good"); cashDeltaEl?.classList.remove("bad");
  }else{
    const label=delta<0?"Falta":"Sobra";
    cashDeltaEl&&(cashDeltaEl.textContent=`${label}: $${money(Math.abs(delta))}`);
    cashDeltaEl?.classList.remove("good"); cashDeltaEl?.classList.add("bad");
  }
}
cashRealEl?.addEventListener("input",renderCaja);

function renderTodaySummary(){
  const dk=todayKey();
  const {total,list}=calcTotalsForDay(dk);
  todayMetaEl&&(todayMetaEl.textContent=`Fecha: ${formatDayKey(dk)}`);
  todayTotalEl&&(todayTotalEl.textContent=`$${money(total)}`);
  todayCountEl&&(todayCountEl.textContent=String(list.length));
}

function renderHistory(){
  if(!historyListEl) return;
  const dayKeys=Array.from(new Set(sales.map(s=>s.dayKey))).sort().reverse();
  if(!dayKeys.length){
    historyListEl.innerHTML=`<div class="muted tiny">Todavía no hay historial.</div>`;
    return;
  }
  historyListEl.innerHTML=dayKeys.map(dk=>{
    const {total,cash,transfer,list}=calcTotalsForDay(dk);
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
  $$(".historyRow").forEach(row=>row.addEventListener("click",()=>openHistoryDay(row.dataset.day)));
}

function openHistoryDay(dayKey){
  if(!historyDetailEl||!historyListEl) return;
  const {total,cash,transfer,counts,list}=calcTotalsForDay(dayKey);

  historyTitleEl&&(historyTitleEl.textContent=`Historial — ${formatDayKey(dayKey)}`);
  histTotalEl&&(histTotalEl.textContent=`$${money(total)}`);
  histCashEl&&(histCashEl.textContent=`$${money(cash)}`);
  histTransferEl&&(histTransferEl.textContent=`$${money(transfer)}`);

  histCountsEl&&(histCountsEl.innerHTML=Object.keys(counts).map(sku=>`
    <div class="count">
      <div>${getLabel(sku)}</div>
      <div><strong>${counts[sku]}</strong></div>
    </div>
  `).join(""));

  histSalesEl&&(histSalesEl.innerHTML=(list.slice().reverse().map(renderSaleCard).join(""))||`<div class="muted tiny">No hay ventas en esta fecha.</div>`);

  historyDetailEl.classList.remove("hidden");
  historyListEl.classList.add("hidden");
}
btnHistoryBack?.addEventListener("click",()=>{
  historyDetailEl?.classList.add("hidden");
  historyListEl?.classList.remove("hidden");
});

/** =========================
 * Export CSV (hoy)
 * ========================= */
$("#btn-export")?.addEventListener("click",()=>{
  const list=salesToday();
  if(!list.length){ alert("No hay ventas hoy para exportar."); return; }

  const header=["fecha","hora","canal","total","efectivo","transferencia","items"];
  const key=todayKey();

  const rows=list.map(s=>{
    const items=s.items.map(it=>`${getLabel(it.sku)} x${it.qty}`).join(" | ");
    return [key,s.time,s.channel||"",s.totals.total,s.totals.cash,s.totals.transfer,`"${items.replaceAll('"','""')}"`].join(",");
  });

  const csv=[header.join(","),...rows].join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=`ventas_${key}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

/** =========================
 * Backup JSON export/import (para migrar dispositivo)
 * ========================= */
btnExportBackup?.addEventListener("click",()=>{
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    products,
    sales,
  };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cubanitos_backup_${todayKey()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

btnImportBackup?.addEventListener("click",()=>{
  if(!backupFile?.files?.[0]){ alert("Elegí un archivo JSON primero."); return; }
  const file = backupFile.files[0];
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(String(reader.result||""));
      if(!data || !Array.isArray(data.products) || !Array.isArray(data.sales)){
        alert("Backup inválido.");
        return;
      }
      products = data.products;
      sales = data.sales;
      rebuildSkuIndex();
      ensureCartKeys();
      saveProducts();
      saveSales();
      alert("Backup importado ✅");
      renderAll();
    }catch(e){
      console.error(e);
      alert("No pude importar el backup.");
    }
  };
  reader.readAsText(file);
});

/** =========================
 * EDITAR: render + handlers
 * ========================= */
function setEditMsg(t){ if(editMsgEl) editMsgEl.textContent = t || ""; }

function renderEdit(){
  if(!editProductsEl) return;

  if(products.length===0){
    editProductsEl.innerHTML = `<div class="muted tiny">No hay productos. Agregá uno abajo.</div>`;
    return;
  }

  editProductsEl.innerHTML = products.map(p=>{
    return `
      <div class="editRow" data-sku="${p.sku}">
        <div class="editRowTop">
          <div>
            <strong>${p.name}</strong>
            <div class="muted tiny">SKU: ${p.sku}</div>
          </div>
          <div class="actions" style="margin-top:0;">
            <button class="btn ghost" data-edit-action="save" type="button">Guardar</button>
            <button class="btn danger ghost" data-edit-action="delete" type="button">Borrar</button>
          </div>
        </div>

        <div class="editPrices">
          <label class="field">
            <span>Presencial</span>
            <input type="number" inputmode="numeric" min="0" step="50" data-price="presencial" value="${p.prices.presencial}" />
          </label>

          <label class="field">
            <span>PedidosYa</span>
            <input type="number" inputmode="numeric" min="0" step="50" data-price="pedidosya" value="${p.prices.pedidosya}" />
          </label>
        </div>
      </div>
    `;
  }).join("");

  $$("#tab-editar [data-edit-action]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      if(!getIsAdmin()){
        setEditMsg("Solo admin puede editar.");
        return;
      }
      const row = btn.closest(".editRow");
      const sku = row?.dataset?.sku;
      if(!sku) return;

      const action = btn.getAttribute("data-edit-action");

      if(action==="delete"){
        const ok = confirm(`¿Borrar el producto "${getLabel(sku)}" (SKU: ${sku})?`);
        if(!ok) return;
        products = products.filter(p=>p.sku!==sku);
        rebuildSkuIndex();
        ensureCartKeys();
        saveProducts();
        renderProductsGrid();
        renderEdit();
        renderAll();
        setEditMsg("Producto borrado ✅");
        return;
      }

      if(action==="save"){
        const p = getProduct(sku);
        if(!p) return;

        const pres = Number(row.querySelector('input[data-price="presencial"]')?.value || 0);
        const ped  = Number(row.querySelector('input[data-price="pedidosya"]')?.value || 0);
        p.prices.presencial = Math.max(0, pres);
        p.prices.pedidosya = Math.max(0, ped);

        saveProducts();
        renderProductsGrid();
        renderAll();
        setEditMsg("Precios guardados ✅");
      }
    });
  });
}

btnAddProduct?.addEventListener("click",()=>{
  try{
    if(!getIsAdmin()){
      setEditMsg("Solo admin puede agregar productos.");
      return;
    }
    setEditMsg("");

    const name = ($("#new-name")?.value || "").trim();
    const skuRaw = ($("#new-sku")?.value || "").trim();
    const sku = skuRaw.replaceAll(" ", "_").toLowerCase();

    const pp = Number($("#new-price-presencial")?.value || 0);
    const py = Number($("#new-price-pedidosya")?.value || 0);

    if(!name) return setEditMsg("Poné un nombre.");
    if(!sku) return setEditMsg("Poné un SKU.");
    if(pp <= 0 || py <= 0) return setEditMsg("Poné precios mayores a 0 en ambos canales.");
    if(getProduct(sku)) return setEditMsg("Ese SKU ya existe.");

    products.push({ sku, name, prices:{presencial:pp, pedidosya:py} });
    rebuildSkuIndex();
    ensureCartKeys();
    saveProducts();

    $("#new-name").value="";
    $("#new-sku").value="";
    $("#new-price-presencial").value="";
    $("#new-price-pedidosya").value="";

    renderProductsGrid();
    renderEdit();
    renderAll();
    setEditMsg("Producto agregado ✅");
  }catch(e){
    console.error(e);
    setEditMsg("Error agregando producto.");
  }
});

btnResetDefaults?.addEventListener("click",()=>{
  if(!getIsAdmin()){
    setEditMsg("Solo admin puede restaurar defaults.");
    return;
  }
  const ok = confirm("¿Restaurar productos y precios default? (No borra ventas)");
  if(!ok) return;
  products = structuredClone(DEFAULT_PRODUCTS);
  rebuildSkuIndex();
  ensureCartKeys();
  saveProducts();
  renderProductsGrid();
  renderEdit();
  renderAll();
  setEditMsg("Defaults restaurados ✅");
});

/** =========================
 * Render global
 * ========================= */
function renderAll(){
  renderProductsGrid();
  renderCart();
  renderSalesList();
  renderCaja();
  renderTodaySummary();
  renderEdit();
  if(historyListEl && !historyListEl.classList.contains("hidden")) renderHistory();
}

/** =========================
 * Init
 * ========================= */
(function init(){
  // data
  loadProducts();
  rebuildSkuIndex();
  loadSales();

  // cart
  ensureCartKeys();

  // canal inicial
  setActiveChannel("presencial");

  // auth state
  applyAuthState();

  // render
  renderAll();
  goTo("cobrar");
})();