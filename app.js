/* SAME GLOBAL SERVICES — Gestion Stock & Ventes
   Application autonome (aucune dépendance externe), stockage local (hors-ligne). */

const STORAGE_KEY = "gsv-data-v1";
const LOW_STOCK_THRESHOLD = 5;
const MARKUP = 0.85;       // P.M.P majoré de 85 %
const TVA_RATE = 0.18;     // 18 %

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF" }).format(Number.isFinite(n) ? n : 0);
const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }); };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const emptyData = { families: [], articles: [], movements: [], sales: [] };

// ---------------- state ----------------
let data = loadData();
let section = "dashboard";
let recapArticleId = "";
let modifierArticleId = "";
let venteArticleId = "";
let searchArticles = "";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...emptyData, ...JSON.parse(raw) };
  } catch (e) { /* ignore */ }
  return { ...emptyData };
}
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch (e) { toast("Erreur d'enregistrement local.", "error"); }
}

function toast(message, tone = "success") {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = tone;
  el.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.style.display = "none"), 2600);
}

// ---------------- icons (inline SVG, no external deps) ----------------
const ICONS = {
  dashboard: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  layers: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  package: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v8a2 2 0 0 1-1 1.73l-6 3.46a2 2 0 0 1-2 0l-6-3.46A2 2 0 0 1 3 16V8"/><path d="M3.27 6.96 12 12l8.73-5.04"/><line x1="12" y1="22" x2="12" y2="12"/></svg>',
  down: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>',
  up: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>',
  pencil: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  boxes: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/><path d="m7 16.5-4.74-2.85"/><path d="m7 16.5 5-3"/><path d="M7 16.5v5.17"/><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"/><path d="m17 16.5 5-3"/><path d="m17 16.5-4.74-2.85"/><path d="M17 16.5v5.17"/><path d="M7.97 4.42A2 2 0 0 1 9 2.71h6a2 2 0 0 1 1.03 1.71v3.66L12 11 7.97 8.08Z"/><path d="m12 8 4.74-2.85"/><path d="M12 8 7.26 5.15"/><path d="M12 13.5V8"/></svg>',
  list: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>',
  reset: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
  cart: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 2-1.58l1.65-7.42H5.12"/></svg>',
  receipt: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="13" y2="15"/></svg>',
  trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  alert: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  check: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"/></svg>',
  search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  wallet: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>',
  trend: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
};

const NAV = [
  { group: "TABLEAU DE BORD", items: [{ key: "dashboard", label: "Vue d'ensemble", icon: "dashboard" }] },
  { group: "GESTION STOCK", items: [
      { key: "familles", label: "Familles de produits", icon: "layers" },
      { key: "articles", label: "Articles", icon: "package" },
      { key: "mouvements", label: "Entrée / Sortie de stock", icon: "down" },
      { key: "modifier", label: "Modifier le stock", icon: "pencil" },
      { key: "soldes", label: "Soldes de stock (P.M.P)", icon: "boxes" },
      { key: "recap", label: "Récap. par article", icon: "list" },
      { key: "cumul", label: "Cumul des stocks détaillé", icon: "layers" },
      { key: "reset", label: "Réinitialiser le stock", icon: "reset" },
  ]},
  { group: "GESTION VENTES", items: [
      { key: "vente", label: "Nouvelle vente", icon: "cart" },
      { key: "historique-ventes", label: "Historique des ventes", icon: "receipt" },
      { key: "reset-ventes", label: "Réinitialiser les ventes", icon: "reset" },
  ]},
];

// ---------------- derived helpers ----------------
function articlesWithFamily() {
  return data.articles.map((a) => ({ ...a, familyName: data.families.find((f) => f.id === a.familyId)?.name || "—" }));
}
function totalStockValue() { return data.articles.reduce((s, a) => s + a.qty * a.pmp, 0); }
function lowStockArticles() { return data.articles.filter((a) => a.qty <= LOW_STOCK_THRESHOLD); }
function totalSalesTTC() { return data.sales.reduce((s, v) => s + v.totalTTC, 0); }
function totalTVACollected() { return data.sales.reduce((s, v) => s + v.tva, 0); }

