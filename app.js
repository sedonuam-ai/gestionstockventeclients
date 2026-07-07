/* =========================================================
   DONNÉES & PERSISTANCE
========================================================= */
const STORAGE_KEY = 'stockventes_data_v1';
const SETTINGS_KEY = 'stockventes_settings_v1';

let state = { products: [], families: [], clients: [], suppliers: [], documents: [] };
let settings = { currency:'FCFA', tva:18, seq:0, docSeq:0, company:{ name:'SAME GLOBAL SERVICES', address:'', phone:'', logoDataUrl:null } };
let currentTab = 'dashboard';
let currentProductId = null;
let currentFamilyFilter = 'all';
let currentComptaView = 'clients';
let currentDocView = 'devis';
let draftDocItems = [];
let draftDocClientId = '';
let draftDocDate = '';
let draftDocNotes = '';
let draftDocType = 'devis';
let draftDocEditId = null;
let tempLogoDataUrl = null;

const DEFAULT_FAMILIES = [
  { code:'F1', name:'Produits alimentaires' },
  { code:'F2', name:'Produits de beauté' },
  { code:'F3', name:'Produits de savon' }
];

function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) state = JSON.parse(raw);
  }catch(e){ console.error('load error', e); }
  try{
    const rawS = localStorage.getItem(SETTINGS_KEY);
    if(rawS) settings = Object.assign(settings, JSON.parse(rawS));
  }catch(e){}
  if(!Array.isArray(state.products)) state.products = [];
  if(!Array.isArray(state.clients)) state.clients = [];
  if(!Array.isArray(state.suppliers)) state.suppliers = [];
  if(!Array.isArray(state.documents)) state.documents = [];
  if(!settings.company) settings.company = { name:'SAME GLOBAL SERVICES', address:'', phone:'', logoDataUrl:null };
  if(!Array.isArray(state.families) || state.families.length===0){
    state.families = DEFAULT_FAMILIES.map(f=>({ id:uid(), code:f.code, name:f.name, seq:0 }));
    saveData();
  }
}
function saveData(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }catch(e){ toast("Stockage indisponible sur cet appareil"); }
}
function uid(){ settings.seq = (settings.seq||0)+1; return Date.now().toString(36)+'-'+settings.seq; }

