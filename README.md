# ColisTrack

ColisTrack est une petite application de gestion de livraisons que tu peux utiliser directement dans ton navigateur. Il n’y a rien à installer : ouvre simplement les fichiers et commence.

---

## Démarrer

1. Ouvre `index.html` ou `main.html` dans ton navigateur.
2. Connecte-toi avec le compte admin ci-dessous.
3. Explore les pages pour voir les livraisons, les coursiers et les salaires.

> Tout fonctionne dans le navigateur. Il n’y a pas de serveur ni d’installation compliquée.

---

## Identifiants de connexion

Utilise le même mot de passe pour chaque compte.

| Rôle     | Nom                   | Email                   | Mot de passe | Zone |
| -------- | --------------------- | ----------------------- | ------------ | ---- |
| Admin    | Achraf Yzem           | `achraf@colistrack.ma`  | `Achraf123`  | —    |
| Coursier | Youssef Alaoui        | `youssef@colistrack.ma` | `100900`     | A    |
| Coursier | Fatima Zahra Mansouri | `fatima@colistrack.ma`  | `100900`     | B    |
| Coursier | Karim Tazi            | `karim@colistrack.ma`   | `100900`     | A    |

- L’admin peut faire toutes les actions.
- Les coursiers peuvent seulement voir leurs propres livraisons et leur salaire.

---

## Ce que tu peux faire

- `index.html` — page d’accueil avec un bouton pour aller à la connexion.
- `main.html` — page de connexion et d’inscription.
- `pages/dashboard.html` — tableau de bord avec les statistiques du mois.
- `pages/livraisons.html` — liste et gestion des livraisons.
- `pages/coursiers.html` — gestion des coursiers (réservée à l’admin).
- `pages/salaires.html` — calcul automatique des salaires.

---

## Description des pages

### Page d’accueil

C’est la première page que voient les utilisateurs. Elle présente rapidement l’application et propose d’aller se connecter.

### Page de connexion

Ici tu peux te connecter ou créer un nouveau compte coursier.

### Tableau de bord

Tu verras des chiffres importants comme :

- le nombre de coursiers actifs
- le nombre de colis livrés
- le taux de réussite
- les problèmes de livraison
- le classement des coursiers

### Livraisons

Tu peux filtrer les livraisons par mois, coursier et statut. L’admin peut ajouter, modifier ou supprimer des livraisons.

### Coursiers

Cette page montre tous les coursiers. Seul l’admin peut ajouter, modifier ou supprimer un coursier.

### Salaires

Cette page calcule le salaire pour un coursier sur un mois.

- salaire de base
- pénalités
- primes
- prime carburant
- salaire final

---

## Règles de salaire

Le salaire dépend du nombre de colis livrés.

- Zone A : quota de 10 colis par livraison
- Zone B : quota de 8 colis par livraison
- Chaque colis manquant enlève 10 DH
- Chaque colis en plus rapporte 15 DH
- La prime carburant ajoute 5 % du bonus total
- Seuls les statuts `Livré` sont pris en compte

Formule simple :

Salaire final = salaire de base − pénalités + bonus + prime carburant

---

## Notes importantes

- Les données sont enregistrées dans ton navigateur.
- Les données restent sur ton ordinateur.
- Les exemples de données montrent le mois de mai 2025.
- Pour voir les données d’exemple, choisis `2025-05` dans les pages `livraisons` ou `salaires`.

Pour réinitialiser les données, ouvre la console du navigateur et copie ceci :

```javascript
DB.reset();
location.reload();
```

---

## Fichiers utiles

- `scripts/db.js` — enregistre et charge les utilisateurs et les livraisons.
- `scripts/session.js` — vérifie qui est connecté.
- `scripts/index.js` — gère la connexion et l’inscription.
- `scripts/dashboard.js` — affiche les statistiques du tableau de bord.
- `scripts/livraisons.js` — gère les livraisons.
- `scripts/coursiers.js` — gère les coursiers.
- `scripts/salaires.js` — calcule les salaires.
- `assets/css/styles.css` — contient le style visuel.

---

## Utiliser les données d’exemple

1. Ouvre `pages/salaires.html`.
2. Choisis `2025-05`.
3. Clique sur `Calculer`.

Ensuite, va sur `pages/livraisons.html` et choisis `2025-05` pour voir les livraisons d’exemple.