// ---------------- actions ----------------
function addFamily(name) {
  name = (name || "").trim();
  if (!name) return toast("Nom de famille requis.", "error");
  if (data.families.some((f) => f.name.toLowerCase() === name.toLowerCase())) return toast("Cette famille existe déjà.", "error");
  data.families.push({ id: uid(), name });
  saveData(); toast("Famille créée."); render();
}
function deleteFamily(id) {
  if (data.articles.some((a) => a.familyId === id)) return toast("Impossible : des articles utilisent cette famille.", "error");
  data.families = data.families.filter((f) => f.id !== id);
  saveData(); render();
}
function addArticle({ reference, name, familyId }) {
  reference = (reference || "").trim(); name = (name || "").trim();
  if (!reference || !name || !familyId) return toast("Référence, désignation et famille sont requises.", "error");
  if (data.articles.some((a) => a.reference.toLowerCase() === reference.toLowerCase())) return toast("Cette référence existe déjà.", "error");
  data.articles.push({ id: uid(), reference, name, familyId, qty: 0, pmp: 0 });
  saveData(); toast("Article enregistré."); render();
}
function deleteArticle(id) {
  if (data.movements.some((m) => m.articleId === id) || data.sales.some((s) => s.articleId === id))
    return toast("Impossible : cet article a des mouvements ou des ventes.", "error");
  data.articles = data.articles.filter((a) => a.id !== id);
  saveData(); render();
}
function addMovement({ articleId, type, quantity, pau, transitPct, date }) {
  const qty = Number(quantity);
  const article = data.articles.find((a) => a.id === articleId);
  if (!article) return toast("Article introuvable.", "error");
  if (!qty || qty <= 0) return toast("Quantité invalide.", "error");

  if (type === "entree") {
    const p = Number(pau);
    if (p == null || p < 0 || Number.isNaN(p)) return toast("Prix d'achat unitaire invalide.", "error");
    const tPct = Number(transitPct || 0);
    if (Number.isNaN(tPct) || tPct < 0) return toast("Taux de frais de transit invalide.", "error");

    const totalAchat = qty * p;
    const fraisTransit = totalAchat * (tPct / 100);
    const prixRevientTotal = totalAchat + fraisTransit;
    const prixRevientUnitaire = prixRevientTotal / qty;

    const newQty = article.qty + qty;
    const newPMP = newQty > 0 ? (article.qty * article.pmp + qty * prixRevientUnitaire) / newQty : 0;
    data.movements.push({
      id: uid(), articleId, type, date: date || todayISO(), quantity: qty,
      pau: prixRevientUnitaire, total: prixRevientTotal, pmpAfter: newPMP, qtyAfter: newQty,
      achatUnitaire: p, transitPct: tPct, fraisTransit, totalAchat, prixRevientTotal, prixRevientUnitaire,
    });
    article.qty = newQty; article.pmp = newPMP;
    saveData(); toast("Entrée de stock enregistrée (prix de revient calculé)."); render();
  } else {
    // Toute sortie de stock est considérée comme une vente : elle génère
    // automatiquement une vente au P.M.P majoré de 85 % + TVA 18 %.
    addSale({ articleId, quantity, date });
  }
}
function editStock({ articleId, newQty, newPmp, reason, date }) {
  const article = data.articles.find((a) => a.id === articleId);
  if (!article) return toast("Article introuvable.", "error");
  const q = Number(newQty), p = Number(newPmp);
  if (Number.isNaN(q) || q < 0) return toast("Quantité invalide.", "error");
  if (Number.isNaN(p) || p < 0) return toast("P.M.P invalide.", "error");
  data.movements.push({ id: uid(), articleId, type: "correction", date: date || todayISO(), quantity: q - article.qty, pau: p, total: q * p - article.qty * article.pmp, pmpAfter: p, qtyAfter: q, reason: reason || "" });
  article.qty = q; article.pmp = p;
  saveData(); toast("Stock modifié."); render();
}
function addSale({ articleId, quantity, date, puVente }) {
  const qty = Number(quantity);
  const article = data.articles.find((a) => a.id === articleId);
  if (!article) return toast("Article introuvable.", "error");
  if (!qty || qty <= 0) return toast("Quantité invalide.", "error");
  if (qty > article.qty) return toast("Stock insuffisant pour cette sortie / vente.", "error");

  let pu = Number(puVente);
  if (puVente === undefined || puVente === null || puVente === "" || Number.isNaN(pu) || pu < 0) {
    pu = article.pmp * (1 + MARKUP); // valeur par défaut si aucun prix n'est fourni (ex. sortie de stock directe)
  }
  const totalHT = pu * qty;
  const tva = totalHT * TVA_RATE;
  const totalTTC = totalHT + tva;
  const margeUnitaire = pu - article.pmp;
  const tauxMarge = article.pmp > 0 ? (margeUnitaire / article.pmp) * 100 : null;
  const saleDate = date || todayISO();
  const sale = { id: uid(), articleId, date: saleDate, quantity: qty, pmp: article.pmp, puVente: pu, totalHT, tva, totalTTC, margeUnitaire, tauxMarge };
  data.sales.push(sale);
  data.movements.push({ id: uid(), articleId, type: "sortie", date: saleDate, quantity: qty, pau: article.pmp, total: qty * article.pmp, pmpAfter: article.pmp, qtyAfter: article.qty - qty, saleId: sale.id });
  article.qty -= qty;
  saveData(); toast("Sortie enregistrée comme vente."); render();
}
function resetStock() {
  data.articles.forEach((a) => { a.qty = 0; a.pmp = 0; });
  data.movements = [];
  saveData(); closeModal(); toast("Stock réinitialisé."); render();
}
function resetSales() {
  data.sales = [];
  saveData(); closeModal(); toast("Ventes réinitialisées."); render();
}

// ---------------- small render helpers ----------------
function icon(name) { return ICONS[name] || ""; }
function stamp(text) { return `<span class="stamp">${esc(text)}</span>`; }
function sectionHead(eyebrow, title) {
  return `<header class="section-head">${stamp(eyebrow)}<h1 class="title slab">${esc(title)}</h1></header>`;
}
function panel(title, bodyHtml, { eyebrow = "", action = "" } = {}) {
  return `<div class="panel">
    <div class="panel-head">
      <div>${eyebrow ? `<div class="panel-eyebrow">${esc(eyebrow)}</div>` : ""}<h2 class="panel-title slab">${esc(title)}</h2></div>
      ${action}
    </div>
    <div class="panel-body">${bodyHtml}</div>
  </div>`;
}
function emptyState(iconName, text) {
  return `<div class="empty">${icon(iconName)}<p>${esc(text)}</p></div>`;
}
function field(label, inputHtml) {
  return `<label class="field"><span class="lbl">${esc(label)}</span>${inputHtml}</label>`;
}
function movementTypeLabel(m) {
  if (m.type === "entree") return `<span style="color:#4FAE7E;font-weight:600">Entrée</span>`;
  if (m.type === "correction") return `<span style="color:#D79A3C;font-weight:600">Correction</span>`;
  return `<span style="color:#E2725A;font-weight:600">Sortie${m.saleId ? " (vente)" : ""}</span>`;
}

