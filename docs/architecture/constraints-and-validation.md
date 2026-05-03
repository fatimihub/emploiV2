# Validation des Contraintes et Personnalisation

Ce document explique comment le système garantit l'intégrité des données lors de la modification manuelle des emplois du temps.

## 1. Moteur de Validation (`constraints.js`)

La logique de validation partagée est centralisée dans `backend/controllers/GA/constraints.js`. Ce module est utilisé à la fois par l'algorithme de génération automatique et par le contrôleur de personnalisation.

### Vérifications effectuées :

- **Disponibilité Formateur** : Vérifie si le formateur est contractuellement au travail (basé sur `FormateurTimetable`).
- **Conflit de Ressources** : S'assure que le formateur ou la salle ne sont pas déjà assignés à une autre session active au même moment, quel que soit le groupe.
- **Règles Pédagogiques** : Validation des créneaux (ex: un cours de 5h nécessite deux blocs consécutifs).
- **Mode d'Enseignement** : Gestion des spécificités du distanciel (pas de salle requise).

## 2. API de Disponibilité Hebdomadaire

Pour permettre une interface fluide (Drag & Drop), le backend expose un point d'accès consolidé :
`GET /api/v1/group/formateur/:formateurId/busy-slots`

Cette route renvoie un objet JSON indexé par jour, contenant tous les créneaux où le formateur est **indisponible** :

- Soit parce qu'il est en **repos** (hors contrat).
- Soit parce qu'il a déjà une **séance programmée** avec un autre groupe.

## 3. Personnalisation Manuelle (`PersonalizeTimetableController.js`)

Toutes les actions manuelles (ajout, déplacement, suppression) passent par ce contrôleur qui effectue une double validation :

1. **Validation métier** : Appel des fonctions de `constraints.js`.
2. **Persistance atomique** : Mise à jour de la table `Sessions` et renvoi immédiat de l'emploi du temps transformé pour éviter les désynchronisations de l'UI.

## 4. Transformers de Données

Le backend utilise des "Transformers" (`backend/helpers/transformers/`) pour préparer les données de la base SQLite avant de les envoyer au frontend.

- **Désaccouplement** : Le frontend ne reçoit pas les objets Sequelize bruts, mais des structures optimisées pour l'affichage.
- **Calculs dynamiques** : Les transformers gèrent le calcul de l'année académique (basé sur la colonne `academic_year` ou la date `valid_form`) et l'attribution des couleurs par module.
