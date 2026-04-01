# Dockerfile Frontend VitalSync avec Nginx
# Ce Dockerfile optimise le servage web statique avec:
#
# 1. SÉCURITÉ:
#    - Utilisateur non-root pour limiter les privilèges
#    - Image Alpine Nginx réduit la surface d'attaque
#    - Configuration Nginx sécurisée (headers de sécurité)
#
# 2. OPTIMISATION DE TAILLE:
#    - Alpine base image: ~9MB vs ~180MB avec Debian
#    - Contient uniquement Nginx et les assets statiques
#    - Pas de cache npm ou dépendances inutiles
#
# 3. PROXY VERS LE BACKEND:
#    - Requêtes /api/* proxifiées vers le backend (port 3000)
#    - Évite les problèmes CORS
#    - Centralise l'accès API via Nginx

FROM nginx:1.27-alpine

LABEL maintainer="VitalSync Team"
LABEL description="VitalSync Frontend - Serveur web avec proxy API"

# Copier le fichier de configuration Nginx personnalisé
COPY nginx.conf /etc/nginx/nginx.conf

COPY index.html /usr/share/nginx/html/

# Assurer les permissions (nginx existe déjà dans l'image)
RUN chown -R nginx:nginx /usr/share/nginx/html && chmod -R 755 /usr/share/nginx/html

# Changer vers l'utilisateur non-root
USER nginx

# Health check pour vérifier la disponibilité du serveur
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

# Port HTTP
EXPOSE 80

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]
