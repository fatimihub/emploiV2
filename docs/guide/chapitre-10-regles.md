# Règles Métier et Contraintes

Le moteur de génération du Générateur d'Emplois du Temps à l'ISTA repose sur un algorithme d'exploration avancée qui garantit le respect de toutes les contraintes administratives et pédagogiques.

## 1. Disponibilité des Formateurs

C'est la contrainte **maître**. Le système ne peut placer une séance que si le formateur a été déclaré comme disponible sur ce créneau lors de l'étape de génération des horaires formateurs (voir Chapitre 6).

- Un formateur "indisponible" ou n'ayant pas de créneau généré ne sera jamais sollicité par le système.

## 2. Unicité des Ressources (Anti-Conflit)

Le système garantit par construction qu'aucune ressource ne peut être "doublée" :

- **Unicité Formateur** : Un formateur ne peut pas enseigner à deux groupes différents sur le même créneau.
- **Unicité de Salle** : Une salle physique ne peut pas accueillir deux sessions simultanées.
- **Unicité de Groupe** : Un groupe d'étudiants ne peut pas avoir deux modules programmés en même temps.

## 3. Limites de Charge Quotidienne

Pour préserver la qualité de l'apprentissage et éviter la fatigue excessive, l'algorithme impose des plafonds stricts :

- **Jours de Semaine (Lundi-Vendredi)** : Maximum **10 heures** de cours par jour (soit 4 blocs de 2.5h).
- **Samedi** : Maximum **5 heures** de cours (soit 2 blocs de 2.5h).

## 4. Spécificités du Samedi

Le samedi fait l'objet de règles horaires restreintes calquées sur le rythme de l'établissement :

- Seuls les créneaux `08:30-11:00` et `11:00-13:30` sont autorisés pour la génération automatique.

## 5. Règle d'Écartement (Gap Rule)

Le système gère intelligemment la transition entre les modes d'apprentissage :

- **Transition Présentiel/Distanciel** : Un délai de sécurité (équivalent à un créneau de 2.5h) est automatiquement inséré si un groupe passe d'un cours en présentiel à un cours à distance (ou vice-versa) pour permettre le déplacement ou le changement de contexte.

## 6. Espacement Pédagogique

Plutôt que de "bourrer" un module sur deux jours, l'algorithme utilise une heuristique de répartition :

- Il privilégie les jours où le module n'a pas encore été programmé dans la semaine.
- Cela favorise une meilleure mémorisation pour les apprenants sur le long terme.

## 7. Gestion des Fusions (Merges)

L'algorithme traite les cours mutualisés (plusieurs groupes pour un même formateur/module) comme une priorité haute :

- Ces sessions sont "figées" simultanément pour tous les groupes concernés avant de remplir individuellement le reste des plannings.

## 8. Fragmentation Optimisée

Tous les blocs horaires sont traités par unités de **2.5 heures**.

- Si un module demande 5 heures hebdomadaires, le système cherchera à placer deux blocs de 2.5h.
- Cela offre une flexibilité maximale pour combler les "trous" dans l'emploi du temps tout en respectant les horaires officiels.

::: info Pourquoi une génération échoue-t-elle ?
Si l'algorithme ne trouve aucune solution respectant **100%** de ces règles pour un groupe donné, il s'arrête et génère un rapport d'erreur. C'est souvent le signe d'un manque de salles disponibles ou d'un formateur trop chargé par rapport à ses disponibilités déclarées.
:::
