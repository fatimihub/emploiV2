# Algorithme de Génération : Formateurs

Ce document explique le fonctionnement technique de l'algorithme d'attribution des créneaux de disponibilité horaires aux formateurs.

## Logique Fonctionnelle

L'algorithme de base (`Generate-timetable-formateur.js`) fonctionne de manière déterministe en associant directement les formateurs aux blocs d'heures. L'objectif est d'attribuer par défaut des séquences de travail complètes en fonction des salles.

L'algorithme repose sur les créneaux suivants :

- **Lundi à Vendredi** : Demi-journées de 5 heures (`08:30-13:30` et `13:30-18:30`).
- **Samedi** : Demi-journées réduites de 2h30 (`08:30-11:00` et `11:00-13:30`).

## Étapes de l'Algorithme

### 1. Analyse des Salles (`Classroom`)

Le moteur récupère chaque salle enregistrée en base de données avec les formateurs qui y sont pré-affectés.

- Si le système détecte des espaces sans affectation ou s'il y a un défaut de configuration, une erreur explicite est renvoyée (ex: "import les salles avant générer").

### 2. Attribution par Alternance

Pour chaque salle, le moteur analyse le nombre de formateurs assignés (cas courant : 1 ou 2 formateurs par salle). L'algorithme itère ensuite sur chaque jour (`Lundi` à `Samedi`).

#### Scénario A : Un seul formateur pour la salle

- **Lundi au Vendredi** : L'algorithme attribue un seul créneau (Matin ou Après-midi), puis **inverse** la polarité pour le lendemain. Par exemple, si le lundi il est affecté à `08:30-13:30`, alors le mardi, il sera affecté à `13:30-18:30`.
- **Samedi** : Un seul créneau par défaut est attribué (`08:30-11:00`).

#### Scénario B : Deux formateurs partageant la salle

La règle d'exclusion de salle entre en jeu : deux formateurs ne peuvent occuper la même ressource. L'algorithme crée un motif croisé.

- **Lundi au Vendredi** :
  - Le Formateur 1 prend le créneau du matin (`08:30-13:30`).
  - Le Formateur 2 prend le créneau de l'après-midi (`13:30-18:30`).
  - Le lendemain, les rôles sont strictement inversés.
- **Samedi** :
  - Le Formateur 1 se voit assigner `08:30-11:00`.
  - Le Formateur 2 se voit assigner `11:00-13:30`.

### 3. Insertion en Base de Données

Le système vérifie si un tel créneau existe déjà pour l'année en cours via `findOrCreate`. Si la configuration est nouvelle, l'algorithme l'enregistre (`FormateurTimetable`). L'ensemble devient la racine des vérifications de contraintes qui sera utilisée par l'algorithme de génération de groupe.
