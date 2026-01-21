#!/bin/bash
# =============================================================================
# Deploy - Config-Driven Render.com Deployment
# =============================================================================
#
# Deploys kosuke-template-based projects to Render.com:
#   - Creates/updates Render project
#   - Deploys storages (PostgreSQL, Redis, S3/Spaces)
#   - Deploys services (web, worker)
#   - Manages environment variables
#
# Usage:
#   ./deploy.sh                           # Automatic deployment (no prompts)
#   ./deploy.sh --interactive             # Interactive mode with confirmations
#   ./deploy.sh --directory=/path/to/project
#
# Environment Variables:
#   RENDER_API_KEY      - Render.com API key (required)
#   RENDER_OWNER_ID     - Render.com owner/team ID (required)
#   S3_ACCESS_KEY_ID    - DigitalOcean Spaces access key (for S3 storage)
#   S3_SECRET_ACCESS_KEY - DigitalOcean Spaces secret key (for S3 storage)
#   NOTIFICATION_EMAIL  - Email for deployment notifications (optional)
#
# Prerequisites:
#   - curl, jq, git must be installed
#   - aws CLI must be installed (for S3/Spaces operations)
#   - kosuke.config.json must exist with production section
#
# =============================================================================

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

RENDER_API_BASE="https://api.render.com/v1"
SPACES_REGION="ams3"
SPACES_ENDPOINT="https://${SPACES_REGION}.digitaloceanspaces.com"

PROJECT_DIR=""
INTERACTIVE=false
AUTOMATIC_MODE=true

# =============================================================================
# ARGUMENT PARSING
# =============================================================================

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --directory=*)
        PROJECT_DIR="${1#*=}"
        shift
        ;;
      --directory)
        PROJECT_DIR="$2"
        shift 2
        ;;
      --interactive)
        INTERACTIVE=true
        AUTOMATIC_MODE=false
        shift
        ;;
      --help|-h)
        show_help
        exit 0
        ;;
      *)
        # Positional argument as directory
        if [[ -z "$PROJECT_DIR" ]]; then
          PROJECT_DIR="$1"
        fi
        shift
        ;;
    esac
  done

  # Default to current directory
  PROJECT_DIR="${PROJECT_DIR:-.}"
  PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
}

show_help() {
  cat << 'EOF'
Deploy - Config-Driven Render.com Deployment

Usage:
  ./deploy.sh [options] [directory]

Options:
  --directory=PATH    Project directory (default: current directory)
  --interactive       Enable confirmation prompts
  --help, -h          Show this help message

Environment Variables (required):
  RENDER_API_KEY      Render.com API key
  RENDER_OWNER_ID     Render.com owner/team ID

Environment Variables (optional):
  S3_ACCESS_KEY_ID      DigitalOcean Spaces access key
  S3_SECRET_ACCESS_KEY  DigitalOcean Spaces secret key
  NOTIFICATION_EMAIL    Email for deployment notifications

Prerequisites:
  - curl, jq, git must be installed
  - aws CLI must be installed (for S3/Spaces)
  - kosuke.config.json with production section

Examples:
  ./deploy.sh                                    # Auto-deploy in current directory
  ./deploy.sh --interactive                      # Interactive mode
  ./deploy.sh --directory=/path/to/project       # Deploy specific directory
EOF
}

# =============================================================================
# LOGGING
# =============================================================================

log_info() { echo "[$(date '+%H:%M:%S')] INFO  $*"; }
log_success() { echo "[$(date '+%H:%M:%S')] OK    $*"; }
log_warn() { echo "[$(date '+%H:%M:%S')] WARN  $*"; }
log_error() { echo "[$(date '+%H:%M:%S')] ERROR $*" >&2; }

# =============================================================================
# VALIDATION
# =============================================================================

