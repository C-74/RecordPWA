# RecordPWA — Technical Design Doc

Étudiant M2 Informatique · 12 octobre 2026 · URL : Déploiement Vercel/Netlify/GitHub Pages · Dépôt : GitHub · Statut : Final

---

## 1. TL;DR

RecordPWA est une Progressive Web App mobile et desktop permettant d'enregistrer, écouter, organiser et exporter des mémos vocaux haute fidélité. Conçue pour les étudiants et professionnels ayant besoin de capturer rapidement des idées vocales sans connexion internet, elle repose sur un stockage 100% local et persistant via IndexedDB (`idb`) et l'API Microphone (`MediaRecorder`).

---

## 2. Contexte et objectifs

- **Problème résolu** : Pouvoir enregistrer des mémos vocaux en situation de mobilité (cours, réunions, déplacements) même en zone blanche (mode avion / hors ligne), sans dépendre d'un compte cloud ni compromettre sa vie privée.
- **Goals (v1)** :
  - Installation PWA standalone sur mobile et desktop avec manifest conforme et icônes adaptatives.
  - Fonctionnement hors ligne complet : App Shell en cache et données locales immédiatement accessibles.
  - Enregistrement audio via `getUserMedia` et `MediaRecorder` déclenché uniquement sur action utilisateur.
  - Sauvegarde locale pérenne des fichiers audio (`Blob`) dans IndexedDB via la librairie officielle `idb`.
  - Visualisation audio en temps réel avec Web Audio API et protection contre la mise en veille (`Screen Wake Lock`).
  - Gestion ergonomique de la liste sous forme de cartes (écoute, renommage, téléchargement, partage natif).
  - Référencement et visibilité assurés par des balises Open Graph, `robots.txt`, `sitemap.xml` et `llms.txt`.
- **Non-goals** :
  - Transcription automatique parole-vers-texte (reportée en v2).
  - Synchronisation cloud multi-appareils nécessitant une base de données distante et une authentification utilisateur.

---

## 3. Architecture

- **Stack technique** :
  - **HTML5 & Vanilla CSS** : Choix délibéré pour une légèreté maximale, un temps de chargement instantané sans dépendance superflue (zéro bundle lourd), et un contrôle précis de la charte graphique calquée sur l'icône (`#ff2b4b`, `#ffcdcd`).
  - **JavaScript ES6+ & idb (v7)** : Gestion asynchrone native et utilisation de la promesse `idb` recommandée par le standard PWA pour manipuler IndexedDB facilement.
  - **Service Worker manuel** : Écrit sans framework pour maîtriser le cycle de vie précis, le versionnage des caches et les stratégies de réponse.
- **Flux de données** :
  ```
  Page (app.js) ──► Microphone (MediaRecorder) ──► Blob Audio ──► IndexedDB (idb)
       │                                                                ▲
       ▼                                                                │
  Service Worker (sw.js) ──► Cache API (App Shell)                      │
       │                                                                │
       └──────────────────► offline.html (secours navigation)           │
                                                                        │
  Liste UI ◄────────────────────────────────────────────────────────────┘
  ```
- **Hébergement et déploiement** :
  - Testable en local via serveur HTTP statique (`python -m http.server 8000`).
  - Déploiement en production sous HTTPS (Netlify / Vercel / GitHub Pages).

---

## 4. Cache et hors ligne

| Ressource | Stratégie | Stockage | Pourquoi |
|---|---|---|---|
| **HTML (App Shell)** | Cache First avec fallback `offline.html` | Cache API (`record-pwa-v1`) | Garantit l'ouverture instantanée de l'application hors ligne sans écran blanc. |
| **CSS, JS, Fonts** | Cache First | Cache API (`record-pwa-v1`) | Les styles et scripts applicatifs sont versionnés et statiques ; ils ne changent pas sans nouvelle version de l'app. |
| **Données audio (Mémos)** | Local Only / Offline First | IndexedDB (`recordings`) | Les fichiers audio binaires (`Blob`) peuvent peser plusieurs mégaoctets et doivent être conservés hors ligne de façon persistante. |
| **Librairie idb (CDN)** | Cache First | Cache API | Pré-mise en cache pour garantir l'exécution de la base de données même sans accès au CDN. |

- **Expérience hors ligne** : L'utilisateur peut enregistrer, écouter, renommer, télécharger et supprimer ses notes vocales sans aucune connexion. Un badge d'état indique le mode "Hors ligne" en temps réel.
- **Page de secours** : `offline.html` est servie par le Service Worker si une navigation échoue totalement.

---

## 5. Mise à jour

- **Stratégie retenue** : Mise à jour **proposée à l'utilisateur via une bannière non intrusive**, plutôt qu'appliquée de force en cours d'utilisation.
- **Justification** : Un enregistrement audio en cours ne doit jamais être interrompu brutalement par un rechargement intempestif de page. L'utilisateur garde le contrôle sur le moment opportun pour recharger.
- **Mécanisme** :
  1. Incrémentation de `CACHE_NAME` dans `sw.js` (`record-pwa-v1` → `v2`).
  2. L'événement `updatefound` dans `app.js` détecte le nouveau worker.
  3. Lorsque `newWorker.state === 'installed'`, la bannière *"Une nouvelle version est disponible"* s'affiche.
  4. Au clic sur "Mettre à jour", la page envoie `postMessage({ type: 'SKIP_WAITING' })`.
  5. Le Service Worker exécute `self.skipWaiting()`, `clients.claim()` dans `activate`, et `controllerchange` déclenche `window.location.reload()`.

