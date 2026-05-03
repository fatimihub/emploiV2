# Frontend et Intégration Electron

L'interface de l'application est conçue pour être à la fois esthétique et performante, offrant une expérience proche d'un logiciel natif.

## Technologies Frontend

- **React 18** : Pour une gestion efficace de l'état et des composants.
- **Vite** : Outil de construction ultra-rapide pour le développement.
- **TailwindCSS** : Système de design basé sur des utilitaires CSS.
- **React Router** : Gestion de la navigation fluide sans rechargement de page.

## Intégration Electron

Electron permet d'encapsuler le code web pour en faire une application de bureau. Voici les points clés de l'intégration :

- **Main Process** : Gère le cycle de vie de l'application et la création des fenêtres.
- **Renderer Process** : Exécute l'interface React.
- **Communication IPC** : Échange de messages entre le processus principal et le rendu pour des opérations système.

## Visualisation des Emplois du Temps

L'interface utilise des bibliothèques telles que :

- **@dnd-kit** : Pour le glisser-déposer lors de la personnalisation manuelle.
- **html2canvas** : Pour capturer l'emploi du temps généré et le transformer en image PNG téléchargeable.
