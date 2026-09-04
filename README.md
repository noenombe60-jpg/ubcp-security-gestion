# UBCP SECURITY Gestion — Version 2

Cette version remplace le stockage local du prototype par Firebase Authentication + Cloud Firestore.

## 1. Créer le projet Firebase
- Ouvre Firebase Console.
- Crée ou sélectionne le projet UBCP SECURITY.
- Ajoute une application Web.
- Active Authentication > Sign-in method > Email/Password.
- Crée le premier compte administrateur dans Authentication.

## 2. Récupérer la configuration Web
Dans les paramètres de l'application Web Firebase, copie la configuration dans `firebase-config.js`.

## 3. Créer le rôle administrateur
Dans Firestore, crée :
`Users/{UID_DU_COMPTE_ADMIN}`
avec :
`role: "admin"`
et éventuellement :
`email: "adresse@email"`

Pour un gestionnaire :
`Users/{UID}`
avec `role: "gestionnaire"`.

## 4. Règles Firestore
Publie le contenu de `firestore.rules` dans Firestore > Rules.

## 5. Collections utilisées
- `users`
- `agents`
- `markets`
- `cash_operations`
- `payments`

## 6. Mise en ligne
Le dossier peut être déployé sur Firebase Hosting, Vercel, Netlify ou tout hébergement HTTPS qui sert des modules JavaScript.

## Important
Le projet fourni est une base fonctionnelle de version 2, mais il reste à configurer ton projet Firebase réel. Ne mets jamais de credentials Admin SDK dans le navigateur.

## Améliorations prévues pour une version 3
- création des comptes utilisateurs depuis l'espace admin via Cloud Function;
- modification des agents/marchés;
- génération de reçus PDF;
- export Excel;
- filtres par dates;
- clôture journalière de caisse;
- audit log immuable;
- sauvegarde et statistiques avancées.
