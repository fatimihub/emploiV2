# Vue d'Ensemble de l'Architecture

Le projet repose sur une architecture moderne de type application de bureau hybride, séparant clairement les responsabilités entre l'interface utilisateur, la logique métier et le système de fichiers.

## Structure Globale

L'application est divisée en trois composants majeurs qui communiquent entre eux pour assurer une expérience fluide et sécurisée.

![Architecture du Système](/images/architecture.svg)

### 1. Le Frontend (React)

L'interface utilisateur est développée avec **React 18** et **TypeScript**. Elle gère toute la couche de présentation, les interactions dynamiques (Drag & Drop via @dnd-kit) et le routage interne. Le style est assuré par **TailwindCSS** pour une interface moderne et réactive.

### 2. Le Backend (Node.js/Express)

Le serveur local s'occupe de la persistance des données et des algorithmes lourds. Il utilise **Express** pour les APIs et **Sequelize** comme ORM pour interagir avec la base de données.

### 3. Le Conteneur Electron

**Electron** sert de pont entre le web et le système natif. Il encapsule l'application, gère les fenêtres, le cycle de vie du processus et permet de distribuer le projet comme un logiciel classique.

## Détails Techniques

Pour une exploration plus approfondie, consultez les sections dédiées :

- [Backend et Base de Données](./backend.md)
- [Frontend et Electron](./frontend.md)
- [Algorithme des Groupes](./algo-groupes.md)
- [Validation des Contraintes](./constraints-and-validation.md)
- [Référence de l'API (Endpoints)](./api-reference.md)
- [Guide de Maintenance (Dév)](./development-guide.md)
