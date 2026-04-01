# Configuration des Secrets GitHub Actions - VitalSync

## a) Configuration des Secrets Nécessaires

### Secrets à Configurer

Accès: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

#### 1. **DB_PASSWORD** (Obligatoire)

```
Nom: DB_PASSWORD
Valeur: Votre mot de passe PostgreSQL sécurisé (min 16 caractères)
Exemple: xK9$mP2@nL7!qR4vZ8#bA
```

**Utilisation:**

- Dans le workflow CI/CD pour la base de données staging
- Ligne 175: `DB_PASSWORD=${{ secrets.DB_PASSWORD }}`

#### 2. **SLACK_WEBHOOK_URL** (Optionnel mais Recommandé)

```
Nom: SLACK_WEBHOOK_URL
Valeur: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Utilisation:**

- Notifications de déploiement dans Slack
- Ligne 211: `webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}`
- Remplace le broken `secrets.SLACK_WEBHOOK` par le nom correct

#### 3. **GITHUB_TOKEN** (Automatique)

```
FOURNI AUTOMATIQUEMENT PAR GITHUB
- Pas besoin de le créer manuellement
- Scope: read:packages, write:packages, contents:read
- Valide durée: 1h par workflow
```

**Utilisation:**

- Authentification GHCR (GitHub Container Registry)
- Ligne 78: `password: ${{ secrets.GITHUB_TOKEN }}`

#### 4. **SLACK_WEBHOOK** (Ancien - À Supprimer)

```
❌ NE PAS UTILISER - ANCIENNE SYNTAXE
✅ REMPLACER PAR: SLACK_WEBHOOK_URL
```

---

## b) Configuration des Déclencheurs (Triggers)

### Déclencheurs Actuels (Configurés)

```yaml
on:
  push:
    branches:
      - develop # Builds à chaque push sur develop
      - main # Builds à chaque push sur main
  pull_request:
    branches:
      - develop # Builds sur PR vers develop
      - main # Builds sur PR vers main
```

### Comportement des Jobs par Branche

| Événement    | Branch    | Lint & Tests |    Build Docker    |         Deploy Staging          |
| ------------ | --------- | :----------: | :----------------: | :-----------------------------: |
| Push         | `develop` |      OK      |         OK         |               OK                |
| Push         | `main`    |      OK      |         OK         | SKIP (pas de staging pour main) |
| Pull Request | `develop` |      OK      | SKIP (si_on_error) |              SKIP               |
| Pull Request | `main`    |      OK      | SKIP (si_on_error) |              SKIP               |

**Conditions dans le Workflow:**

```yaml
# Job 2: Build & Push Docker
build-docker:
  if: github.event_name == 'push' # Seulement sur push, pas sur PR
  # ➜ Lance sur: develop push, main push
  # ➜ Ignore: PR (sauf erreur via continue-on-error)

# Job 3: Deploy Staging
deploy-staging:
  if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
  # ➜ Lance seulement sur: develop push
  # ➜ Ignore: main push, tous les PR
```

### Comportement Recommandé

**Pour `develop` (branche de développement):**

- Exécuter tous les tests (Lint, Jest)
- Construire les images Docker
- Déployer automatiquement en staging (test avant production)

**Pour `main` (branche de production/stable):**

- Exécuter tous les tests (Lint, Jest)
- Construire les images Docker
- Déploiement manuel (review et approbation humaine requise)

**Pour les Pull Requests:**

- Exécuter tous les tests immédiatement
- Pas de build/push Docker (optimisation : on veut d'abord valider le code)
- Pas de déploiement (sauf merge)

---

## c) Pourquoi Ne JAMAIS Stocker les Secrets en Clair ?

### Mauvaise Pratique : Secrets en Clair

```yaml
# DANGER CRITIQUE ! NE JAMAIS FAIRE CELA

deploy-staging:
  env:
    DB_PASSWORD: xK9$mP2@nL7!qR4vZ8#bA # En clair
    GITHUB_TOKEN: ghp_abc123xyz789... # Token exposé
    SLACK_WEBHOOK: https://hooks.slack.com/... # URL publique


