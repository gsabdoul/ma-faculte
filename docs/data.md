Quelques infos backend
# On a trois role:
## admin
Accès total à toutes les fonctionnalités de l'application.
## writer
Accès limité aux fonctionnalités de création et de modification de contenus.
## reader
Accès en lecture seule aux contenus de l'application.
## Chaque utilisateur est assigné à un seul rôle et les admin peuvent modifier les roles
# profile
La table profile  les informations suivantes:
- id(auth_id)
- nom
- prenom
- universite
- filiere
- niveau
- role
- code(code unique de 8 caractères(lettre et des chiffres) generer lors de l'inscription )
- active_code (code unique de 8 caractères(lettre et des chiffres) generer lors de l'inscription qui sera nessessaire pour activer le compte(passer à premium))
- is_premium (boolean qui indique si l'utilisateur est premium ou non)
# universites
La table universites contient les informations suivantes:
- id
- nom
- logo_url
# facules
La table facules contient les informations suivantes:
- id
- nom
- created_at
# niveau
La table niveau contient les informations suivantes:
- id
- nom
- created_at
- ordre
- faculte_id
On a pas besoins de table filieres et les drives sont fonction de faculte et niveau
