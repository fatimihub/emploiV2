import { defineConfig } from 'vitepress';

export default defineConfig({
  base: '/Timetable-Generator-ISTA/',
  lang: 'fr-FR',
  title: 'Générateur d\'Emplois du Temps',
  description: 'Documentation officielle pour le système de génération automatisée d\'emplois du temps pour l\'ISTA.',
  head: [
    ['link', { rel: 'icon', href: '/Timetable-Generator-ISTA/logo.png' }]
  ],

  themeConfig: {
    logo: '/logo.png',
    siteTitle: 'TG ISTA',
    nav: [
      { text: 'Accueil', link: '/' },
      { text: 'Guide d\'Utilisation', link: '/guide/chapitre-1-auth' },
      { text: 'Architecture', link: '/architecture/overview' }
    ],

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: 'Rechercher',
                buttonAriaLabel: 'Rechercher'
              },
              modal: {
                noResultsText: 'Aucun résultat pour',
                resetButtonTitle: 'Effacer la recherche',
                footer: {
                  selectText: 'pour sélectionner',
                  navigateText: 'pour naviguer',
                  closeText: 'pour fermer'
                }
              }
            }
          }
        }
      }
    },

    outline: {
      level: [2, 3],
      label: 'Sur cette page'
    },

    sidebar: [
      {
        text: 'Présentation',
        items: [
          { text: 'Introduction', link: '/presentation/introduction' },
          { text: 'Fonctionnalités', link: '/presentation/features' }
        ]
      },
      {
        text: 'Installation',
        items: [
          { text: 'Prérequis', link: '/guide/prerequisites' },
          { text: 'Démarrage Rapide', link: '/guide/getting-started' }
        ]
      },
      {
        text: 'Guide de Référence Utilisateur',
        items: [
          { text: 'Connexion et Inscription', link: '/guide/chapitre-1-auth' },
          { text: 'Importation de Données', link: '/guide/chapitre-2-setup' },
          { text: 'Filières, Modules & Salles', link: '/guide/chapitre-3-resources' },
          { text: 'Les Formateurs', link: '/guide/chapitre-4-staff' },
          { text: 'Groupes, Fusions & Stages', link: '/guide/chapitre-5-groups' },
          { text: 'Générer des Emplois du Temps', link: '/guide/chapitre-6-generation' },
          { text: 'Personnaliser un emploi', link: '/guide/chapitre-7-edit' },
          { text: 'Paramètres & Profil Admin', link: '/guide/chapitre-8-profile' },
          { text: 'Exporter et Historique', link: '/guide/chapitre-9-history' },
          { text: 'Règles Métier & Contraintes', link: '/guide/chapitre-10-regles' }
        ]
      },
      {
        text: 'Architecture Technique',
        items: [
          { text: 'Vue d\'Ensemble', link: '/architecture/overview' },
          { text: 'Algorithme : Formateurs', link: '/architecture/algo-formateurs' },
          { text: 'Algorithme : Groupes', link: '/architecture/algo-groupes' },
          { text: 'Backend & Base de Données', link: '/architecture/backend' },
          { text: 'Frontend & Electron', link: '/architecture/frontend' }
        ]
      },
      {
        text: 'Déploiement',
        items: [
          { text: 'Workflow CI/CD', link: '/guide/deployment' }
        ]
      }
    ],

    footer: {
      message: 'Ce projet est la propriété de l\'ISTA Cité de l\'air el jadida.',
      copyright: 'Copyright © 2026 ELMAHDI JAOUALI'
    }
  }
});
