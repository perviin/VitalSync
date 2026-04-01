# Stratégie de Déploiement et Déclencheurs CI/CD - VitalSync

## Configuration des Déclencheurs

### 1. Déclencheurs Déjà Configurés

Fichier: `.github/workflows/ci-cd.yml` (lignes 3-9)

```yaml
on:
  push:
    branches:
      - develop # Branche de développement
      - main # Branche de production
  pull_request:
    branches:
      - develop # PR vers dev
      - main # PR vers prod (merge requests)
```

### 2. Matrice de Comportement

```
┌─────────────────────────────────────────────────────────────────┐
│                      PIPELINE BEHAVIOR                          │
├────────────────────┬──────────┬──────────┬──────────┬──────────┤
│ Événement          │ Lint     │ Build    │ Push     │ Deploy   │
│                    │ & Tests  │ Docker   │ GHCR     │ Staging  │
├────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ push develop       │ OK RUN   │ OK RUN   │ OK PUSH  │ OK RUN   │
│ push main          │ OK RUN   │ OK RUN   │ OK PUSH  │ SKIP    │
│ PR -> develop       │ OK RUN   │ SKIP    │ SKIP  │ SKIP  │
│ PR -> main          │ OK RUN   │ SKIP    │ SKIP  │ SKIP  │
└────────────────────┴──────────┴──────────┴──────────┴──────────┘

Légende:
OK RUN    = Exécuté
SKIP   = Non exécuté
OK PUSH   = Enregistré dans GHCR
SKIP   = Condition continue-on-error: true
```

### Condition pour Build Docker (ligne 47):

```yaml
build-docker:
  if: github.event_name == 'push' # Seulement sur push
```

