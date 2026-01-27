#!/bin/bash
# =============================================================================
# Deploy - Render.com Deployment Helper
# =============================================================================
#
# Deploys kosuke-template-based projects to Render.com:
#   - Creates/updates Render project
#   - Deploys storages (PostgreSQL, Redis)
#   - Deploys services (web, worker)
#
# Usage:
#   ./deploy.sh                           # Interactive deployment
#   ./deploy.sh --help                    # Show help
#
# Environment Variables:
#   RENDER_API_KEY      - Render.com API key (required)
#   RENDER_OWNER_ID     - Render.com owner/team ID (required)
#
# Prerequisites:
#   - curl, jq, git must be installed
#
# =============================================================================

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

RENDER_API_BASE="https://api.render.com/v1"
PROJECT_DIR=""

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
      --help|-h)
        show_help
        exit 0
        ;;
      *)
        if [[ -z "$PROJECT_DIR" ]]; then
          PROJECT_DIR="$1"
        fi
        shift
        ;;
    esac
  done

  PROJECT_DIR="${PROJECT_DIR:-.}"
  PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
}

show_help() {
  cat << 'EOF'
Deploy - Render.com Deployment Helper

Usage:
  ./deploy.sh [options] [directory]

Options:
  --directory=PATH    Project directory (default: current directory)
  --help, -h          Show this help message

Environment Variables (required):
  RENDER_API_KEY      Render.com API key
  RENDER_OWNER_ID     Render.com owner/team ID

Prerequisites:
  - curl, jq, git must be installed

Examples:
  ./deploy.sh                                    # Deploy in current directory
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

    for state in $success_states; do
      if [[ "$status" == "$state" ]]; then
        log_info "   Status: $status"
        return 0
      fi
    done

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
  local plan="${2:-basic_256mb}"

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
  local plan="${2:-starter}"
  local maxmemory_policy="${3:-noeviction}"

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
  local build_command="$5"
  local start_command="$6"
  local env_vars_json="$7"

  log_info "Creating $name service..."

  local render_type
  if [[ "$type" == "web" ]]; then
    render_type="web_service"
  else
    render_type="background_worker"
  fi

  local env_vars_array="[]"
  if [[ -n "$env_vars_json" ]] && [[ "$env_vars_json" != "{}" ]]; then
    env_vars_array=$(echo "$env_vars_json" | jq '[to_entries[] | {key: .key, value: .value, isSecret: false}]')
  fi

  local service_details
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

  local data
  data=$(jq -n \
    --arg type "$render_type" \
    --arg name "$name" \
    --arg ownerId "$RENDER_OWNER_ID" \
    --arg repo "https://$git_repo" \
    --argjson serviceDetails "$service_details" \
    --argjson envVars "$env_vars_array" \
    '{type: $type, name: $name, ownerId: $ownerId, repo: $repo, branch: "main", serviceDetails: $serviceDetails, envVars: $envVars}')

  local response
  response=$(render_api_post "/services" "$data") || return 1

  local service_id deploy_id url
  service_id=$(echo "$response" | jq -r '.service.id')
  deploy_id=$(echo "$response" | jq -r '.deployId')
  url=$(echo "$response" | jq -r ".service.serviceDetails.url // \"https://${name}.onrender.com\"")

  log_success "$name created"
  echo "$service_id|$deploy_id|$url"
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
# INTERACTIVE PROMPTS
# =============================================================================

prompt_yes_no() {
  local message="$1"
  local default="${2:-y}"

  if [[ "$default" == "y" ]]; then
    read -rp "$message [Y/n] " response
    [[ -z "$response" || "$response" =~ ^[Yy] ]]
  else
    read -rp "$message [y/N] " response
    [[ "$response" =~ ^[Yy] ]]
  fi
}

prompt_input() {
  local message="$1"
  local default="${2:-}"

  if [[ -n "$default" ]]; then
    read -rp "$message [$default]: " response
    echo "${response:-$default}"
  else
    read -rp "$message: " response
    echo "$response"
  fi
}

prompt_select() {
  local message="$1"
  shift
  local options=("$@")

  echo "$message"
  for i in "${!options[@]}"; do
    echo "  $((i+1))) ${options[$i]}"
  done

  local selection
  read -rp "Select option: " selection

  if [[ "$selection" =~ ^[0-9]+$ ]] && [[ "$selection" -ge 1 ]] && [[ "$selection" -le "${#options[@]}" ]]; then
    echo "${options[$((selection-1))]}"
  else
    echo "${options[0]}"
  fi
}

# =============================================================================
# DEPLOYMENT ORCHESTRATION
# =============================================================================

declare -A DEPLOYED_STORAGES
declare -A DEPLOYED_STORAGE_CONNECTIONS
declare -A DEPLOYED_SERVICES

deploy_project() {
  local project_name="$1"

  local existing
  if existing=$(project_check "$project_name"); then
    local project_id env_id
    IFS='|' read -r project_id env_id <<< "$existing"
    log_success "Project already exists: $project_id"
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
    DEPLOYED_STORAGES["postgres"]="$existing_id"
    DEPLOYED_STORAGE_CONNECTIONS["postgres"]="$conn_str"
    return 0
  fi

  local db_id
  db_id=$(database_create "$name" "$plan")

  local env_id
  env_id=$(project_get_environment "$project_id")
  if [[ -n "$env_id" ]]; then
    environment_attach_resources "$env_id" "[\"$db_id\"]"
  fi

  database_wait_for_availability "$db_id"

  local conn_str
  conn_str=$(database_get_connection_string "$db_id")

  DEPLOYED_STORAGES["postgres"]="$db_id"
  DEPLOYED_STORAGE_CONNECTIONS["postgres"]="$conn_str"
}

deploy_redis() {
  local name="$1"
  local plan="$2"
  local project_id="$3"

  local existing_id
  if existing_id=$(redis_check "$name"); then
    log_success "Redis already exists: $existing_id"
    local conn_str
    conn_str=$(redis_get_connection_string "$existing_id")
    DEPLOYED_STORAGES["redis"]="$existing_id"
    DEPLOYED_STORAGE_CONNECTIONS["redis"]="$conn_str"
    return 0
  fi

  local redis_id
  redis_id=$(redis_create "$name" "$plan")

  local env_id
  env_id=$(project_get_environment "$project_id")
  if [[ -n "$env_id" ]]; then
    environment_attach_resources "$env_id" "[\"$redis_id\"]"
  fi

  redis_wait_for_availability "$redis_id"

  local conn_str
  conn_str=$(redis_get_connection_string "$redis_id")

  DEPLOYED_STORAGES["redis"]="$redis_id"
  DEPLOYED_STORAGE_CONNECTIONS["redis"]="$conn_str"
}

deploy_web_service() {
  local name="$1"
  local plan="$2"
  local git_repo="$3"
  local project_id="$4"
  local env_vars="$5"

  local existing
  if existing=$(service_check "$name"); then
    local service_id url
    IFS='|' read -r service_id url <<< "$existing"
    log_success "Web service already exists: $service_id"
    DEPLOYED_SERVICES["web"]="$service_id|$url|web"
    return 0
  fi

  local result
  result=$(service_create "$name" "web" "$plan" "$git_repo" "bun install && bun run build" "bun run start" "$env_vars")

  local service_id deploy_id url
  IFS='|' read -r service_id deploy_id url <<< "$result"

  local env_id
  env_id=$(project_get_environment "$project_id")
  if [[ -n "$env_id" ]]; then
    environment_attach_resources "$env_id" "[\"$service_id\"]"
  fi

  service_wait_for_deployment "$service_id" "$deploy_id"

  DEPLOYED_SERVICES["web"]="$service_id|$url|web"
}

deploy_worker_service() {
  local name="$1"
  local plan="$2"
  local git_repo="$3"
  local project_id="$4"
  local env_vars="$5"

  local existing
  if existing=$(service_check "$name"); then
    local service_id url
    IFS='|' read -r service_id url <<< "$existing"
    log_success "Worker service already exists: $service_id"
    DEPLOYED_SERVICES["worker"]="$service_id|$url|worker"
    return 0
  fi

  local result
  result=$(service_create "$name" "worker" "$plan" "$git_repo" "bun install" "bun run workers:start" "$env_vars")

  local service_id deploy_id url
  IFS='|' read -r service_id deploy_id url <<< "$result"

  local env_id
  env_id=$(project_get_environment "$project_id")
  if [[ -n "$env_id" ]]; then
    environment_attach_resources "$env_id" "[\"$service_id\"]"
  fi

  service_wait_for_deployment "$service_id" "$deploy_id"

  DEPLOYED_SERVICES["worker"]="$service_id|$url|worker"
}

build_env_vars() {
  local app_url="$1"

  local env_vars='{}'
  env_vars=$(echo "$env_vars" | jq '. + {NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1"}')

  if [[ -n "${DEPLOYED_STORAGE_CONNECTIONS[postgres]:-}" ]]; then
    env_vars=$(echo "$env_vars" | jq --arg val "${DEPLOYED_STORAGE_CONNECTIONS[postgres]}" '. + {POSTGRES_URL: $val}')
  fi

  if [[ -n "${DEPLOYED_STORAGE_CONNECTIONS[redis]:-}" ]]; then
    env_vars=$(echo "$env_vars" | jq --arg val "${DEPLOYED_STORAGE_CONNECTIONS[redis]}" '. + {REDIS_URL: $val}')
  fi

  if [[ -n "$app_url" ]]; then
    env_vars=$(echo "$env_vars" | jq --arg val "$app_url" '. + {NEXT_PUBLIC_APP_URL: $val}')
  fi

  echo "$env_vars"
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

  echo "Next steps:"
  echo "   1. Add environment variables in Render dashboard"
  echo "   2. Run database migrations"
  echo "   3. Seed the database if needed"
  echo ""
}

# =============================================================================
# MAIN
# =============================================================================

main() {
  parse_args "$@"

  echo ""
  echo "================================================================================"
  echo "  Deploy - Render.com Deployment Helper"
  echo "================================================================================"
  echo ""

  validate_dependencies
  validate_required_env_vars

  if [[ ! -d "$PROJECT_DIR" ]]; then
    log_error "Project directory not found: $PROJECT_DIR"
    exit 1
  fi

  local git_repo
  git_repo=$(get_git_repo_info)
  local project_name
  project_name=$(echo "$git_repo" | cut -d'/' -f2)

  log_info "Git repository: $git_repo"
  log_info "Project name: $project_name"
  echo ""

  # Interactive configuration
  echo "Configuration:"
  echo ""

  local deploy_postgres_flag
  if prompt_yes_no "Deploy PostgreSQL database?"; then
    deploy_postgres_flag=true
    local postgres_plan
    postgres_plan=$(prompt_select "Select PostgreSQL plan:" "basic_256mb" "basic_1gb" "basic_4gb" "pro_4gb")
  else
    deploy_postgres_flag=false
  fi

  local deploy_redis_flag
  if prompt_yes_no "Deploy Redis cache?"; then
    deploy_redis_flag=true
    local redis_plan
    redis_plan=$(prompt_select "Select Redis plan:" "starter" "standard" "pro")
  else
    deploy_redis_flag=false
  fi

  local deploy_web_flag
  if prompt_yes_no "Deploy web service?"; then
    deploy_web_flag=true
    local web_plan
    web_plan=$(prompt_select "Select web service plan:" "starter" "standard" "pro")
  else
    deploy_web_flag=false
  fi

  local deploy_worker_flag
  if prompt_yes_no "Deploy worker service?"; then
    deploy_worker_flag=true
    local worker_plan
    worker_plan=$(prompt_select "Select worker service plan:" "starter" "standard" "pro")
  else
    deploy_worker_flag=false
  fi

  echo ""
  if ! prompt_yes_no "Proceed with deployment?"; then
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
  echo ""

  if [[ "$deploy_postgres_flag" == "true" ]]; then
    deploy_postgres "postgres-${project_name}" "${postgres_plan:-basic_256mb}" "$project_id"
  fi

  if [[ "$deploy_redis_flag" == "true" ]]; then
    deploy_redis "redis-${project_name}" "${redis_plan:-starter}" "$project_id"
  fi

  # Step 3: Deploy services
  echo ""
  echo "--- Step 3: Services ---"
  echo ""

  local app_url="https://app-${project_name}.onrender.com"
  local env_vars
  env_vars=$(build_env_vars "$app_url")

  if [[ "$deploy_web_flag" == "true" ]]; then
    deploy_web_service "app-${project_name}" "${web_plan:-starter}" "$git_repo" "$project_id" "$env_vars"
  fi

  if [[ "$deploy_worker_flag" == "true" ]]; then
    deploy_worker_service "worker-${project_name}" "${worker_plan:-starter}" "$git_repo" "$project_id" "$env_vars"
  fi

  # Print summary
  print_deployment_summary "$project_id"
}

# =============================================================================
# ENTRY POINT
# =============================================================================

main "$@"
