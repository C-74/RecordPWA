# RecordPWA — Enregistreur Audio Progressive Web App

Application Progressive Web App (PWA) d'enregistrement de mémos vocaux haute fidélité avec stockage local persistant et fonctionnement 100% hors-ligne.  
Développée dans le cadre du cours PWA — Master 2 Informatique.

---

## 🚀 Fonctionnalités principales

- 🎙️ **Enregistrement audio fluide** : Utilise l'API Microphone native (`MediaRecorder`) avec demande de permission sécurisée à l'action.
- 📊 **Visualiseur de spectre sonore en direct** : Rendu des fréquences audio sur `<canvas>` grâce à l'API **Web Audio** (`AudioContext`, `AnalyserNode`).
- 📁 **Organisation en cartes** : Liste latérale ergonomique avec écoute directe, recherche par mot-clé, renommage et suppression.
- 💾 **Stockage persistant IndexedDB (`idb`)** : Tous vos mémos sont conservés localement sur votre appareil sans limite de session.
- 📴 **100% Hors-Ligne (Offline)** : Service Worker avec stratégie de cache robuste (Cache First) et page de secours dédiée (`offline.html`).
- 📱 **PWA Installable** : Conforme aux critères d'installation standalone sur smartphones Android / iOS et Desktop.
- 🔒 **Vie privée absolue** : Les enregistrements ne quittent jamais votre terminal.
- 📤 **Exportation et partage** : Téléchargement direct des fichiers audio et intégration de la **Web Share API**.
- 💡 **Protection de veille** : Utilise la **Screen Wake Lock API** pendant la capture audio.
- 🔄 **Resynchronisation au retour du réseau (Outbox Pattern)** : File d'attente automatique IndexedDB qui se dépile dès que la connexion Internet est rétablie.
- 🔔 **Notifications PWA** : Alertes de confirmation d'enregistrement et notification système lors du dépilage de l'outbox via le Service Worker.

---

## 🛠️ Lancer le projet en local

1. Clonez ou téléchargez le dépôt :

   ```bash
   git clone <URL_DU_DEPOT>
   cd RecordPWA
   ```

2. Démarrez un serveur HTTP local (indispensable pour charger le Service Worker et tester les permissions) :

   ```bash
   python -m http.server 8000
   ```

   _Ou avec Node.js / npx :_

   ```bash
   npx serve .
   ```

3. Ouvrez votre navigateur sur [http://localhost:8000](http://localhost:8000).

---

## 📄 Documentation technique

Le document de conception technique complet détaillant l'architecture, les choix de cache, le modèle de données IndexedDB et les capacités utilisées est disponible dans :
[DOC-TECHNIQUE.md](DOC-TECHNIQUE.md)
