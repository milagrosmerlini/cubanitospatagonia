// =============================
(function(){
  const $=(s)=>document.querySelector(s);
  const menuBtn=$("#menu-btn"), menuEl=$("#menu"), menuWrap=$(".menuWrap");

  const closeMenu=()=>{
    if(!menuEl||!menuBtn) return;
    menuEl.classList.remove("show");
    menuEl.setAttribute("aria-hidden","true");
    menuBtn.setAttribute("aria-expanded","false");
  };
  const openMenu=()=>{
    if(!menuEl||!menuBtn) return;
    menuEl.classList.add("show");
    menuEl.setAttribute("aria-hidden","false");
    menuBtn.setAttribute("aria-expanded","true");
  };
  const toggleMenu=()=>menuEl?.classList.contains("show")?closeMenu():openMenu();

  const goTo=(tab)=>{
    if(!tab) return;
    document.querySelectorAll(".panel").forEach(p=>p.classList.remove("show"));
    document.getElementById(`tab-${tab}`)?.classList.add("show");
    closeMenu();
  };
  window.goTo=goTo;

  const bind=()=>{
    if(!menuBtn||!menuEl||!menuWrap) return;

    menuBtn.addEventListener("click",(e)=>{e.preventDefault();e.stopPropagation();toggleMenu();});

    menuEl.addEventListener("click",(e)=>{
      e.stopPropagation();
      const item=e.target.closest(".menuItem");
      if(!item) return;
      e.preventDefault();
      goTo(item.dataset.go);
    });

    document.addEventListener("click",(e)=>{ if(!menuWrap.contains(e.target)) closeMenu(); });
    document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeMenu(); });
  };

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",bind);
  else bind();
})();

