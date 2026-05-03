# Générer des Emplois du Temps

Le système permet de générer automatiquement les emplois du temps.

## Logique de Fonctionnement de l'Algorithme

Le processus de génération s'appuie sur une analyse multidimensionnelle des contraintes :

1. **Contraintes Humaines** : Respect absolu des disponibilités des formateurs.
2. **Contraintes Matérielles** : Disponibilité et capacité des salles de classe.
3. **Contraintes Pédagogiques** : Répartition équilibrée des sessions pour éviter la saturation des apprenants.
4. **Contraintes d'Intégrité** : Unicité de présence pour chaque formateur et salle sur un créneau donné.

## Procédure de Lancement (Étape par Étape)

La génération exige de suivre une procédure stricte, incluant l'importation de vos données, avant de pouvoir lancer le calcul algorithmique.

### Étape 1 : Importer les Salles et Formateurs

Assurez-vous que vos affectations de base soient complètes.

1. Allez sur la page **Salles**.
2. Utilisez le bouton d'importation pour charger votre fichier Excel (ex : `formateurs_avec_des_salle.xlsx`).

### Étape 2 : Importer l'Avancement du Programme

Le système a besoin de connaître l'état actuel des volumes horaires.

1. Cliquez sur **Générer des emplois** dans le menu latéral.
2. Utilisez l'outil d'importation pour charger votre fichier d'avancement des modules (fichier exporté du système **E-note**, ex : `AvancementProgramme.xlsx`).

::: info Colonne Dynamique "Année"
Le système extrait désormais l'année académique directement depuis une colonne nommée **"Année"** dans votre fichier Excel. Si cette colonne est présente, vos emplois du temps afficheront cette valeur (ex: 2024-2025). Dans le cas contraire, le système calculera automatiquement l'année en fonction de la date de début de validité.
:::

### Étape 3 : Génération des Formateurs (Prérequis Absolu)

1. Ouvrez le menu **Paramètres** dans la barre latérale.
2. Identifiez la section de génération et cliquez sur le bouton pour générer les **emplois du temps des formateurs**.

::: danger Prérequis Strict
Omettre cette étape bloquera la génération globale des groupes. L'algorithme a absolument besoin de la base horaire des formateurs en premier lieu.
:::

### Étape 4 : Génération Globale (Groupes)

Une fois les données importées et les horaires des formateurs pré-calculés :

1. Retournez dans **Générer des emplois**.
2. Renseignez la date de départ en sélectionnant une date **"Valide à partir de"** dans le calendrier.
3. Lancez la génération. Le moteur explore alors les combinaisons, évite les conflits et finalise votre semestre.

::: info Gestion des Erreurs
En cas d'erreur de génération, un rapport localisé en français s'affichera, listant les modules spécifiques qui n'ont pas pu être programmés (formateur indisponible, quotas dépassés, etc.).
:::

## Archivage Stratégique

La gestion des versions est automatisée. À chaque nouvelle itération de l'emploi du temps global :

- La version précédente est figée et stockée dans l'historique.
- Les données de performance de la génération sont conservées pour analyse.
