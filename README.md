# VitalSync - Plateforme de Suivi d'Activités Physiques

Une application web moderne pour le suivi d'activités physiques avec une architecture containerisée, orchestrée par Docker Compose et intégrée à une pipeline CI/CD complète via GitHub Actions.

## Vue d'Ensemble

VitalSync est une plateforme full-stack composée de:

- **Backend API**: Express.js (Node.js 18) avec PostgreSQL
- **Frontend**: Nginx serveur web statique avec reverse proxy
- **Database**: PostgreSQL 16 Alpine
- **Orchestration**: Docker Compose pour le déploiement local
- **CI/CD**: GitHub Actions avec GHCR (GitHub Container Registry)

---

## Architecture Système

```
CLIENT (Navigateur)
        │ HTTP/HTTPS
        ↓
Frontend (Nginx 1.27-Alpine)
  - Serveur web statique (index.html)
  - Reverse proxy /api → Backend
  - Caching: CSS/JS/images 30j, HTML no-cache
        │ localhost:80 → localhost:3000 (interne)
        ↓
Backend API (Node.js 18-Alpine)
  - Express.js API
  - GET /health (health check)
  - GET /api/activities (liste activités)
  - Connect: database:5432
        │ TCP:5432
        ↓
Database (PostgreSQL 16-Alpine)
  - Port: 5432 (interne seulement)
  - Volume: postgres_data (persistent)
  - Credentials: vitalsync_user / DB_PASSWORD

RÉSEAU: vitalsync-network (bridge, 172.20.0.0/16)
VOLUMES: postgres_data (Docker named volume)
```

---

## Prérequis et Installation

### Outils Requis

| Outil                                   | Version | Rôle                          |
| --------------------------------------- | ------- | ----------------------------- |
| **Docker Desktop**                      | 4.25+   | Moteur de containerisation    |
| **Docker Compose**                      | 2.20+   | Orchestration multi-conteneur |
| **Git**                                 | 2.40+   | Gestion de version            |
| **Node.js** (optionnel, pour dev local) | 18.16+  | Runtime JavaScript            |
| **npm** (optionnel, pour dev local)     | 9.6+    | Package manager               |

### Versions Utilisées

```
Backend:
  - Node.js: 18-Alpine
  - Express: 4.18.x
  - Jest: 29.x (tests)
  - ESLint: 8.x (linting Airbnb style)

Frontend:
  - Nginx: 1.27-Alpine

Database:
  - PostgreSQL: 16-Alpine

CI/CD:
  - GitHub Actions
  - Docker images: multi-stage builds
  - GHCR: GitHub Container Registry
```

### Installation Locale

#### 1. Cloner le Projet

```bash
git clone https://github.com/votre-org/vitalsync.git
cd vitalsync
```

#### 2. Configurer les Variables d'Environnement

```bash
# Créer le fichier .env (ne pas commiter)
cat > .env << EOF
DB_USER=vitalsync_user
DB_PASSWORD=xK9$mP2@nL7!qR4vZ8#bA
DB_NAME=vitalsync_db
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost
EOF

# Vérifier que .env est dans .gitignore
grep ".env" .gitignore
```

#### 3. Démarrer les Services

```bash
# Vérifier la configuration
docker-compose config

# Démarrer tous les services
docker-compose up -d

# Vérifier que tout fonctionne
docker-compose ps
```

**Output attendu:**

```
NAME                 COMMAND               SERVICE    STATUS           PORTS
vitalsync-postgres   "postgres"            database   Up (healthy)     5432/tcp
vitalsync-api        "node server.js"      backend    Up (healthy)     3000/tcp
vitalsync-web        "nginx"               frontend   Up (healthy)     0.0.0.0:80->80/tcp
```

#### 4. Accéder à l'Application

```
Frontend:  http://localhost
Backend:   http://localhost:3000
Health:    http://localhost:3000/health
API:       http://localhost/api/activities
```

---

## Commandes Docker Compose Essentielles

### Démarrage et Arrêt

```bash
# Démarrer les services en arrière-plan
docker-compose up -d

# Démarrer avec logs en direct
docker-compose up

# Arrêter tous les services
docker-compose stop

# Arrêter et supprimer les conteneurs
docker-compose down

# Supprimer aussi les volumes (attention: données perdues!)
docker-compose down -v
```

### Monitoring et Debugging

```bash
# Voir l'état de tous les services
docker-compose ps

# Voir les logs d'un service
docker-compose logs backend
docker-compose logs -f database

# Exécuter une commande dans un conteneur
docker-compose exec backend npm test
docker-compose exec database psql -U vitalsync_user -d vitalsync_db

# Accéder au shell d'un service
docker-compose exec backend sh
```

### Rebuild et Nettoyage

```bash
# Reconstruire les images
docker-compose build

# Supprimer les conteneurs et images
docker system prune -a
```

---

## Pipeline CI/CD

### Déclencheurs

```
git push develop        → Pipeline COMPLÈTE (test, build, deploy)
git push main           → Pipeline BUILD (test, build, pas deploy)
PR develop/main         → Tests SEULEMENT (lint, jest)
```

### Jobs

**Job 1: Lint & Tests** (5-10 min)

- ESLint: détecte code style violations (Airbnb)
- Jest: 2 tests de health checks
- Coverage reporting: codecov

**Job 2: Build & Push Docker** (10-15 min)

- Checkout code
- Setup Docker Buildx
- Build backend image (multi-stage)
- Build frontend image (nginx)
- Push to GHCR avec tags SHA + branch

**Job 3: Deploy to Staging** (5-10 min)