// -----------------------------
// Helpers
// -----------------------------
const $=(s)=>document.querySelector(s);
const $$=(s)=>Array.from(document.querySelectorAll(s));
const money=(n)=>Number(n||0).toLocaleString("es-AR");
const todayKey=(d=new Date())=>{
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),dd=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
};
const formatDayKey=(k)=>{const [y,m,d]=k.split("-");return `${d}/${m}/${y}`;};
const nowTime=(d=new Date())=>`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
const clampQty=(q)=>Math.max(0,Math.min(999,Number(q||0)));

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
// Promo garrapiñadas
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
const cartHasItems=(c)=>Object.values(c).some(q=>q>0);
const getPrices=()=>PRICES_BY_CHANNEL[activeChannel];

// =============================
// UI refs (si no existen, quedan null y no rompe)
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
const tabPresencial=$("#tab-presencial"),tabPedidosYa=$("#tab-pedidosya");

// =============================
// Canal
// =============================
function setActiveChannel(ch){
  if(!PRICES_BY_CHANNEL[ch]) return;
  activeChannel=ch;
  tabPresencial?.classList.toggle("active",ch==="presencial");
  tabPedidosYa?.classList.toggle("active",ch==="pedidosya");
  document.querySelectorAll("[data-aligner]").forEach(el=>{ el.style.display=ch==="presencial"?"block":"none"; });
  saveMsgEl&&(saveMsgEl.textContent="");
  renderPrices();renderCart();
  const promoText=document.querySelector('[data-promo="garrapinadas"]');
  if(promoText) promoText.style.display=ch==="pedidosya"?"none":"block";
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
// Pago
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
    diffEl?.classList.add("good");diffEl?.classList.remove("bad");
  }else{
    const label=diff<0?"Falta":"Sobra";
    diffEl&&(diffEl.textContent=`${label}: $${money(Math.abs(diff))}`);
    diffEl?.classList.remove("good");diffEl?.classList.add("bad");
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
// Render carrito
// =============================
function renderCart(){
  const cart=getCart();
  for(const sku of SKUS){
    const el=document.querySelector(`[data-qty="${sku}"]`);
    if(el) el.value=String(cart[sku]);
  }
  const {total,garrapinadas}=cartTotal(cart,getPrices(),activeChannel);
  totalEl&&(totalEl.textContent=`$${money(total)}`);

  if(activeChannel==="presencial"&&garrapinadas.packs>0){
    const text=`Promo garrapiñadas: ${garrapinadas.packs}×(3 por $3000)`+
      (garrapinadas.rest? ` + ${garrapinadas.rest} suelta(s)`:"")+
      (garrapinadas.savings>0? ` · Ahorrás $${money(garrapinadas.savings)}`:"");
    promoLineEl&&(promoLineEl.textContent=text);
  }else promoLineEl&&(promoLineEl.textContent="");

  applyPayMode();
}

// =============================
// Controles + / -
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

    setCart(cart); saveMsgEl&&(saveMsgEl.textContent=""); renderCart();
  });
});
$$(".qty").forEach(input=>{
  input.addEventListener("input",()=>{
    const sku=input.dataset.qty;
    let val=Number(input.value||0);
    if(val<0) val=0; if(val>999) val=999;
    const cart={...getCart()}; cart[sku]=val; setCart(cart);
    renderCart();
  });
});

// =============================
// Auth / Admin + Supabase (guardado para no romper si faltan tabs)
// =============================
let session=null,isAdmin=false;
const ADMIN_CODE_EMAIL="admin@cubanitos.app";
const authCodeEl=$("#auth-code"),btnLoginCode=$("#btn-login-code"),emailArea=$("#email-area");
const authEmailEl=$("#auth-email"),authPassEl=$("#auth-pass"),btnLogin=$("#btn-login"),btnLogout=$("#btn-logout");
const authMsgEl=$("#auth-msg"),authUserEl=$("#auth-user"),authBadgeEl=$("#auth-status-badge"),editNoteEl=$("#edit-note");

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
  const sb=window.supabase;
  if(!sb?.auth) return (session=null);
  const {data}=await sb.auth.getSession();
  session=data?.session||null;
}
async function checkIsAdmin(){
  const sb=window.supabase;
  if(!session?.user||!sb?.from) return false;
  const {data,error}=await sb.from("admins").select("user_id,name").eq("user_id",session.user.id).maybeSingle();
  if(error){console.error(error);return false;}
  return !!data;
}
async function applyAuthState(){
  await refreshSession();
  isAdmin=await checkIsAdmin();

  if(authUserEl) authUserEl.textContent=session?.user? `Usuario: ${session.user.email}` : "";

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
    const sb=window.supabase;
    if(!sb?.auth) throw new Error("Supabase no inicializado");
    setAuthMsg("Entrando con código...");
    const code=(authCodeEl?.value||"").trim();
    if(!code) return setAuthMsg("Ingresá un código.");
    const {error}=await sb.auth.signInWithPassword({email:ADMIN_CODE_EMAIL,password:code});
    if(error) throw error;
    await applyAuthState();
  }catch(e){
    console.error(e);setBadge("Error","bad");
    setAuthMsg("Código inválido o error al iniciar sesión.");
  }
});

$("#btn-login")?.addEventListener("click",async()=>{
  try{
    const sb=window.supabase;
    if(!sb?.auth) throw new Error("Supabase no inicializado");
    setAuthMsg("Entrando...");
    const email=(authEmailEl?.value||"").trim(),password=authPassEl?.value||"";
    const {error}=await sb.auth.signInWithPassword({email,password});
    if(error) throw error;
    await applyAuthState();
  }catch(e){
    console.error(e);setBadge("Error","bad");
    setAuthMsg(e?.message||"Error al iniciar sesión");
  }
});

btnLogout?.addEventListener("click",async()=>{
  try{
    const sb=window.supabase;
    if(!sb?.auth) throw new Error("Supabase no inicializado");
    await sb.auth.signOut();
    session=null;isAdmin=false;
    await applyAuthState();
  }catch(e){
    console.error(e);setBadge("Error","bad");
    setAuthMsg("Error al cerrar sesión");
  }
});

// =============================
// Render global mínimo (para esta versión compacta)
// =============================
function renderAll(){
  renderPrices();
  renderCart();
  // (las pantallas Ventas/Caja/Historial se renderizan en tu versión completa)
}

// =============================
// Init
// =============================
(async function init(){
  setActiveChannel("presencial");
  renderAll();
  window.goTo?.("cobrar");

  try{ await applyAuthState(); }catch(e){ console.error("Auth:",e); }

  const sb=window.supabase;
  if(sb?.auth?.onAuthStateChange){
    sb.auth.onAuthStateChange(async(_event,newSession)=>{
      session=newSession;
      await applyAuthState();
      renderAll();
    });
  }
})();