validate_required_env_vars() {
  local missing=()

  if [[ -z "${RENDER_API_KEY:-}" ]]; then
    missing+=("RENDER_API_KEY")
  fi

  if [[ -z "${RENDER_OWNER_ID:-}" ]]; then
    missing+=("RENDER_OWNER_ID")
  fi

  if [[ ${#missing[@]} -gt 0 ]]; then
    log_error "Missing required environment variables:"
    for var in "${missing[@]}"; do
      log_error "  - $var"
    done
    exit 1
  fi
}

validate_dependencies() {
  local missing=()

  for cmd in curl jq git; do
    if ! command -v "$cmd" &>/dev/null; then
      missing+=("$cmd")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    log_error "Missing required commands:"
    for cmd in "${missing[@]}"; do
      log_error "  - $cmd"
    done
    exit 1
  fi
}

# =============================================================================
# CONFIRMATION
# =============================================================================

ask_confirmation() {
  local message="$1"

  if [[ "$AUTOMATIC_MODE" == "true" ]]; then
    echo "   [auto] $message"
    return 0
  fi

  read -rp "   [?] $message [Y/n] " confirm
  if [[ "$confirm" =~ ^[Nn] ]]; then
    return 1
  fi
  return 0
}

# =============================================================================
# RENDER API
# =============================================================================

render_api_get() {
  local path="$1"
  local params="${2:-}"

  local url="${RENDER_API_BASE}${path}"
  if [[ -n "$params" ]]; then
    url="${url}?${params}"
  fi

  local response
  response=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Content-Type: application/json" \
    "$url")

  local http_code
  http_code=$(echo "$response" | tail -n1)
  local body
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" -ge 400 ]]; then
    log_error "Render API GET $path failed (HTTP $http_code): $body"
    return 1
  fi

  echo "$body"
}

render_api_post() {
  local path="$1"
  local data="$2"

  local response
  response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$data" \
    "${RENDER_API_BASE}${path}")

  local http_code
  http_code=$(echo "$response" | tail -n1)
  local body
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" -ge 400 ]]; then
    log_error "Render API POST $path failed (HTTP $http_code): $body"
    return 1
  fi

  echo "$body"
}

render_api_patch() {
  local path="$1"
  local data="$2"

  local response
  response=$(curl -s -w "\n%{http_code}" \
    -X PATCH \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$data" \
    "${RENDER_API_BASE}${path}")

  local http_code
  http_code=$(echo "$response" | tail -n1)
  local body
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" -ge 400 ]]; then
    log_error "Render API PATCH $path failed (HTTP $http_code): $body"
    return 1
  fi

  echo "$body"
}

render_api_delete() {
  local path="$1"

  local response
  response=$(curl -s -w "\n%{http_code}" \
    -X DELETE \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Content-Type: application/json" \
    "${RENDER_API_BASE}${path}")

  local http_code
  http_code=$(echo "$response" | tail -n1)

  if [[ "$http_code" -ge 400 ]] && [[ "$http_code" != "404" ]]; then
    local body
    body=$(echo "$response" | sed '$d')
    log_error "Render API DELETE $path failed (HTTP $http_code): $body"
    return 1
  fi

  return 0
}

# =============================================================================
# POLLING
# =============================================================================

poll_status() {
  local check_cmd="$1"
  local success_states="$2"
  local failure_states="$3"
  local max_attempts="${4:-30}"
  local delay_seconds="${5:-5}"

  for ((attempt=1; attempt<=max_attempts; attempt++)); do
    local status
    status=$(eval "$check_cmd")

    # Check success states
    for state in $success_states; do
      if [[ "$status" == "$state" ]]; then
        log_info "   Status: $status"
        return 0
      fi
    done

    # Check failure states
    for state in $failure_states; do
      if [[ "$status" == "$state" ]]; then
        log_error "Operation failed with status: $status"
        return 1
      fi
    done

    log_info "   Status: $status (attempt $attempt/$max_attempts)"
    sleep "$delay_seconds"
  done

  log_error "Operation did not complete after $max_attempts attempts"
  return 1
}

# =============================================================================
# CONFIG LOADING
# =============================================================================

load_production_config() {
  local config_file="$PROJECT_DIR/kosuke.config.json"

  if [[ ! -f "$config_file" ]]; then
    log_error "Missing kosuke.config.json in project root."
    log_error "Please create $config_file with your deployment configuration."
    exit 1
  fi

  if ! jq empty "$config_file" 2>/dev/null; then
    log_error "Invalid JSON in kosuke.config.json"
    exit 1
  fi

  local has_production
  has_production=$(jq -r 'has("production")' "$config_file")
  if [[ "$has_production" != "true" ]]; then
    log_error "Missing production section in kosuke.config.json."
    log_error "Please add a \"production\" section with services, storages, resources, and environment."
    exit 1
  fi

  # Validate required sections
  local has_services has_storages has_resources has_environment
  has_services=$(jq -r '.production | has("services")' "$config_file")
  has_storages=$(jq -r '.production | has("storages")' "$config_file")
  has_resources=$(jq -r '.production | has("resources")' "$config_file")
  has_environment=$(jq -r '.production | has("environment")' "$config_file")

  if [[ "$has_services" != "true" ]]; then
    log_error "Invalid kosuke.config.json: production.services is required"
    exit 1
  fi
  if [[ "$has_storages" != "true" ]]; then
    log_error "Invalid kosuke.config.json: production.storages is required"
    exit 1
  fi
  if [[ "$has_resources" != "true" ]]; then
    log_error "Invalid kosuke.config.json: production.resources is required"
    exit 1
  fi
  if [[ "$has_environment" != "true" ]]; then
    log_error "Invalid kosuke.config.json: production.environment is required"
    exit 1
  fi

  cat "$config_file"
}

get_resource_plan() {
  local config="$1"
  local resource_name="$2"

  local plan
  plan=$(echo "$config" | jq -r ".production.resources[\"$resource_name\"].plan // \"starter\"")
  echo "$plan"
}

# =============================================================================
# GIT UTILITIES
# =============================================================================

get_git_repo_info() {
  cd "$PROJECT_DIR"

  local remote_url
  remote_url=$(git remote get-url origin 2>/dev/null || true)

  if [[ -z "$remote_url" ]]; then
    log_error "Could not determine Git repository from directory"
    log_error "Make sure you're in a git repository with an origin remote."
    exit 1
  fi

  # Parse owner/repo from URL
  local owner repo
  if [[ "$remote_url" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
    owner="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
  else
    log_error "Could not parse GitHub repository from: $remote_url"
    exit 1
  fi

  echo "${owner}/${repo}"
}

# =============================================================================
# PROJECT MODULE
# =============================================================================

project_check() {
  local name="$1"

  local response
  response=$(render_api_get "/projects" "name=$name&limit=20") || return 1

  local project_id
  project_id=$(echo "$response" | jq -r '.[0].project.id // empty')

  if [[ -n "$project_id" ]]; then
    local env_id
    env_id=$(echo "$response" | jq -r '.[0].project.environmentIds[0] // empty')
    echo "$project_id|$env_id"
    return 0
  fi

  return 1
}

project_create() {
  local name="$1"

  log_info "Creating Render project..."

  local data
  data=$(jq -n \
    --arg name "$name" \
    --arg ownerId "$RENDER_OWNER_ID" \
    '{name: $name, ownerId: $ownerId, environments: [{name: "production"}]}')

  local response
  response=$(render_api_post "/projects" "$data") || return 1

  local project_id
  project_id=$(echo "$response" | jq -r '.id')

  log_success "Project created: $project_id"
  echo "$project_id|"
}

project_get_environment() {
  local project_id="$1"

  local response
  response=$(render_api_get "/projects/$project_id") || return 1

  echo "$response" | jq -r '.environmentIds[0] // empty'
}

# =============================================================================
# DATABASE MODULE
# =============================================================================

database_check() {
  local name="$1"

  local response
  response=$(render_api_get "/postgres" "name=$name&includeReplicas=true&limit=20") || return 1

  local db_id
  db_id=$(echo "$response" | jq -r '.[0].postgres.id // empty')

  if [[ -n "$db_id" ]]; then
    echo "$db_id"
    return 0
  fi

  return 1
}

database_get_connection_string() {
  local db_id="$1"

  local response
  response=$(render_api_get "/postgres/$db_id/connection-info") || return 1

  echo "$response" | jq -r '.internalConnectionString'
}

database_create() {
  local name="$1"
  local plan="$2"

  log_info "Creating PostgreSQL database..."

  local data
  data=$(jq -n \
    --arg name "$name" \
    --arg ownerId "$RENDER_OWNER_ID" \
    --arg plan "$plan" \
    '{name: $name, ownerId: $ownerId, region: "frankfurt", enableHighAvailability: false, plan: $plan, version: "17"}')

  local response
  response=$(render_api_post "/postgres" "$data") || return 1

  local db_id
  db_id=$(echo "$response" | jq -r '.id')

  log_success "Database created: $db_id"
  echo "$db_id"
}

database_wait_for_availability() {
  local db_id="$1"

  log_info "Waiting for database to be available..."

  poll_status \
    "render_api_get '/postgres/$db_id' | jq -r '.status'" \
    "available" \
    "" \
    60 \
    10

  log_success "Database is available"
}

# =============================================================================
# REDIS MODULE
# =============================================================================

redis_check() {
  local name="$1"

  local response
  response=$(render_api_get "/redis" "name=$name&limit=20") || return 1

  local redis_id
  redis_id=$(echo "$response" | jq -r '.[0].redis.id // empty')

  if [[ -n "$redis_id" ]]; then
    echo "$redis_id"
    return 0
  fi

  return 1
}

redis_get_connection_string() {
  local redis_id="$1"

  local response
  response=$(render_api_get "/redis/$redis_id/connection-info") || return 1

  echo "$response" | jq -r '.internalConnectionString'
}

redis_create() {
  local name="$1"
  local plan="$2"
  local maxmemory_policy="${3:-allkeys-lru}"

  log_info "Creating Redis cache..."

  local data
  data=$(jq -n \
    --arg name "$name" \
    --arg ownerId "$RENDER_OWNER_ID" \
    --arg plan "$plan" \
    --arg maxmemoryPolicy "$maxmemory_policy" \
    '{name: $name, ownerId: $ownerId, region: "frankfurt", plan: $plan, maxmemoryPolicy: $maxmemoryPolicy}')

  local response
  response=$(render_api_post "/redis" "$data") || return 1

  local redis_id
  redis_id=$(echo "$response" | jq -r '.id')

  log_success "Redis created: $redis_id"
  echo "$redis_id"
}

redis_update() {
  local redis_id="$1"
  local maxmemory_policy="$2"

  log_info "Updating Redis $redis_id..."

  local data
  data=$(jq -n --arg maxmemoryPolicy "$maxmemory_policy" '{maxmemoryPolicy: $maxmemoryPolicy}')

  render_api_patch "/redis/$redis_id" "$data" || return 1

  log_success "Redis updated"
}

redis_wait_for_availability() {
  local redis_id="$1"

  log_info "Waiting for Redis to be available..."

  poll_status \
    "render_api_get '/redis/$redis_id' | jq -r '.status'" \
    "available" \
    "" \
    60 \
    10

  log_success "Redis is available"
}

# =============================================================================
# SPACES MODULE (DigitalOcean S3)
# =============================================================================

spaces_check() {
  local name="$1"

  if [[ -z "${S3_ACCESS_KEY_ID:-}" ]] || [[ -z "${S3_SECRET_ACCESS_KEY:-}" ]]; then
    log_warn "S3 credentials not set, skipping Spaces check"
    return 1
  fi

  # Check if aws CLI is available
  if ! command -v aws &>/dev/null; then
    log_warn "aws CLI not installed, skipping Spaces check"
    return 1
  fi

  local buckets
  buckets=$(AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" \
    AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" \
    aws s3api list-buckets \
    --endpoint-url "$SPACES_ENDPOINT" \
    --query "Buckets[?Name=='$name'].Name" \
    --output text 2>/dev/null || true)

  if [[ "$buckets" == "$name" ]]; then
    echo "$name"
    return 0
  fi

  return 1
}

spaces_create() {
  local name="$1"

  if [[ -z "${S3_ACCESS_KEY_ID:-}" ]] || [[ -z "${S3_SECRET_ACCESS_KEY:-}" ]]; then
    log_error "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required for Spaces"
    return 1
  fi

  if ! command -v aws &>/dev/null; then
    log_error "aws CLI is required for Spaces operations"
    return 1
  fi

  log_info "Creating DigitalOcean Space..."

  local bucket_name="$name"
  local max_attempts=3

  for ((attempt=1; attempt<=max_attempts; attempt++)); do
    if AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" \
       AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" \
       aws s3api create-bucket \
       --bucket "$bucket_name" \
       --endpoint-url "$SPACES_ENDPOINT" \
       --region "$SPACES_REGION" \
       2>/dev/null; then
      log_success "Space created: $bucket_name"
      echo "$bucket_name"
      return 0
    fi

    # Name might be taken, try with suffix
    local suffix
    suffix=$(date +%s | tail -c 6)
    bucket_name="${name}-${suffix}"
    log_warn "Name \"$name\" taken, trying \"$bucket_name\"..."
  done

  log_error "Failed to create Space after $max_attempts attempts"
  return 1
}

# =============================================================================
# SERVICE MODULE
# =============================================================================

service_check() {
  local name="$1"

  local response
  response=$(render_api_get "/services" "name=$name&includePreviews=true&limit=20") || return 1

  local service_id
  service_id=$(echo "$response" | jq -r '.[0].service.id // empty')

  if [[ -n "$service_id" ]]; then
    local url
    url=$(echo "$response" | jq -r ".[0].service.serviceDetails.url // \"https://${name}.onrender.com\"")
    echo "$service_id|$url"
    return 0
  fi

  return 1
}

service_create() {
  local name="$1"
  local type="$2"
  local plan="$3"
  local git_repo="$4"
  local runtime="$5"
  local build_command="$6"
  local start_command="$7"
  local env_vars_json="$8"
  local root_dir="${9:-}"

  log_info "Creating $name service..."

  # Map service type
  local render_type
  if [[ "$type" == "web" ]]; then
    render_type="web_service"
  else
    render_type="background_worker"
  fi

  # Build env vars array
  local env_vars_array="[]"
  if [[ -n "$env_vars_json" ]] && [[ "$env_vars_json" != "{}" ]]; then
    env_vars_array=$(echo "$env_vars_json" | jq '[to_entries[] | {key: .key, value: .value, isSecret: false}]')
  fi

  # Build service details
  local service_details
  if [[ "$runtime" == "node" ]]; then
    service_details=$(jq -n \
      --arg plan "$plan" \
      --arg buildCommand "$build_command" \
      --arg startCommand "$start_command" \
      '{
        runtime: "node",
        plan: $plan,
        region: "frankfurt",
        numInstances: 1,
        envSpecificDetails: {
          buildCommand: $buildCommand,
          startCommand: $startCommand
        }
      }')
  else
    service_details=$(jq -n \
      --arg plan "$plan" \
      '{
        runtime: "docker",
        plan: $plan,
        region: "frankfurt",
        numInstances: 1
      }')
  fi

  # Build full payload
  local data
  data=$(jq -n \
    --arg type "$render_type" \
    --arg name "$name" \
    --arg ownerId "$RENDER_OWNER_ID" \
    --arg repo "https://$git_repo" \
    --argjson serviceDetails "$service_details" \
    --argjson envVars "$env_vars_array" \
    '{type: $type, name: $name, ownerId: $ownerId, repo: $repo, branch: "main", serviceDetails: $serviceDetails, envVars: $envVars}')

  # Add root dir if specified
  if [[ -n "$root_dir" ]] && [[ "$root_dir" != "." ]]; then
    data=$(echo "$data" | jq --arg rootDir "$root_dir" '. + {rootDir: $rootDir}')
  fi

  # Add notification email if set
  if [[ -n "${NOTIFICATION_EMAIL:-}" ]]; then
    data=$(echo "$data" | jq --arg email "$NOTIFICATION_EMAIL" '. + {notificationEmail: $email}')
  fi

  local response
  response=$(render_api_post "/services" "$data") || return 1

  local service_id deploy_id url
  service_id=$(echo "$response" | jq -r '.service.id')
  deploy_id=$(echo "$response" | jq -r '.deployId')
  url=$(echo "$response" | jq -r ".service.serviceDetails.url // \"https://${name}.onrender.com\"")

  log_success "$name created"
  echo "$service_id|$deploy_id|$url"
}

service_update() {
  local service_id="$1"
  local build_command="$2"
  local start_command="$3"
  local env_vars_json="$4"

  log_info "Updating service $service_id..."

  local data="{}"

  # Add service details if commands provided
  if [[ -n "$build_command" ]] || [[ -n "$start_command" ]]; then
    local env_details="{}"
    if [[ -n "$build_command" ]]; then
      env_details=$(echo "$env_details" | jq --arg cmd "$build_command" '. + {buildCommand: $cmd}')
    fi
    if [[ -n "$start_command" ]]; then
      env_details=$(echo "$env_details" | jq --arg cmd "$start_command" '. + {startCommand: $cmd}')
    fi
    data=$(echo "$data" | jq --argjson details "{\"envSpecificDetails\": $env_details}" '. + {serviceDetails: $details}')
  fi

  # Add env vars if provided
  if [[ -n "$env_vars_json" ]] && [[ "$env_vars_json" != "{}" ]]; then
    local env_vars_array
    env_vars_array=$(echo "$env_vars_json" | jq '[to_entries[] | {key: .key, value: .value, isSecret: false}]')
    data=$(echo "$data" | jq --argjson envVars "$env_vars_array" '. + {envVars: $envVars}')
  fi

  local response
  response=$(render_api_patch "/services/$service_id" "$data") || return 1

  local deploy_id
  deploy_id=$(echo "$response" | jq -r '.deployId // empty')

  log_success "Service updated"
  echo "$deploy_id"
}

service_wait_for_deployment() {
  local service_id="$1"
  local deploy_id="$2"

  log_info "Waiting for deployment to complete..."

  poll_status \
    "render_api_get '/services/$service_id/deploys/$deploy_id' | jq -r '.status'" \
    "live" \
    "build_failed update_failed canceled pre_deploy_failed" \
    120 \
    5

  log_success "Deployment is live"
}

service_list() {
  local response
  response=$(render_api_get "/services" "includePreviews=false&limit=100&ownerId=$RENDER_OWNER_ID") || return 1

  echo "$response" | jq -r '.[] | "\(.service.id)|\(.service.name)"'
}

service_delete() {
  local service_id="$1"

  log_info "Deleting service $service_id..."
  render_api_delete "/services/$service_id" || return 1
  log_success "Service deleted"
}

# =============================================================================
# ENVIRONMENT MODULE
# =============================================================================

environment_attach_resources() {
  local env_id="$1"
  local resource_ids="$2"

  if [[ -z "$env_id" ]]; then
    return 0
  fi

  log_info "Attaching resources to environment..."

  local data
  data=$(jq -n --argjson ids "$resource_ids" '{resourceIds: $ids}')

  render_api_post "/environments/$env_id/resources" "$data" || return 1

  log_success "Resources attached to environment"
}

# =============================================================================
# DEPLOYMENT ORCHESTRATION
# =============================================================================

# Associative arrays to store deployed resources
declare -A DEPLOYED_STORAGES
declare -A DEPLOYED_STORAGE_CONNECTIONS
declare -A DEPLOYED_SERVICES

deploy_project() {
  local project_name="$1"

  if ! ask_confirmation "Create or use existing project?"; then
    log_info "Skipping project creation - using existing"
    local existing
    existing=$(project_check "$project_name") || {
      log_error "No existing project found. Please create one first."
      exit 1
    }
    local project_id env_id
    IFS='|' read -r project_id env_id <<< "$existing"
    log_info "Using project: $project_id"
    echo "$project_id|$env_id"
    return 0
  fi

  local existing
  if existing=$(project_check "$project_name"); then
    local project_id env_id
    IFS='|' read -r project_id env_id <<< "$existing"
    log_success "Project already exists: $project_id"
    log_info "Using project: $project_id"
    echo "$project_id|$env_id"
    return 0
  fi

  local result
  result=$(project_create "$project_name")
  echo "$result"
}

deploy_postgres() {
  local name="$1"
  local plan="$2"
  local project_id="$3"

  local existing_id
  if existing_id=$(database_check "$name"); then
    log_success "PostgreSQL already exists: $existing_id"
    local conn_str
    conn_str=$(database_get_connection_string "$existing_id")
    DEPLOYED_STORAGES["$name"]="$existing_id"
    DEPLOYED_STORAGE_CONNECTIONS["$name"]="$conn_str"
    return 0
  fi

  if ! ask_confirmation "Create PostgreSQL database ($plan)?"; then
    log_error "PostgreSQL database \"$name\" required but not found. Please create it first."
    exit 1
  fi

  local db_id
  db_id=$(database_create "$name" "$plan")

  # Attach to project environment
  local env_id
  env_id=$(project_get_environment "$project_id")
  if [[ -n "$env_id" ]]; then
    environment_attach_resources "$env_id" "[\"$db_id\"]"
  fi

  database_wait_for_availability "$db_id"

  local conn_str
  conn_str=$(database_get_connection_string "$db_id")

  DEPLOYED_STORAGES["$name"]="$db_id"
  DEPLOYED_STORAGE_CONNECTIONS["$name"]="$conn_str"
}

deploy_redis() {
  local name="$1"
  local plan="$2"
  local maxmemory_policy="$3"
  local project_id="$4"

  local existing_id
  if existing_id=$(redis_check "$name"); then
    log_success "Redis already exists: $existing_id"
    local conn_str
    conn_str=$(redis_get_connection_string "$existing_id")
    DEPLOYED_STORAGES["$name"]="$existing_id"
    DEPLOYED_STORAGE_CONNECTIONS["$name"]="$conn_str"

    if [[ "$INTERACTIVE" == "true" ]] && [[ -n "$maxmemory_policy" ]]; then
      if ask_confirmation "Update Redis configuration?"; then
        redis_update "$existing_id" "$maxmemory_policy"
      fi
    fi
    return 0
  fi

  if ! ask_confirmation "Create Redis cache ($plan)?"; then
    log_error "Redis cache \"$name\" required but not found. Please create it first."
    exit 1
  fi

  local redis_id
  redis_id=$(redis_create "$name" "$plan" "$maxmemory_policy")

  # Attach to project environment
  local env_id
  env_id=$(project_get_environment "$project_id")
  if [[ -n "$env_id" ]]; then
    environment_attach_resources "$env_id" "[\"$redis_id\"]"
  fi

  redis_wait_for_availability "$redis_id"

  local conn_str
  conn_str=$(redis_get_connection_string "$redis_id")

  DEPLOYED_STORAGES["$name"]="$redis_id"
  DEPLOYED_STORAGE_CONNECTIONS["$name"]="$conn_str"
}

deploy_s3() {
  local name="$1"

  local existing_bucket
  if existing_bucket=$(spaces_check "$name"); then
    log_success "S3 Space already exists: $existing_bucket"
    DEPLOYED_STORAGES["$name"]="$existing_bucket"
    return 0
  fi

  if ! ask_confirmation "Create DigitalOcean Space for S3 storage?"; then
    log_error "S3 Space \"$name\" required but not found. Please create it first."
    exit 1
  fi

  local bucket_name
  bucket_name=$(spaces_create "$name")

  DEPLOYED_STORAGES["$name"]="$bucket_name"
}

deploy_storages() {
  local config="$1"
  local project_name="$2"
  local project_id="$3"

  local storage_keys
  storage_keys=$(echo "$config" | jq -r '.production.storages | keys[]')

  if [[ -z "$storage_keys" ]]; then
    log_info "No storages defined in config"
    return 0
  fi

  for storage_key in $storage_keys; do
    local storage_name="${storage_key}-${project_name}"
    local storage_type
    storage_type=$(echo "$config" | jq -r ".production.storages[\"$storage_key\"].type")
    local plan
    plan=$(get_resource_plan "$config" "$storage_key")

    echo ""
    echo "--- Storage: $storage_key ($storage_name) ---"
    echo ""

    case "$storage_type" in
      postgres)
        deploy_postgres "$storage_name" "$plan" "$project_id"
        ;;
      keyvalue)
        local maxmemory_policy
        maxmemory_policy=$(echo "$config" | jq -r ".production.storages[\"$storage_key\"].maxmemory_policy // \"noeviction\"")
        deploy_redis "$storage_name" "$plan" "$maxmemory_policy" "$project_id"
        ;;
      s3)
        deploy_s3 "$storage_name"
        ;;
      *)
        log_warn "Unknown storage type: $storage_type"
        ;;
    esac
  done
}

build_service_env_vars() {
  local config="$1"
  local service_key="$2"
  local service_name="$3"

  # Start with base env vars
  local env_vars
  env_vars=$(echo "$config" | jq '.production.environment')
  env_vars=$(echo "$env_vars" | jq '. + {NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1"}')

  # Inject storage connection strings
  local storage_keys
  storage_keys=$(echo "$config" | jq -r '.production.storages | keys[]')

  for storage_key in $storage_keys; do
    local storage_type
    storage_type=$(echo "$config" | jq -r ".production.storages[\"$storage_key\"].type")

    case "$storage_type" in
      postgres|keyvalue)
        local conn_var
        conn_var=$(echo "$config" | jq -r ".production.storages[\"$storage_key\"].connection_variable // empty")
        if [[ -n "$conn_var" ]] && [[ -n "${DEPLOYED_STORAGE_CONNECTIONS[$storage_key]:-}" ]]; then
          env_vars=$(echo "$env_vars" | jq --arg key "$conn_var" --arg val "${DEPLOYED_STORAGE_CONNECTIONS[$storage_key]}" '. + {($key): $val}')
        fi
        ;;
      s3)
        local bucket_var region_var endpoint_var access_key_var secret_key_var
        bucket_var=$(echo "$config" | jq -r ".production.storages[\"$storage_key\"].bucket_variable // empty")
        region_var=$(echo "$config" | jq -r ".production.storages[\"$storage_key\"].region_variable // empty")
        endpoint_var=$(echo "$config" | jq -r ".production.storages[\"$storage_key\"].endpoint_variable // empty")
        access_key_var=$(echo "$config" | jq -r ".production.storages[\"$storage_key\"].access_key_id_variable // empty")
        secret_key_var=$(echo "$config" | jq -r ".production.storages[\"$storage_key\"].secret_access_key_variable // empty")

        if [[ -n "$bucket_var" ]] && [[ -n "${DEPLOYED_STORAGES[$storage_key]:-}" ]]; then
          env_vars=$(echo "$env_vars" | jq --arg key "$bucket_var" --arg val "${DEPLOYED_STORAGES[$storage_key]}" '. + {($key): $val}')
        fi
        if [[ -n "$region_var" ]]; then
          env_vars=$(echo "$env_vars" | jq --arg key "$region_var" --arg val "$SPACES_REGION" '. + {($key): $val}')
        fi
        if [[ -n "$endpoint_var" ]]; then
          env_vars=$(echo "$env_vars" | jq --arg key "$endpoint_var" --arg val "$SPACES_ENDPOINT" '. + {($key): $val}')
        fi
        if [[ -n "$access_key_var" ]] && [[ -n "${S3_ACCESS_KEY_ID:-}" ]]; then
          env_vars=$(echo "$env_vars" | jq --arg key "$access_key_var" --arg val "$S3_ACCESS_KEY_ID" '. + {($key): $val}')
        fi
        if [[ -n "$secret_key_var" ]] && [[ -n "${S3_SECRET_ACCESS_KEY:-}" ]]; then
          env_vars=$(echo "$env_vars" | jq --arg key "$secret_key_var" --arg val "$S3_SECRET_ACCESS_KEY" '. + {($key): $val}')
        fi
        ;;
    esac
  done

  # Set external connection variable for entrypoint service
  local is_entrypoint
  is_entrypoint=$(echo "$config" | jq -r ".production.services[\"$service_key\"].is_entrypoint // false")
  if [[ "$is_entrypoint" == "true" ]]; then
    local ext_conn_var
    ext_conn_var=$(echo "$config" | jq -r ".production.services[\"$service_key\"].external_connection_variable // empty")
    if [[ -n "$ext_conn_var" ]]; then
      local app_url="https://${service_name}.onrender.com"
      env_vars=$(echo "$env_vars" | jq --arg key "$ext_conn_var" --arg val "$app_url" '. + {($key): $val}')
    fi
  fi

  echo "$env_vars"
}

deploy_service() {
  local config="$1"
  local service_key="$2"
  local project_name="$3"
  local project_id="$4"
  local git_repo="$5"

  # Generate service name
  local prefix_map='{"nextjs":"app","app":"app","web":"app","worker":"worker","backend":"backend","api":"api"}'
  local prefix
  prefix=$(echo "$prefix_map" | jq -r ".[\"$service_key\"] // \"$service_key\"")
  local service_name="${prefix}-${project_name}"

  local service_type
  service_type=$(echo "$config" | jq -r ".production.services[\"$service_key\"].type")
  local runtime
  runtime=$(echo "$config" | jq -r ".production.services[\"$service_key\"].runtime")
  local build_command
  build_command=$(echo "$config" | jq -r ".production.services[\"$service_key\"].build_command")
  local start_command
  start_command=$(echo "$config" | jq -r ".production.services[\"$service_key\"].start_command")
  local directory
  directory=$(echo "$config" | jq -r ".production.services[\"$service_key\"].directory // \".\"")
  local plan
  plan=$(get_resource_plan "$config" "$service_key")

  # Build environment variables
  local env_vars
  env_vars=$(build_service_env_vars "$config" "$service_key" "$service_name")

  echo ""
  echo "--- Service: $service_key ($service_name) ---"
  echo ""

  local existing
  if existing=$(service_check "$service_name"); then
    local service_id url
    IFS='|' read -r service_id url <<< "$existing"
    log_success "Service already exists: $service_id"

    if [[ "$INTERACTIVE" == "true" ]]; then
      if ask_confirmation "Update service configuration?"; then
        local deploy_id
        deploy_id=$(service_update "$service_id" "$build_command" "$start_command" "$env_vars")
        if [[ -n "$deploy_id" ]]; then
          service_wait_for_deployment "$service_id" "$deploy_id"
        fi
      fi
    fi

    DEPLOYED_SERVICES["$service_key"]="$service_id|$url|$service_type"
    return 0
  fi

  if ! ask_confirmation "Create $service_type service \"$service_name\" ($plan)?"; then
    log_error "Service \"$service_name\" required but not found. Please create it first."
    exit 1
  fi

  local result
  result=$(service_create "$service_name" "$service_type" "$plan" "$git_repo" "$runtime" "$build_command" "$start_command" "$env_vars" "$directory")

  local service_id deploy_id url
  IFS='|' read -r service_id deploy_id url <<< "$result"

  # Attach to project environment
  local env_id
  env_id=$(project_get_environment "$project_id")
  if [[ -n "$env_id" ]]; then
    environment_attach_resources "$env_id" "[\"$service_id\"]"
  fi

  service_wait_for_deployment "$service_id" "$deploy_id"

  DEPLOYED_SERVICES["$service_key"]="$service_id|$url|$service_type"
}

deploy_services() {
  local config="$1"
  local project_name="$2"
  local project_id="$3"
  local git_repo="$4"

  local service_keys
  service_keys=$(echo "$config" | jq -r '.production.services | keys[]')

  for service_key in $service_keys; do
    deploy_service "$config" "$service_key" "$project_name" "$project_id" "$git_repo"
  done
}

detect_and_clean_orphans() {
  local config="$1"
  local project_name="$2"

  if [[ "$INTERACTIVE" != "true" ]]; then
    return 0
  fi

  echo ""
  echo "--- Checking for orphaned resources ---"
  echo ""

  # Get expected service names
  local expected_names=()
  local service_keys
  service_keys=$(echo "$config" | jq -r '.production.services | keys[]')

  for service_key in $service_keys; do
    local prefix_map='{"nextjs":"app","app":"app","web":"app","worker":"worker","backend":"backend","api":"api"}'
    local prefix
    prefix=$(echo "$prefix_map" | jq -r ".[\"$service_key\"] // \"$service_key\"")
    expected_names+=("${prefix}-${project_name}")
  done

  # Get all services
  local services
  services=$(service_list)

  # Find orphans
  local orphans=()
  while IFS='|' read -r service_id service_name; do
    # Check if name matches project pattern but not in expected
    if [[ "$service_name" =~ -${project_name}$ ]]; then
      local found=false
      for expected in "${expected_names[@]}"; do
        if [[ "$service_name" == "$expected" ]]; then
          found=true
          break
        fi
      done
      if [[ "$found" == "false" ]]; then
        orphans+=("$service_id|$service_name")
      fi
    fi
  done <<< "$services"

  if [[ ${#orphans[@]} -eq 0 ]]; then
    log_success "No orphaned services found"
    return 0
  fi

  log_warn "Found services on Render not in config:"
  for orphan in "${orphans[@]}"; do
    IFS='|' read -r orphan_id orphan_name <<< "$orphan"
    echo "   - $orphan_name ($orphan_id)"
  done
  echo ""

  for orphan in "${orphans[@]}"; do
    IFS='|' read -r orphan_id orphan_name <<< "$orphan"
    if ask_confirmation "Delete orphaned service \"$orphan_name\"?"; then
      service_delete "$orphan_id"
    fi
  done
}

print_deployment_summary() {
  local project_id="$1"

  echo ""
  echo "================================================================================"
  echo "  Deployment complete!"
  echo "================================================================================"
  echo ""
  echo "Project:  https://dashboard.render.com/teams/${RENDER_OWNER_ID}/projects/${project_id}"
  echo ""

  if [[ ${#DEPLOYED_STORAGES[@]} -gt 0 ]]; then
    echo "Storages:"
    for key in "${!DEPLOYED_STORAGES[@]}"; do
      echo "   $key: ${DEPLOYED_STORAGES[$key]}"
    done
    echo ""
  fi

  if [[ ${#DEPLOYED_SERVICES[@]} -gt 0 ]]; then
    echo "Services:"
    for key in "${!DEPLOYED_SERVICES[@]}"; do
      local service_data="${DEPLOYED_SERVICES[$key]}"
      IFS='|' read -r service_id url service_type <<< "$service_data"
      echo "   $key: $url"
    done
    echo ""
  fi
}

# =============================================================================
# MAIN
# =============================================================================

main() {
  parse_args "$@"

  echo ""
  echo "================================================================================"
  echo "  Deploy - Config-Driven Render.com Deployment"
  echo "================================================================================"
  echo ""

  # Validate dependencies and environment
  validate_dependencies
  validate_required_env_vars

  # Validate project directory
  if [[ ! -d "$PROJECT_DIR" ]]; then
    log_error "Project directory not found: $PROJECT_DIR"
    exit 1
  fi

  # Load production config
  log_info "Loading production configuration..."
  local config
  config=$(load_production_config)

  # Get git repo info
  local git_repo
  git_repo=$(get_git_repo_info)
  local project_name
  project_name=$(echo "$git_repo" | cut -d'/' -f2)

  log_info "Git repository: $git_repo"
  log_info "Project name: $project_name"
  log_info "Interactive mode: $INTERACTIVE"
  echo ""

  # Print deployment plan
  echo "Deployment Plan:"
  echo "   Project: $project_name"

  local storage_keys
  storage_keys=$(echo "$config" | jq -r '.production.storages | keys[]')
  for key in $storage_keys; do
    local storage_type
    storage_type=$(echo "$config" | jq -r ".production.storages[\"$key\"].type")
    echo "   |-- $key ($storage_type)"
  done

  local service_keys
  service_keys=$(echo "$config" | jq -r '.production.services | keys[]')
  local last_key
  last_key=$(echo "$service_keys" | tail -n1)
  for key in $service_keys; do
    local service_type
    service_type=$(echo "$config" | jq -r ".production.services[\"$key\"].type")
    if [[ "$key" == "$last_key" ]]; then
      echo "   \`-- $key ($service_type)"
    else
      echo "   |-- $key ($service_type)"
    fi
  done
  echo ""

  if ! ask_confirmation "Proceed with deployment?"; then
    log_info "Deployment cancelled"
    exit 0
  fi

  # Step 1: Create/check project
  echo ""
  echo "--- Step 1: Project ---"
  echo ""

  local project_result
  project_result=$(deploy_project "$project_name")
  local project_id env_id
  IFS='|' read -r project_id env_id <<< "$project_result"

  # Step 2: Deploy storages
  echo ""
  echo "--- Step 2: Storages ---"

  deploy_storages "$config" "$project_name" "$project_id"

  # Step 3: Deploy services
  echo ""
  echo "--- Step 3: Services ---"

  deploy_services "$config" "$project_name" "$project_id" "$git_repo"

  # Step 4: Clean up orphans (interactive only)
  detect_and_clean_orphans "$config" "$project_name"

  # Print summary
  print_deployment_summary "$project_id"
}

# =============================================================================
# ENTRY POINT
# =============================================================================

main "$@"
