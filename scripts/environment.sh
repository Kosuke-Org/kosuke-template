#!/bin/bash
# =============================================================================
# Environment - Sync External Integration Environment Variables
# =============================================================================
#
# One-shot analysis to sync kosuke.config.json environment section:
#   - Read .kosuke/docs.md for required external integrations
#   - Read kosuke.config.json for current configuration
#   - Claude analyzes and determines needed environment variables
#   - Update kosuke.config.json with additions/removals
#
# Usage:
#   ./environment.sh                           # Run in current directory
#   ./environment.sh --directory=/path/to/project
#
# Note:
#   - Uses CLAUDE_CONFIG_DIR to isolate from global ~/.claude/CLAUDE.md
#   - Only loads CLAUDE.md from the project directory
#
# =============================================================================

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

PROJECT_DIR=""
ENVIRONMENT_CONFIG_DIR=""

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
Environment - Sync External Integration Environment Variables

Usage:
  ./environment.sh [options] [directory]

Options:
  --directory=PATH    Project directory (default: current directory)
  --help, -h          Show this help message

Prerequisites:
  - .kosuke/docs.md must exist (run requirements.sh first)
  - kosuke.config.json must exist in project root

Examples:
  ./environment.sh                                    # Run in current directory
  ./environment.sh /path/to/project                   # Run in specific directory
  ./environment.sh --directory=/path/to/project       # Same as above

Output:
  Updates kosuke.config.json with required environment variables
EOF
}

# =============================================================================
# LOGGING
# =============================================================================

log_info() { echo "[$(date '+%H:%M:%S')] INFO  $*"; }
log_success() { echo "[$(date '+%H:%M:%S')] OK    $*"; }
log_error() { echo "[$(date '+%H:%M:%S')] ERROR $*" >&2; }

# =============================================================================
# CLEANUP
# =============================================================================

cleanup() {
  # Remove isolated Claude config directory
  if [[ -n "$ENVIRONMENT_CONFIG_DIR" ]] && [[ -d "$ENVIRONMENT_CONFIG_DIR" ]]; then
    rm -rf "$ENVIRONMENT_CONFIG_DIR"
  fi
}

# =============================================================================
# CLAUDE CODE WRAPPER
# =============================================================================

run_claude() {
  local prompt="$1"

  cd "$PROJECT_DIR"

  # Run Claude Code with isolated config (prevents ~/.claude/CLAUDE.md loading)
  CLAUDE_CONFIG_DIR="$ENVIRONMENT_CONFIG_DIR" claude \
    --dangerously-skip-permissions \
    --output-format stream-json \
    -p "$prompt" \
    2>&1 | while IFS= read -r line; do
      # Parse JSON and extract text content for display
      if echo "$line" | jq -e '.type == "assistant" and .message.content' >/dev/null 2>&1; then
        echo "$line" | jq -r '.message.content[] | select(.type == "text") | .text' 2>/dev/null || true
      elif echo "$line" | jq -e '.type == "result"' >/dev/null 2>&1; then
        # Result message - check for errors
        if echo "$line" | jq -e '.is_error == true' >/dev/null 2>&1; then
          log_error "Claude Code execution failed"
          return 1
        fi
      fi
    done

  return 0
}

# =============================================================================
# ENVIRONMENT COMMAND
# =============================================================================