---

## 6. Données et synchronisation

- **Modèle de données** :
  - Base IndexedDB : `audio-recordings-db` (version 1)
  - ObjectStore : `recordings`
  - Clé primaire : `id` (auto-incrémentée)
  - Structure d'un enregistrement :
    ```javascript
    {
      id: 1,
      title: "Note du 12 oct. à 00:47",
      blob: Blob (audio/webm ou audio/wav),
      duration: 17, // en secondes
      timestamp: 1791758830000,
      dateStr: "12 oct. 2026, 00:47"
    }
    ```
- **Politique de synchronisation** : L'application fonctionnant en architecture locale autonome (Local-First), l'exportation se fait directement au format fichier `.webm` / `.wav` par téléchargement ou partage vers les autres applications du système.

---

## 7. Capacités de l'appareil

| Capacité / API | Déclenchée quand | Pourquoi à ce moment | Si refus |
|---|---|---|---|
| **Microphone (`getUserMedia`)** | Au clic explicite sur le bouton **« Enregistrer »** (`#btn-record`) | Ne jamais solliciter de permission intrusive au premier chargement de la page ; l'utilisateur doit être dans l'action voulue. | Gestion propre via bloc `try...catch` : affichage d'un message convivial *"Accès micro refusé. Veuillez l'autoriser."* dans l'indicateur de statut sans aucun crash de l'interface. |
| **Screen Wake Lock (`navigator.wakeLock`)** | Pendant l'enregistrement actif | Empêche l'extinction de l'écran ou la mise en veille du téléphone pendant qu'un cours ou une réunion est enregistré. | Dégradation silencieuse (`console.warn`) : l'enregistrement audio continue normalement même si le Wake Lock n'est pas supporté. |
| **Web Share API (`navigator.share`)** | Au clic sur le bouton **« Partager »** d'une carte | Permet d'envoyer la note audio enregistrée vers WhatsApp, Mail, Telegram ou Drive nativement depuis le téléphone. | Le bouton ne s'affiche que si `navigator.share` est disponible ; sinon le bouton **« Sauvegarder »** prend le relais universellement. |

---

## 8. Notifications

- **Choix** : Aucune notification push ou locale requise pour la v1.
- **Justification** : Un enregistreur vocal est un outil synchrone d'utilité immédiate. Envoyer des notifications à l'utilisateur serait intrusif et injustifié sans composante de rappel programmé.

---

## 9. Visibilité : SEO et agents IA

- **HTML initial** : Le titre `<h1>`, les méta-données descriptives, le badge de statut et l'arborescence des sections sont présents directement dans le DOM initial, lisibles par `curl` et les moteurs de recherche.
- **Fichiers de découverte** :
  - [robots.txt](file:///c:/Users/bella/Desktop/Etudes/Master/PWA_Mobile/RecordPWA/robots.txt) : autorise l'ensemble des crawlers et indique le sitemap.
  - [sitemap.xml](file:///c:/Users/bella/Desktop/Etudes/Master/PWA_Mobile/RecordPWA/sitemap.xml) : déclare l'URL principale de la PWA.
  - [llms.txt](file:///c:/Users/bella/Desktop/Etudes/Master/PWA_Mobile/RecordPWA/llms.txt) : résumé structuré en Markdown destiné aux agents conversationnels et modèles d'IA explorateurs.
  - Balises **Open Graph** (`og:title`, `og:description`, `og:type`) dans l'en-tête pour un rendu soigné lors du partage sur les réseaux sociaux.

---

## 10. Sécurité et vie privée

- **100% Hors-Ligne & Privé** : Aucun flux audio ni métadonnée ne quitte l'appareil de l'utilisateur. Toutes les données demeurent confinées dans le bac à sable IndexedDB de l'origine.
- **Zéro fuite de credentials** : Aucun secret, clé d'API ou jeton d'authentification n'est stocké côté client.
- **Sécurité HTTPS** : Indispensable pour l'activation des Service Workers et de l'API `getUserMedia`.

---

## 11. Mesures & Audits

- **Lighthouse PWA** :
  - Manifest valide (icônes 192px et 512px, `display: standalone`, couleurs de thème).
  - Service Worker actif avec gestion de la mise en cache hors ligne et réponse au statut 200 sur la racine.
  - Bouton d'installation fonctionnel via l'événement `beforeinstallprompt`.
- **Core Web Vitals** :
  - LCP < 1.0s (App Shell ultra-léger sans bundle JS tiers).
  - CLS = 0 (mise en page stable à deux colonnes).
  - FID / INP quasi nul (manipulations DOM légères et optimisées).

---

## 12. Limites connues et suite (v2)

- **Limites actuelles** :
  - Sur iOS Safari, le codec audio par défaut de `MediaRecorder` peut varier selon la version d'iOS (géré via détection de `isTypeSupported`).
  - L'API Screen Wake Lock requiert un contexte de premier plan actif.
- **Pistes pour la v2** :
  - Intégration de la Web Speech API pour la transcription automatique des mémos en texte.
  - Catégorisation des mémos par tags ou dossiers.
  - Synchronisation chiffrée de bout en bout (E2EE) vers un stockage WebDAV ou cloud personnel.
