// =====================================================
// Cubanitos Patagonia — Supabase only + Auth admins edit
// + Canal: Presencial / PedidosYa (tabs con precios distintos)
// =====================================================

// =============================
// Config (precios y productos)
// =============================
const PRICES_BY_CHANNEL={
  presencial:{cubanito_comun:1000,cubanito_blanco:1300,cubanito_negro:1300,garrapinadas:1200},
  pedidosya:{cubanito_comun:1300,cubanito_blanco:1900,cubanito_negro:1900,garrapinadas:1600},
};

const LABELS={
  cubanito_comun:"Cubanito común",
  cubanito_blanco:"Cubanito choco blanco",
  cubanito_negro:"Cubanito choco negro",
  garrapinadas:"Garrapiñadas",
};
const SKUS=Object.keys(LABELS);

// =============================
// Estado (carrito por canal)
// =============================
let activeChannel="presencial";
let cartByChannel={
  presencial:{cubanito_comun:0,cubanito_blanco:0,cubanito_negro:0,garrapinadas:0},
  pedidosya:{cubanito_comun:0,cubanito_blanco:0,cubanito_negro:0,garrapinadas:0},
};
const getCart=()=>cartByChannel[activeChannel];
const setCart=(c)=>{cartByChannel[activeChannel]=c;};
let sales=[];