/* =========================================================
   FAMILLES DE PRODUITS & RÉFÉRENCES
========================================================= */
function getFamily(id){ return state.families.find(f=>f.id===id); }
function familyLabel(id){ const f = getFamily(id); return f ? `${f.code} — ${f.name}` : 'Sans famille'; }
function nextFamilyCode(){
  const nums = state.families.map(f => parseInt((f.code.match(/\d+/)||['0'])[0], 10)).filter(n=>!isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return 'F' + next;
}
function addFamily(name, code){
  const finalCode = (code && code.trim()) ? code.trim().toUpperCase() : nextFamilyCode();
  const family = { id:uid(), code:finalCode, name:name.trim(), seq:0 };
  state.families.push(family);
  saveData();
  return family;
}
function deleteFamily(id){
  const inUse = state.products.some(p=>p.familyId===id);
  if(inUse){ toast('Impossible : des produits appartiennent encore à cette famille'); return false; }
  state.families = state.families.filter(f=>f.id!==id);
  saveData(); return true;
}
function nextReference(familyId){
  const f = getFamily(familyId);
  if(!f) return '—';
  f.seq = (f.seq||0) + 1;
  return `${f.code}-${String(f.seq).padStart(3,'0')}`;
}

/* =========================================================
   CLIENTS & FOURNISSEURS
========================================================= */
function getClient(id){ return state.clients.find(c=>c.id===id); }
function getSupplier(id){ return state.suppliers.find(s=>s.id===id); }
function clientLabel(id){ const c = getClient(id); return c ? c.name : null; }
function supplierLabel(id){ const s = getSupplier(id); return s ? s.name : null; }

function addClient(data){
  const client = { id:uid(), name:data.name.trim(), phone:(data.phone||'').trim(), address:(data.address||'').trim(), notes:(data.notes||'').trim() };
  state.clients.push(client); saveData(); return client;
}
function updateClient(id, data){
  const c = getClient(id); if(!c) return;
  c.name = data.name.trim(); c.phone = (data.phone||'').trim(); c.address = (data.address||'').trim(); c.notes = (data.notes||'').trim();
  saveData();
}
function deleteClient(id){
  state.clients = state.clients.filter(c=>c.id!==id);
  state.products.forEach(p=> p.sales.forEach(s=>{ if(s.clientId===id) s.clientId=null; }));
  saveData();
}
function addSupplier(data){
  const supplier = { id:uid(), name:data.name.trim(), phone:(data.phone||'').trim(), address:(data.address||'').trim(), notes:(data.notes||'').trim() };
  state.suppliers.push(supplier); saveData(); return supplier;
}
function updateSupplier(id, data){
  const s = getSupplier(id); if(!s) return;
  s.name = data.name.trim(); s.phone = (data.phone||'').trim(); s.address = (data.address||'').trim(); s.notes = (data.notes||'').trim();
  saveData();
}
function deleteSupplier(id){
  state.suppliers = state.suppliers.filter(s=>s.id!==id);
  state.products.forEach(p=> p.entries.forEach(e=>{ if(e.supplierId===id) e.supplierId=null; }));
  saveData();
}
/* Historique agrégé : toutes les ventes liées à un client / tous les achats liés à un fournisseur */
function clientHistory(clientId){
  const rows = [];
  state.products.forEach(p=>{
    p.sales.forEach(s=>{ if(s.clientId===clientId) rows.push({date:s.date, seq:s.seq, prodName:p.name, reference:p.reference, qty:s.qty, amount:s.pvt, label:s.designation}); });
  });
  rows.sort((a,b)=> (b.date||'').localeCompare(a.date||'') || b.seq-a.seq);
  return rows;
}
function supplierHistory(supplierId){
  const rows = [];
  state.products.forEach(p=>{
    p.entries.forEach(e=>{ if(e.supplierId===supplierId) rows.push({date:e.date, seq:e.seq, prodName:p.name, reference:p.reference, qty:e.qty, amount:e.pat, label:e.label}); });
  });
  rows.sort((a,b)=> (b.date||'').localeCompare(a.date||'') || b.seq-a.seq);
  return rows;
}
function findProductBySaleId(saleId){
  return state.products.find(p=>p.sales.some(s=>s.id===saleId));
}
function deleteSaleById(saleId){
  const p = findProductBySaleId(saleId);
  if(p) deleteMove(p.id, 'sale', saleId);
}

/* =========================================================
   PARAMÈTRES ENTREPRISE
========================================================= */
function updateCompany(data){
  settings.company = Object.assign({}, settings.company, data);
  saveData();
}

/* =========================================================
   DEVIS & FACTURES
========================================================= */
function nextDocNumber(){
  settings.docSeq = (settings.docSeq||0) + 1;
  return String(settings.docSeq).padStart(4,'0');
}
function recomputeDocument(doc){
  let totalHT=0, totalTVA=0;
  doc.items.forEach(it=>{
    const p = state.products.find(p=>p.id===it.productId);
    const pmp = p ? p._stock.pmp : (it.lastPmp||0);
    const unitPrice = pmp * (1 + (it.margeB/100));
    it.designation = it.designation || (p ? p.name : 'Article');
    it.unitPrice = unitPrice;
    it.lineHT = unitPrice * it.qty;
    it.lineTVA = it.lineHT * (it.tva/100);
    it.lineTTC = it.lineHT + it.lineTVA;
    totalHT += it.lineHT; totalTVA += it.lineTVA;
  });
  doc.totalHT = totalHT; doc.totalTVA = totalTVA; doc.totalTTC = totalHT + totalTVA;
}
function createDocument({clientId, date, notes, items}){
  const doc = { id:uid(), number:nextDocNumber(), status:'devis', date, factureDate:null,
    clientId: clientId||null, notes: notes||'', items: items.map(it=>({...it})), saleIds:[] };
  recomputeDocument(doc);
  state.documents.push(doc);
  saveData();
  return doc;
}
function updateDocument(docId, {clientId, date, notes, items}){
  const doc = state.documents.find(d=>d.id===docId);
  if(!doc || doc.status!=='devis') return false;
  doc.clientId = clientId||null; doc.date = date; doc.notes = notes||''; doc.items = items.map(it=>({...it}));
  recomputeDocument(doc); saveData(); return true;
}
function convertToFacture(docId, factureDate){
  const doc = state.documents.find(d=>d.id===docId);
  if(!doc || doc.status!=='devis') return { ok:false, error:'Document introuvable' };
  // Vérifie le stock disponible pour toutes les lignes avant d'exécuter quoi que ce soit
  const neededByProduct = {};
  doc.items.forEach(it=>{ neededByProduct[it.productId] = (neededByProduct[it.productId]||0) + it.qty; });
  for(const productId in neededByProduct){
    const p = state.products.find(p=>p.id===productId);
    if(!p || neededByProduct[productId] > p._stock.qty + 1e-9){
      return { ok:false, error:`Stock insuffisant pour "${p?p.name:'produit inconnu'}"` };
    }
  }
  const saleIds = [];
  for(const it of doc.items){
    const p = state.products.find(p=>p.id===it.productId);
    const saleId = addSale(p.id, { date:factureDate, designation:it.designation, qty:it.qty, margeB:it.margeB, tva:it.tva, clientId:doc.clientId });
    if(saleId) saleIds.push(saleId);
  }
  doc.status = 'facture';
  doc.factureDate = factureDate;
  doc.saleIds = saleIds;
  recomputeDocument(doc);
  saveData();
  return { ok:true };
}
function deleteDocument(docId){
  const doc = state.documents.find(d=>d.id===docId);
  if(!doc) return;
  if(doc.status==='facture' && doc.saleIds){
    doc.saleIds.forEach(saleId => deleteSaleById(saleId));
  }
  state.documents = state.documents.filter(d=>d.id!==docId);
  saveData();
}

/* =========================================================
   MOTEUR DE CALCUL (PMP / CUMP, marges, TVA)
========================================================= */
function recomputeProduct(p){
  const moves = [];
  p.entries.forEach(e => moves.push({kind:'entry', ref:e, date:e.date, seq:e.seq}));
  p.exits.forEach(x => moves.push({kind:'exit', ref:x, date:x.date, seq:x.seq}));
  moves.sort((a,b)=> (a.date||'').localeCompare(b.date||'') || a.seq-b.seq);

  let soldeQty = 0, soldeVal = 0;
  moves.forEach(m=>{
    if(m.kind==='entry'){
      const e = m.ref;
      soldeVal += e.qty * e.pau;
      soldeQty += e.qty;
      e.pat = e.qty * e.pau;
      e.soldeQty = soldeQty;
      e.pmp = soldeQty>0 ? soldeVal/soldeQty : 0;
    } else {
      const x = m.ref;
      const pmpAvant = soldeQty>0 ? soldeVal/soldeQty : 0;
      x.pau = pmpAvant;
      x.pat = x.qty * pmpAvant;
      soldeVal -= x.pat;
      soldeQty -= x.qty;
      if(soldeQty < 0){ soldeQty = 0; }
      x.soldeQty = soldeQty;
      x.pmp = soldeQty>0 ? soldeVal/soldeQty : pmpAvant;
    }
  });

  p.sales.forEach(s=>{
    const linkedExit = p.exits.find(x=>x.id===s.exitId);
    if(!linkedExit) return;
    const pmp = linkedExit.pau;
    s.pmp = pmp;
    s.puv = pmp * (1 + (s.margeB/100));
    s.pum = s.puv * s.qty;
    s.tvaMontant = s.pum * (s.tva/100);
    s.pvt = s.pum + s.tvaMontant;
    s.resultat = s.pvt - linkedExit.pat;
  });

  p._stock = { qty: soldeQty, value: soldeVal, pmp: soldeQty>0 ? soldeVal/soldeQty : 0 };
}
function recomputeAll(){ state.products.forEach(recomputeProduct); }

/* =========================================================
   ACTIONS PRODUITS / MOUVEMENTS
========================================================= */
function addProduct(name, unit, familyId){
  const reference = nextReference(familyId);
  state.products.push({ id:uid(), name:name.trim(), unit:unit.trim()||'u', familyId, reference, entries:[], exits:[], sales:[], _stock:{qty:0,value:0,pmp:0} });
  saveData(); render();
}
function deleteProduct(id){
  state.products = state.products.filter(p=>p.id!==id);
  saveData(); render();
}
function addEntry(productId, {date, label, qty, pau, supplierId}){
  const p = state.products.find(p=>p.id===productId);
  p.entries.push({ id:uid(), seq: settings.seq, date, label: label||'Entrée stock', qty:+qty, pau:+pau, supplierId: supplierId||null });
  recomputeProduct(p); saveData(); render();
}
function addExit(productId, {date, label, qty}){
  const p = state.products.find(p=>p.id===productId);
  if(qty > p._stock.qty + 1e-9){ toast('Quantité supérieure au stock disponible'); return false; }
  p.exits.push({ id:uid(), seq: settings.seq, date, label: label||'Sortie stock', qty:+qty });
  recomputeProduct(p); saveData(); render(); return true;
}
function addSale(productId, {date, designation, qty, margeB, tva, clientId}){
  const p = state.products.find(p=>p.id===productId);
  if(qty > p._stock.qty + 1e-9){ toast('Stock insuffisant pour cette vente'); return false; }
  const exitId = uid();
  const saleId = uid();
  p.exits.push({ id:exitId, seq: settings.seq, date, label:'Vente : '+(designation||''), qty:+qty });
  p.sales.push({ id:saleId, seq: settings.seq, date, designation: designation||p.name, qty:+qty, margeB:+margeB, tva:+tva, exitId, clientId: clientId||null });
  recomputeProduct(p); saveData(); render(); return saleId;
}
function deleteMove(productId, kind, id){
  const p = state.products.find(p=>p.id===productId);
  if(kind==='entry') p.entries = p.entries.filter(e=>e.id!==id);
  if(kind==='exit'){ p.exits = p.exits.filter(e=>e.id!==id); p.sales = p.sales.filter(s=>s.exitId!==id); }
  if(kind==='sale'){ const s = p.sales.find(s=>s.id===id); if(s){ p.exits = p.exits.filter(e=>e.id!==s.exitId); } p.sales = p.sales.filter(s=>s.id!==id); }
  recomputeProduct(p); saveData(); render();
}

/* =========================================================
   HELPERS AFFICHAGE
========================================================= */
function money(n){ return (isFinite(n)?n:0).toLocaleString('fr-FR',{minimumFractionDigits:0, maximumFractionDigits:0}) + ' ' + settings.currency; }
function num(n, d=2){ return (isFinite(n)?n:0).toLocaleString('fr-FR',{minimumFractionDigits:d, maximumFractionDigits:d}); }
function fdate(iso){ if(!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'}); }
function today(){ return new Date().toISOString().slice(0,10); }
function toast(msg){
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(window._toastTimer); window._toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
}
function esc(s){ return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* =========================================================
   NAVIGATION
========================================================= */
function setTab(tab, productId){
  currentTab = tab;
  if(productId !== undefined) currentProductId = productId;
  document.querySelectorAll('.tab').forEach(b=> b.classList.toggle('active', b.dataset.tab===tab));
  render();
}

/* =========================================================
   RENDU DES VUES
========================================================= */
function render(){
  const titles = {
    dashboard:['Tableau de bord',"Vue d'ensemble de l'activité"],
    products:['Produits','Catalogue et stocks courants'],
    stock:['Stock','Entrées, sorties &amp; PMP'],
    sales:['Ventes','Facturation &amp; marges'],
    contacts:['Contacts','Clients &amp; fournisseurs'],
    documents:['Devis &amp; Factures','Documents commerciaux PDF']
  };
  document.getElementById('page-title').innerHTML = titles[currentTab][0];
  document.getElementById('page-sub').innerHTML = titles[currentTab][1];
  document.getElementById('eyebrow-date').textContent = new Date().toLocaleDateString('fr-FR',{weekday:'long', day:'numeric', month:'long'});

  const view = document.getElementById('view');
  if(currentTab==='dashboard') view.innerHTML = renderDashboard();
  else if(currentTab==='products') view.innerHTML = renderProducts();
  else if(currentTab==='stock') view.innerHTML = renderStock();
  else if(currentTab==='sales') view.innerHTML = renderSales();
  else if(currentTab==='contacts') view.innerHTML = renderContacts();
  else if(currentTab==='documents') view.innerHTML = renderDocuments();

  document.querySelectorAll('.fab').forEach(f=>f.remove());
  if(currentTab==='products'){
    const fab = document.createElement('button');
    fab.className='fab'; fab.innerHTML='+'; fab.onclick=()=>openProductModal();
    document.getElementById('app').appendChild(fab);
  }
  if(currentTab==='contacts'){
    const fab = document.createElement('button');
    fab.className='fab'; fab.innerHTML='+'; fab.onclick=()=>openContactModal(currentComptaView);
    document.getElementById('app').appendChild(fab);
  }
  if(currentTab==='documents'){
    const fab = document.createElement('button');
    fab.className='fab'; fab.innerHTML='+'; fab.onclick=()=>openDocumentModal();
    document.getElementById('app').appendChild(fab);
  }
}

function renderDashboard(){
  let totalValue=0, totalCA=0, totalResultat=0, totalMouvements=0;
  state.products.forEach(p=>{
    totalValue += p._stock.value;
    p.sales.forEach(s=>{ totalCA += s.pvt; totalResultat += s.resultat; });
    totalMouvements += p.entries.length + p.exits.length;
  });

  const recent = [];
  state.products.forEach(p=>{
    const tag = p.reference ? `${p.reference} — ` : '';
    p.entries.forEach(e=> recent.push({type:'in', date:e.date, seq:e.seq, prod:tag+p.name, label:e.label, qty:e.qty, amount:e.pat}));
    p.exits.forEach(x=>{ if(!p.sales.find(s=>s.exitId===x.id)) recent.push({type:'out', date:x.date, seq:x.seq, prod:tag+p.name, label:x.label, qty:x.qty, amount:x.pat}); });
    p.sales.forEach(s=> recent.push({type:'sale', date:s.date, seq:s.seq, prod:tag+p.name, label:'Vente : '+s.designation, qty:s.qty, amount:s.pvt}));
  });
  recent.sort((a,b)=> (b.date||'').localeCompare(a.date||'') || b.seq-a.seq);
  const top = recent.slice(0,8);

  if(state.products.length===0){
    return emptyState('📊',"Aucune donnée pour l'instant","Ajoute un premier produit dans l'onglet « Produits » pour démarrer le suivi de stock et de ventes.",'products');
  }

  return `
    <div class="kpi-grid">
      <div class="kpi gold"><div class="label">Valeur du stock</div><div class="value">${money(totalValue)}</div></div>
      <div class="kpi green"><div class="label">Chiffre d'affaires</div><div class="value">${money(totalCA)}</div></div>
      <div class="kpi ${totalResultat>=0?'green':'rust'}"><div class="label">Résultat net</div><div class="value">${money(totalResultat)}</div></div>
      <div class="kpi"><div class="label">Produits suivis</div><div class="value">${state.products.length}</div></div>
    </div>
    <h2 class="section-title">Activité récente</h2>
    ${top.length? top.map(r=>`
      <div class="ticket">
        <div class="row">
          <div>
            <span class="pill ${r.type==='in'?'in':r.type==='out'?'out':'sale'}">${r.type==='in'?'ENTRÉE':r.type==='out'?'SORTIE':'VENTE'}</span>
            <div style="margin-top:8px; font-weight:600; font-size:14px;">${esc(r.prod)}</div>
            <div class="prod-meta">${esc(r.label)} · ${fdate(r.date)}</div>
          </div>
          <div style="text-align:right;">
            <div class="prod-pmp"><span class="qty">${r.type==='out'?'-':'+'}${num(r.qty,0)}</span></div>
            <div class="prod-meta">${money(r.amount)}</div>
          </div>
        </div>
      </div>`).join('') : '<div class="empty"><p>Aucun mouvement enregistré.</p></div>'}
  `;
}

function renderProducts(){
  if(state.products.length===0){
    return emptyState('📦','Aucun produit','Crée ton premier article : choisis sa famille, sa référence est générée automatiquement.', null, true);
  }
  const filtered = currentFamilyFilter==='all' ? state.products : state.products.filter(p=>p.familyId===currentFamilyFilter);
  const filterBar = `
    <div class="scroll-x" style="margin-bottom:14px;">
      <div class="segmented" style="display:inline-flex; width:auto;">
        <button class="${currentFamilyFilter==='all'?'active':''}" onclick="currentFamilyFilter='all'; render();">Toutes</button>
        ${state.families.map(f=>`<button class="${currentFamilyFilter===f.id?'active':''}" onclick="currentFamilyFilter='${f.id}'; render();">${esc(f.code)}</button>`).join('')}
      </div>
    </div>
    <div class="row" style="margin-bottom:14px;">
      <a class="link-btn" onclick="openFamiliesModal()">⚙️ Gérer les familles de produits</a>
    </div>`;
  const list = filtered.length ? filtered.map(p=>`
    <div class="prod-item" onclick="openProduct('${p.id}')">
      <div>
        <div class="prod-name">${esc(p.name)}</div>
        <div class="prod-meta"><span class="pill" style="background:var(--surface-3); color:var(--gold);">${esc(p.reference||'—')}</span> · ${esc(familyLabel(p.familyId))}</div>
        <div class="prod-meta">${p.entries.length} entrée(s) · ${p.exits.length} sortie(s) · ${p.sales.length} vente(s)</div>
      </div>
      <div class="prod-pmp">
        <div class="qty">${num(p._stock.qty,0)} ${esc(p.unit)}</div>
        <div class="lbl">PMP ${money(p._stock.pmp)}</div>
      </div>
    </div>
  `).join('') : '<div class="empty"><p>Aucun produit dans cette famille.</p></div>';
  return filterBar + list;
}

function openProduct(id){ currentProductId = id; setTab('stock', id); }

function productPicker(actionLabel){
  if(state.products.length===0) return '';
  return `
    <div class="field">
      <label>Produit</label>
      <select id="picker-product" onchange="currentProductId=this.value; render();">
        ${state.products.map(p=>`<option value="${p.id}" ${p.id===currentProductId?'selected':''}>${esc(p.reference||'—')} — ${esc(p.name)}</option>`).join('')}
      </select>
    </div>`;
}

function renderStock(){
  if(state.products.length===0) return emptyState('📦','Aucun produit',"Ajoute d'abord un produit dans l'onglet « Produits ».", null, true);
  if(!currentProductId || !state.products.find(p=>p.id===currentProductId)) currentProductId = state.products[0].id;
  const p = state.products.find(p=>p.id===currentProductId);

  const moves = [];
  p.entries.forEach(e=> moves.push({...e, kind:'entry'}));
  p.exits.forEach(x=> moves.push({...x, kind:'exit'}));
  moves.sort((a,b)=> (b.date||'').localeCompare(a.date||'') || b.seq-a.seq);

  return `
    ${productPicker()}
    <div class="row" style="margin:-4px 0 14px;">
      <span class="pill" style="background:var(--surface-3); color:var(--gold);">${esc(p.reference||'—')}</span>
      <span class="prod-meta">${esc(familyLabel(p.familyId))}</span>
    </div>
    <div class="kpi-grid">
      <div class="kpi"><div class="label">Stock actuel</div><div class="value">${num(p._stock.qty,0)} ${esc(p.unit)}</div></div>
      <div class="kpi gold"><div class="label">PMP</div><div class="value">${money(p._stock.pmp)}</div></div>
    </div>
    <div class="btn-row" style="margin-bottom:18px;">
      <button class="btn btn-gold" onclick="openEntryModal('${p.id}')">+ Entrée</button>
      <button class="btn btn-ghost" onclick="openExitModal('${p.id}')">− Sortie</button>
    </div>
    <h2 class="section-title">Historique des mouvements</h2>
    ${moves.length ? moves.map(m=>`
      <div class="ticket">
        <div class="row">
          <div>
            <span class="pill ${m.kind==='entry'?'in':'out'}">${m.kind==='entry'?'ENTRÉE':'SORTIE'}</span>
            <div style="margin-top:8px; font-weight:600; font-size:14px;">${esc(m.label)}</div>
            <div class="prod-meta">${fdate(m.date)} · PAU ${money(m.pau)} · Solde après : ${num(m.soldeQty,0)} ${esc(p.unit)}</div>
            ${m.supplierId && supplierLabel(m.supplierId) ? `<div class="prod-meta">🚚 ${esc(supplierLabel(m.supplierId))}</div>` : ''}
          </div>
          <div style="text-align:right;">
            <div class="prod-pmp"><span class="qty">${m.kind==='exit'?'-':'+'}${num(m.qty,0)}</span></div>
            <div class="prod-meta">${money(m.pat)}</div>
            <button class="btn btn-sm btn-danger" style="margin-top:8px;" onclick="event.stopPropagation(); if(confirm('Supprimer ce mouvement ?')) deleteMove('${p.id}','${m.kind}','${m.id}')">Suppr.</button>
          </div>
        </div>
      </div>`).join('') : '<div class="empty"><p>Aucun mouvement pour ce produit.</p></div>'}
  `;
}

function renderSales(){
  if(state.products.length===0) return emptyState('🧾','Aucun produit',"Ajoute d'abord un produit dans l'onglet « Produits ».", null, true);
  if(!currentProductId || !state.products.find(p=>p.id===currentProductId)) currentProductId = state.products[0].id;
  const p = state.products.find(p=>p.id===currentProductId);
  const sales = [...p.sales].sort((a,b)=> (b.date||'').localeCompare(a.date||'') || b.seq-a.seq);

  let ca=0, resultat=0;
  p.sales.forEach(s=>{ ca+=s.pvt; resultat+=s.resultat; });

  return `
    ${productPicker()}
    <div class="row" style="margin:-4px 0 14px;">
      <span class="pill" style="background:var(--surface-3); color:var(--gold);">${esc(p.reference||'—')}</span>
      <span class="prod-meta">${esc(familyLabel(p.familyId))}</span>
    </div>
    <div class="kpi-grid">
      <div class="kpi green"><div class="label">CA produit</div><div class="value">${money(ca)}</div></div>
      <div class="kpi ${resultat>=0?'green':'rust'}"><div class="label">Résultat</div><div class="value">${money(resultat)}</div></div>
    </div>
    <button class="btn btn-gold" style="margin-bottom:18px;" onclick="openSaleModal('${p.id}')">+ Nouvelle vente</button>
    <h2 class="section-title">Historique des ventes</h2>
    ${sales.length ? sales.map(s=>`
      <div class="ticket">
        <div class="row">
          <div>
            <span class="pill sale">VENTE</span>
            <div style="margin-top:8px; font-weight:600; font-size:14px;">${esc(s.designation)}</div>
            <div class="prod-meta">${fdate(s.date)} · ${num(s.qty,0)} ${esc(p.unit)} · PMP ${money(s.pmp)} · marge ${s.margeB}% · TVA ${s.tva}%</div>
            ${s.clientId && clientLabel(s.clientId) ? `<div class="prod-meta">👤 ${esc(clientLabel(s.clientId))}</div>` : ''}
          </div>
          <div style="text-align:right;">
            <div class="prod-pmp"><span class="qty" style="color:var(--green)">${money(s.pvt)}</span></div>
            <div class="prod-meta">Résultat ${money(s.resultat)}</div>
            <button class="btn btn-sm btn-danger" style="margin-top:8px;" onclick="event.stopPropagation(); if(confirm('Supprimer cette vente ?')) deleteMove('${p.id}','sale','${s.id}')">Suppr.</button>
          </div>
        </div>
      </div>`).join('') : '<div class="empty"><p>Aucune vente enregistrée pour ce produit.</p></div>'}
  `;
}

function emptyState(icon,title,text,goTab,showAddBtn){
  return `
    <div class="empty">
      <div class="icon">${icon}</div>
      <h3 style="color:var(--text); margin:0 0 8px;">${title}</h3>
      <p>${text}</p>
      ${showAddBtn? '<button class="btn btn-gold" style="width:auto; padding:12px 22px;" onclick="openProductModal()">+ Ajouter un produit</button>' : (goTab? `<button class="btn btn-gold" style="width:auto; padding:12px 22px;" onclick="setTab('${goTab}')">Aller à ${goTab}</button>` : '')}
    </div>`;
}

function renderContacts(){
  const isClients = currentComptaView==='clients';
  const list = isClients ? state.clients : state.suppliers;
  const switcher = `
    <div class="segmented" style="margin-bottom:16px;">
      <button class="${isClients?'active':''}" onclick="currentComptaView='clients'; render();">👤 Clients</button>
      <button class="${!isClients?'active':''}" onclick="currentComptaView='suppliers'; render();">🚚 Fournisseurs</button>
    </div>`;
  if(list.length===0){
    return switcher + `
      <div class="empty">
        <div class="icon">${isClients?'👤':'🚚'}</div>
        <h3 style="color:var(--text); margin:0 0 8px;">${isClients?'Aucun client':'Aucun fournisseur'}</h3>
        <p>${isClients?"Ajoute tes clients pour suivre qui achète quoi.":"Ajoute tes fournisseurs pour suivre tes achats."}</p>
        <button class="btn btn-gold" style="width:auto; padding:12px 22px;" onclick="openContactModal('${currentComptaView}')">+ Ajouter ${isClients?'un client':'un fournisseur'}</button>
      </div>`;
  }
  const rows = list.map(c=>{
    const hist = isClients ? clientHistory(c.id) : supplierHistory(c.id);
    const total = hist.reduce((s,h)=>s+h.amount,0);
    return `
      <div class="prod-item" onclick="openContactDetail('${isClients?'clients':'suppliers'}','${c.id}')">
        <div>
          <div class="prod-name">${esc(c.name)}</div>
          <div class="prod-meta">${esc(c.phone||'Pas de téléphone')}</div>
        </div>
        <div class="prod-pmp">
          <div class="qty">${money(total)}</div>
          <div class="lbl">${hist.length} ${isClients?'vente(s)':'achat(s)'}</div>
        </div>
      </div>`;
  }).join('');
  return switcher + rows;
}

function renderDocuments(){
  const isDevis = currentDocView==='devis';
  const list = state.documents.filter(d=> isDevis ? d.status==='devis' : d.status==='facture')
    .sort((a,b)=> (b.date||'').localeCompare(a.date||'') || b.number.localeCompare(a.number));
  const switcher = `
    <div class="segmented" style="margin-bottom:12px;">
      <button class="${isDevis?'active':''}" onclick="currentDocView='devis'; render();">📝 Devis</button>
      <button class="${!isDevis?'active':''}" onclick="currentDocView='facture'; render();">🧾 Factures</button>
    </div>
    <div class="row" style="margin-bottom:16px;">
      <a class="link-btn" onclick="openCompanySettingsModal()">🏢 Paramètres de l'entreprise</a>
    </div>`;
  if(list.length===0){
    return switcher + `
      <div class="empty">
        <div class="icon">${isDevis?'📝':'🧾'}</div>
        <h3 style="color:var(--text); margin:0 0 8px;">${isDevis?'Aucun devis':'Aucune facture'}</h3>
        <p>${isDevis?"Crée un devis multi-produits pour un client, puis convertis-le en facture.":"Les devis convertis en facture apparaissent ici."}</p>
        ${isDevis?'<button class="btn btn-gold" style="width:auto; padding:12px 22px;" onclick="openDocumentModal()">+ Nouveau devis</button>':''}
      </div>`;
  }
  const rows = list.map(d=>{
    const client = d.clientId ? getClient(d.clientId) : null;
    return `
      <div class="ticket" onclick="openDocumentDetail('${d.id}')" style="cursor:pointer;">
        <div class="row">
          <div>
            <span class="pill ${isDevis?'':'sale'}">${isDevis?'DEVIS':'FACTURE'} N°${esc(d.number)}</span>
            <div style="margin-top:8px; font-weight:600; font-size:14px;">${esc(client?client.name:'Client non renseigné')}</div>
            <div class="prod-meta">${fdate(isDevis?d.date:d.factureDate)} · ${d.items.length} ligne(s)</div>
          </div>
          <div style="text-align:right;">
            <div class="prod-pmp"><span class="qty" style="color:var(--gold)">${money(d.totalTTC)}</span></div>
          </div>
        </div>
      </div>`;
  }).join('');
  return switcher + rows;
}

/* =========================================================
   MODALES (sheets)
========================================================= */
function closeModal(){ document.getElementById('modal-root').innerHTML=''; }

function openProductModal(){
  if(state.families.length===0){
    toast("Crée d'abord une famille de produits");
    openFamiliesModal();
    return;
  }
  document.getElementById('modal-root').innerHTML = `
    <div class="overlay" onclick="if(event.target===this) closeModal()">
      <div class="sheet">
        <button class="close-x" onclick="closeModal()">✕</button>
        <h3>Nouveau produit</h3>
        <p class="sheet-sub">Crée un article à suivre en stock et en vente. Sa référence est générée automatiquement à partir de la famille choisie.</p>
        <div class="field">
          <label>Famille de produits</label>
          <select id="f-family">
            ${state.families.map(f=>`<option value="${f.id}">${esc(f.code)} — ${esc(f.name)}</option>`).join('')}
          </select>
          <div class="helper" id="f-ref-preview">Référence : ${esc(state.families[0].code)}-${String((state.families[0].seq||0)+1).padStart(3,'0')}</div>
        </div>
        <div class="field"><label>Nom de l'article</label><input id="f-name" type="text" placeholder="Ex : Sac de riz 25kg" autofocus></div>
        <div class="field"><label>Unité</label><input id="f-unit" type="text" placeholder="Ex : pièce, kg, carton" value="pièce"></div>
        <button class="btn btn-gold" onclick="submitProduct()">Ajouter le produit</button>
      </div>
    </div>`;
  document.getElementById('f-family').addEventListener('change', updateRefPreview);
}
function updateRefPreview(){
  const f = getFamily(document.getElementById('f-family').value);
  if(!f) return;
  document.getElementById('f-ref-preview').textContent = `Référence : ${f.code}-${String((f.seq||0)+1).padStart(3,'0')}`;
}
function submitProduct(){
  const name = document.getElementById('f-name').value.trim();
  if(!name){ toast("Indique un nom d'article"); return; }
  const unit = document.getElementById('f-unit').value;
  const familyId = document.getElementById('f-family').value;
  addProduct(name, unit, familyId);
  closeModal();
  toast('Produit ajouté');
}

/* ---- Gestion des familles de produits ---- */
function openFamiliesModal(){
  document.getElementById('modal-root').innerHTML = `
    <div class="overlay" onclick="if(event.target===this) closeModal()">
      <div class="sheet">
        <button class="close-x" onclick="closeModal()">✕</button>
        <h3>Familles de produits</h3>
        <p class="sheet-sub">Chaque famille possède un code (ex. F1) qui préfixe la référence de ses produits.</p>
        <div id="families-list">
          ${state.families.map(f=>`
            <div class="row" style="padding:10px 0; border-bottom:1px solid var(--border);">
              <div>
                <div style="font-weight:600; font-family:var(--mono); color:var(--gold);">${esc(f.code)}</div>
                <div class="prod-meta">${esc(f.name)}</div>
              </div>
              <button class="btn btn-sm btn-danger" onclick="if(confirm('Supprimer cette famille ?')) { deleteFamily('${f.id}'); openFamiliesModal(); }">Suppr.</button>
            </div>`).join('')}
        </div>
        <h3 style="margin-top:20px; font-size:14px;">Ajouter une famille</h3>
        <div class="field-row">
          <div class="field" style="flex:0 0 90px;"><label>Code</label><input id="nf-code" type="text" placeholder="${esc(nextFamilyCode())}"></div>
          <div class="field"><label>Nom</label><input id="nf-name" type="text" placeholder="Ex : Produits d'entretien"></div>
        </div>
        <button class="btn btn-ghost" onclick="submitFamily()">+ Ajouter la famille</button>
      </div>
    </div>`;
}
function submitFamily(){
  const name = document.getElementById('nf-name').value.trim();
  if(!name){ toast('Indique un nom de famille'); return; }
  const code = document.getElementById('nf-code').value.trim();
  addFamily(name, code);
  openFamiliesModal();
  toast('Famille ajoutée');
}

/* ---- Gestion des clients & fournisseurs ---- */
function openContactModal(type, editId){
  const isClients = type==='clients';
  const editing = editId ? (isClients?getClient(editId):getSupplier(editId)) : null;
  document.getElementById('modal-root').innerHTML = `
    <div class="overlay" onclick="if(event.target===this) closeModal()">
      <div class="sheet">
        <button class="close-x" onclick="closeModal()">✕</button>
        <h3>${editing?'Modifier':'Nouveau'} ${isClients?'client':'fournisseur'}</h3>
        <div class="field"><label>Nom</label><input id="c-name" type="text" placeholder="Ex : ${isClients?'Boutique Awa':'Grossiste Diallo & Fils'}" value="${editing?esc(editing.name):''}" autofocus></div>
        <div class="field"><label>Téléphone</label><input id="c-phone" type="tel" placeholder="Ex : 77 123 45 67" value="${editing?esc(editing.phone):''}"></div>
        <div class="field"><label>Adresse</label><input id="c-address" type="text" placeholder="Ex : Marché central, stand 12" value="${editing?esc(editing.address):''}"></div>
        <div class="field"><label>Notes</label><input id="c-notes" type="text" placeholder="Facultatif" value="${editing?esc(editing.notes):''}"></div>
        <button class="btn btn-gold" onclick="submitContact('${type}'${editing?`,'${editId}'`:''})">${editing?'Enregistrer':'Ajouter'}</button>
      </div>
    </div>`;
}
function submitContact(type, editId){
  const name = document.getElementById('c-name').value.trim();
  if(!name){ toast('Indique un nom'); return; }
  const data = { name, phone:document.getElementById('c-phone').value, address:document.getElementById('c-address').value, notes:document.getElementById('c-notes').value };
  if(type==='clients'){
    if(editId) updateClient(editId, data); else addClient(data);
  } else {
    if(editId) updateSupplier(editId, data); else addSupplier(data);
  }
  closeModal(); currentComptaView = type; render();
  toast(editId?'Contact mis à jour':'Contact ajouté');
}
function openContactDetail(type, id){
  const isClients = type==='clients';
  const c = isClients ? getClient(id) : getSupplier(id);
  if(!c) return;
  const hist = isClients ? clientHistory(id) : supplierHistory(id);
  const total = hist.reduce((s,h)=>s+h.amount,0);
  document.getElementById('modal-root').innerHTML = `
    <div class="overlay" onclick="if(event.target===this) closeModal()">
      <div class="sheet">
        <button class="close-x" onclick="closeModal()">✕</button>
        <h3>${esc(c.name)}</h3>
        <p class="sheet-sub">${esc(c.phone||'Pas de téléphone')}${c.address?' · '+esc(c.address):''}</p>
        ${c.notes?`<p class="prod-meta" style="margin:-10px 0 14px;">${esc(c.notes)}</p>`:''}
        <div class="kpi-grid">
          <div class="kpi ${isClients?'green':'gold'}"><div class="label">${isClients?'Total acheté':'Total fourni'}</div><div class="value">${money(total)}</div></div>
          <div class="kpi"><div class="label">${isClients?'Ventes':'Livraisons'}</div><div class="value">${hist.length}</div></div>
        </div>
        <div class="btn-row" style="margin-bottom:16px;">
          <button class="btn btn-ghost" onclick="openContactModal('${type}','${id}')">Modifier</button>
          <button class="btn btn-danger" onclick="if(confirm('Supprimer ce contact ?')) { ${isClients?'deleteClient':'deleteSupplier'}('${id}'); closeModal(); render(); }">Supprimer</button>
        </div>
        <h2 class="section-title" style="margin-top:0;">Historique</h2>
        ${hist.length ? hist.map(h=>`
          <div class="ticket">
            <div class="row">
              <div>
                <div style="font-weight:600; font-size:14px;">${esc(h.reference||'')} — ${esc(h.prodName)}</div>
                <div class="prod-meta">${esc(h.label)} · ${fdate(h.date)}</div>
              </div>
              <div style="text-align:right;">
                <div class="prod-pmp"><span class="qty">${num(h.qty,0)}</span></div>
                <div class="prod-meta">${money(h.amount)}</div>
              </div>
            </div>
          </div>`).join('') : '<div class="empty"><p>Aucun historique pour ce contact.</p></div>'}
      </div>
    </div>`;
}

function openEntryModal(productId){
  document.getElementById('modal-root').innerHTML = `
    <div class="overlay" onclick="if(event.target===this) closeModal()">
      <div class="sheet">
        <button class="close-x" onclick="closeModal()">✕</button>
        <h3>Entrée de stock</h3>
        <p class="sheet-sub">Réception de marchandise (achat, réappro...).</p>
        <div class="field-row">
          <div class="field"><label>Date</label><input id="f-date" type="date" value="${today()}"></div>
          <div class="field"><label>Quantité</label><input id="f-qty" type="number" min="0" step="any" placeholder="0"></div>
        </div>
        <div class="field"><label>Libellé</label><input id="f-label" type="text" placeholder="Ex : Facture N°12"></div>
        <div class="field"><label>Prix d'achat unitaire (P.A.U.)</label><input id="f-pau" type="number" min="0" step="any" placeholder="0.00"></div>
        <div class="field">
          <label>Fournisseur (facultatif)</label>
          <select id="f-supplier">
            <option value="">— Aucun —</option>
            ${state.suppliers.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}
          </select>
          <div class="helper"><a class="link-btn" onclick="closeModal(); currentComptaView='suppliers'; setTab('contacts');">+ Gérer les fournisseurs</a></div>
        </div>
        <button class="btn btn-gold" onclick="submitEntry('${productId}')">Enregistrer l'entrée</button>
      </div>
    </div>`;
}
function submitEntry(productId){
  const qty = parseFloat(document.getElementById('f-qty').value);
  const pau = parseFloat(document.getElementById('f-pau').value);
  if(!qty || qty<=0){ toast('Quantité invalide'); return; }
  if(isNaN(pau) || pau<0){ toast("Prix d'achat invalide"); return; }
  const supplierId = document.getElementById('f-supplier').value || null;
  addEntry(productId, { date:document.getElementById('f-date').value, label:document.getElementById('f-label').value, qty, pau, supplierId });
  closeModal(); toast('Entrée enregistrée');
}

function openExitModal(productId){
  document.getElementById('modal-root').innerHTML = `
    <div class="overlay" onclick="if(event.target===this) closeModal()">
      <div class="sheet">
        <button class="close-x" onclick="closeModal()">✕</button>
        <h3>Sortie de stock</h3>
        <p class="sheet-sub">Sortie hors vente (perte, casse, usage interne...). Pour une vente, utilise l'onglet Ventes.</p>
        <div class="field-row">
          <div class="field"><label>Date</label><input id="f-date" type="date" value="${today()}"></div>
          <div class="field"><label>Quantité</label><input id="f-qty" type="number" min="0" step="any" placeholder="0"></div>
        </div>
        <div class="field"><label>Libellé</label><input id="f-label" type="text" placeholder="Ex : Casse, don, usage interne"></div>
        <button class="btn btn-gold" onclick="submitExit('${productId}')">Enregistrer la sortie</button>
      </div>
    </div>`;
}
function submitExit(productId){
  const qty = parseFloat(document.getElementById('f-qty').value);
  if(!qty || qty<=0){ toast('Quantité invalide'); return; }
  const ok = addExit(productId, { date:document.getElementById('f-date').value, label:document.getElementById('f-label').value, qty });
  if(ok!==false){ closeModal(); toast('Sortie enregistrée'); }
}

function openSaleModal(productId){
  const p = state.products.find(p=>p.id===productId);
  document.getElementById('modal-root').innerHTML = `
    <div class="overlay" onclick="if(event.target===this) closeModal()">
      <div class="sheet">
        <button class="close-x" onclick="closeModal()">✕</button>
        <h3>Nouvelle vente</h3>
        <p class="sheet-sub">Stock disponible : ${num(p._stock.qty,0)} ${esc(p.unit)} · PMP ${money(p._stock.pmp)}</p>
        <div class="field-row">
          <div class="field"><label>Date</label><input id="f-date" type="date" value="${today()}"></div>
          <div class="field"><label>Quantité</label><input id="f-qty" type="number" min="0" step="any" placeholder="0"></div>
        </div>
        <div class="field"><label>Désignation (n° facture...)</label><input id="f-desig" type="text" placeholder="Ex : Facture n°3" value="${esc(p.name)}"></div>
        <div class="field">
          <label>Client (facultatif)</label>
          <select id="f-client">
            <option value="">— Aucun —</option>
            ${state.clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}
          </select>
          <div class="helper"><a class="link-btn" onclick="closeModal(); currentComptaView='clients'; setTab('contacts');">+ Gérer les clients</a></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Marge brute (%)</label><input id="f-marge" type="number" min="0" step="any" value="80"></div>
          <div class="field"><label>TVA (%)</label><input id="f-tva" type="number" min="0" step="any" value="${settings.tva}"></div>
        </div>
        <div class="helper">Prix de vente = PMP × (1 + marge). Résultat = PVT − coût de sortie stock.</div>
        <button class="btn btn-gold" style="margin-top:16px;" onclick="submitSale('${productId}')">Enregistrer la vente</button>
      </div>
    </div>`;
}
function submitSale(productId){
  const qty = parseFloat(document.getElementById('f-qty').value);
  if(!qty || qty<=0){ toast('Quantité invalide'); return; }
  const margeB = parseFloat(document.getElementById('f-marge').value) || 0;
  const tva = parseFloat(document.getElementById('f-tva').value) || 0;
  const clientId = document.getElementById('f-client').value || null;
  const ok = addSale(productId, { date:document.getElementById('f-date').value, designation:document.getElementById('f-desig').value, qty, margeB, tva, clientId });
  if(ok!==false){ closeModal(); toast('Vente enregistrée'); }
}

/* ---- Paramètres entreprise (logo, coordonnées) ---- */
function openCompanySettingsModal(){
  const c = settings.company || {};
  tempLogoDataUrl = c.logoDataUrl || null;
  document.getElementById('modal-root').innerHTML = `
    <div class="overlay" onclick="if(event.target===this) closeModal()">
      <div class="sheet">
        <button class="close-x" onclick="closeModal()">✕</button>
        <h3>Paramètres de l'entreprise</h3>
        <p class="sheet-sub">Ces informations apparaissent sur tes devis et factures PDF.</p>
        <div class="field">
          <label>Logo</label>
          <div id="logo-preview" style="margin-bottom:8px;">${tempLogoDataUrl?`<img src="${tempLogoDataUrl}" style="max-height:60px; border-radius:8px;">`:'<span class="prod-meta">Aucun logo</span>'}</div>
          <input id="c-logo" type="file" accept="image/*" onchange="handleLogoUpload(event)">
        </div>
        <div class="field"><label>Nom de l'entreprise</label><input id="c-name" type="text" value="${esc(c.name||'')}"></div>
        <div class="field"><label>Adresse</label><input id="c-address" type="text" value="${esc(c.address||'')}" placeholder="Ex : Marché central, Dakar"></div>
        <div class="field"><label>Téléphone</label><input id="c-phone" type="tel" value="${esc(c.phone||'')}" placeholder="Ex : 77 123 45 67"></div>
        <button class="btn btn-gold" onclick="submitCompanySettings()">Enregistrer</button>
      </div>
    </div>`;
}
function handleLogoUpload(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    const img = new Image();
    img.onload = function(){
      const maxW = 320;
      const scale = Math.min(1, maxW/img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width*scale); canvas.height = Math.round(img.height*scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      tempLogoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const preview = document.getElementById('logo-preview');
      if(preview) preview.innerHTML = `<img src="${tempLogoDataUrl}" style="max-height:60px; border-radius:8px;">`;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function submitCompanySettings(){
  const name = document.getElementById('c-name').value.trim();
  if(!name){ toast("Indique un nom d'entreprise"); return; }
  updateCompany({ name, address:document.getElementById('c-address').value, phone:document.getElementById('c-phone').value, logoDataUrl: tempLogoDataUrl });
  closeModal(); render(); toast('Paramètres enregistrés');
}

/* ---- Devis & Factures ---- */
function makeEmptyDocItem(){
  return { productId: state.products.length?state.products[0].id:'', qty:1, margeB:80, tva:settings.tva };
}
function renderDraftItemsHTML(){
  if(state.products.length===0) return '<p class="prod-meta">Aucun produit disponible.</p>';
  return draftDocItems.map((it,idx)=>`
    <div class="ticket" style="margin-bottom:10px;">
      <div class="field">
        <label>Produit</label>
        <select onchange="updateDraftItem(${idx},'productId',this.value)">
          ${state.products.map(p=>`<option value="${p.id}" ${p.id===it.productId?'selected':''}>${esc(p.reference||'—')} — ${esc(p.name)}</option>`).join('')}
        </select>
      </div>
      <div class="field-row">
        <div class="field"><label>Quantité</label><input type="number" min="0" step="any" value="${it.qty}" oninput="updateDraftItem(${idx},'qty',this.value)"></div>
        <div class="field"><label>Marge (%)</label><input type="number" min="0" step="any" value="${it.margeB}" oninput="updateDraftItem(${idx},'margeB',this.value)"></div>
        <div class="field"><label>TVA (%)</label><input type="number" min="0" step="any" value="${it.tva}" oninput="updateDraftItem(${idx},'tva',this.value)"></div>
      </div>
      ${draftDocItems.length>1?`<button class="btn btn-sm btn-danger" onclick="removeDraftItem(${idx})">Retirer cette ligne</button>`:''}
    </div>`).join('');
}
function refreshDocItemsUI(){
  const el = document.getElementById('doc-items');
  if(el) el.innerHTML = renderDraftItemsHTML();
}
function addDraftItem(){ draftDocItems.push(makeEmptyDocItem()); refreshDocItemsUI(); }
function removeDraftItem(idx){ draftDocItems.splice(idx,1); if(draftDocItems.length===0) draftDocItems.push(makeEmptyDocItem()); refreshDocItemsUI(); }
function updateDraftItem(idx, field, value){
  if(!draftDocItems[idx]) return;
  draftDocItems[idx][field] = (field==='productId') ? value : parseFloat(value)||0;
}
function openDocumentModal(editId){
  if(state.products.length===0){ toast("Ajoute d'abord au moins un produit dans l'onglet Produits"); return; }
  const editing = editId ? state.documents.find(d=>d.id===editId) : null;
  if(editing && editing.status!=='devis'){ toast('Une facture ne peut plus être modifiée'); return; }
  if(editing){
    draftDocEditId = editId;
    draftDocClientId = editing.clientId || '';
    draftDocDate = editing.date;
    draftDocNotes = editing.notes || '';
    draftDocItems = editing.items.map(it=>({ productId: it.productId, qty: it.qty, margeB: it.margeB, tva: it.tva }));
  } else {
    draftDocEditId = null;
    draftDocClientId = '';
    draftDocDate = today();
    draftDocNotes = '';
    draftDocItems = [ makeEmptyDocItem() ];
  }
  document.getElementById('modal-root').innerHTML = `
    <div class="overlay" onclick="if(event.target===this) closeModal()">
      <div class="sheet">
        <button class="close-x" onclick="closeModal()">✕</button>
        <h3>${editing?'Modifier le devis':'Nouveau devis'}</h3>
        <p class="sheet-sub">Le devis pourra ensuite être converti en facture — le stock ne bouge qu'à ce moment-là.</p>
        <div class="field">
          <label>Client (facultatif)</label>
          <select id="doc-client">
            <option value="">— Aucun —</option>
            ${state.clients.map(c=>`<option value="${c.id}" ${c.id===draftDocClientId?'selected':''}>${esc(c.name)}</option>`).join('')}
          </select>
          <div class="helper"><a class="link-btn" onclick="closeModal(); currentComptaView='clients'; setTab('contacts');">+ Gérer les clients</a></div>
        </div>
        <div class="field"><label>Date du devis</label><input id="doc-date" type="date" value="${draftDocDate}"></div>
        <h2 class="section-title" style="margin-top:6px;">Lignes</h2>
        <div id="doc-items">${renderDraftItemsHTML()}</div>
        <button class="btn btn-ghost" style="margin-bottom:16px;" onclick="addDraftItem()">+ Ajouter une ligne</button>
        <div class="field"><label>Notes (facultatif)</label><input id="doc-notes" type="text" value="${esc(draftDocNotes)}" placeholder="Ex : Validité 15 jours"></div>
        <button class="btn btn-gold" onclick="submitDocumentModal()">${editing?'Enregistrer les modifications':'Créer le devis'}</button>
      </div>
    </div>`;
}
function submitDocumentModal(){
  const clientId = document.getElementById('doc-client').value || null;
  const date = document.getElementById('doc-date').value;
  const notes = document.getElementById('doc-notes').value;
  const items = draftDocItems.filter(it=>it.productId && it.qty>0);
  if(items.length===0){ toast('Ajoute au moins une ligne valide'); return; }
  if(draftDocEditId){
    updateDocument(draftDocEditId, {clientId, date, notes, items});
    toast('Devis mis à jour');
  } else {
    createDocument({clientId, date, notes, items});
    toast('Devis créé');
  }
  closeModal(); currentTab='documents'; currentDocView='devis'; render();
}
function handleConvertToFacture(docId){
  if(!confirm('Convertir ce devis en facture ? Le stock sera déduit à cette date.')) return;
  const res = convertToFacture(docId, today());
  if(!res.ok){ toast(res.error); return; }
  toast('Converti en facture, stock mis à jour');
  closeModal(); currentDocView='facture'; render();
}
function openDocumentDetail(docId){
  const doc = state.documents.find(d=>d.id===docId);
  if(!doc) return;
  const client = doc.clientId ? getClient(doc.clientId) : null;
  const isDevis = doc.status==='devis';
  document.getElementById('modal-root').innerHTML = `
    <div class="overlay" onclick="if(event.target===this) closeModal()">
      <div class="sheet">
        <button class="close-x" onclick="closeModal()">✕</button>
        <h3>${isDevis?'Devis':'Facture'} N°${esc(doc.number)}</h3>
        <p class="sheet-sub">${client?esc(client.name):'Client non renseigné'} · ${fdate(isDevis?doc.date:doc.factureDate)}</p>
        <div class="kpi-grid">
          <div class="kpi"><div class="label">Total HT</div><div class="value">${money(doc.totalHT)}</div></div>
          <div class="kpi gold"><div class="label">Total TTC</div><div class="value">${money(doc.totalTTC)}</div></div>
        </div>
        <h2 class="section-title" style="margin-top:0;">Lignes</h2>
        ${doc.items.map(it=>`
          <div class="ticket">
            <div class="row">
              <div>
                <div style="font-weight:600; font-size:14px;">${esc(it.designation)}</div>
                <div class="prod-meta">${num(it.qty,0)} × ${money(it.unitPrice)} · TVA ${it.tva}%</div>
              </div>
              <div style="text-align:right;">
                <div class="prod-pmp"><span class="qty">${money(it.lineTTC)}</span></div>
              </div>
            </div>
          </div>`).join('')}
        ${doc.notes?`<p class="prod-meta" style="margin:12px 0 0;">${esc(doc.notes)}</p>`:''}
        <button class="btn btn-gold" style="margin-top:18px;" onclick="printDocument('${doc.id}')">🖨️ Imprimer / Enregistrer en PDF</button>
        <div class="btn-row" style="margin-top:10px;">
          ${isDevis?`<button class="btn btn-ghost" onclick="openDocumentModal('${doc.id}')">Modifier</button>`:''}
          ${isDevis?`<button class="btn btn-ghost" onclick="handleConvertToFacture('${doc.id}')">Convertir en facture</button>`:''}
        </div>
        <button class="btn btn-danger" style="width:100%; margin-top:10px;" onclick="if(confirm('Supprimer ce document ?')){ deleteDocument('${doc.id}'); closeModal(); render(); }">Supprimer</button>
      </div>
    </div>`;
}
function printDocument(docId){
  const doc = state.documents.find(d=>d.id===docId);
  if(!doc) return;
  const client = doc.clientId ? getClient(doc.clientId) : null;
  const isDevis = doc.status==='devis';
  const c = settings.company || {};
  const area = document.getElementById('print-area');
  if(!area) return;
  area.innerHTML = `
    <div style="font-family:Arial, Helvetica, sans-serif; color:#111;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #E8B94A; padding-bottom:14px; margin-bottom:22px;">
        <div>
          ${c.logoDataUrl?`<img src="${c.logoDataUrl}" style="max-height:64px; display:block; margin-bottom:8px;">`:''}
          <div style="font-weight:700; font-size:16px;">${esc(c.name||'')}</div>
          <div style="font-size:11px; color:#555;">${esc(c.address||'')}</div>
          <div style="font-size:11px; color:#555;">${esc(c.phone||'')}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:20px; font-weight:700; letter-spacing:.03em;">${isDevis?'DEVIS':'FACTURE'}</div>
          <div style="font-size:13px; margin-top:4px;">N° ${esc(doc.number)}</div>
          <div style="font-size:12px; color:#555;">${fdate(isDevis?doc.date:doc.factureDate)}</div>
        </div>
      </div>
      <div style="margin-bottom:18px;">
        <div style="font-size:10.5px; text-transform:uppercase; color:#888; font-weight:700; letter-spacing:.05em;">Client</div>
        <div style="font-size:13px; font-weight:600; margin-top:2px;">${client?esc(client.name):'Client non renseigné'}</div>
        ${client&&client.phone?`<div style="font-size:12px;">${esc(client.phone)}</div>`:''}
        ${client&&client.address?`<div style="font-size:12px;">${esc(client.address)}</div>`:''}
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
          <tr style="border-bottom:1.5px solid #333;">
            <th style="text-align:left; padding:7px 4px;">Désignation</th>
            <th style="text-align:right; padding:7px 4px;">Qté</th>
            <th style="text-align:right; padding:7px 4px;">PU HT</th>
            <th style="text-align:right; padding:7px 4px;">TVA</th>
            <th style="text-align:right; padding:7px 4px;">Total TTC</th>
          </tr>
        </thead>
        <tbody>
          ${doc.items.map(it=>`
            <tr style="border-bottom:1px solid #ddd;">
              <td style="padding:7px 4px;">${esc(it.designation)}</td>
              <td style="text-align:right; padding:7px 4px;">${num(it.qty,0)}</td>
              <td style="text-align:right; padding:7px 4px;">${money(it.unitPrice)}</td>
              <td style="text-align:right; padding:7px 4px;">${it.tva}%</td>
              <td style="text-align:right; padding:7px 4px;">${money(it.lineTTC)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-top:18px; display:flex; justify-content:flex-end;">
        <table style="font-size:13px;">
          <tr><td style="padding:3px 14px 3px 0;">Total HT</td><td style="text-align:right; padding:3px 0;">${money(doc.totalHT)}</td></tr>
          <tr><td style="padding:3px 14px 3px 0;">Total TVA</td><td style="text-align:right; padding:3px 0;">${money(doc.totalTVA)}</td></tr>
          <tr style="font-weight:700; font-size:15px;"><td style="padding:8px 14px 0 0; border-top:2px solid #333;">Total TTC</td><td style="text-align:right; padding:8px 0 0; border-top:2px solid #333;">${money(doc.totalTTC)}</td></tr>
        </table>
      </div>
      ${doc.notes?`<div style="margin-top:22px; font-size:12px; color:#555;"><strong>Notes :</strong> ${esc(doc.notes)}</div>`:''}
      <div style="margin-top:50px; font-size:10px; color:#999; text-align:center;">Document généré avec ${esc(c.name||'SAME GLOBAL SERVICES')}</div>
    </div>`;
  setTimeout(()=>window.print(), 150);
}

/* =========================================================
   INIT
========================================================= */

loadData();
recomputeAll();
document.querySelector('.tab[data-tab="dashboard"]').classList.add('active');
render();