function closeModal() { document.getElementById("modalRoot").innerHTML = ""; }
function openConfirmModal({ title, message, confirmLabel, onConfirm, tone = "danger" }) {
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal">
        <h3>${icon("alert")} ${esc(title)}</h3>
        <p>${esc(message)}</p>
        <div class="actions">
          <button class="btn btn-ghost" id="modalCancel">Annuler</button>
          <button class="btn btn-${tone}" id="modalConfirm">${esc(confirmLabel)}</button>
        </div>
      </div>
    </div>`;
  document.getElementById("modalCancel").onclick = closeModal;
  document.getElementById("modalOverlay").onclick = (e) => { if (e.target.id === "modalOverlay") closeModal(); };
  document.getElementById("modalConfirm").onclick = onConfirm;
}

// ---------------- views ----------------
function viewDashboard() {
  const arts = data.articles;
  const low = lowStockArticles();
  const recent = [...data.movements].slice(-6).reverse();
  const kpis = `
    <div class="kpis">
      <div class="kpi">${icon("wallet")}<div class="val mono">${fmt(totalStockValue())}</div><div class="lbl">Valeur du stock</div></div>
      <div class="kpi">${icon("package")}<div class="val mono">${arts.length}</div><div class="lbl">Articles enregistrés</div></div>
      <div class="kpi">${icon("cart")}<div class="val mono">${fmt(totalSalesTTC())}</div><div class="lbl">Ventes (TTC)</div></div>
      <div class="kpi">${icon("trend")}<div class="val mono">${fmt(totalTVACollected())}</div><div class="lbl">TVA collectée</div></div>
    </div>`;

  const lowHtml = low.length === 0 ? emptyState("check", "Aucun article en stock faible.") :
    `<ul style="list-style:none;margin:0;padding:0">${low.map((a) => `
      <li style="display:flex;justify-content:space-between;font-size:13.5px;border-bottom:1px solid var(--border);padding:8px 0">
        <span style="display:flex;align-items:center;gap:8px">${icon("alert")}<span style="font-weight:500">${esc(a.name)}</span><span class="mono" style="font-size:11px;color:var(--muted)">${esc(a.reference)}</span></span>
        <span class="mono" style="font-weight:700;color:var(--rust)">${a.qty} u.</span>
      </li>`).join("")}</ul>`;

  const recentHtml = recent.length === 0 ? emptyState("down", "Aucun mouvement enregistré.") :
    `<ul style="list-style:none;margin:0;padding:0">${recent.map((m) => {
      const art = data.articles.find((a) => a.id === m.articleId);
      return `<li style="display:flex;justify-content:space-between;font-size:13.5px;border-bottom:1px solid var(--border);padding:8px 0">
        <span style="display:flex;align-items:center;gap:8px">${icon(m.type === "entree" ? "down" : "up")}<span>${esc(art?.name || "—")}</span></span>
        <span class="mono" style="font-size:12px;color:var(--muted)">${m.type === "entree" ? "+" : "−"}${m.quantity} · ${fmtDate(m.date)}</span>
      </li>`;
    }).join("")}</ul>`;

  return sectionHead("Tableau de bord", "Vue d'ensemble") + kpis +
    `<div class="grid grid-2">
      ${panel("Stock faible", lowHtml, { eyebrow: "Alerte" })}
      ${panel("Derniers mouvements", recentHtml, { eyebrow: "Journal" })}
    </div>`;
}

function viewFamilles() {
  const rows = data.families.length === 0 ? emptyState("layers", "Aucune famille créée pour l'instant.") :
    `<ul style="list-style:none;margin:0;padding:0">${data.families.map((f) => `
      <li style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
        <span style="font-weight:500">${esc(f.name)}</span>
        <button class="btn-icon" data-action="delete-family" data-id="${f.id}" style="background:none;border:0;color:var(--rust);cursor:pointer">${icon("trash")}</button>
      </li>`).join("")}</ul>`;

  return sectionHead("Gestion stock", "Création de famille des produits") +
    panel("Nouvelle famille", `
      <form id="familyForm" style="display:flex;gap:12px;align-items:end">
        <div style="flex:1">${field("Nom de la famille", `<input class="input" name="name" placeholder="ex : Boissons, Quincaillerie…" />`)}</div>
        <button class="btn btn-primary" type="submit">+ Ajouter</button>
      </form>`) +
    panel(`Familles (${data.families.length})`, rows);
}

function viewArticles() {
  const families = data.families;
  const arts = articlesWithFamily().filter((a) =>
    a.name.toLowerCase().includes(searchArticles.toLowerCase()) || a.reference.toLowerCase().includes(searchArticles.toLowerCase()));

  const formHtml = families.length === 0 ? `<p style="font-size:13.5px;color:#D79A3C">Créez d'abord une famille de produits.</p>` :
    `<form id="articleForm" class="grid grid-4" style="align-items:end">
      ${field("Référence", `<input class="input" name="reference" placeholder="REF-001" />`)}
      ${field("Désignation", `<input class="input" name="name" placeholder="Nom de l'article" />`)}
      ${field("Famille", `<select class="input" name="familyId"><option value="">—</option>${families.map((f) => `<option value="${f.id}">${esc(f.name)}</option>`).join("")}</select>`)}
      <button class="btn btn-primary" type="submit">+ Enregistrer</button>
    </form>`;

  const tableHtml = arts.length === 0 ? emptyState("package", "Aucun article.") :
    `<table class="ledger"><thead><tr><th>Référence</th><th>Désignation</th><th>Famille</th><th class="tr-right">Qté</th><th class="tr-right">P.M.P</th><th></th></tr></thead>
    <tbody>${arts.map((a) => `<tr>
      <td class="mono">${esc(a.reference)}</td><td>${esc(a.name)}</td><td style="color:var(--muted)">${esc(a.familyName)}</td>
      <td class="tr-right mono">${a.qty}</td><td class="tr-right mono">${fmt(a.pmp)}</td>
      <td class="tr-right"><button data-action="delete-article" data-id="${a.id}" style="background:none;border:0;color:var(--rust);cursor:pointer">${icon("trash")}</button></td>
    </tr>`).join("")}</tbody></table>`;

  return sectionHead("Gestion stock", "Enregistrer les articles (référence spécifique)") +
    panel("Nouvel article", formHtml) +
    panel(`Articles (${data.articles.length})`, tableHtml, {
      action: `<div style="position:relative"><span style="position:absolute;left:10px;top:9px;color:var(--muted)">${icon("search")}</span>
        <input class="input" id="articleSearch" placeholder="Rechercher…" style="padding-left:30px;width:200px" value="${esc(searchArticles)}" /></div>`
    });
}