environment_command() {
  local docs_file="$PROJECT_DIR/.kosuke/docs.md"
  local config_file="$PROJECT_DIR/kosuke.config.json"

  # Validate docs.md exists
  if [[ ! -f "$docs_file" ]]; then
    log_error "Requirements document not found: $docs_file"
    log_error "Please run requirements.sh first to generate requirements."
    return 1
  fi

  # Validate kosuke.config.json exists
  if [[ ! -f "$config_file" ]]; then
    log_error "Configuration file not found: $config_file"
    log_error "This file must exist before running the environment command."
    return 1
  fi

  # Validate JSON is valid
  if ! jq empty "$config_file" 2>/dev/null; then
    log_error "Invalid JSON in $config_file"
    return 1
  fi

  log_info "Reading: $docs_file"
  log_info "Reading: $config_file"
  echo ""

  local docs_content
  docs_content=$(cat "$docs_file")

  local config_content
  config_content=$(cat "$config_file")

  local prompt
  prompt='You are an expert at analyzing product requirements and determining required environment variables for external integrations.

**YOUR TASK:** Analyze the docs.md requirements and the current kosuke.config.json to determine what external integration environment variables need to be added, removed, or modified.

**IMPORTANT DISTINCTIONS:**

1. **Internal Services (DO NOT ADD TO ENVIRONMENT):**
   - Services defined in the "services" section (e.g., nextjs, express)
   - Storages defined in the "storages" section (e.g., postgres, redis)
   - These have their connection variables auto-injected by the system
   - Example: POSTGRES_URL, REDIS_URL are NOT in environment section

2. **External Integrations (ADD TO ENVIRONMENT):**
   - Third-party services requiring API keys (Stripe, Resend, Twilio, etc.)
   - OAuth providers (Google, GitHub, etc.)
   - External APIs (OpenAI, SendGrid, etc.)
   - These MUST be in the environment section

**COMMON EXTERNAL INTEGRATIONS AND THEIR VARIABLES:**

- **Stripe (payments):** STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_SUCCESS_URL, STRIPE_CANCEL_URL, and any STRIPE_*_PRICE_ID variables
- **Resend (email):** RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME, RESEND_REPLY_TO
- **SendGrid (email):** SENDGRID_API_KEY, SENDGRID_FROM_EMAIL
- **Twilio (SMS):** TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
- **OpenAI:** OPENAI_API_KEY
- **Google OAuth:** GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- **GitHub OAuth:** GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
- **Auth/Security:** BETTER_AUTH_SECRET, JWT_SECRET, SESSION_SECRET
- **AWS S3:** AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME, AWS_REGION
- **Cloudinary:** CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

**YOUR WORKFLOW:**

1. Read the docs.md content to identify all external integrations mentioned
2. Read the current kosuke.config.json to see existing environment variables
3. Determine what variables need to be:
   - ADDED: New integrations mentioned in docs.md that do not have variables
   - REMOVED: Variables for integrations no longer mentioned in docs.md
   - MODIFIED: Existing variables that do not match the actual product structure in docs.md (remove old + add correct ones)
4. Update the kosuke.config.json file with the changes

**CRITICAL: MATCHING VARIABLES TO DOCS.MD REQUIREMENTS**

The default kosuke.config.json may contain placeholder variables that do not match your actual product structure. You MUST analyze docs.md and adjust variable names accordingly.

**Example - Stripe Price IDs:**
- Default config has: STRIPE_PRO_PRICE_ID, STRIPE_BUSINESS_PRICE_ID
- But docs.md describes plans: "Starter ($9/mo), Growth ($29/mo), Enterprise ($99/mo)"
- You should:
  - REMOVE: STRIPE_PRO_PRICE_ID (reason: "Replaced with plan names from docs.md")
  - REMOVE: STRIPE_BUSINESS_PRICE_ID (reason: "Replaced with plan names from docs.md")
  - ADD: STRIPE_STARTER_PRICE_ID (reason: "Starter plan defined in docs.md")
  - ADD: STRIPE_GROWTH_PRICE_ID (reason: "Growth plan defined in docs.md")
  - ADD: STRIPE_ENTERPRISE_PRICE_ID (reason: "Enterprise plan defined in docs.md")

**How to infer correct variable names:**
- Look for pricing tiers, plan names, or product levels mentioned in docs.md
- Use the EXACT names from docs.md (e.g., "Growth" -> STRIPE_GROWTH_PRICE_ID)
- Convert to UPPER_SNAKE_CASE for variable names
- Maintain consistent naming patterns (e.g., STRIPE_{PLAN}_PRICE_ID)

**RULES:**
- New variables should have empty string values: "NEW_VAR": ""
- NEVER modify the services or storages sections
- NEVER add variables for internal services (postgres, redis connection strings)
- ALWAYS preserve existing variable values (only change keys, not values)
- Be thorough - ensure variable names match the actual product structure in docs.md

## .kosuke/docs.md

'"$docs_content"'

## kosuke.config.json

'"$config_content"'

Analyze the requirements, determine what external integration environment variables need to be added or removed, and update the kosuke.config.json file. Print a summary of changes made.'

  run_claude "$prompt"

  log_success "Environment sync completed"
}

# =============================================================================
# MAIN
# =============================================================================

main() {
  parse_args "$@"

  # Validate project directory
  if [[ ! -d "$PROJECT_DIR" ]]; then
    log_error "Project directory not found: $PROJECT_DIR"
    exit 1
  fi

  # Create isolated Claude config directory (prevents ~/.claude/CLAUDE.md loading)
  ENVIRONMENT_CONFIG_DIR=$(mktemp -d)

  # Set up cleanup trap
  trap 'cleanup' EXIT

  echo ""
  echo "================================================================================"
  echo "  Environment - Sync External Integration Environment Variables"
  echo "================================================================================"
  echo ""
  log_info "Project: $PROJECT_DIR"
  log_info "Using isolated Claude config: $ENVIRONMENT_CONFIG_DIR"
  echo ""

  environment_command
}

# =============================================================================
# ENTRY POINT
# =============================================================================

main "$@"
