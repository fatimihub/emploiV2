# Algorithme de Génération : Groupes

Ce document détaille le fonctionnement de l'algorithme utilisé pour la production des plannings finaux destinés aux groupes d'étudiants.

L'algorithme se trouve principalement dans `Generate-timetable.js` et s'appuie désormais sur un moteur optimisé (`OptimizedTimetableGenerator`) utilisant une approche d'exploration basée sur les contraintes.

## Phase 1 : Traitement Préalable et Fusions (Merges)

L'algorithme analyse en priorité les "fusions" (sessions regroupant plusieurs cohortes pour un même module).

1. Le système extrait les groupes nécessitant un nouvel emploi du temps (`GroupsNeedChangeTimetable`).
2. Le moteur génère une matrice vide.
3. L'algorithme de fusion (Merge Remote Timetables) place les sessions mutualisées dans les matrices des différents groupes simultanément, pour figer ces moments de synchronisation.
4. Si un conflit insoluble est détecté au niveau d'une fusion (ex. impossible d'aligner les étudiants), l'algorithme utilise un mécanisme de recul partiel (backtracking) ou crée une copie déphasée (`reassigned = true`).

## Phase 2 : Placement Déterministe et Validation (`placeSessionWithValidation`)

Pour chaque groupe, le programme dresse la liste des sessions "présentielles" requises, basées sur la charge hebdomadaire demandée.

L'algorithme tente d'insérer, bloc par bloc (2.5 heures ou 5 heures), une session dans le planning de la semaine :

1. **Recherche de Créneau Libre** : L'algorithme itère sur l'axe des jours (`DAYS.length`) et des horaires possibles pour le dit formateur (`getValidTimeShotsForFormateurDay`).
2. **Filtrages Strictes** :
   - Le formateur est-il déjà pris par un autre groupe à cette heure précise ? (`checkIfSessionWithFormateurTakenByGroup`)
   - Y a-t-il une règle d'écartement imposant une distance entre deux cours similaires ? (`canAddSessionWithGapRule`)
   - La limite d'heures quotidienne est-elle respectée ? (`canAddSessionToDay`)
3. **Cas de la Session Double (5h)** : Si une matière exige 5 heures consécutives, l'algorithme teste impérativement deux blocs contigus (ex. "08:30-11:00" puis le `getNextTimeShot`).
4. **Conclusion de Placement** : Dès qu'une fenêtre valablement filtrée est trouvée, la configuration est validée pour la semaine.

## Phase 3 : Audit de Faisabilité (Fallback)

Que se passe-t-il si un cours ne peut pas être inséré ? La robustesse de l'algorithme repère les impasses :

- Si un formateur est déclaré "disponible" localement moins d'heures que ce qui est exigé pour son enseignement ("_availableHours < requiredHours_").
- Le module échoue. Le système bascule le flag `is_started` à `false`. Cela permet aux autres de terminer et un rapport d'échec isolera le problème précis ("rapport_global.pdf") listant explicitement la cause.

## Phase 4 : Enregistrement et Archivage Automatique

1. Toutes les entités `Timetable` existantes pour le groupe ciblé se voient attribuer le statut `archived`.
2. Une nouvelle entrée `Timetable` "active" et ses sous-sessions associées sont créées, incluant la date de validité.
