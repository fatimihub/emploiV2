# Référence de l'API REST (v1)

Toutes les requêtes doivent être préfixées par `/api/v1`. Les routes protégées nécessitent un en-tête `Authorization: Bearer <token>`.

## Authentification (`/auth.js`)

- `POST /login` : Connexion administrateur. Retourne un JWT.
- `POST /register` : Création de compte (si activé dans les réglages).
- `GET /me` : Récupère les infos de l'utilisateur connecté.

## Groupes (`/group.js`)

- `GET /groups` : Liste de tous les groupes.
- `GET /groups/:id` : Détails d'un groupe.
- `PATCH /groups/:groupId/module/:moduleId` : Active/Désactive un module pour un groupe.
- `GET /modules/by-group/:groupId` : Liste des modules ouverts.
- `GET /available-modules/:groupId` : Modules disponibles pour ajout manuel.

## Emplois du Temps (`/timetableGroup.js`)

- `GET /timetables/groups` : Liste des emplois du temps actifs.
- `GET /timetables/:id` : Détails complets d'un emploi du temps (transformé).
- `POST /timetables/update-session-position` : Gère le glisser-déposer (Drag & Drop).
- `DELETE /timetables/sessions/:id` : Supprime une séance spécifique.
- `GET /timetables/groups/excel` : Export global Excel.
- `GET /timetables/groups/pdf` : Export global PDF.

## Formateurs et Disponibilités

- `GET /formateurs` : Liste des formateurs.
- `GET /formateur/:formateurId/busy-slots` : **(Nouveau)** Récupère l'indisponibilité hebdomadaire consolidée (contrat + conflits).
- `GET /timetable-formateur` : Emploi du temps de base des formateurs.

## Salles (`/classroom.js`)

- `GET /classrooms` : Liste des salles.
- `POST /classrooms` : Ajouter une salle.
- `POST /classrooms/import` : Importation via Excel (`xlsx`).

## Paramètres et Génération

- `GET /settings` : Liste des réglages globaux.
- `POST /settings` : Créer/Mettre à jour un réglage.
- `POST /generate` : Lance l'algorithme de génération globale.
- `POST /import-avancement` : Importation du fichier E-note (`AvancementProgramme.xlsx`).

## Divers

- `GET /branches` : Liste des filières.
- `GET /global-generation-reports` : Rapports d'erreurs de la dernière génération.
