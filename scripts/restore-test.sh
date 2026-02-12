#!/bin/bash
set -e

# Configuration - update these for your environment
BACKUP_BUCKET="${BACKUP_BUCKET:-workout-log-dev-backups}"
TEST_DIR="${TEST_DIR:-/tmp/restore-test-$(date +%s)}"
LOG_FILE="${LOG_FILE:-/dev/stdout}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
  echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_pass() {
  log "${GREEN}PASS${NC}: $1"
}

log_fail() {
  log "${RED}FAIL${NC}: $1"
}

log_warn() {
  log "${YELLOW}WARN${NC}: $1"
}

cleanup() {
  if [ -d "$TEST_DIR" ]; then
    rm -rf "$TEST_DIR"
    log "Cleaned up test directory"
  fi
}

# Set trap for cleanup
trap cleanup EXIT

usage() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Verify backup integrity by downloading and testing restore"
  echo ""
  echo "Options:"
  echo "  -b, --bucket NAME    S3 bucket name (default: workout-log-dev-backups)"
  echo "  -f, --file PATH      Test a local backup file instead of S3"
  echo "  -a, --all            Test all available backups (not just latest)"
  echo "  -h, --help           Show this help message"
  echo ""
  echo "Environment variables:"
  echo "  BACKUP_BUCKET        S3 bucket name"
  echo "  AWS_PROFILE          AWS profile to use"
  echo ""
  echo "Examples:"
  echo "  $0                           # Test latest backup from default bucket"
  echo "  $0 -b my-backup-bucket       # Test latest backup from specific bucket"
  echo "  $0 -f ./workout.db           # Test a local database file"
  echo "  $0 -a                        # Test all backups in bucket"
}

# Parse arguments
TEST_ALL=false
LOCAL_FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -b|--bucket)
      BACKUP_BUCKET="$2"
      shift 2
      ;;
    -f|--file)
      LOCAL_FILE="$2"
      shift 2
      ;;
    -a|--all)
      TEST_ALL=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

log "=========================================="
log "Backup Restore Test"
log "=========================================="

# Create test directory
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

TESTS_PASSED=0
TESTS_FAILED=0

# Function to test a single database file
test_database() {
  local db_path="$1"
  local db_name="$2"

  log ""
  log "Testing: $db_name"
  log "-------------------------------------------"

  # Test 1: File exists and is readable
  if [ ! -f "$db_path" ] || [ ! -r "$db_path" ]; then
    log_fail "Database file not readable"
    ((TESTS_FAILED++))
    return 1
  fi
  log_pass "File is readable"
  ((TESTS_PASSED++))

  # Test 2: SQLite integrity check
  local integrity
  integrity=$(sqlite3 "$db_path" "PRAGMA integrity_check;" 2>&1)
  if echo "$integrity" | grep -q "ok"; then
    log_pass "SQLite integrity check"
    ((TESTS_PASSED++))
  else
    log_fail "SQLite integrity check: $integrity"
    ((TESTS_FAILED++))
    return 1
  fi

  # Test 3: Check required tables exist
  local tables
  tables=$(sqlite3 "$db_path" ".tables" 2>&1)
  local required_tables="users exercises workouts workout_sets personal_records"
  local all_tables_exist=true

  for table in $required_tables; do
    if echo "$tables" | grep -qw "$table"; then
      log_pass "Table '$table' exists"
      ((TESTS_PASSED++))
    else
      log_fail "Table '$table' missing"
      ((TESTS_FAILED++))
      all_tables_exist=false
    fi
  done

  if [ "$all_tables_exist" = false ]; then
    return 1
  fi

  # Test 4: Data readability
  local user_count exercise_count workout_count set_count
  user_count=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM users;" 2>&1)
  exercise_count=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM exercises;" 2>&1)
  workout_count=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM workouts;" 2>&1)
  set_count=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM workout_sets;" 2>&1)

  log "  Data counts: Users=$user_count, Exercises=$exercise_count, Workouts=$workout_count, Sets=$set_count"

  if [ "$exercise_count" -ge 0 ] 2>/dev/null; then
    log_pass "Data is queryable"
    ((TESTS_PASSED++))
  else
    log_fail "Could not query data"
    ((TESTS_FAILED++))
    return 1
  fi

  # Test 5: Foreign key integrity (optional - may have orphans)
  local fk_check
  fk_check=$(sqlite3 "$db_path" "PRAGMA foreign_key_check;" 2>&1)
  if [ -z "$fk_check" ]; then
    log_pass "Foreign key integrity"
    ((TESTS_PASSED++))
  else
    log_warn "Foreign key violations found (may be expected):"
    echo "$fk_check" | head -5
  fi

  return 0
}

