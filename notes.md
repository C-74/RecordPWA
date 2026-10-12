# Enregistreur audio PWA

> Capturez vos idées vocales instantanément, stockées en local et disponibles hors ligne.
> Application Progressive Web App développée dans le cadre du cours PWA & Mobile.

## Fonctionnalités

- Enregistrement audio fluide via l'API Microphone native (MediaRecorder)
- Visualiseur de spectre sonore en direct via Web Audio API
- Stockage local persistant dans IndexedDB (idb)
- 100% Fonctionnel hors ligne avec Service Worker et stratégie Cache First
- Resynchronisation automatique au retour du réseau (Outbox Pattern)
- Exportation et partage natif via la Web Share API
- Protection contre la mise en veille de l'écran pendant l'enregistrement (Screen Wake Lock)

## Notes publiques d'exemple

- Première note : ce carnet vocal s'ouvre et s'utilise en mode avion
- Deuxième note : tous les enregistrements audio restent sur cet appareil
- Troisième note : installable directement depuis le navigateur sur mobile et desktop

## Stack technique

- HTML5, Vanilla CSS, JavaScript ES6+
- Service Worker & Cache API
- Base de données IndexedDB (librairie idb)
