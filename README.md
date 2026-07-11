# SAME GLOBAL SERVICES — Gestion Stock & Ventes

Application de gestion de stock et de ventes, installable sur téléphone Android, fonctionnant **100 % hors connexion** une fois installée. Aucune donnée n'est envoyée sur internet : tout est enregistré sur l'appareil.

## 1. Mettre l'application en ligne sur GitHub Pages (gratuit)

1. Créez un compte sur [github.com](https://github.com) si vous n'en avez pas.
2. Cliquez sur **New repository** (nouveau dépôt).
   - Nom : `gestion-stock-ventes` (ou ce que vous voulez)
   - Cochez **Public**
   - Cliquez sur **Create repository**
3. Sur la page du dépôt, cliquez sur **Add file → Upload files**, puis glissez-déposez **tous les fichiers de ce dossier** en conservant la structure :
   ```
   index.html
   app.js
   manifest.json
   sw.js
   icons/icon-192.png
   icons/icon-512.png
   icons/icon-512-maskable.png
   icons/favicon.png
   ```
   ⚠️ Le sous-dossier `icons/` doit être conservé tel quel (glissez le dossier entier, GitHub garde l'arborescence).
4. Cliquez sur **Commit changes**.
5. Allez dans **Settings → Pages** (menu de gauche).
6. Sous **Build and deployment**, choisissez **Source : Deploy from a branch**, branche **main**, dossier **/ (root)**, puis **Save**.
7. Attendez 1 à 2 minutes. GitHub affiche l'adresse de votre site, du type :
   ```
   https://VOTRE-NOM-UTILISATEUR.github.io/gestion-stock-ventes/
   ```

## 2. Installer l'application sur votre téléphone Android

1. Ouvrez **Chrome** sur votre téléphone Android.
2. Allez à l'adresse de votre site (celle obtenue à l'étape précédente).
3. Un message **« Ajouter à l'écran d'accueil »** ou **« Installer l'application »** apparaît en bas de l'écran.
   - S'il n'apparaît pas automatiquement : appuyez sur les **⋮** (trois points) en haut à droite de Chrome → **Installer l'application** (ou **Ajouter à l'écran d'accueil**).
4. Confirmez. L'icône **SAME GLOBAL SERVICES** apparaît alors sur votre écran d'accueil, comme une application normale, avec son propre logo.
5. Ouvrez-la une première fois **avec internet** pour qu'elle se mette entièrement en cache.

À partir de là, l'application fonctionne **sans connexion internet** : vous pouvez couper le Wi-Fi/données mobiles, elle continue de fonctionner normalement, avec toutes vos données de stock et de ventes sauvegardées directement sur le téléphone.

## 3. Mettre à jour l'application plus tard

Si vous voulez ajouter une fonctionnalité plus tard : remplacez les fichiers modifiés dans le dépôt GitHub (**Add file → Upload files**, puis **Commit**). La prochaine fois que le téléphone aura internet et rouvrira l'application, la nouvelle version se mettra à jour automatiquement en arrière-plan.

## Important — sauvegarde des données

Les données (stock, articles, ventes) sont stockées **uniquement sur ce téléphone**, dans la mémoire du navigateur. Elles ne sont pas sur internet, donc :
- Elles ne sont **pas partagées** entre plusieurs téléphones automatiquement.
- Si vous **désinstallez l'application** ou **videz les données du navigateur**, elles seront **perdues**.
- Pensez à exporter/vérifier vos données régulièrement si elles sont importantes (une fonction d'export peut être ajoutée sur demande).