# Test local file or S3 backups
if [ -n "$LOCAL_FILE" ]; then
  # Test local file
  if [ ! -f "$LOCAL_FILE" ]; then
    log_fail "Local file not found: $LOCAL_FILE"
    exit 1
  fi
  test_database "$LOCAL_FILE" "$(basename "$LOCAL_FILE")"
else
  # Test S3 backups
  log "Bucket: s3://$BACKUP_BUCKET"

  # Check AWS CLI
  if ! command -v aws &> /dev/null; then
    log_fail "AWS CLI is not installed"
    exit 1
  fi

  # List backups
  log "Fetching backup list..."
  DAILY_BACKUPS=$(aws s3 ls "s3://$BACKUP_BUCKET/daily/" 2>/dev/null | sort -k1,2 || echo "")
  WEEKLY_BACKUPS=$(aws s3 ls "s3://$BACKUP_BUCKET/weekly/" 2>/dev/null | sort -k1,2 || echo "")

  if [ -z "$DAILY_BACKUPS" ] && [ -z "$WEEKLY_BACKUPS" ]; then
    log_fail "No backups found in s3://$BACKUP_BUCKET"
    exit 1
  fi

  DAILY_COUNT=$(echo "$DAILY_BACKUPS" | grep -c "workout-" || echo "0")
  WEEKLY_COUNT=$(echo "$WEEKLY_BACKUPS" | grep -c "workout-" || echo "0")
  log "Found $DAILY_COUNT daily backups, $WEEKLY_COUNT weekly backups"

  if [ "$TEST_ALL" = true ]; then
    # Test all backups
    log "Testing ALL backups..."

    for backup in $(echo "$DAILY_BACKUPS" | awk '{print "daily/" $4}'); do
      if [ -n "$backup" ] && [ "$backup" != "daily/" ]; then
        aws s3 cp "s3://$BACKUP_BUCKET/$backup" "$TEST_DIR/test.db" --quiet
        test_database "$TEST_DIR/test.db" "$backup"
        rm -f "$TEST_DIR/test.db"
      fi
    done

    for backup in $(echo "$WEEKLY_BACKUPS" | awk '{print "weekly/" $4}'); do
      if [ -n "$backup" ] && [ "$backup" != "weekly/" ]; then
        aws s3 cp "s3://$BACKUP_BUCKET/$backup" "$TEST_DIR/test.db" --quiet
        test_database "$TEST_DIR/test.db" "$backup"
        rm -f "$TEST_DIR/test.db"
      fi
    done
  else
    # Test only latest daily and latest weekly
    LATEST_DAILY=$(echo "$DAILY_BACKUPS" | tail -1 | awk '{print $4}')
    LATEST_WEEKLY=$(echo "$WEEKLY_BACKUPS" | tail -1 | awk '{print $4}')

    if [ -n "$LATEST_DAILY" ]; then
      log "Downloading latest daily backup: $LATEST_DAILY"
      aws s3 cp "s3://$BACKUP_BUCKET/daily/$LATEST_DAILY" "$TEST_DIR/daily.db" --quiet
      test_database "$TEST_DIR/daily.db" "daily/$LATEST_DAILY"
    fi

    if [ -n "$LATEST_WEEKLY" ]; then
      log "Downloading latest weekly backup: $LATEST_WEEKLY"
      aws s3 cp "s3://$BACKUP_BUCKET/weekly/$LATEST_WEEKLY" "$TEST_DIR/weekly.db" --quiet
      test_database "$TEST_DIR/weekly.db" "weekly/$LATEST_WEEKLY"
    fi
  fi
fi

# Summary
log ""
log "=========================================="
log "SUMMARY"
log "=========================================="
log "Tests passed: $TESTS_PASSED"
log "Tests failed: $TESTS_FAILED"

if [ "$TESTS_FAILED" -gt 0 ]; then
  log_fail "Some tests failed!"
  exit 1
else
  log_pass "All tests passed!"
  exit 0
fi