function viewMouvements() {
  const arts = articlesWithFamily();
  const recent = [...data.movements].slice(-8).reverse();

  const formHtml = arts.length === 0 ? `<p style="font-size:13.5px;color:#D79A3C">Enregistrez d'abord un article.</p>` :
    `<div class="note ochre">${icon("alert")}<p style="margin:0">Toute <strong>sortie</strong> de stock est automatiquement considérée comme une <strong>vente</strong> : le prix est calculé au P.M.P majoré de 85 %, TVA 18 % incluse, et elle apparaît dans l'historique des ventes.</p></div>
    <form id="movForm">
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button type="button" class="btn" data-mvtype="entree" style="flex:1;justify-content:center;border:2px solid var(--border);background:transparent;color:var(--muted)">${icon("down")} Entrée</button>
        <button type="button" class="btn" data-mvtype="sortie" style="flex:1;justify-content:center;border:2px solid var(--border);background:transparent;color:var(--muted)">${icon("up")} Sortie (= vente)</button>
      </div>
      <input type="hidden" name="type" id="mvTypeInput" value="entree" />
      <div class="grid grid-4">
        ${field("Article", `<select class="input" name="articleId" id="mvArticle"><option value="">—</option>${arts.map((a) => `<option value="${a.id}">${esc(a.reference)} — ${esc(a.name)}</option>`).join("")}</select>`)}
        ${field("Quantité", `<input class="input" type="number" min="0" step="any" name="quantity" />`)}
        <div id="mvPauWrap">${field("Prix d'achat unitaire", `<input class="input" type="number" min="0" step="any" name="pau" id="mvPau" />`)}</div>
        ${field("Date", `<input class="input" type="date" name="date" value="${todayISO()}" />`)}
      </div>
      <div id="mvTransitWrap" class="grid grid-4" style="margin-top:12px"></div>
      <div id="mvInfo" style="margin-top:12px"></div>
      <button class="btn btn-primary" type="submit" style="margin-top:14px">+ Enregistrer le mouvement</button>
    </form>`;

  const tableHtml = recent.length === 0 ? emptyState("down", "Aucun mouvement.") :
    `<table class="ledger"><thead><tr><th>Date</th><th>Article</th><th>Type</th><th class="tr-right">Quantité</th><th class="tr-right">Coût unitaire</th><th class="tr-right">Montant total</th><th class="tr-right">Solde</th></tr></thead>
    <tbody>${recent.map((m) => {
      const art = data.articles.find((a) => a.id === m.articleId);
      return `<tr><td class="mono" style="font-size:11px">${fmtDate(m.date)}</td><td>${esc(art?.name || "—")}</td><td>${movementTypeLabel(m)}</td>
      <td class="tr-right mono">${m.quantity}</td><td class="tr-right mono">${fmt(m.pau)}</td><td class="tr-right mono">${fmt(m.total)}</td><td class="tr-right mono">${m.qtyAfter}</td></tr>`;
    }).join("")}</tbody></table>`;

  return sectionHead("Gestion stock", "Saisie : entrée et sortie de stock") +
    panel("Nouveau mouvement", formHtml) +
    panel("Description : derniers mouvements", tableHtml);
}

function viewModifier() {
  const arts = articlesWithFamily();
  if (arts.length === 0) return sectionHead("Gestion stock", "Modifier le stock") + panel("Correction manuelle d'un article", `<p style="font-size:13.5px;color:#D79A3C">Aucun article enregistré.</p>`);

  const article = arts.find((a) => a.id === modifierArticleId);
  const selectHtml = field("Article", `<select class="input" id="modArticle"><option value="">—</option>${arts.map((a) => `<option value="${a.id}" ${a.id === modifierArticleId ? "selected" : ""}>${esc(a.reference)} — ${esc(a.name)}</option>`).join("")}</select>`);

  let rest = "";
  if (article) {
    rest = `
      <div class="box" style="margin:14px 0">Valeurs actuelles : ${article.qty} u. · P.M.P ${fmt(article.pmp)}</div>
      <form id="modForm">
        <div class="grid grid-3">
          ${field("Nouvelle quantité", `<input class="input" type="number" min="0" step="any" name="newQty" id="modQty" value="${article.qty}" />`)}
          ${field("Nouveau P.M.P", `<input class="input" type="number" min="0" step="any" name="newPmp" id="modPmp" value="${article.pmp}" />`)}
          ${field("Date", `<input class="input" type="date" name="date" value="${todayISO()}" />`)}
        </div>
        <div style="margin-top:12px">${field("Motif de la correction (optionnel)", `<input class="input" name="reason" placeholder="ex : inventaire physique, erreur de saisie…" />`)}</div>
        <div class="note ochre" id="modDiff" style="margin-top:14px;display:flex;justify-content:space-between"></div>
        <button class="btn btn-ochre" type="submit" style="margin-top:14px">${icon("pencil")} Enregistrer la correction</button>
      </form>`;
  }

  return sectionHead("Gestion stock", "Modifier le stock") + panel("Correction manuelle d'un article", selectHtml + rest);
}

