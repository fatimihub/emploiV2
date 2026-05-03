# Guide de Développement et Maintenance

Ce document s'adresse aux développeurs souhaitant modifier ou étendre les fonctionnalités du Générateur d'Emplois du Temps.

## 1. Environnement de Développement

### Prérequis

- **Node.js** (Version recommandé : 18+)
- **Git**

### Installation

```bash
# Cloner le dépôt
git clone [URL_DU_DEPOT]

# Installer les dépendances (Racine)
npm install

# Installer les dépendances (Backend)
cd backend && npm install
```

### Lancement Local

```bash
# Lancement combiné (Electron + Backend + Frontend)
npm run dev
```

## 2. Cycle de Vie de la Base de Données

Le projet utilise **Sequelize CLI** pour gérer les évolutions du schéma.

### Ajouter un champ dans une table

1. Modifiez le modèle dans `backend/models/[nom_modele].js`.
2. Créez une migration : `npx sequelize-cli migration:generate --name add-[champ]-to-[table]`.
3. Implémentez `up` et `down` dans le fichier généré.
4. Appliquez à votre base locale : `cd backend && npm run migrate`.

## 3. Tests Automatisés

Le projet dispose de deux suites de tests :

### Tests Unitaires et Intégration (Backend)

Utilisent **Jest**. Ils vérifient la logique métier et l'absence de conflits de base.

```bash
cd backend
npm test
```

### Tests Bout-en-Bout (E2E)

Utilisent **Playwright** pour simuler un utilisateur réel dans l'application Electron.

```bash
npm run test:e2e
```

## 4. Documentation

La documentation est générée avec **VitePress**. Elle se trouve dans le dossier `/docs`.

- **Développement** : `npm run docs:dev`
- **Build** : `npm run docs:build`

## 5. Bonnes Pratiques

- **Transformers** : Ne renvoyez jamais de données "brutes" de la base au frontend. Créez ou modifiez un transformer dans `backend/helpers/transformers/`.
- **Validation** : Toute nouvelle règle de placement doit être ajoutée dans `backend/controllers/GA/constraints.js` pour être appliquée à la fois en automatique et en manuel.
- **Vite Watch** : Le fichier `vite.config.ts` contient une liste `ignored`. Ajoutez-y tout nouveau fichier de données (logs, db temporaire) pour éviter les rechargements intempestifs de l'app.
