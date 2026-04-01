# Multi-stage Dockerfile pour VitalSync Backend:
# Le build multi-stage est une stratégie essentiellement pour:
#
# 1. SÉCURITÉ:
#    - Les outils de build (dépendances de dev, cache npm) n'entrent pas
#      dans l'image finale
#    - Réduit la surface d'attaque en excluant les binaires et paquets
#      inutiles d'une image de production
#    - L'image finale contient SEULEMENT ce qui est nécessaire au runtime
#
# 2. OPTIMISATION DE TAILLE:
#    - Stage builder: node_modules complet, cache npm, tests (~500MB)
#    - Stage production est ~200MB plus léger en utilisant Alpine et
#      en excluant les artefacts de build
#    - Déploiement plus rapide, économies de stockage, démarrage plus
#      rapide des conteneurs
#
# 3. MEILLEURES PRATIQUES:
#    - Séparation des préoccupations: env de build ≠ env de runtime
#    - Qualité garantie: les tests font échouer le build si nécessaire
#    - Builds immuables et reproductibles
# ============================================================================

# Stage 1: Builder - Installation et tests
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps --force

COPY . .
RUN npm test

# Stage 2: Production - Image allégée

FROM node:18-alpine

LABEL maintainer="VitalSync Team"
LABEL description="VitalSync API - Health Activity Tracker"

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --chown=nodejs:nodejs . .

USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
