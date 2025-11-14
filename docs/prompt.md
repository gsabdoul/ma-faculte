# Prompt  - Application Ma faculté

## Contexte du Projet
Développe une application mobile Flutter nommée **Ma faculte** destinée aux étudiants de toutes les faculté au Burkina Faso.Les contenus de l'application sera fonction de la faculté et du niveau de l'étudiant connecté.

## Stack Technique


- **Backend**: Supabase

  ## Architecture de l'Application

### 1. Panneau Admin
- Accessible uniquement aux utilisateurs avec rôle admin
- Permet de visualiser et créer toutes les données de l'application

### 2. Authentification

#### Page de Connexion
- Champs: Email, Mot de passe

#### Page d'Inscription
- Nom
- Prénom
- Email
- Université (sélection)
- Filière (sélection)
- Niveau d'étude (sélection)
 NB: Il doit avoir une cohérence dans les elections 

### 3. Navigation Bar (Bottom Navigation)
- Accueil
- Drives
- Livres
- Profil

## Fonctionnalités Détaillées

### I. PAGE ACCUEIL (Pour ne pas dire sujet

#### Header
- Container avec angles inférieurs arrondis contenant:
  - Avatar (photo de profil modifiable depuis les paramètres)
  - Message de bienvenue
  - "[Nom de l'étudiant]"
  - Icône notification

#### Body

##### Section Carrousel
- Titre: Infos
- Container avec images (flyers) d'information/promotions en carrousel

##### Section GridView  

1. **Titre**
   - Anciens sujets par module

2. **Module**
   - Affichage
     - icône du module sous format image
     - Nom du module
     - icone cadenas
   - Action:Navigation vers universitePage 

   **universitePage**:
   - Affichage:
     - Barre de recherche
     - Liste des université qui ont au moins un sujet sur le module cliqué
       - Logo de l'universite
       - Le nombre de sujets
  
   - Actions: Navigation vers sujetPage
   **sujetPage**
   - Affichage:
     - Barre de recherche
     - Liste des sujets (Format Pdf stockés sur google drive )
       - Icone PDF
       - Titre du sujet
       - Taille du fichier
       - Icone téléchargez
    - Action:
       - Télécharger le sujet pour une première fois
       - Navigation vers sujetviewPage
   **sujetViewPage**:
   - Affichage:
     - AppBar:
        - Titre du sujet
        - Un bouton 
           - Signaler(Pour decrire un problème)
           - Enregistré (Pour enregistrer le fichier pdf) 
      - PDF view pour lire le sujet directement dans l'application
      - Les pages (1/5 et permet de saisir un numero de page)

### II. PAGE DRIVES
 - Affichage:
   - Fonctionnalité de recherche
   - Liste des drives partagés accessibles à tous les étudiants
     - Icone de google drive
     - Titre du drive
     - Description 
### III. PAGE Livres(PDF stockés aussi sur drive)
 - Affichage:
    - Fonctionnalité de recherche 
    - ChoiceSips ou TabBar des module qui ont au moins un livre
    - Liste des livre en fonction du module
        - Couverture du livre ( image stockée sur drive)
        - Un titre
        - nombre de page 
        - Taille
        - Icone de téléchargement pour une première fois
  - Action:
     - Télécharger dans la database
     - Navigation Vers livreViewPage
   **livreViewPage**:
   - Affichage:
     - AppBar:
        - Titre du livre
        - Un bouton 
           - Signaler(Pour décrire un problème)
           - Enregistré (Pour enregistrer le fichier pdf) 
      - PDF view pour lire le livre directement dans l'application
      - Les pages (1/5 et permet de saisir un numéro de page)

### IV. PAGE PROFIL

Affichage:
- Container
   - Photo(icône) avatar nom modifiable
   - Nom et prénom de l'étudiant connecté
   - Sa faculté et son niveau d'étude 
   - Son adresse mail 
   - Un bouton pour éditer les infos personnelles
-Une liste de bouton:
 - Mon abonnement 
 - Notre équipe (testeurs,developpeurs,disigner avec leur profife facebook)
 - Obtenir de l'aide
 - Panneau admin
 - Politique de confidentialité 
 - Termes et  conditions d'utilisation
 - Partager l'application (via lien/invitation)
 - Déconnexion

## Directives d'Implémentation


### Design UI/UX
- Interface moderne et intuitive
- Thème adapté au domaine scolaire (couleurs professionnelles)
- Responsive design
- Animations fluides
- Accessibilité

### Bonnes Pratiques
- Code commenté en français
- Gestion d'erreurs robuste
- États de chargement appropriés
- Validation des formulaires
- Optimisation des performances
- Tests unitaires pour la logique métier
- Gestion du cache pour le mode hors ligne 

## Priorisation des Développements

### Phase 1 (MVP)
### Phase 2
-Panneau admin
-Backend:
  - Authentification sécurisée via Supabase
  - Row Level Security (RLS) sur Supabase
  - Validation côté client et serveur
  - Gestion sécurisée des tokens 

**Important**: Toujours demander des clarifications si une fonctionnalité n'est pas claire avant de commencer l'implémentation. Je suis débutant donc essayez de comprendre ma logique et si j'ai oublier ou si vous avez des apports que se soit un ajout ou un retrait de quoi que ce soit, Je suis très ouverte. Ne suivez pas ma description à la lettre, faites quelque chose d'unique et très professionnelle.Commençons par la phase 1