# Ou dans un fichier .env commité :
# DB_PASSWORD=xK9$mP2@nL7!qR4vZ8#bA
# JAMAIS dans git !
```

---

### Risques Concrets de Secrets Non Protégés

#### 1. Accès aux Données Sensibles (Data Breach)

```
Scénario: Un attaquant accède au repository
↓
Trouve le mot de passe PostgreSQL en clair
↓
Se connecte à la base produit
↓
Vol de 100 000 données patient (RGPD violation)
↓
Amendes: jusqu'à 10M€ ou 4% du CA
```

#### 2. Compromission de Services Tiers

```
Scénario: Token Slack/GitHub exposé en clair
↓
Attaquant utilise le token
↓
Envoie faux messages Slack (social engineering)
ou force push sur main (malveillance)
↓
Pertes financières + réputation endommagée
```

#### 3. Utilisation de Ressources (Cryptominers)

```
Scénario: GitHub token avec accès Runner exposé
↓
Attaquant lance des runners malveillants
↓
Utilise votre quota de runners pour miner du crypto
↓
Facture GitHub: $5000/mois au lieu de $100 normal
```

#### 4. Chaîne de Contamination

```
Scénario: Développeur clique sur fork malveillant
↓
Fork contient des logs avec secrets en clair
↓
Son ordinateur local a git history
↓
Ransomware + vol identité + accès production
```

#### 5. Logs Exposés Publiquement

```
Scénario: Secret stocké dans code source : build.sh
↓
Git history: commit "WIP: fix deploy" contient le secret
↓
Même après suppression : secret dans git log
↓
GitHub, GitLab logs : accessibles via force-push logs
↓
Audits: Montrent la fuite pour 6 mois après suppression
```

---

### Bonne Pratique : Secrets Protégés

```yaml
# BONNE PRATIQUE : Utiliser les Secrets GitHub

deploy-staging:
  env:
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}      # Masqué
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}    # Auto-généré
    SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK_URL }}  # Protégé

# Fichier .env.example (commité, sans valeurs) :
DB_USER=vitalsync_user
DB_PASSWORD=CHANGE_ME_IN_GITHUB_SECRETS
DB_NAME=vitalsync_db
NODE_ENV=staging
```

---

### Garanties de Sécurité GitHub Secrets

| Propriété        | Protection                                 |
| ---------------- | ------------------------------------------ |
| **Chiffrement**  | AES-256 au repos (Libsodium)               |
| **Transmission** | TLS 1.3 chiffré                            |
| **Accès**        | Limitée aux workflows autorisés (RBAC)     |
| **Audit Trail**  | Logs d'accès traçables                     |
| **Masquage**     | `***` dans les logs publics                |
| **Expiration**   | Tokens auto-expiration (GITHUB_TOKEN : 1h) |

---

### Checklist Sécurité

- [x] N'AUCUN secret en clair dans `.yml`, scripts, ou code
- [x] Tous les mots de passe dans GitHub Secrets (Settings -> Secrets)
- [x] `.env` fichier dans `.gitignore`
- [x] `.env.example` commité avec valeurs de démo
- [x] Tokens courte durée (GitHub = 1h auto)
- [x] Secrets rotatés tous les 90 jours
- [x] Audit: `git log -p --all -- docker-compose.yml` <- vérifier no secrets
- [x] Pas de `git push --force` de branches publiques (risque réversion)

---

### Cas d'Usage Réels

**Attaque par Secrets en Clair - Log4j Débâcle 2021:**

```
Dependencies exposaient secrets dans les logs à cause de :
- Mots de passe pas masqués
- Tokens laissés en clair
- URLs de connexion avec credentials
Effet: Plus de 3 milliards de devices affectés
Coût: Patchs d'urgence + audits = milliards en heures ingénieur
```

**Protection réussie - GitHub Secrets:**

```
Des milliers de projects utilisant GitHub Secrets
- Zéro breach reporté via GitHub Secrets
- Raison: Chiffrement fort + audit trail
- Coût: Gratuit pour tous les plans
```

---

## Support & Questions

**Besoin de créer un secret?**

1. Allez en: `Settings` (icone engrenage en haut a droite)
2. `Secrets and variables` → `Actions`
3. `New repository secret`
4. Entrez `Name` et `Value`
5. La valeur n'est jamais affichée après création

**Besoin de mettre à jour?**

- Supprimez l'ancien secret
- Créez-en un nouveau
- Déclenchez un workflow pour tester

**Besoin de débugguer?**

- Vérifiez le workflow a accès au secret: `${{ secrets.NOM_SECRET }}`
- Vérifiez le nom exact (case-sensitive)
- Vérifiez la branche (certains secrets par branche)
