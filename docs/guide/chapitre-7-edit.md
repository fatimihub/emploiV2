# Guide de Personnalisation de l'Emploi du Temps

Après la génération automatisée par l'algorithme, vous pouvez affiner manuellement chaque emploi du temps pour répondre à des besoins spécifiques ou des imprévus.

## 1. Accéder à l'interface

Pour personnaliser un emploi du temps :

1. Allez dans la liste des **Groupes** ou de l'**Historique**.
2. Cliquez sur l'icône de modification (stylo) ou sur le bouton **"Personnaliser"**.
3. Vous arrivez sur une interface interactive où chaque cellule de l'emploi du temps peut être manipulée dynamiquement.

## 2. Le Glisser-Déposer Intelligent (Drag & Drop)

Le système inclut une aide à la décision en temps réel pour éviter les erreurs de planification et les conflits de ressources.

### Comment déplacer une session :

1. Cliquez et maintenez le clic sur une séance (un bloc de couleur).
2. **Aide Visuelle** : Dès que vous commencez à déplacer la séance, plusieurs cases de l'emploi du temps s'illuminent en **gris clair**.
3. **Logique de Disponibilité** : Une case n'est mise en évidence que si :
   - Le formateur est **contractuellement disponible** (selon ses heures de travail définies dans ses paramètres).
   - Le formateur n'a **aucun conflit** avec un autre groupe sur ce créneau spécifique.
4. Relâchez la souris sur une case grise pour valider le déplacement.

::: tip Fluidité des Planning
Si une zone reste blanche (non surlignée), cela signifie qu'un conflit existe. Le système bloquera automatiquement la dépose sur ces zones pour garantir que l'emploi du temps reste valide et cohérent.
:::

## 3. Ajouter une Séance Manuellement

Si vous avez besoin d'insérer un cours sur un créneau vide :

1. Cliquez sur le bouton **"+"** (Ajouter une séance) situé en haut de la page.
2. Remplissez le formulaire :
   - **Module** : Sélectionnez le module souhaité parmi ceux affectés au groupe.
   - **Formateur & Salle** : Le système propose par défaut le formateur et la salle associés au module lors de l'importation.
   - **Créneau** : Choisissez le jour et l'heure (seuls les créneaux libres sont affichés).
3. Cliquez sur **Enregistrer**. Le système effectue une dernière validation avant d'insérer la séance.

## 4. Retouches Rapides sur les Sessions

Chaque bloc de séance dispose de contrôles directs pour des modifications rapides :

- **Changer la Salle** : Cliquez sur l'étiquette de la salle pour ouvrir un sélecteur et choisir un autre local disponible.
- **Mode Distanciel** : Un bouton permet de basculer instantanément la session entre "Présentiel" et "À distance".
- **Suppression Rapide** : Cliquez sur l'icône de la **poubelle** pour retirer la séance. Une fenêtre de confirmation s'affichera pour éviter les suppressions accidentelles.

## 5. Synchronisation en Temps Réel

Toutes les modifications effectuées dans cette interface sont **immédiates** et **persistantes**.

- **Pas de bouton Sauvegarder** : Chaque action (déplacement, ajout, modification, suppression) met à jour la base de données SQLite instantanément.
- **Rafraîchissement Intelligent** : L'affichage se met à jour sans recharger la page, vous permettant de continuer vos retouches sans interruption.

::: danger Sécurité Pédagogique
Même en mode manuel, le système refuse catégoriquement de créer un conflit de salle ou de formateur. Si une action échoue, une notification rouge s'affichera avec le détail de la contrainte non respectée.
:::
