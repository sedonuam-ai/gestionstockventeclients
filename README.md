# SAME GLOBAL SERVICES — Gestion de stock et vente

Application de gestion de stock et de ventes multi-produits (entrées, sorties, PMP, marges, TVA, tableau de bord), installable sur Android comme une vraie application et utilisable **100 % hors connexion**.

## 🚀 Mettre l'appli en ligne avec GitHub Pages (gratuit)

1. Crée un compte sur [github.com](https://github.com) si tu n'en as pas.
2. Clique sur **New repository**, donne-lui un nom (ex. `stock-ventes`), coche **Public**, puis **Create repository**.
3. Sur la page du dépôt, clique sur **Add file → Upload files**, puis glisse-dépose **tous les fichiers et le dossier `icons/`** de ce zip (garde bien la même structure de dossiers).
4. Clique sur **Commit changes**.
5. Va dans **Settings → Pages** (menu de gauche).
6. Dans **Branch**, choisis `main` et le dossier `/ (root)`, puis **Save**.
7. Après une minute, GitHub affiche l'adresse de ton site, du type :
   `https://TON-PSEUDO.github.io/stock-ventes/`

## 📱 Installer l'appli sur ton téléphone Android

1. Ouvre l'adresse ci-dessus dans **Chrome** sur ton téléphone.
2. Appuie sur le menu **⋮** en haut à droite.
3. Choisis **Installer l'application** (ou **Ajouter à l'écran d'accueil**).
4. L'icône de l'appli apparaît sur ton écran d'accueil, elle s'ouvre en plein écran comme une appli native.

Une fois installée et ouverte au moins une fois, l'appli fonctionne **entièrement hors connexion** (le service worker met en cache tous les fichiers nécessaires). Tes données (produits, stock, ventes) restent enregistrées sur ton téléphone.

## 🗂️ Structure du projet

```
stock-ventes/
├── index.html        → structure de l'application
├── style.css         → apparence (thème sombre, cartes façon ticket de caisse)
├── app.js            → logique métier (stock, PMP, ventes, marges, TVA)
├── manifest.json      → identité de l'application (nom, icône, couleurs)
├── sw.js              → service worker, permet le fonctionnement hors-ligne
├── icons/             → logo de l'application en plusieurs tailles
└── README.md
```

## 📄 Devis & Factures PDF (onglet Docs)

- **Paramètres de l'entreprise** (lien en haut de l'onglet) : nom, adresse, téléphone et **logo** (utilisés sur tous les devis/factures).
- **Créer un devis** : choisis un client (facultatif), ajoute une ou plusieurs lignes en piochant dans tes produits, avec quantité, marge et TVA — comme pour une vente classique. Le devis **ne touche pas le stock**.
- **Convertir un devis en facture** : le document garde le **même numéro**, seul son statut change. C'est à ce moment précis que le stock est déduit et que la vente est enregistrée (avec PMP, marge, résultat) — exactement comme une vente créée depuis l'onglet Ventes.
- **Imprimer / Enregistrer en PDF** : ouvre la boîte de dialogue d'impression d'Android/Chrome ; choisis **« Enregistrer en PDF »** comme imprimante pour obtenir un vrai fichier PDF avec ton logo et tes coordonnées, sans connexion internet.
- Supprimer une facture annule aussi la vente de stock associée (le stock est restitué).

Prochaine étape prévue : un module de comptabilité générale (journal, bilan, TVA).

## 👤 Clients & fournisseurs (onglet Contacts)

- **Clients** : associe un client à chaque vente. Sa fiche affiche le total acheté et l'historique de ses achats.
- **Fournisseurs** : associe un fournisseur à chaque entrée de stock. Sa fiche affiche le total livré et l'historique de ses livraisons.
- Ajout rapide depuis le formulaire de vente/entrée via le lien « + Gérer les clients/fournisseurs », ou directement depuis l'onglet **Contacts**.
- Supprimer un contact ne supprime pas l'historique des ventes/achats liés — seul le lien vers ce contact est retiré.

Prochaine évolution « façon Ciel » prévue : un module de comptabilité générale (journal, bilan, TVA).

## 🏷️ Familles de produits & références

Chaque produit appartient à une **famille** (ex. `F1 — Produits alimentaires`, `F2 — Produits de beauté`, `F3 — Produits de savon`...). À la création d'un produit, tu choisis sa famille et l'application lui attribue automatiquement une **référence unique** au format `CODE-NUMÉRO` (ex. `F1-001`, `F1-002`, `F2-001`...).

- **Ajouter une famille** : onglet *Produits* → « ⚙️ Gérer les familles de produits » → renseigne un nom (le code, ex. `F4`, est proposé automatiquement, mais modifiable).
- **Filtrer les produits par famille** : boutons en haut de l'onglet *Produits*.
- Une famille contenant encore des produits ne peut pas être supprimée (message d'alerte affiché).

## 🧮 Comment sont calculées les valeurs

- **PMP** (prix moyen pondéré) : recalculé automatiquement à chaque entrée de stock, selon la méthode comptable du coût moyen pondéré.
- **Prix de vente unitaire** = PMP × (1 + marge brute %)
- **Montant TVA** = (Prix de vente × quantité) × taux de TVA %
- **Prix de vente total TTC** = montant HT + TVA
- **Résultat** = Prix de vente TTC − coût de la sortie de stock correspondante

## 🔧 Tester en local avant de le mettre en ligne

Double-cliquer sur `index.html` fonctionne pour un premier aperçu, mais le service worker (mode hors-ligne) et l'installation nécessitent d'être servis via **http(s)**. Pour un test local rapide :

```bash
# Depuis le dossier du projet
python3 -m http.server 8000
# puis ouvrir http://localhost:8000 dans le navigateur
```

## 🔄 Mettre à jour l'application plus tard

Si tu modifies les fichiers et les redéposes sur GitHub, **pense à changer le numéro de version dans `sw.js`** (ligne `const CACHE_NAME = 'stock-ventes-cache-v2';` → passe-le en `v3`, `v4`, etc.). Sans ça, le téléphone continue d'afficher l'ancienne version mise en cache pour le mode hors-ligne. Une fois ce numéro changé, l'appli se met à jour et se recharge automatiquement toute seule au prochain lancement.

## ✏️ Personnaliser

- **Devise / taux de TVA par défaut** : modifiables dans `app.js`, variable `settings` (`currency`, `tva`).
- **Couleurs / logo** : `style.css` (variables CSS en haut du fichier) et fichiers PNG dans `icons/`.
