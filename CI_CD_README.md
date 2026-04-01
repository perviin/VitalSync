# VitalSync - Configuration Pipeline CI/CD

## 📋 Résumé

Pipeline complète avec **3 étapes**:

1. **Lint & Tests** - Code quality checks
2. **Build Docker** - Images container construction
3. **Deploy Staging** - Déploiement automatique

---

## 🚀 Fichiers créés/modifiés

### Nouveaux fichiers

- `.github/workflows/ci-cd.yml` - Pipeline principale
- `backend/.eslintrc.json` - Configuration ESLint

### Fichiers modifiés

- `backend/package.json` - Scripts lint + dépendances ESLint

---

## ⚙️ Configuration requise

### GitHub Secrets (à configurer)

Aller dans: **Repo Settings → Secrets and variables → Actions**

Ajouter:

1. **`DB_PASSWORD`** - Password PostgreSQL
   - Utilisé pour staging
   - Jamais visible dans les logs

2. **`SLACK_WEBHOOK`** (optionnel)
   - URL webhook pour notifications Slack
   - Format: `https://hooks.slack.com/services/T.../B.../X...`

---

## 📊 Vue d'ensemble - Étapes

### ✅ Étape 1: Lint & Tests

- Installe dépendances backend
- Exécute **ESLint** (analyse code)
- Exécute **Jest** tests
- Upload rapport couverture

**Échec si**:

- Tests échouent
- Erreurs ESLint critiques

### 📦 Étape 2: Build Docker

**Dépend**: Étape 1 réussie

- Build image backend
- Build image frontend
- Tag avec **SHA du commit** (ex: `develop-a1b2c3d`)
- Push vers **GHCR** (GitHub Container Registry)

**Seulement sur**: Push (pas PR)

### 🚀 Étape 3: Déploiement Staging

**Dépend**: Étape 2 réussie

- Arrête anciens conteneurs
- Démarre: Backend + Frontend + PostgreSQL
- **Health checks**:
  - Database `pg_isready`
  - Backend `GET /health`
  - Frontend `GET /health`

**Échoue si**: Tout health check échoue

**Seulement sur**: Push à `develop`

---

## 🏃 Exécution en live

1. **Pushez du code** sur `develop`

   ```bash
   git add .
   git commit -m "Feature X"
   git push origin develop
   ```

2. **Allez sur Actions** (onglet GitHub)
   - Regardez la pipeline en action
   - Logs en temps réel

3. **Attendez résultats**:
   - ✅ Tous tests passent → images pushed → staging deployé
   - ❌ Erreur? → logs détaillés montrent pourquoi

---

## 🔍 Logs détaillés

Chaque étape produit des logs:

**Lint & Tests**:

```
> eslint .
✓ 3 files checked, 0 errors

> jest
PASS test/health.test.js
  ✓ GET /health returns 200
  ✓ GET /api/activities returns array
```

**Build Docker**:

```
[backend 1/6] FROM node:18-alpine
[backend 2/6] WORKDIR /app
...
Built image: ghcr.io/pervi/vitalsync-api:develop-a1b2c3d
Pushed successfully ✓
```

**Deploy Staging**:

```
Starting services...
✓ Database is ready
✓ Backend responding at /health
✓ Frontend health check passed
Deployment successful!
```

---

## 🔑 Points clés

### Pourquoi SHA vs "latest"?

- **SHA** = exact + reproductible (ex: `develop-a1b2c3d`)
- **latest** = ambigu, difficile rollback
- GitHub Actions auto-génère les tags

### Pourquoi health checks?

- Garantit que API répond avant "succès"
- Échoue immédiatement si bug critique
- DRY = test réel pas juste "docker up"

### Pourquoi GHCR (vs Docker Hub)?

- Gratuit pour public repos
- Intégré GitHub (tokens automatiques)
- Pas de rate-limits GitHub ↔ GHCR

---

## 🛠️ Customisation

### Modifier branche de déploiement

`ci-cd.yml` ligne ~167:

```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
```

Changer `develop` → `main` pour prod deploy

### Ajouter plus de linters

`backend/package.json` devDeps:

```json
"prettier": "^3.0.0",    // Code formatter
"commitlint": "^17.0.0"  // Git commit linting
```

### Changer délai health check

`ci-cd.yml` ligne ~175:

```bash
for i in {1..30}; do  # 30 tentatives × 2s = 60s max
```

Changer 30 → plus de tentatives = plus d'attente

---

## 📈 Monitoring/Observabilité

Slack notifications (si `SLACK_WEBHOOK` configuré):

- `✅ Déploiement réussi`
- `❌ Test échoué - backend`
- `❌ Health check échoué - API down`

---

## 🐛 Debugging

Si pipeline échoue:

1. **Logs détaillés** → Actions → Cliquer sur job échoué
2. **Identifier étape** → Lint? Tests? Build? Deploy?
3. **Reproduire localement**:
   ```bash
   cd backend && npm run lint    # ESLint
   npm test                      # Tests
   npm start                     # Santé API
   ```

---

## ✨ Résultats attendus

**Sur développment réussi**:

```
✅ Lint successful (0 errors)
✅ Jest tests passed (2/2)
✅ Backend image built & pushed: ghcr.io/.../vitalsync-api:develop-xyz
✅ Frontend image built & pushed: ghcr.io/.../vitalsync-web:develop-xyz
✅ Staging deployed successfully
✅ Health checks passed (DB, API, Web)
```

**Temps total**: ~10-15 minutes (premiere fois), ~3-5 min après (cache)

---

## 📚 Références

- [GitHub Actions Docs](https://docs.github.com/actions)
- [Docker Build Action](https://github.com/docker/build-push-action)
- [ESLint Configuration](https://eslint.org/docs/rules/)
- [PostgreSQL pg_isready](https://www.postgresql.org/docs/current/app-pg-isready.html)
