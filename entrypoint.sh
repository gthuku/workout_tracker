#!/bin/sh
set -e

DATA_DIR="/app/data"
DB_FILE="$DATA_DIR/workout.db"
S3_BUCKET="${S3_BUCKET:-}"
S3_DB_KEY="${S3_DB_KEY:-}"
S3_DB_PREFIX="${S3_DB_PREFIX:-daily/}"
BACKUP_INTERVAL="${BACKUP_INTERVAL:-300}" # Default: 5 minutes

# ============ FUNCTIONS ============

log() {
  echo "[entrypoint] $(date '+%Y-%m-%d %H:%M:%S') $1"
}

download_from_s3() {
  if [ -z "$S3_BUCKET" ]; then
    log "No S3_BUCKET set, skipping download"
    return 0
  fi

  # If an explicit key is provided, prefer it.
  if [ -n "$S3_DB_KEY" ]; then
    log "Downloading database from s3://$S3_BUCKET/$S3_DB_KEY ..."
    if aws s3 cp "s3://$S3_BUCKET/$S3_DB_KEY" "$DB_FILE" 2>/dev/null; then
      log "Database downloaded successfully"
      return 0
    fi
    log "Could not download explicit key s3://$S3_BUCKET/$S3_DB_KEY"
  fi

  # Fall back to the latest backup under a prefix (matches Pulumi backup layout).
  log "Finding latest backup in s3://$S3_BUCKET/$S3_DB_PREFIX ..."
  LATEST_KEY=$(aws s3 ls "s3://$S3_BUCKET/$S3_DB_PREFIX" 2>/dev/null | sort | tail -n 1 | awk '{print $4}')
  if [ -n "$LATEST_KEY" ]; then
    log "Downloading latest backup: s3://$S3_BUCKET/$S3_DB_PREFIX$LATEST_KEY"
    if aws s3 cp "s3://$S3_BUCKET/$S3_DB_PREFIX$LATEST_KEY" "$DB_FILE" 2>/dev/null; then
      log "Latest backup downloaded successfully"
      return 0
    fi
  fi

  log "No existing database in S3 (first run?), starting fresh"
}

upload_to_s3() {
  if [ -z "$S3_BUCKET" ]; then
    return 0
  fi

  if [ ! -f "$DB_FILE" ]; then
    log "No database file to upload"
    return 0
  fi

  # Default upload key keeps backward compatibility and supports explicit restore key.
  UPLOAD_KEY="${S3_DB_KEY:-workout.db}"

  log "Uploading database to s3://$S3_BUCKET/$UPLOAD_KEY ..."
  if aws s3 cp "$DB_FILE" "s3://$S3_BUCKET/$UPLOAD_KEY"; then
    log "Database uploaded successfully"
  else
    log "WARNING: Failed to upload database to S3"
  fi

  # Also upload WAL/SHM files if they exist (SQLite)
  for ext in "-wal" "-shm"; do
    if [ -f "${DB_FILE}${ext}" ]; then
      aws s3 cp "${DB_FILE}${ext}" "s3://$S3_BUCKET/${UPLOAD_KEY}${ext}" 2>/dev/null || true
    fi
  done
}

start_backup_loop() {
  if [ -z "$S3_BUCKET" ]; then
    return 0
  fi

  log "Starting periodic backup (every ${BACKUP_INTERVAL}s)"
  while true; do
    sleep "$BACKUP_INTERVAL"
    upload_to_s3
  done &
  BACKUP_PID=$!
}

cleanup() {
  log "Shutting down... performing final backup"

  # Stop the backup loop
  if [ -n "$BACKUP_PID" ]; then
    kill "$BACKUP_PID" 2>/dev/null || true
  fi

  # Stop the Node.js app gracefully
  if [ -n "$APP_PID" ]; then
    kill -TERM "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
  fi

  # Final upload
  upload_to_s3

  log "Shutdown complete"
  exit 0
}

# ============ MAIN ============

# Ensure data directory exists
mkdir -p "$DATA_DIR"

# Download database from S3
download_from_s3

# Set up signal handlers for graceful shutdown
trap cleanup SIGTERM SIGINT

# Start periodic backups
start_backup_loop

# Start the application
log "Starting application..."
node dist/server/index.js &
APP_PID=$!

# Wait for the app to exit
wait "$APP_PID"
