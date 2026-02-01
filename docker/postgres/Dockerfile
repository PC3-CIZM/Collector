FROM postgres:16-alpine

# Le script est exécuté automatiquement au premier démarrage
# si le volume de données est vide
COPY ./init.sql /docker-entrypoint-initdb.d/01-init.sql
