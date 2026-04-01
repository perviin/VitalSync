# VitalSync - Guide Docker Compose

## Démarrage rapide

### 1. Configuration initiale

```bash
# Copier le fichier d'exemple en .env (avec vos vraies valeurs)
cp .env.example .env

# Éditer .env avec vos configurations sensibles
# NE PAS commiter le fichier .env en production !
```

### 2. Lancer les services

```bash
# Construire et démarrer tous les services
docker-compose up --build

# Ou sans rebuild (si images déjà construites)
docker-compose up

# En arrière-plan (détaché)
docker-compose up -d
```

### 3. Vérifier le statut

```bash
# Voir les logs en temps réel
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f backend
docker-compose logs -f database
docker-compose logs -f frontend

# Vérifier l'état des services
docker-compose ps
```

## Accès aux services

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **PostgreSQL**: localhost:5432 (depuis l'host) ou `database:5432` (depuis les conteneurs)

## Architecture Docker Compose

### Services

1. **database** (PostgreSQL 16-Alpine)
   - Base de données persistante
   - Network: `vitalsync-network`
   - Volume: `postgres_data` (stockage persistant)
   - Healthcheck: Vérifie que PostgreSQL est prêt

2. **backend** (Node.js API)
   - API VitalSync
   - Network: `vitalsync-network`
   - Dépend de: `database` (healthcheck)
   - Variables env: DB_HOST=database (résolution DNS)
   - Expose: port 3000

3. **frontend** (Nginx)
   - Serveur web statique
   - Proxy API vers backend:3000
   - Network: `vitalsync-network`
   - Dépend de: `backend`
   - Expose: port 80

### Réseau Bridge personnalisé (vitalsync-network)

**INTÉRÊT DE L'ISOLATION:**

1. **Isolement réseau**: Les services ne sont accessibles qu'entre eux
2. **Noms DNS**: Utilisation de noms de services (ex: `http://backend:3000`)
3. **Sécurité**: Pas d'exposition accidentelle vers l'extérieur
4. **Performance**: Le driver bridge Docker est optimisé pour les conteneurs
5. **Subnet statique**: 172.20.0.0/16 pour cohérence entre redémarrages

### Volume persistant (postgres_data)

**SANS VOLUME pour PostgreSQL:**

- Les données sont stockées dans la couche d'écriture du conteneur
- **Au redémarrage**: PERTE COMPLÈTE des données
- **À la suppression**: Perte permanente
- Chaque redémarrage = base vide

**AVEC VOLUME:**

- Les données persistent sur l'hôte
- Survivent aux redémarrages, arrêts, mises à jour
- Possibilité de backup et restauration
- **EN PRODUCTION**: OBLIGATOIRE

## Variables d'environnement

Fichier `.env` (NE PAS COMMITER):

```
DB_USER=vitalsync_user
DB_PASSWORD=dev_password_123456
DB_NAME=vitalsync_db
NODE_ENV=production
PORT=3000
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost
```

Fichier `.env.example` (à versionner): Template avec valeurs par défaut

## Gestion des services

```bash
# Arrêter les services (sans supprimer les volumes)
docker-compose down

# Arrêter et supprimer les volumes
docker-compose down -v

# Redémarrer un service
docker-compose restart backend

# Arrêter/Démarrer individuellement
docker-compose stop backend
docker-compose start backend

# Exécuter une commande dans un conteneur
docker-compose exec backend npm test
docker-compose exec database psql -U vitalsync_user -d vitalsync_db
```

## Debugging

```bash
# Entrer dans le shell d'un conteneur
docker-compose exec backend sh
docker-compose exec database sh

# Vérifier la connectivité entre services
docker-compose exec frontend ping backend
docker-compose exec backend wget http://database:5432 -O -  # Vérifier PostgreSQL

# Voir le réseau
docker network inspect vitalsync_vitalsync-network
```

## Healthchecks

Tous les services ont un healthcheck configuré:

- **database**: `pg_isready` - Teste la connexion PostgreSQL
- **backend**: `GET /health` - Endpoint de santé API
- **frontend**: `GET /health` - Endpoint Nginx

Utilisez `docker-compose ps` pour voir l'état: `healthy`, `unhealthy`, ou `starting`
