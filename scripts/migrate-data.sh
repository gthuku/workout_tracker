#!/bin/bash
set -e

# Configuration
BACKUP_BUCKET="workout-log-prod-backups-d721111" # Extracted from Pulumi output or known config
LOCAL_DB_PATH="workout.db"

echo "=== Starting Data Migration ==="

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed"
    exit 1
fi

# List latest backup
echo "Finding latest backup in s3://$BACKUP_BUCKET/daily/..."
LATEST_BACKUP=$(aws s3 ls "s3://$BACKUP_BUCKET/daily/" | sort | tail -n 1 | awk '{print $4}')

if [ -z "$LATEST_BACKUP" ]; then
    echo "Error: No backups found in s3://$BACKUP_BUCKET/daily/"
    exit 1
fi

echo "Downloading latest backup: $LATEST_BACKUP"
aws s3 cp "s3://$BACKUP_BUCKET/daily/$LATEST_BACKUP" "$LOCAL_DB_PATH"

echo "Database downloaded to $LOCAL_DB_PATH"

# Instructions for Docker volume
echo ""
echo "=== Migration Complete ==="
echo "To copy this database into the Docker volume:"
echo "1. Start the container: docker-compose up -d"
echo "2. Copy file: docker cp $LOCAL_DB_PATH \$(docker-compose ps -q app):/app/data/workout.db"
echo "3. Restart container: docker-compose restart app"
