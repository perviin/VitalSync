# VitalSync - Health Activity Tracker

VitalSync est une application web pour tracker vos activités physiques et monitorer votre santé en temps réel.

## Architecture

- **Backend**: Node.js + Express API
- **Frontend**: HTML5 + CSS3 + JavaScript
- **Infrastructure**: Docker Compose pour la containerisation

## Installation

```bash
# Cloner le repository
git clone <repository-url>

# Installer les dépendances backend
cd backend
npm install

# Lancer l'application
docker-compose up
```

## API Endpoints

### Health Check

- `GET /health` - Vérifier le statut du serveur

```json
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2026-04-01T10:30:00.000Z"
}
```

### Activities

- `GET /api/activities` - Récupérer la liste des activités

```json
[
  { "id": 1, "name": "Walking", "duration": 30, "calories": 150 },
  { "id": 2, "name": "Running", "duration": 20, "calories": 250 }
]
```

## Tests

```bash
cd backend
npm test
```

## Conventions

Ce projet suit les conventions:

- **Commits**: Conventional Commits (feat:, fix:, docs:, chore:, test:)
- **Code Style**: ESLint avec Prettier
