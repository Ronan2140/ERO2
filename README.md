## Prérequis

*   **Node.js** : Version 18.0.0 ou supérieure (la version LTS v20+ est recommandée).
*   **npm** : Installé automatiquement avec Node.js.

> **Note** : Ce projet utilise Vite 6, qui ne supporte plus les anciennes versions de Node.js (comme v12 ou v14).

# Moulinette Simulator (ERO2)

Simulation du système de correction "La Moulinette" avec files d'attente et gestion des priorités (ING vs PREPA).

## Démarrage Rapide

1. **Installer** : `npm install`
2. **Lancer** : `npm start` (ou `npm run dev`)
3. **Ouvrir** : http://localhost:3000

## Structure Rapide

*   **`src/simulationEngine.ts`** : Gère la logique (files, arrivées, barrages) et calcule les stats.
*   **`src/types.ts`** : Les définitions des objets (Config, Agent, Résultats).
*   **`src/App.tsx`** : L'écran principal. Gère l'historique et l'export Excel.
*   **`src/components/`** :
    *   `ControlPanel` : Panneau de gauche pour régler les paramètres (lambda, Serveurs, etc.).
    *   `ResultsDashboard` : Tableaux de bord, graphiques et KPI.
    *   `LiveVisualization` : Vue animée de la simulation en temps réel.

## Comment utiliser ?

1.  **Réglez les paramètres** à gauche :
    *   **Scénario** : *Waterfall* (Simple) ou *Channels* (Avec priorités & barrages).
    *   **Temps (T)** et **Serveurs (K)** : Durée de simu et puissance de calcul.
    *   **Taux d'arrivée (lambda)** : Fréquence d'arrivée des élèves (0.2 = 20% de chance par tick).
    *   **Files** : Taille max avant rejet.
2.  Cliquez sur **"Lancer la Simulation"**.
    *   Vous pouvez lancer *N itérations* pour avoir une moyenne fiable.
3.  Analysez les résultats :
    *   **Onglet Résultats** : KPI (Taux de rejet, Temps moyen), graphiques d'occupation.
    *   **Onglet Temps Réel** : Voir les agents bouger dans le système.
4.  **Exporter** : Le bouton en bas à gauche génère un Excel complet de vos tests.
