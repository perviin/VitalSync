# Pipeline CI/CD VitalSync - Documentation

## Choix GitHub Actions

**Justification**: GitHub Actions a été choisi pour sa simplicité d'intégration native avec les repos GitHub, son absence de coûts pour les dépôts publics, et sa gestion transparente des secrets et des authentifications via les tokens GITHUB_TOKEN.

---

## Architecture de la Pipeline

### 🔄 Déclenchement

- **Branch**: `develop` et `main`
- **Événements**: `push` et `pull_request`
- Les jobs de build et deploy ne s'exécutent que sur les `push` (pas sur les PR)

---

## Étape 1: Lint & Tests (6 pts)

### Objectives

- ✅ Installation des dépendances du back-end
- ✅ Exécution des tests unitaires (Jest)
- ✅ Linting avec ESLint

### Job: `lint-and-test`

**Étapes**:

1. **Checkout code** (`actions/checkout@v4`)
   - Clone le repo pour accès au code
   - Utilise le SHA du commit pour reproductibilité

2. **Setup Node.js** (`actions/setup-node@v3`)
   - Version: 18 (même que production)
   - Cache npm: réutilise les dépendances entre runs
   - Lecture du `package-lock.json` pour cohérence exacte

3. **Install dependencies** (`npm ci`)
   - `npm ci` vs `npm install`: ci = Clean Install
   - Garanti d'installer les versions exactes du lock file
   - Plus rapide et déterministe que `npm install`

4. **Run ESLint** (`npm run lint`)
   - Configuration: `.eslintrc.json`
   - Analyse le code pour erreurs de style/bonnes pratiques
   - `continue-on-error: true`: les warnings ne bloquent pas le build

5. **Run Jest tests** (`npm test -- --coverage`)
   - Exécute tous les tests unitaires
   - Flag `--coverage`: génère rapport de couverture
   - Échoue si un test échoue (bloque la pipeline)

6. **Upload coverage reports** (codecov)
   - Envoi du rapport de couverture à Codecov
   - Optionnel (`fail_ci_if_error: false`)
   - Permet de tracker la couverture dans le temps

### Configuration ESLint (`.eslintrc.json`)

```json
{
  "env": {
    "node": true, // Environnement Node.js
    "es2021": true, // Features ES2021 autorisées
    "jest": true // Globals Jest (describe, it, expect)
  },
  "extends": "airbnb-base", // Style guide Airbnb
  "rules": {
    "no-console": "warn", // console.log = warning (dev OK, prod bad)
    "no-unused-vars": "error", // Variables non utilisées = erreur
    "prefer-destructuring": "warn" // Encourage destructuring
  }
}
```

---

## Étape 2: Build Docker (6 pts)

### Objectives

- ✅ Construction des images Docker (backend + frontend)
- ✅ Tag des images avec le SHA du commit
- ✅ Push vers GitHub Container Registry (GHCR)

### Job: `build-docker`

**Dépend de**: `lint-and-test` (les tests passent avant de builder)

**Conditions**:

- Seulement sur événement `push` (pas sur PR)
- Nécessite permissions: `packages: write`

#### Étapes

1. **Setup Docker Buildx** (`docker/setup-buildx-action@v2`)
   - Active le builder Docker multi-plateforme
   - Utilise BuildKit pour optimisation des couches

2. **Login to Container Registry** (`docker/login-action@v2`)
   - Authentification à GHCR avec `${{ secrets.GITHUB_TOKEN }}`
   - Token auto-généré par GitHub, sécurisé par défaut

3. **Extract metadata for backend** (`docker/metadata-action@v4`)
   - Génère les tags automatiquement
   - Schéma de tags:
     ```
     develop-<SHA court>          # develop-a1b2c3d
     develop                       # branche courante
     latest                        # si branche par défaut
     v1.0.0                        # si tag SemVer
     ```

4. **Build and push backend image** (`docker/build-push-action@v4`)
   - `context: ./backend` - dossier à builder
   - `push: true` - pousse vers GHCR directement
   - `cache-from/to: type=gha` - utilise cache GitHub Actions
   - Réutilise les couches entre runs → builds 10x+ rapides

5. **Build and push frontend image**
   - Même logique pour `./frontend`
   - Exécution parallèle avec backend

### Justification du choix de GHCR

| Registry   | Avantages                               | Inconvénients                         |
| ---------- | --------------------------------------- | ------------------------------------- |
| **GHCR**   | ✅ Intégré GitHub, gratuit, tokens auto | Images publiques visibles             |
| Docker Hub | ✅ Populaire, limite gratuit            | Authentification séparée, rate-limits |
| GitLab     | ✅ Privé par défaut                     | Nécessite GitLab                      |

**Choix**: GHCR pour sa simplicité avec GitHub Actions.

### Tagging par SHA vs "latest"

**SHA du commit** (`v2.1.0-a1b2c3d`):

- ✅ **Reproductibilité**: exact commit identifiable
- ✅ **Traçabilité**: qui a deployer quelle version?
- ✅ **Rollback facile**: redéployer l'ancienne image par SHA
- ✅ **Pas de collisions**: chaque commit = image unique

**"latest"**:

- ❌ Ambigu: qu'est-ce que "latest"? Quand a été pushé?
- ❌ Rollbacks difficiles: on perd l'historique
- ❌ Cache confus: Docker peut servir une vieille image avec tag "latest"

**Donc**: SHA + latest (le latest pointe au dernier commit de develop)

---

## Étape 3: Déploiement Staging (8 pts)

### Objectives

