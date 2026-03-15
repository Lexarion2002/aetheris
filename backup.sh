#!/bin/bash

# ==========================================
# Script de Backup Sécurisé - Aetheris
# ==========================================

# Configuration
PROJECT_DIR="/Users/louissaure/Documents/Aetheris"
BACKUP_DEST="$HOME/Backups" # À modifier selon votre second emplacement (ex: Cloud ou disque externe)
PROJECT_NAME="Aetheris"

# Format YYYY-MM-DD_HHMM
TIMESTAMP=$(date +"%Y-%m-%d_%H%M")
ARCHIVE_NAME="${TIMESTAMP}_${PROJECT_NAME}_BACKUP.zip"
ARCHIVE_PATH="$BACKUP_DEST/$ARCHIVE_NAME"

echo "🚀 Démarrage du backup sécurisé pour $PROJECT_NAME..."

# Création du dossier de destination s'il n'existe pas
mkdir -p "$BACKUP_DEST"

# Déplacement dans le dossier du projet
cd "$PROJECT_DIR" || { echo "❌ Erreur: Impossible d'accéder au répertoire $PROJECT_DIR"; exit 1; }

# Vérification de la présence de Git
if [ ! -d ".git" ]; then
    echo "❌ Erreur: Ce projet n'est pas un dépôt Git. Veuillez exécuter 'git init' d'abord."
    exit 1
fi

echo "📦 Compression des fichiers en cours..."
git ls-files -z | xargs -0 zip -q "$ARCHIVE_PATH"
git ls-files --others --exclude-standard -z | xargs -0 zip -u -q "$ARCHIVE_PATH" 2>/dev/null || true

cd "$BACKUP_DEST" || exit 1
echo "🔐 Génération du checksum SHA-256..."
shasum -a 256 "$ARCHIVE_NAME" > "${ARCHIVE_NAME}.sha256"

echo "✅ Backup terminé avec succès !"
echo "📍 Archive : $ARCHIVE_PATH"
echo "📜 Checksum :"
cat "${ARCHIVE_NAME}.sha256"