→ Ignore les PR (économise les ressources jusqu'à merge)

### Condition pour Deploy Staging (ligne 89):

```yaml
deploy-staging:
  if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
```

→ Seulement après un push direkt sur `develop` (pas sur main, pas sur PR)

---

## Flux de Développement Recommandé

### Scenario 1: Développement Normal (feature branch)

```
1. Créer feature branch  : git checkout -b feature/user-auth
                           git push origin feature/user-auth

2. Créer Pull Request    : GitHub UI
   Cible: develop branch
   ❌ AUCUNE action CI/CD sauf tests (économise GHCR quota)

3. Review & Merge        : github.com/... Merge PR
   ↓
   Déclenche: push event on develop branch
   ↓
   Pipeline COMPLÈTE:
   • ✅ Lint & Tests
   • ✅ Build Docker images
   • ✅ Push to GHCR (tags: develop-abc123, latest-develop)
   • ✅ Auto Deploy Staging (health checks)
   ↓
   Approuver visuellement sur staging.vitalsync.dev

4. Produit Ready        : git tag v1.2.3
                         : Créer Release PR develop → main
                         : Merge on main
   ↓
   Déclenche: push event on main branch
   ↓
   Pipeline PARTIELLE:
   • ✅ Lint & Tests
   • ✅ Build Docker images
   • ✅ Push to GHCR (tags: main-abc123, latest)
   • ⏸️ PAUSE: Pas de deploy auto (sécurité prod)
   ↓
   Déployer manuellement:
   • ssh prod.vitalsync.dev
   • docker pull ghcr.io/.../vitalsync-api:latest
   • docker-compose up -d
```

### Scenario 2: Hotfix Production

```
1. Créer hotfix branch  : git checkout -b hotfix/payment-bug
                         : git push origin hotfix/payment-bug

2. Fix critique & Tests : git push (déclenche tests sur PR)

3. Merge sur develop    : PR develop ← hotfix
   ↓
   ✅ Auto deploy staging immédiatement

4. Cherry-pick sur main : PR main ← hotfix
                         : Merge on main
   ↓
   ✅ Build final
   ⏸️ Attend review (pas auto-deploy)
```

---

## 🔐 Configuration des Secrets - Résumé Exécutif

### A. Créer les Secrets

**Lieu:** `GitHub.com` → Project Settings → `Secrets and variables` → `Actions`

```
┌─────────────────────────────────────────────┐
│ SECRETS REQUIRED                            │
├─────────────────────────────────────────────┤
│ DB_PASSWORD                                 │
│ (optionnel) SLACK_WEBHOOK_URL               │
├─────────────────────────────────────────────┤
│ SECRETS AUTO (ne pas créer)                 │
├─────────────────────────────────────────────┤
│ GITHUB_TOKEN (fourni automatiquement)       │
└─────────────────────────────────────────────┘
```

### B. Ajouter le Secret `DB_PASSWORD`

1. Settings Icône ⚙️ (haut droit du repo)
2. Left menu: `Secrets and variables` → `Actions`
3. Bouton: `New repository secret`
4. **Name:** `DB_PASSWORD`
5. **Value:** `(db password fort, 16+ chars)`
6. **Add secret** ✅

### C. Utilisation dans le Workflow

```yaml
- name: Create .env file
  run: |
    cat > .env << EOF
    DB_PASSWORD=${{ secrets.DB_PASSWORD }}  # ✅ Accès correct
    EOF
```

**Les logs afficheront:** `DB_PASSWORD=***` (masqué automatiquement)

---

## ⚠️ Sécurité: Explication Détaillée

### Problème 1: Secrets en Clair dans Git

```bash
# ❌ DANGER: Stocker secrets en clair
git add docker-compose.yml  # Contient DB_PASSWORD=abc123
git push

# Même si on supprime après:
git rm docker-compose.yml
git commit -m "Remove secrets"
git push

# LE SECRET RESTE dans l'historique Git !
git log -p --all | grep "DB_PASSWORD"  # Toujours visible
git show abc1234:docker-compose.yml    # Affiche le secret
```

**Conséquence:** N'IMPORTE QUI avec accès au repo voit tout l'historique.

### Problème 2: Logs Publics CI/CD

```
GitHub Actions Logs (PUBLICS par défaut) affichent:

Run: docker-compose -e DB_PASSWORD=abc123 up
# ❌ GitHub.com/actions/runs/123 → tout le monde voit le secret

GitHub masque automatiquement les secrets enregistrés:
Run: docker-compose -e DB_PASSWORD=*** up
# ✅ Grâce au secret GitHub
```

### Problème 3: Accès Non Autorisé au Repo

```
Attaquant: Obtient accès au repo (compromised account)
↓
Voit: cat docker-compose.yml → DB_PASSWORD exposé
↓
Attaque: Se connecte à database avec ce password
↓
Perte: 100,000 enregistrements patients volés (RGPD)
```

### Sécurité GitHub Secrets

```
GitHub Secrets protègent car:

1. Chiffrement AES-256
   Stocké: Encrypted at rest
   Chiffrement avant transmission: TLS 1.3

2. Audit Trail
   Qui a accédé? Quand?
   Trace de chaque utilisation

3. Isolation par Workflow
   Le secret secret.DB_PASSWORD
   n'est accessible que dans ci-cd.yml

4. Token Auto-Expiration
   GITHUB_TOKEN: Valide 1h seulement
   Après: Automatiquement révoqué

5. Masquage dans Logs
   Affiche automatiquement: ***
   Jamais dans output brut
```

---

## 📊 Comparaison: Avant vs Après

### ❌ AVANT (Dangereux)

```yaml
# workflow.yml (public)
deploy:
  env:
    DB_PASSWORD: xK9$mP2@nL7!qR4vZ8#bA

# docker-compose.yml (public)
environment:
  POSTGRES_PASSWORD: ${DB_PASSWORD} # = "xK9$mP2@nL7!qR4vZ8#bA"

# Logs publics sur GitHub.com/actions/runs/123
Run: psql -U root -p xK9$mP2@nL7!qR4vZ8#bA postgres
```

**Problèmes:**

- 🔓 Secret visible à tous
- 📝 Historique Git permanent
- 🔓 Logs publics montrent le secret
- 📊 Impossible de rotater sans nouveau push
- 🎯 Audit impossible (qui l'a créé? utilisé?)

### ✅ APRÈS (Sécurisé)

```yaml
# workflow.yml (public)
deploy:
  env:
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }} # Référence seulement

# docker-compose.yml (public)
environment:
  POSTGRES_PASSWORD: ${DB_PASSWORD}

# Logs publics sur GitHub.com/actions/runs/123
Run: psql -U root -p *** postgres # ✅ Masqué
```

**Avantages:**

- 🔒 Secret JAMAIS en clair
- 🔄 Rotatif sans commit
- 🎯 Audit trail complet
- 🛡️ TLS + AES-256 chiffrement
- ⏰ Token auto-expiration
- 👥 RBAC (seul workflow autorisé accède)

---

## ✅ Checklist Sécurité - Avant de Merger

```
[ ] Aucun secret en clair dans code
    git log -p --all | grep -i "password\|token\|secret" ← Rien?

[ ] .env* dans .gitignore
    cat .gitignore | grep "\.env"

[ ] .env.example existe avec valeurs de démo
    cat .env.example | grep "DB_PASSWORD=CHANGE_ME"

[ ] GitHub Secrets configurés
    Settings → Secrets → DB_PASSWORD ✅

[ ] Workflow utilise secrets: ${{ secrets.NAME }}
    grep '\${{ secrets.' .github/workflows/*.yml

[ ] Pas de tokens en dur dans code
    grep -r "ghp_\|sk_\|sv_\|supabase_" . --exclude-dir=.git
```

---

## 🚨 Incident: Secret Accidentellement Commité?

```bash
# IMMÉDIAT (dans 5 minutes):

# 1. Créer secret GitHub avec nouvelle valeur
GitHub Settings → Secrets → DB_PASSWORD = new_value_456

# 2. Rendre l'ancien secret inutile
Production DB → Changer Le mot de passe
psql -c "ALTER USER vitalsync_user PASSWORD 'new_secure_pass'"

# 3. Nettoyer l'historique Git (Force compliquée)
git filter-branch --force --env-filter '
  if [[ $GIT_COMMIT_MESSAGE =~ "password" ]]; then
    # Rewrite commit
  fi
' HEAD

# 4. Notifier l'équipe
Slack: "Secret exposé dans commit abc1234. Nouveau password dans secrets."

# 5. Rotate TOUS les secrets (paranoid mais juste)
```

**Important:** GitHub détecte les secrets exposés automatiquement!
→ Alert reçu automatiquement via email si token GitHub trouvé

---

## 📞 Ressources

- [GitHub Secrets Docs](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [OWASP Secret Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub Token Security](https://docs.github.com/en/rest/authentication/authenticating-with-the-rest-api?apiVersion=2022-11-28)
