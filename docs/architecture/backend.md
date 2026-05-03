# Backend et Base de Données

Le backend est le moteur de l'application, gérant la logique métier, la validation des données et les algorithmes de génération.

## Technologies Utilisées

- **Node.js** : Environnement d'exécution.
- **Express.js** : Framework web pour la création d'API REST.
- **Sequelize** : ORM (Object-Relational Mapping) pour une gestion simplifiée de la base de données.
- **SQLite** : Moteur de base de données léger. Le fichier se trouve dans `backend/database/database.sqlite`.

## Structure du Projet (Backend)

- `/controllers` : Logique métier (Importation, Génération, Personnalisation).
- `/models` : Définitions Sequelize (Groupes, Formateurs, Sessions, etc.).
- `/routes` : Endpoints API v1.
- `/helpers/transformers` : Couche de transformation pour formater les données pour le frontend.
- `/migrations` : Historique des évolutions de la base de données.

## Modèles et Relations Principaux

- **Group** : Possède plusieurs `Timetable`. Inclut `academic_year` (importé) et `year_of_formation` (niveau).
- **Timetable** : Représente une version d'un planning. Possède plusieurs `Session`.
- **Session** : Un bloc horaire spécifique (Jour/Timeshot) liant un Groupe, un Formateur et une Salle.
- **FormateurTimetable** : Définit les disponibilités contractuelles de base des formateurs.

## Validation et Contraintes

La logique de validation est cruciale pour éviter les doubles réservations. Consultez [Validation des Contraintes](./constraints-and-validation.md) pour plus de détails sur le fonctionnement interne des vérifications de conflits.

## Sécurité

L'accès aux routes sensibles est protégé par un middleware JWT. Les paramètres globaux (heures max, etc.) sont stockés dans la table `Settings`.