function viewSoldes() {
  const arts = articlesWithFamily();
  const tableHtml = arts.length === 0 ? emptyState("boxes", "Aucun article.") :
    `<table class="ledger"><thead><tr><th>Référence</th><th>Désignation</th><th>Famille</th><th class="tr-right">Quantité</th><th class="tr-right">P.M.P</th><th class="tr-right">Prix total</th></tr></thead>
    <tbody>${arts.map((a) => `<tr><td class="mono">${esc(a.reference)}</td><td>${esc(a.name)}</td><td style="color:var(--muted)">${esc(a.familyName)}</td>
      <td class="tr-right mono" style="${a.qty <= LOW_STOCK_THRESHOLD ? "color:var(--rust);font-weight:700" : ""}">${a.qty}</td>
      <td class="tr-right mono">${fmt(a.pmp)}</td><td class="tr-right mono" style="font-weight:700">${fmt(a.qty * a.pmp)}</td></tr>`).join("")}</tbody></table>`;
  return sectionHead("Gestion stock", "Soldes de stock") + panel("Quantité · P.M.P · Prix total", tableHtml);
}

function viewRecap() {
  const arts = articlesWithFamily();
  if (arts.length === 0) return sectionHead("Gestion stock", "Récapitulation stock entrée et sortie par article") + panel("Sélectionner un article", emptyState("list", "Aucun article."));
  const article = arts.find((a) => a.id === recapArticleId);
  const list = data.movements.filter((m) => m.articleId === recapArticleId);

  const selectAction = `<select class="input" id="recapSelect" style="width:260px"><option value="">—</option>${arts.map((a) => `<option value="${a.id}" ${a.id === recapArticleId ? "selected" : ""}>${esc(a.reference)} — ${esc(a.name)}</option>`).join("")}</select>`;

  let body;
  if (!article) body = emptyState("list", "Choisissez un article pour voir son historique.");
  else if (list.length === 0) body = emptyState("list", "Aucun mouvement pour cet article.");
  else body = `<table class="ledger"><thead><tr><th>Date</th><th>Type</th><th class="tr-right">Quantité</th><th class="tr-right">P.A.U / P.M.P</th><th class="tr-right">Prix total</th><th class="tr-right">P.M.P après</th><th class="tr-right">Solde qté</th></tr></thead>
    <tbody>${list.map((m) => `<tr><td class="mono" style="font-size:11px">${fmtDate(m.date)}</td><td>${movementTypeLabel(m)}</td>
      <td class="tr-right mono">${m.quantity}</td><td class="tr-right mono">${fmt(m.pau)}</td><td class="tr-right mono">${fmt(m.total)}</td>
      <td class="tr-right mono">${fmt(m.pmpAfter)}</td><td class="tr-right mono" style="font-weight:700">${m.qtyAfter}</td></tr>`).join("")}</tbody></table>`;

  return sectionHead("Gestion stock", "Récapitulation stock entrée et sortie par article") +
    panel(article ? `${article.reference} — ${article.name}` : "Sélectionner un article", body, { action: selectAction });
}

