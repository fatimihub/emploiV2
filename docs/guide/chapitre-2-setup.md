# Initialisation et Importation de Données

L'efficacité du système repose sur une base de données structurée. L'importation via des fichiers Excel standardisés est la méthode unique pour l'initialisation du centre.

Le système condense la création de toute votre hiérarchie en **seulement deux fichiers Excel**. Il n'y a pas besoin d'importer les filières, les groupes et les modules séparément : le système lit intelligemment le fichier global pour construire et lier l'ensemble de la base de données.

## 1. Importation des Salles et Formateurs

Ce premier fichier (ex: `formateurs_avec_des_salle.xlsx`) pré-configure l'infrastructure physique et l'associe aux formateurs.

- **Salle** : Le nom du local.
- **Formateur & Matricule** : L'identité du formateur assigné à cette salle.

**Procédure technique** : Rendez-vous sur la page **Salles** de la barre latérale, et utilisez le bouton d'importation.

::: tip Précision
S'il y a des doublons ou des erreurs (ex: salle manquante pour un formateur existant), l'interface vous affichera précisément la ligne en erreur.
:::

## 2. Importation de l'Avancement du Programme (Global)

Ce fichier maître (ex: `AvancementProgramme.xlsx`), **exporté directement depuis le système institutionnel E-note**, est le cœur du système. À lui seul, il dicte l'ensemble de la répartition de l'année.

En lisant ce fichier massif, le système extrait, crée et lie automatiquement :

- **Les Filières** (à partir du code filière).
- **Les Groupes** (et leur effectif).
- **Les Modules** (avec précision des MHP, MHSYN et les heures régionales).
- **Les Fusions** (regroupements de classes).

**Procédure technique** : L'intégration se fait exclusivement depuis la page **Générer des emplois**.

::: info Sécurité Transactionnelle
Le fichier est protégé par une transaction sécurisée. En d'autres termes, soit tout le fichier est parfait et intégré, soit l'intégration est annulée en vous avertissant, évitant ainsi toute corruption partielle de votre base de données.
:::