- ✅ Déploiement automatique sur environnement de test
- ✅ Vérification de santé (health check)
- ✅ Échouer si health check échoue

### Job: `deploy-staging`

**Dépend de**: `build-docker`

**Conditions**:

- Seulement sur `push` à la branche `develop`
- Ne déploye pas sur PR ou branche `main`

#### Étapes

1. **Checkout code** - Récupère docker-compose.yml

2. **Stop previous containers** (`docker-compose down`)
   - Arrête l'ancienne version (staging)
   - `|| true` - ne bloque pas si aucun conteneur

3. **Create .env file for staging**
   - Variables d'environnement pour staging
   - `DB_PASSWORD` vient de `${{ secrets.DB_PASSWORD }}`
   - Secrets GitHub Actions = chiffré, non visible dans logs

4. **Pull latest images**
   - Télécharge les images pushées en Étape 2
   - Tag avec SHA: `vitalsync-api:develop-a1b2c3d`
   - `continue-on-error: true` - pas grave si pull échoue (local)

5. **Deploy with docker-compose**
   - Lance `docker-compose up -d`
   - `-d` = détaché (en arrière-plan)
   - Démarre les 3 conteneurs: backend, frontend, database

6. **Wait for services to start** (`sleep 10`)
   - Donne du temps aux services de démarrer
   - Database: initialisation, migrations
   - API: démarrage applicatif

#### Health Checks (très important!)

**7. Health check - Database**

```bash
docker-compose exec -T database pg_isready -U vitalsync_user
```

- `pg_isready` = outil PostgreSQL pour vérifier connexion
- `-T` = pas de TTY (safe en CI)
- Échoue si PostgreSQL ne répond pas

**8. Health check - Backend API** (crucial!)

```bash
for i in {1..30}; do
  if curl -f http://localhost:3000/health; then
    exit 0
  fi
  sleep 2
done
exit 1
```

- **Boucle de 30 tentatives** (60 secondes max)
- `curl -f` = échoue si HTTP != 2xx
- Appel `/health` endpoint du backend (défini dans `server.js`)
- **Échoue la pipeline si endpoint ne répond pas**

**9. Health check - Frontend**

```bash
curl -f http://localhost/health || exit 1
```

- Vérifie Nginx health check endpoint

#### Pourquoi les Health Checks font échouer la pipeline

Si un health check échoue:

1. `exit 1` → le step échoue
2. Le job échoue
3. La pipeline échoue ❌
4. Les logs montrent exactement quel service ne répond pas
5. Les développeurs sont alertés → peuvent débugger

**Safety net**: Si le backend n'est pas prêt, on ne met pas en staging

### Nettoyage et notifications

**10. Get deployment logs** (`docker-compose logs`)

- Si erreur → affiche les logs de tous les services
- Utile pour debugging

**11. Cleanup on failure**

- Si la pipeline échoue → arrête les conteneurs
- Évite les états "half-alive"

**12. Send notification** (Slack optionnel)

- Notification du statut (success/failure)
- Nécessite `${{ secrets.SLACK_WEBHOOK }}` configuré

---

## Secrets obligatoires

À configurer dans GitHub:

- **`DB_PASSWORD`**: Password PostgreSQL (production)
- **`SLACK_WEBHOOK`** (optionnel): URL Slack pour notifications

**Où les configurer**:

1. Repo GitHub → Settings → Secrets and variables → Actions
2. Ajouter new secret
3. Disponible automatiquement dans workflow via `${{ secrets.NOM }}`

---

## Résumé des fichiers

### `.github/workflows/ci-cd.yml`

- Pipeline complète (3 jobs)
- ~200 lignes

### `backend/.eslintrc.json`

- Configuration ESLint
- ~20 lignes

### `backend/package.json` (modifié)

- Scripts: `lint`, `lint:fix`
- DevDeps: `eslint`, plugins

---

## Exécution visuelle

```
Commit push → GitHub
    ↓
    ├─→ [lint-and-test] eslint + jest → ✅
    │
    ├─→ [build-docker] (dépend de lint-and-test)
    │   ├─ Backend: docker build → push GHCR ✅
    │   └─ Frontend: docker build → push GHCR ✅
    │
    └─→ [deploy-staging] (branche develop seulement)
        ├─ docker-compose up -d
        ├─ Health DB ✅
        ├─ Health API ✅ (crucial!)
        ├─ Health Web ✅
        └─ Deployment réussi! 🎉
```

---

## Troubleshooting

| Problème             | Cause                            | Solution                                |
| -------------------- | -------------------------------- | --------------------------------------- |
| Health check timeout | API n'a pas le temps de démarrer | Augmenter sleep ou tentatives           |
| GHCR push auth error | Token expiré                     | Régénérer via Settings → Tokens         |
| Database failing     | Migration non exécutée           | Ajouter script SQL au Dockerfile        |
| Cache invalide       | Dépendances changées             | `cache-to: type=gha,mode=max` résout ça |

---

## Performance

- **First build**: ~5-10 minutes (pull images, compilation)
- **Builds suivants**: ~2-3 minutes (cache layers)
- **Health checks**: ~20 secondes (max)

Total pipeline: **~10-15 minutes** (temps réel)

---

## Prochaines étapes intelligentes

1. **Production deploy**: Ajouter job `deploy-prod` avec gate manual
2. **Security scanning**: Trivy pour scan vulnérabilités images Docker
3. **End-to-end tests**: Après staging, avant prod
4. **Load testing**: Vérifier perf avant prod
5. **Canary deployment**: Déployer à 10%, puis 50%, puis 100%