- Seulement sur `develop` push
- Crée .env avec secrets
- `docker-compose up -d`
- Tests de santé (health checks)
- Notifications Slack

### Sécurité: Gestion des Secrets

```
Secrets configurés:
  - DB_PASSWORD: PostgreSQL password
  - SLACK_WEBHOOK_URL: Notifications (optionnel)
  - GITHUB_TOKEN: Auto-généré (1h expiration)

Protection:
  - AES-256 chiffrement
  - TLS 1.3 en transit
  - Jamais affiché en logs
  - Audit trail d'accès
```

---

## API Endpoints

### Health Check

```bash
GET /health
```

Response:

```json
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2026-04-01T10:30:00.000Z"
}
```

### Activities

```bash
GET /api/activities
```

Response:

```json
[
  { "id": 1, "name": "Walking", "duration": 30, "calories": 150 },
  { "id": 2, "name": "Running", "duration": 20, "calories": 250 }
]
```

---

## Tests

### Exécuter Localement

```bash
cd backend
npm install
npm run lint   # ESLint (Airbnb style)
npm test       # Jest tests

# Output:
# PASS test/health.test.js
#   Health endpoints
#     ✓ GET /health returns 200 (23 ms)
#     ✓ GET /api/activities returns array (4 ms)
# Tests: 2 passed, 2 total
```

### Vérifier Pipeline GitHub

1. Pousser du code: `git push origin develop`
2. Aller à: GitHub repo → Actions tab
3. Vérifier les 3 jobs: Lint -> Build -> Deploy

---

## Choix Techniques et Justifications

### Alpine Linux pour Images de Base

**node:18-alpine** et **nginx:1.27-alpine**

| Aspect            | Alpine  | Debian       |
| ----------------- | ------- | ------------ |
| Taille            | 160MB   | 450MB        |
| Temps build       | 60s     | 2-3 min      |
| Surface d'attaque | Minimal | 100 packages |

Reduction de 65% taille des images.

### Multi-stage Build pour Backend

Séparation builder/production:

- Tests exécutés AVANT production (fail-fast)
- Dépendances dev non incluses (image plus légère)
- Utilisateur non-root pour sécurité

### Network Bridge Personnalisé

`vitalsync-network` au lieu du default:

- Communication: `backend:3000` au lieu d'IP
- Isolement: services pas accessibles de l'extérieur
- Scaling: ajouter/retirer services dynamiquement

### Named Volume pour PostgreSQL

`postgres_data` (Docker managed):

- Données persistent à redémarrage
- Fonctionne localement ET en CI/CD
- Pas de dossier bind-mount problématique

### Health Checks Intégrés

Vérification automatique dans docker-compose.yml:

- `depends_on: condition: service_healthy`
- Évite les erreurs "Connection refused"
- Déploiement fiable

### GitHub Actions + GHCR

Au lieu de Jenkins, Travis, ou GitLab CI:

- Configuration YAML simple et native
- Intégration directe au repo
- Secrets chiffrés AES-256
- Zéro infrastructure à maintenir

### Lint & Tests Obligatoires

ESLint + Jest bloquent les mauvais PRs:

- Code style cohérent (Airbnb)
- Tests réels (2/2 passing)
- Si tests échouent: build échoue

### Deploy Auto seulement pour `develop`

- `develop`: auto-deploy en staging
- `main`: build seulement, deploy manuel
- Prévient les accidents en production

---

## Structure du Projet

```
vitalsync/
├── README.md                              (ce fichier)
├── docker-compose.yml                     (orchestration)
├── .github/
│   └── workflows/
│       └── ci-cd.yml                      (pipeline GitHub Actions)
├── .gitignore                             (exclusions git)
├── .dockerignore                          (exclusions Docker)
├── .env.example                           (template vars)
├── backend/
│   ├── Dockerfile                         (multi-stage)
│   ├── package.json                       (dépendances)
│   ├── .eslintrc.json                     (règles linting)
│   ├── server.js                          (Express API)
│   ├── middleware/
│   │   └── logger.js                      (logging middleware)
│   └── test/
│       └── health.test.js                 (Jest tests)
└── frontend/
    ├── Dockerfile                         (Nginx)
    ├── nginx.conf                         (config reverse proxy)
    └── index.html                         (SPA statique)
```

---

## Troubleshooting

### "psql: error: connection failed"

Backend tente de se connecter avant que la DB soit prête.

Solution: `depends_on: condition: service_healthy`

### "docker-compose: command not found"

Docker Compose v1 (deprecated) installé.

Solution:

```bash
docker-compose version  # Vérifier
docker-compose-plugin install  # Mettre à jour
```

### Tests échouent localement

Versions Node.js différentes.

Solution:

```bash
node --version  # Doit être v18.x.x
nvm install 18 && nvm use 18
npm test
```

---

## Déploiement en Production

```bash
# 1. Créer release
git tag v1.0.0
git push origin v1.0.0

# 2. Merger develop → main
git checkout main && git merge develop

# 3. Pipeline construit les images
# ghcr.io/pervi/vitalsync-api:latest
# ghcr.io/pervi/vitalsync-web:latest

# 4. Déployer manuellement en prod
ssh prod.server.com
docker pull ghcr.io/pervi/vitalsync-api:latest
docker-compose up -d
```

---

## Ressources

- [Docker Compose Official](https://docs.docker.com/compose/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [GitHub Container Registry](https://docs.github.com/en/packages/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

## Auteur et Licence

Auteur: Milo Roche-Vandenbroucque
Projet: VitalSync - Exercice E6 RNCP39608
Licence: MIT