// =============================
// Helpers DOM
// =============================
const $=(s)=>document.querySelector(s);
const $$=(s)=>Array.from(document.querySelectorAll(s));
const money=(n)=>Number(n||0).toLocaleString("es-AR");
const todayKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const formatDayKey=(k)=>{const [y,m,d]=k.split("-");return `${d}/${m}/${y}`;};
const nowTime=(d=new Date())=>`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
const clampQty=(q)=>Math.max(0,Math.min(999,Number(q||0)));
const getPrices=()=>PRICES_BY_CHANNEL[activeChannel];
const cartHasItems=(c)=>Object.values(c).some(q=>q>0);

// =============================
// Promo garrapiñadas
// - Presencial: 3 por 3000
// - PedidosYa: NO hay promo
// =============================
function garrapinadasSubtotal(qty,unitPrice,channel){
  qty=clampQty(qty);
  if(channel==="pedidosya") return {packs:0,rest:qty,subtotal:qty*unitPrice,savings:0};
  const packs=Math.floor(qty/3),rest=qty%3,subtotal=packs*3000+rest*unitPrice,full=qty*unitPrice;
  return {packs,rest,subtotal,savings:full-subtotal};
}
function cartTotal(cartObj,prices,channel=activeChannel){
  const common=cartObj.cubanito_comun*prices.cubanito_comun;
  const white=cartObj.cubanito_blanco*prices.cubanito_blanco;
  const dark=cartObj.cubanito_negro*prices.cubanito_negro;
  const g=garrapinadasSubtotal(cartObj.garrapinadas,prices.garrapinadas,channel);
  return {total:common+white+dark+g.subtotal,garrapinadas:g};
}

// =============================
// Auth / Admin gating
// =============================
let session=null,isAdmin=false;
const ADMIN_CODE_EMAIL="admin@cubanitos.app";

const authCodeEl=$("#auth-code"),btnLoginCode=$("#btn-login-code"),emailArea=$("#email-area");
const authEmailEl=$("#auth-email"),authPassEl=$("#auth-pass"),btnLogin=$("#btn-login"),btnLogout=$("#btn-logout");
const authMsgEl=$("#auth-msg"),authUserEl=$("#auth-user"),authBadgeEl=$("#auth-status-badge");
const editNoteEl=$("#edit-note");

const setAuthMsg=(t)=>{ if(authMsgEl) authMsgEl.textContent=t||""; };
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
async function refreshSession(){
  const {data}=await window.supabase.auth.getSession();
  session=data?.session||null;
}
async function checkIsAdmin(){
  if(!session?.user) return false;
  const {data,error}=await window.supabase.from("admins").select("user_id,name").eq("user_id",session.user.id).maybeSingle();
  if(error){ console.error(error); return false; }
  return !!data;
}
async function applyAuthState(){
  await refreshSession();
  isAdmin=await checkIsAdmin();

  if(authUserEl) authUserEl.textContent=session?.user?`Usuario: ${session.user.email}`:"";

  if(!session?.user){
    setBadge("Invitado","bad");
    setAuthMsg("Podés ver todo. Para editar necesitás iniciar sesión como admin.");
    setEditEnabled(false);
    return;
  }
  if(!isAdmin){
    setBadge("Usuario (no admin)","bad");
    setAuthMsg("Sesión iniciada, pero NO sos admin. Solo lectura.");
    setEditEnabled(false);
    return;
  }
  setBadge("Admin OK","good");
  setAuthMsg("Admin ✅ Podés guardar y editar ventas.");
  setEditEnabled(true);
}

btnLogin?.addEventListener("click",()=>{ emailArea?.classList.toggle("hidden"); });

btnLoginCode?.addEventListener("click",async()=>{
  try{
    setAuthMsg("Entrando con código...");
    const code=(authCodeEl?.value||"").trim();
    if(!code) return setAuthMsg("Ingresá un código.");
    const {error}=await window.supabase.auth.signInWithPassword({email:ADMIN_CODE_EMAIL,password:code});
    if(error) throw error;
    await applyAuthState();
    sales=await loadSalesFromDB();
    renderAll();
  }catch(e){
    console.error(e);setBadge("Error","bad");setAuthMsg("Código inválido o error al iniciar sesión.");
  }
});

btnLogin?.addEventListener("click",async()=>{
  try{
    setAuthMsg("Entrando...");
    const email=(authEmailEl?.value||"").trim(),password=authPassEl?.value||"";
    const {error}=await window.supabase.auth.signInWithPassword({email,password});
    if(error) throw error;
    await applyAuthState();
    sales=await loadSalesFromDB();
    renderAll();
  }catch(e){
    console.error(e);setBadge("Error","bad");setAuthMsg(e?.message||"Error al iniciar sesión");
  }
});

btnLogout?.addEventListener("click",async()=>{
  try{
    await window.supabase.auth.signOut();
    session=null;isAdmin=false;
    await applyAuthState();
    renderAll();
  }catch(e){
    console.error(e);setBadge("Error","bad");setAuthMsg("Error al cerrar sesión");
  }
});

// =============================
// Supabase persistence
// =============================
async function loadSalesFromDB(){
  const {data,error}=await window.supabase.from("sales").select("*").order("day",{ascending:true}).order("time",{ascending:true});
  if(error){ console.error(error); return []; }
  return (data||[]).map(r=>({
    id:r.id,
    dayKey:String(r.day),
    time:r.time,
    channel:r.channel||"presencial",
    items:r.items||[],
    totals:{ total:Number(r.total), cash:Number(r.cash), transfer:Number(r.transfer) },
  }));
}
async function insertSaleToDB(sale){
  if(!session?.user) throw new Error("Tenés que iniciar sesión");
  if(!isAdmin) throw new Error("No sos admin");
  const payload={
    id:sale.id, day:sale.dayKey, time:sale.time,
    channel:sale.channel, items:sale.items,
    total:sale.totals.total, cash:sale.totals.cash, transfer:sale.totals.transfer,
  };
  const {error}=await window.supabase.from("sales").insert(payload);
  if(error) throw error;
}
async function deleteSaleById(id){
  if(!session?.user) throw new Error("Tenés que iniciar sesión");
  if(!isAdmin) throw new Error("No sos admin");
  const {error}=await window.supabase.from("sales").delete().eq("id",id);
  if(error) throw error;
}
async function deleteDaySales(dayKey){
  if(!session?.user) throw new Error("Tenés que iniciar sesión");
  if(!isAdmin) throw new Error("No sos admin");
  const {error}=await window.supabase.from("sales").delete().eq("day",dayKey);
  if(error) throw error;
}

// =============================
// UI refs
// =============================
const totalEl=$("#total"),promoLineEl=$("#promo-line"),saveMsgEl=$("#save-msg");
const cashEl=$("#cash"),transferEl=$("#transfer"),diffEl=$("#diff"),mixedArea=$("#mixed-area");
const salesListEl=$("#sales-list");
const kpiTotalEl=$("#kpi-total"),kpiCashEl=$("#kpi-cash"),kpiTransferEl=$("#kpi-transfer");
const countsEl=$("#counts"),cashRealEl=$("#cash-real"),cashDeltaEl=$("#cash-delta");
const todayMetaEl=$("#today-meta"),todayTotalEl=$("#today-total"),todayCountEl=$("#today-count");
const historyListEl=$("#history-list"),historyDetailEl=$("#history-detail"),historyTitleEl=$("#history-title");
const histTotalEl=$("#hist-total"),histCashEl=$("#hist-cash"),histTransferEl=$("#hist-transfer");
const histCountsEl=$("#hist-counts"),histSalesEl=$("#hist-sales"),btnHistoryBack=$("#btn-history-back");

// Tabs canal
const tabPresencial=$("#tab-presencial"),tabPedidosYa=$("#tab-pedidosya");

// =============================
// Menú hamburguesa + tabs
// =============================
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

// =============================
// Canal: handlers + render
// =============================
function setActiveChannel(ch){
  if(!PRICES_BY_CHANNEL[ch]) return;
  activeChannel=ch;

  tabPresencial?.classList.toggle("active",ch==="presencial");
  tabPedidosYa?.classList.toggle("active",ch==="pedidosya");

  // Alinear hint extra (solo en presencial)
  document.querySelectorAll("[data-aligner]").forEach(el=>{
    el.style.display = ch==="presencial" ? "block" : "none";
  });
  
  document.body.classList.toggle("pedidosya-mode", ch==="pedidosya");

  // Promo visible solo presencial
  const promoText=document.querySelector('[data-promo="garrapinadas"]');
  if(promoText) promoText.style.display = ch==="pedidosya" ? "none" : "block";

  saveMsgEl&&(saveMsgEl.textContent="");
  renderPrices();
  renderCart();
}
tabPresencial?.addEventListener("click",()=>setActiveChannel("presencial"));
tabPedidosYa?.addEventListener("click",()=>setActiveChannel("pedidosya"));

// =============================
// Render precios
// =============================
function renderPrices(){
  const prices=getPrices();
  $$("[data-price]").forEach(span=>{
    const sku=span.getAttribute("data-price");
    span.textContent=money(prices[sku]??0);
  });
}

// =============================
// Pago: modo simple vs mixto
// =============================
const payModeEls=Array.from(document.querySelectorAll('input[name="paymode"]'));
const getPayMode=()=>payModeEls.find(r=>r.checked)?.value||"cash";

function renderSplitDiff(){
  const {total}=cartTotal(getCart(),getPrices(),activeChannel);
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
  const {total}=cartTotal(cart,getPrices(),activeChannel);

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

// =============================
// Render carrito + total (canal activo)
// =============================
function renderCart(){
  const cart=getCart();
  for(const sku of SKUS){
    const el=document.querySelector(`[data-qty="${sku}"]`);
    if(el) el.value=String(cart[sku]);
  }

  const {total,garrapinadas}=cartTotal(cart,getPrices(),activeChannel);
  totalEl&&(totalEl.textContent=`$${money(total)}`);

  if(activeChannel==="presencial" && garrapinadas.packs>0){
    const text=`Promo garrapiñadas: ${garrapinadas.packs}×(3 por $3000)`+
      (garrapinadas.rest?` + ${garrapinadas.rest} suelta(s)`:"")+
      (garrapinadas.savings>0?` · Ahorrás $${money(garrapinadas.savings)}`:"");
    promoLineEl&&(promoLineEl.textContent=text);
  }else promoLineEl&&(promoLineEl.textContent="");

  applyPayMode();
}

// =============================
// Controles + / - (afecta canal activo)
// =============================
$$(".product").forEach(card=>{
  card.addEventListener("click",(e)=>{
    const btn=e.target.closest("button"); if(!btn) return;
    const sku=card.getAttribute("data-sku");
    const action=btn.getAttribute("data-action");
    if(!sku||!action) return;

    const cart={...getCart()};
    if(action==="inc") cart[sku]=clampQty(cart[sku]+1);
    if(action==="dec") cart[sku]=clampQty(cart[sku]-1);

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

// =============================
// Guardar / limpiar (guarda canal)
// =============================
$("#btn-save")?.addEventListener("click",async()=>{
  const cart=getCart(),prices=getPrices();
  const {total}=cartTotal(cart,prices,activeChannel);
  const mode=getPayMode();

  if(!cartHasItems(cart)){
    saveMsgEl&&(saveMsgEl.textContent="No hay productos cargados.");
    return;
  }
  if(!session?.user||!isAdmin){
    saveMsgEl&&(saveMsgEl.textContent="Solo admin puede guardar ventas. Entrá en Sesión.");
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
  const items=Object.entries(cart).filter(([,q])=>q>0).map(([sku,q])=>({sku,qty:q,unitPrice:prices[sku]}));

  const sale={
    id:`${Date.now()}_${Math.random().toString(16).slice(2)}`,
    dayKey,time,channel:activeChannel,items,
    totals:{total,cash,transfer},
  };

  try{
    await insertSaleToDB(sale);
    sales.push(sale);
  }catch(e){
    console.error(e);
    saveMsgEl&&(saveMsgEl.textContent="Error guardando en la nube (revisá RLS/admin/columna channel).");
    return;
  }

  // limpiar SOLO canal activo
  cartByChannel[activeChannel]={cubanito_comun:0,cubanito_blanco:0,cubanito_negro:0,garrapinadas:0};
  saveMsgEl&&(saveMsgEl.textContent="Venta guardada ✅");
  renderAll();
});

$("#btn-clear")?.addEventListener("click",()=>{
  cartByChannel[activeChannel]={cubanito_comun:0,cubanito_blanco:0,cubanito_negro:0,garrapinadas:0};
  saveMsgEl&&(saveMsgEl.textContent="");
  renderAll();
});

// =============================
// Ventas: reset día / deshacer (solo admin)
// =============================
$("#btn-reset-day")?.addEventListener("click",async()=>{
  if(!session?.user||!isAdmin){ alert("Solo admin puede reiniciar el día."); return; }
  const key=todayKey();
  try{
    await deleteDaySales(key);
    sales=sales.filter(s=>s.dayKey!==key);
    renderAll();
  }catch(e){ console.error(e); alert("Error reiniciando el día en Supabase."); }
});

$("#btn-undo")?.addEventListener("click",async()=>{
  if(!session?.user||!isAdmin){ alert("Solo admin puede deshacer ventas."); return; }
  const key=todayKey();
  const todayList=sales.filter(s=>s.dayKey===key);
  if(todayList.length===0) return;

  const last=todayList.slice().sort((a,b)=>a.time.localeCompare(b.time)).pop();
  try{
    await deleteSaleById(last.id);
    sales=sales.filter(s=>s.id!==last.id);
    renderAll();
  }catch(e){ console.error(e); alert("Error deshaciendo venta en Supabase."); }
});

// =============================
// Ventas helpers
// =============================
const salesByDay=(dayKey)=>sales.filter(s=>s.dayKey===dayKey);
const salesToday=()=>salesByDay(todayKey());

function renderSaleCard(s){
  const itemsText=s.items.map(it=>`${LABELS[it.sku]} × ${it.qty}`).join(" · ");
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

// =============================
// Render ventas de HOY
// =============================
function renderSalesList(){
  if(!salesListEl) return;
  const list=salesToday().slice().reverse();
  salesListEl.innerHTML = list.length
    ? list.map(renderSaleCard).join("")
    : `<div class="muted tiny">Todavía no hay ventas guardadas hoy.</div>`;
}

// =============================
// Caja + Totales por día (suma todo junto, ambos canales)
// =============================
function calcTotalsForDay(dayKey){
  const list=salesByDay(dayKey);
  let total=0,cash=0,transfer=0;
  const counts={cubanito_comun:0,cubanito_blanco:0,cubanito_negro:0,garrapinadas:0};

  for(const s of list){
    total+=s.totals.total;
    cash+=s.totals.cash;
    transfer+=s.totals.transfer;
    for(const it of s.items){ if(counts[it.sku]!=null) counts[it.sku]+=it.qty; }
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
      <div>${LABELS[sku]}</div>
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

// =============================
// Ventas de hoy: fecha + KPIs
// =============================
function renderTodaySummary(){
  const dk=todayKey();
  const {total,list}=calcTotalsForDay(dk);
  todayMetaEl&&(todayMetaEl.textContent=`Fecha: ${formatDayKey(dk)}`);
  todayTotalEl&&(todayTotalEl.textContent=`$${money(total)}`);
  todayCountEl&&(todayCountEl.textContent=String(list.length));
}

// =============================
// Historial
// =============================
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
      <div>${LABELS[sku]}</div>
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

// =============================
// Export CSV (hoy)
// =============================
$("#btn-export")?.addEventListener("click",()=>{
  const list=salesToday();
  if(!list.length){ alert("No hay ventas hoy para exportar."); return; }

  const header=["fecha","hora","canal","total","efectivo","transferencia","items"];
  const key=todayKey();

  const rows=list.map(s=>{
    const items=s.items.map(it=>`${LABELS[it.sku]} x${it.qty}`).join(" | ");
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

// =============================
// Render global
// =============================
function renderAll(){
  renderPrices();
  renderCart();
  renderSalesList();
  renderCaja();
  renderTodaySummary();
  if(historyListEl && !historyListEl.classList.contains("hidden")) renderHistory();
}

// =============================
// Init
// =============================
(async function init(){
  // Canal inicial
  setActiveChannel("presencial");

  // cargar nube + auth
  try{ sales=await loadSalesFromDB(); }catch(e){ console.error("No pude cargar ventas:",e); sales=[]; }
  try{ await applyAuthState(); }catch(e){ console.error("No pude aplicar auth:",e); }

  renderAll();
  goTo("cobrar");

  window.supabase.auth.onAuthStateChange(async(_event,newSession)=>{
    session=newSession;
    await applyAuthState();
    // recargar ventas para que el feed esté al día
    sales=await loadSalesFromDB();
    renderAll();
  });
})();