function viewCumul() {
  const arts = articlesWithFamily();
  const byFamily = {};
  arts.forEach((a) => { byFamily[a.familyName] = byFamily[a.familyName] || { qty: 0, value: 0 }; byFamily[a.familyName].qty += a.qty; byFamily[a.familyName].value += a.qty * a.pmp; });

  const detailHtml = arts.length === 0 ? emptyState("layers", "Aucun article.") :
    `<table class="ledger"><thead><tr><th>Référence</th><th>Désignation</th><th>Famille</th><th class="tr-right">Quantité</th><th class="tr-right">P.M.P</th><th class="tr-right">Valeur</th></tr></thead>
    <tbody>${arts.map((a) => `<tr><td class="mono">${esc(a.reference)}</td><td>${esc(a.name)}</td><td style="color:var(--muted)">${esc(a.familyName)}</td>
      <td class="tr-right mono">${a.qty}</td><td class="tr-right mono">${fmt(a.pmp)}</td><td class="tr-right mono">${fmt(a.qty * a.pmp)}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td colspan="5" class="tr-right" style="text-transform:uppercase;font-size:11px">Total général</td><td class="tr-right mono" style="font-size:16px">${fmt(totalStockValue())}</td></tr></tfoot></table>`;

  const famHtml = `<table class="ledger"><thead><tr><th>Famille</th><th class="tr-right">Quantité</th><th class="tr-right">Valeur</th></tr></thead>
    <tbody>${Object.entries(byFamily).map(([fam, v]) => `<tr><td>${esc(fam)}</td><td class="tr-right mono">${v.qty}</td><td class="tr-right mono">${fmt(v.value)}</td></tr>`).join("")}</tbody></table>`;

  return sectionHead("Gestion stock", "Cumul des stocks détaillé") + panel("Détail par article", detailHtml) + panel("Cumul par famille", famHtml);
}

function viewReset() {
  return sectionHead("Gestion stock", "Réinitialiser le stock") + panel("Remise à zéro", `
    <div class="note">${icon("alert")}<p style="margin:0">Cette action remet toutes les quantités et P.M.P à zéro pour les ${data.articles.length} article(s) enregistrés,
    et efface l'historique des mouvements de stock. Les familles, les articles et l'historique des ventes restent intacts. Cette action est irréversible.</p></div>
    <button class="btn btn-danger" id="resetBtn">${icon("reset")} Réinitialiser le stock</button>`);
}

function viewVente() {
  const arts = articlesWithFamily();
  if (arts.length === 0) return sectionHead("Gestion ventes", "Prix de vente libre · Taux de marge calculé automatiquement") + panel("Nouvelle vente", `<p style="font-size:13.5px;color:#D79A3C">Aucun article disponible.</p>`);
  const article = arts.find((a) => a.id === venteArticleId);

  const formTop = `<div class="grid grid-3">
    ${field("Article", `<select class="input" id="venteArticle"><option value="">—</option>${arts.map((a) => `<option value="${a.id}" ${a.qty <= 0 ? "disabled" : ""} ${a.id === venteArticleId ? "selected" : ""}>${esc(a.reference)} — ${esc(a.name)} (${a.qty} u. dispo.)</option>`).join("")}</select>`)}
    ${field("Quantité vendue", `<input class="input" type="number" min="0" step="any" name="quantity" id="venteQty" />`)}
    ${field("Date", `<input class="input" type="date" name="date" value="${todayISO()}" />`)}
  </div>`;

  let infoHtml = "";
  if (article) {
    const suggestedPU = article.pmp * (1 + MARKUP);
    infoHtml = `<div class="grid grid-3" style="margin-top:14px">
      ${field("Prix de revient unitaire (P.M.P)", `<input class="input" value="${fmt(article.pmp)}" disabled />`)}
      ${field("Prix de vente unitaire (libre)", `<input class="input" type="number" min="0" step="any" name="puVente" id="ventePU" value="${suggestedPU ? suggestedPU.toFixed(2) : ""}" />`)}
      ${field("Taux de marge bénéficiaire", `<input class="input" id="venteMarge" value="—" disabled />`)}
    </div>
    <div class="box grid grid-3" style="margin-top:14px">
      <div><div class="lbl" style="margin-bottom:4px">Total HT</div><span id="venteHT">${fmt(0)}</span></div>
      <div><div class="lbl" style="margin-bottom:4px">TVA 18%</div><span id="venteTVA">${fmt(0)}</span></div>
      <div style="border-left:1px solid var(--border);padding-left:14px;display:flex;flex-direction:column;justify-content:center">
        <span class="lbl">Total TTC</span><span id="venteTTC" style="font-size:18px;font-weight:700">${fmt(0)}</span>
      </div>
    </div>`;
  }

  return sectionHead("Gestion ventes", "Prix de vente libre · Taux de marge calculé automatiquement") +
    panel("Nouvelle vente", `<form id="venteForm">${formTop}${infoHtml}<button class="btn btn-ochre" type="submit" style="margin-top:14px">${icon("cart")} Valider la vente</button></form>`);
}

function viewHistoriqueVentes() {
  const sorted = [...data.sales].reverse();
  const totalTTC = data.sales.reduce((s, v) => s + v.totalTTC, 0);
  const totalTVA = data.sales.reduce((s, v) => s + v.tva, 0);
  const body = sorted.length === 0 ? emptyState("receipt", "Aucune vente enregistrée.") :
    `<table class="ledger"><thead><tr><th>Date</th><th>Article</th><th class="tr-right">Qté</th><th class="tr-right">P.M.P</th><th class="tr-right">P.U. Vente</th><th class="tr-right">Taux de marge</th><th class="tr-right">Total HT</th><th class="tr-right">TVA</th><th class="tr-right">Total TTC</th></tr></thead>
    <tbody>${sorted.map((s) => {
      const art = data.articles.find((a) => a.id === s.articleId);
      const margeTxt = s.tauxMarge === null || s.tauxMarge === undefined ? "—" : `${s.tauxMarge.toFixed(2)} %`;
      return `<tr><td class="mono" style="font-size:11px">${fmtDate(s.date)}</td><td>${esc(art?.name || "—")}</td><td class="tr-right mono">${s.quantity}</td>
      <td class="tr-right mono">${fmt(s.pmp)}</td><td class="tr-right mono">${fmt(s.puVente)}</td>
      <td class="tr-right mono" style="color:${(s.tauxMarge ?? 0) >= 0 ? '#4FAE7E' : '#E2725A'}">${margeTxt}</td>
      <td class="tr-right mono">${fmt(s.totalHT)}</td>
      <td class="tr-right mono">${fmt(s.tva)}</td><td class="tr-right mono" style="font-weight:700">${fmt(s.totalTTC)}</td></tr>`;
    }).join("")}</tbody>
    <tfoot><tr><td colspan="7" class="tr-right" style="text-transform:uppercase;font-size:11px">Totaux</td><td class="tr-right mono">${fmt(totalTVA)}</td><td class="tr-right mono" style="font-size:16px">${fmt(totalTTC)}</td></tr></tfoot></table>`;
  return sectionHead("Gestion ventes", "Historique des ventes") + panel(`${data.sales.length} vente(s)`, body);
}

function viewResetVentes() {
  return sectionHead("Gestion ventes", "Réinitialiser les ventes") + panel("Remise à zéro de l'historique des ventes", `
    <div class="note">${icon("alert")}<p style="margin:0">Cette action efface définitivement l'historique des ${data.sales.length} vente(s) enregistrée(s) (chiffre d'affaires, TVA collectée). Les mouvements de stock déjà comptabilisés pour ces ventes restent inchangés dans le journal de stock. Cette action est irréversible.</p></div>
    <button class="btn btn-danger" id="resetVentesBtn">${icon("reset")} Réinitialiser les ventes</button>`);
}

const VIEWS = {
  dashboard: viewDashboard, familles: viewFamilles, articles: viewArticles, mouvements: viewMouvements,
  modifier: viewModifier, soldes: viewSoldes, recap: viewRecap, cumul: viewCumul, reset: viewReset,
  vente: viewVente, "historique-ventes": viewHistoriqueVentes, "reset-ventes": viewResetVentes,
};

// ---------------- render + event wiring ----------------
function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = NAV.map((grp) => `
    <div class="grp-label">${esc(grp.group)}</div>
    <ul class="navlist">${grp.items.map((it) => `
      <li><button class="navlink ${section === it.key ? "active" : ""}" data-section="${it.key}">${icon(it.icon)}<span>${esc(it.label)}</span></button></li>
    `).join("")}</ul>`).join("");
  nav.querySelectorAll(".navlink").forEach((btn) => {
    btn.addEventListener("click", () => {
      section = btn.dataset.section;
      document.getElementById("sidebar").classList.remove("open");
      render();
    });
  });
}

function render() {
  renderNav();
  const content = document.getElementById("content");
  content.innerHTML = (VIEWS[section] || viewDashboard)();
  wireSectionEvents();
}

function wireSectionEvents() {
  // Familles
  const familyForm = document.getElementById("familyForm");
  if (familyForm) familyForm.addEventListener("submit", (e) => { e.preventDefault(); addFamily(new FormData(familyForm).get("name")); });
  document.querySelectorAll('[data-action="delete-family"]').forEach((b) => b.addEventListener("click", () => deleteFamily(b.dataset.id)));

  // Articles
  const articleForm = document.getElementById("articleForm");
  if (articleForm) articleForm.addEventListener("submit", (e) => {
    e.preventDefault(); const fd = new FormData(articleForm);
    addArticle({ reference: fd.get("reference"), name: fd.get("name"), familyId: fd.get("familyId") });
  });
  document.querySelectorAll('[data-action="delete-article"]').forEach((b) => b.addEventListener("click", () => deleteArticle(b.dataset.id)));
  const searchInput = document.getElementById("articleSearch");
  if (searchInput) {
    searchInput.addEventListener("input", () => { searchArticles = searchInput.value; render(); searchInput.focus(); searchInput.selectionStart = searchInput.selectionEnd = searchInput.value.length; });
  }

  // Mouvements
  const movForm = document.getElementById("movForm");
  if (movForm) {
    let mvType = "entree";
    const typeBtns = movForm.querySelectorAll("[data-mvtype]");
    const typeInput = document.getElementById("mvTypeInput");
    const pauWrap = document.getElementById("mvPauWrap");
    const transitWrap = document.getElementById("mvTransitWrap");
    const articleSel = document.getElementById("mvArticle");
    const infoBox = document.getElementById("mvInfo");

    function refreshTypeUI() {
      typeBtns.forEach((b) => {
        const on = b.dataset.mvtype === mvType;
        b.style.borderColor = on ? (mvType === "entree" ? "#2E7A57" : "#C24A38") : "#2E4257";
        b.style.background = on ? (mvType === "entree" ? "rgba(31,77,58,.1)" : "rgba(166,61,47,.1)") : "transparent";
        b.style.color = on ? (mvType === "entree" ? "#4FAE7E" : "#E2725A") : "#93A0AF";
      });
      typeInput.value = mvType;
      const art = data.articles.find((a) => a.id === articleSel.value);
      pauWrap.innerHTML = mvType === "entree"
        ? field("Prix d'achat unitaire", `<input class="input" type="number" min="0" step="any" name="pau" id="mvPau" />`)
        : field("P.M.P (auto)", `<input class="input" value="${fmt(art?.pmp || 0)}" disabled />`);
      transitWrap.innerHTML = mvType === "entree"
        ? field("Frais de transit (%)", `<input class="input" type="number" min="0" step="any" name="transitPct" id="mvTransitPct" placeholder="ex : 12" />`)
        : "";
      refreshInfo();
    }
    function refreshInfo() {
      const art = data.articles.find((a) => a.id === articleSel.value);
      if (!art) { infoBox.innerHTML = ""; return; }
      const qtyInput = movForm.querySelector('[name="quantity"]');
      const qty = Number(qtyInput.value || 0);
      if (mvType === "entree") {
        const pauInput = document.getElementById("mvPau");
        const transitInput = document.getElementById("mvTransitPct");
        const p = Number(pauInput?.value || 0);
        const tPct = Number(transitInput?.value || 0);
        const totalAchat = qty * p;
        const fraisTransit = totalAchat * (tPct / 100);
        const prixRevientTotal = totalAchat + fraisTransit;
        const prixRevientUnitaire = qty > 0 ? prixRevientTotal / qty : 0;
        infoBox.innerHTML = `<div class="box grid grid-4">
          <div><div class="lbl" style="margin-bottom:4px">Achat total</div>${fmt(totalAchat)}</div>
          <div><div class="lbl" style="margin-bottom:4px">Frais de transit (${tPct || 0}%)</div>${fmt(fraisTransit)}</div>
          <div><div class="lbl" style="margin-bottom:4px">Prix de revient total</div>${fmt(prixRevientTotal)}</div>
          <div><div class="lbl" style="margin-bottom:4px">Prix de revient unitaire</div>${fmt(prixRevientUnitaire)}</div>
          <div style="grid-column:1/-1;border-top:1px solid var(--border);padding-top:10px;font-size:12px;color:var(--muted)">Stock actuel : ${art.qty} u. · P.M.P actuel ${fmt(art.pmp)}</div>
        </div>`;
      } else {
        const puVente = art.pmp * (1 + MARKUP);
        const totalHT = puVente * qty;
        const tva = totalHT * TVA_RATE;
        const totalTTC = totalHT + tva;
        const margeUnitaire = puVente - art.pmp;
        const tauxMarge = art.pmp > 0 ? (margeUnitaire / art.pmp) * 100 : 0;
        infoBox.innerHTML = `<div class="box grid grid-4">
          <div><div class="lbl" style="margin-bottom:4px">P.M.P (coût)</div>${fmt(art.pmp)}</div>
          <div><div class="lbl" style="margin-bottom:4px">P.U. Vente (+85%)</div>${fmt(puVente)}</div>
          <div><div class="lbl" style="margin-bottom:4px">Total HT</div>${fmt(totalHT)}</div>
          <div><div class="lbl" style="margin-bottom:4px">TVA 18%</div>${fmt(tva)}</div>
          <div style="grid-column:1/-1;border-top:1px solid var(--border);padding-top:10px;display:flex;justify-content:space-between;align-items:baseline">
            <span class="lbl">Total TTC</span><span style="font-size:16px;font-weight:700">${fmt(totalTTC)}</span>
          </div>
          <div style="grid-column:1/-1;display:flex;justify-content:space-between;align-items:baseline">
            <span class="lbl">Taux de marge bénéficiaire</span><span style="font-weight:700;color:var(--ochre)">${tauxMarge.toFixed(2)} %</span>
          </div>
        </div>`;
      }
    }
    typeBtns.forEach((b) => b.addEventListener("click", () => { mvType = b.dataset.mvtype; refreshTypeUI(); }));
    articleSel.addEventListener("change", refreshInfo);
    movForm.addEventListener("input", (e) => { if (["quantity", "pau", "transitPct"].includes(e.target.name)) refreshInfo(); });
    refreshTypeUI();

    movForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(movForm);
      addMovement({ articleId: fd.get("articleId"), type: fd.get("type"), quantity: fd.get("quantity"), pau: fd.get("pau"), transitPct: fd.get("transitPct"), date: fd.get("date") });
    });
  }

  // Modifier le stock
  const modArticleSel = document.getElementById("modArticle");
  if (modArticleSel) modArticleSel.addEventListener("change", () => { modifierArticleId = modArticleSel.value; render(); });
  const modForm = document.getElementById("modForm");
  if (modForm) {
    const qtyIn = document.getElementById("modQty"), pmpIn = document.getElementById("modPmp");
    const diffBox = document.getElementById("modDiff");
    const article = data.articles.find((a) => a.id === modifierArticleId);
    function refreshDiff() {
      const q = Number(qtyIn.value || 0), p = Number(pmpIn.value || 0);
      const diffQty = q - article.qty;
      const diffVal = q * p - article.qty * article.pmp;
      diffBox.innerHTML = `<span>Écart quantité : ${diffQty > 0 ? "+" : ""}${diffQty}</span><span style="font-weight:700">Écart valeur : ${diffVal > 0 ? "+" : ""}${fmt(diffVal)}</span>`;
    }
    qtyIn.addEventListener("input", refreshDiff); pmpIn.addEventListener("input", refreshDiff); refreshDiff();
    modForm.addEventListener("submit", (e) => {
      e.preventDefault(); const fd = new FormData(modForm);
      editStock({ articleId: modifierArticleId, newQty: fd.get("newQty"), newPmp: fd.get("newPmp"), reason: fd.get("reason"), date: fd.get("date") });
    });
  }

  // Recap
  const recapSelect = document.getElementById("recapSelect");
  if (recapSelect) recapSelect.addEventListener("change", () => { recapArticleId = recapSelect.value; render(); });

  // Reset
  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) resetBtn.addEventListener("click", () => {
    openConfirmModal({
      title: "Réinitialiser le stock ?",
      message: "Toutes les quantités et P.M.P seront remis à zéro, et l'historique des mouvements de stock sera effacé définitivement. Les articles, familles et l'historique des ventes sont conservés.",
      confirmLabel: "Réinitialiser",
      onConfirm: resetStock,
    });
  });
  const resetVentesBtn = document.getElementById("resetVentesBtn");
  if (resetVentesBtn) resetVentesBtn.addEventListener("click", () => {
    openConfirmModal({
      title: "Réinitialiser les ventes ?",
      message: "L'historique des ventes (chiffre d'affaires, TVA) sera effacé définitivement. Les mouvements de stock déjà enregistrés pour ces ventes ne sont pas modifiés.",
      confirmLabel: "Réinitialiser",
      onConfirm: resetSales,
    });
  });

  // Vente
  const venteArticleSel = document.getElementById("venteArticle");
  if (venteArticleSel) venteArticleSel.addEventListener("change", () => { venteArticleId = venteArticleSel.value; render(); });
  const venteForm = document.getElementById("venteForm");
  if (venteForm) {
    const qtyIn = document.getElementById("venteQty");
    const puIn = document.getElementById("ventePU");
    const article = data.articles.find((a) => a.id === venteArticleId);
    function refresh() {
      if (!article) return;
      const pu = Number(puIn?.value || 0);
      const qty = Number(qtyIn.value || 0);
      const totalHT = pu * qty, tva = totalHT * TVA_RATE, totalTTC = totalHT + tva;
      const ht = document.getElementById("venteHT"), tv = document.getElementById("venteTVA"), tt = document.getElementById("venteTTC");
      const margeEl = document.getElementById("venteMarge");
      if (ht) ht.textContent = fmt(totalHT);
      if (tv) tv.textContent = fmt(tva);
      if (tt) tt.textContent = fmt(totalTTC);
      if (margeEl) {
        if (article.pmp > 0) {
          const taux = ((pu - article.pmp) / article.pmp) * 100;
          margeEl.value = `${taux.toFixed(2)} %`;
        } else {
          margeEl.value = "—";
        }
      }
    }
    if (qtyIn) qtyIn.addEventListener("input", refresh);
    if (puIn) puIn.addEventListener("input", refresh);
    refresh();
    venteForm.addEventListener("submit", (e) => {
      e.preventDefault(); const fd = new FormData(venteForm);
      addSale({ articleId: venteArticleId, quantity: fd.get("quantity"), date: fd.get("date"), puVente: fd.get("puVente") });
    });
  }
}

// ---------------- boot ----------------
document.getElementById("menuBtn")?.addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
render();

// Service worker registration (offline support)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {/* offline-first still works via cache */});
  });
  // Recharge automatiquement une seule fois quand une nouvelle version du service worker prend le relais,
  // pour que les mises à jour soient visibles immédiatement (sans double-rechargement manuel).
  let swRefreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (swRefreshing) return;
    swRefreshing = true;
    window.location.reload();
  });
}
