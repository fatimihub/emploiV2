# Déploiement et CI/CD

Pour garantir la qualité et la disponibilité de l'application et de sa documentation, nous utilisons des processus automatisés de déploiement.

## GitHub Actions

Le projet utilise GitHub Actions pour automatiser plusieurs tâches :

1. **Tests E2E** : Vérification de la stabilité de l'application à chaque modification.
2. **Build Documentation** : Compilation automatique de cette documentation via VitePress.
3. **Publication GitHub Pages** : Déploiement de la version HTML de la documentation sur le serveur web de GitHub.

## Déploiement de l'Application

L'application finale est distribuée sous forme de binaires :

- **.exe** pour Windows.
- **.AppImage** pour Linux.
- **.dmg** pour macOS.

Ces fichiers sont générés via **electron-builder** et peuvent être hébergés dans la section "Releases" du dépôt GitHub.
