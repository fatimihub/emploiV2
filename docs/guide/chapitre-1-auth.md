# Premiers Pas et Authentification Sécurisée

Ce chapitre détaille les procédures d'accès initial et la gestion de la sécurité des sessions pour l'administration de l'établissement.

## Protocole de Connexion

L'accès à l'interface de gestion est strictement réservé au personnel administratif autorisé. Le système s'appuie sur une architecture de sécurité robuste pour garantir l'intégrité des données de planification.

### Procédure d'Authentification

1. **Identification** : Saisissez l'adresse électronique associée à votre compte administrateur.
2. **Authentification** : Renseignez votre mot de passe confidentiel.
3. **Session de Travail** : Après validation, un jeton de sécurité éphémère (JWT) est généré. Ce jeton assure la protection de vos échanges avec le serveur local durant toute la durée de votre activité.

::: info Gestion des Accès
Selon la politique de sécurité en vigueur dans votre établissement, l'inscription de nouveaux administrateurs peut être réalisée directement depuis l'écran d'accueil.

- **Formulaire d'enregistrement** : Requiert une identité complète et un mot de passe robuste.
- **Révocation** : Les droits d'accès peuvent être réinitialisés par un administrateur via les paramètres de base de données.
  :::

## Interface de Direction (Dashboard)

Le tableau de bord constitue le centre de commande de l'application. Il a été conçu pour offrir une visibilité immédiate sur les indicateurs clés de performance (KPI) du centre de formation.

- **Moniteur de Ressources** : Visualisation en temps réel du nombre de formateurs actifs, des groupes de formation et des salles de cours opérationnelles.
- **Navigation Structurelle** : La barre latérale permet un accès hiérarchique à tous les modules fonctionnels, de la configuration des filières à la génération finale.
- **Alertes Systèmes** : Notifications automatiques en cas d'incohérence dans les données ou de conflits majeurs détectés.
