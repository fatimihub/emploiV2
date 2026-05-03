# Démarrage Rapide

Suivez ces étapes pour mettre en place votre environnement de développement et lancer l'application localement.

## Clonage du Projet

Commencez par récupérer les sources depuis le dépôt officiel :

```bash
git clone https://github.com/Elmahdijaouali/Timetable-Generator-ISTA.git
cd Timetable-Generator-ISTA
```

## Installation des Dépendances

Le projet utilise une structure modulaire. Vous devez installer les dépendances à la racine et dans le dossier backend :

```bash
# Installation des dépendances générales
npm install

# Installation des dépendances du serveur
cd backend
npm install
cd ..
```

## Lancement en Mode Développement

Pour démarrer simultanément le frontend (Vite), le backend (Express) et l'interface Electron :

```bash
npm run dev
```

## Compilation pour la Production

Pour générer les exécutables finaux selon votre plateforme :

```bash
# Pour Windows
npm run build:win

# Pour Linux
npm run build:linux
```
