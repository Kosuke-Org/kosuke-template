#!/bin/bash
# =============================================================================
# Vamos - AI-Driven Development Workflow
# =============================================================================
#
# Orchestrates Claude Code to implement features from requirements:
#   1. MAP      → Generate project structure map
#   2. TICKETS  → Generate implementation tickets
#   3. BUILD    → Implement each ticket (ship → migrate → review → commit)
#   4-5. TESTS  → Skipped (use --with-tests in TypeScript version)
#   6. COMMIT   → Final commit
#
# Usage:
#   ./vamos.sh                           # Run in current directory
#   ./vamos.sh --directory=/path/to/project
#   ./vamos.sh --interactive             # Enable confirmations
#
# Environment:
#   SLACK_WEBHOOK_URL   - Optional, for failure notifications
#
# Prerequisites:
#   - Claude Code CLI must be authenticated (run `claude` first)
#   - Docker must be running (script creates its own PostgreSQL container)
#
# =============================================================================

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR=""
INTERACTIVE=false
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-https://hooks.slack.com/services/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}"

# PostgreSQL container (created at runtime)
POSTGRES_CONTAINER_NAME=""
POSTGRES_PORT=""
POSTGRES_URL=""

# Isolated Claude config directory (prevents ~/.claude/CLAUDE.md loading)
VAMOS_CONFIG_DIR=""

# State files (set after PROJECT_DIR is resolved)
KOSUKE_DIR=""
STATE_FILE=""
TICKETS_FILE=""
MAP_FILE=""
DOCS_FILE=""

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

  # Set state file paths
  KOSUKE_DIR="$PROJECT_DIR/.kosuke"
  STATE_FILE="$KOSUKE_DIR/.vamos-state.json"
  TICKETS_FILE="$KOSUKE_DIR/tickets.json"
  MAP_FILE="$KOSUKE_DIR/map.json"
  DOCS_FILE="$KOSUKE_DIR/docs.md"
}

show_help() {
  cat << 'EOF'
Vamos - AI-Driven Development Workflow

Usage:
  ./vamos.sh [options] [directory]

Options:
  --directory=PATH    Project directory (default: current directory)
  --interactive       Enable confirmation prompts
  --help, -h          Show this help message

Environment Variables:
  SLACK_WEBHOOK_URL   Slack webhook for failure notifications (optional)

Prerequisites:
  - Claude Code CLI must be authenticated (run `claude` first to authenticate)
  - Docker must be running (script creates its own PostgreSQL container)

Examples:
  ./vamos.sh                                    # Run in current directory
  ./vamos.sh /path/to/project                   # Run in specific directory
  ./vamos.sh --directory=/path/to/project       # Same as above
  SLACK_WEBHOOK_URL="..." ./vamos.sh            # With Slack notifications

Running in tmux (recommended):
  tmux new-session -d -s vamos './vamos.sh /path/to/project'
  tmux attach -t vamos
EOF
}

# =============================================================================
# LOGGING
# =============================================================================

log_info() { echo "[$(date '+%H:%M:%S')] ℹ️  $*"; }
log_success() { echo "[$(date '+%H:%M:%S')] ✅ $*"; }
log_warn() { echo "[$(date '+%H:%M:%S')] ⚠️  $*"; }
log_error() { echo "[$(date '+%H:%M:%S')] ❌ $*" >&2; }

log_step() {
  local step="$1"
  echo ""
  echo "================================================================================"
  echo "🔨 $step"
  echo "================================================================================"
  echo ""
}

log_separator() {
  echo ""
  echo "--------------------------------------------------------------------------------"
  echo ""
}

# =============================================================================
# POSTGRESQL CONTAINER MANAGEMENT
# =============================================================================

start_postgres_container() {
  log_info "Starting PostgreSQL container..."

  # Generate unique container name
  POSTGRES_CONTAINER_NAME="vamos-postgres-$$"

  # Find a random available port
  POSTGRES_PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("", 0)); print(s.getsockname()[1]); s.close()')

  # Start PostgreSQL container
  docker run -d \
    --name "$POSTGRES_CONTAINER_NAME" \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=postgres \
    -p "$POSTGRES_PORT:5432" \
    postgres:17 \
    >/dev/null

  # Build connection URL
  POSTGRES_URL="postgresql://postgres:postgres@localhost:$POSTGRES_PORT/postgres"

  # Wait for PostgreSQL to be ready
  log_info "Waiting for PostgreSQL to be ready on port $POSTGRES_PORT..."
  local retries=30
  while ! docker exec "$POSTGRES_CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; do
    retries=$((retries - 1))
    if [[ $retries -le 0 ]]; then
      log_error "PostgreSQL container failed to start"
      stop_postgres_container
      return 1
    fi
    sleep 1
  done

  log_success "PostgreSQL container started (port: $POSTGRES_PORT)"
}

stop_postgres_container() {
  if [[ -n "$POSTGRES_CONTAINER_NAME" ]]; then
    log_info "Stopping PostgreSQL container..."
    docker rm -f "$POSTGRES_CONTAINER_NAME" >/dev/null 2>&1 || true
    log_success "PostgreSQL container stopped"
  fi
}

# =============================================================================
# SLACK NOTIFICATIONS
# =============================================================================

notify_slack() {
  local message="$1"
  local status="${2:-info}"

  [[ -z "$SLACK_WEBHOOK_URL" ]] && return 0

  local emoji="ℹ️"
  [[ "$status" == "success" ]] && emoji="✅"
  [[ "$status" == "failure" ]] && emoji="❌"

  local project_name
  project_name=$(basename "$PROJECT_DIR")

  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"$emoji *Vamos* ($project_name): $message\"}" \
    >/dev/null 2>&1 || true
}

# =============================================================================
# STATE MANAGEMENT
# =============================================================================

load_state() {
  if [[ -f "$STATE_FILE" ]]; then
    cat "$STATE_FILE"
  else
    echo '{"currentStep": 1, "completedSteps": [], "mode": "one-shot"}'
  fi
}

save_state() {
  local state="$1"
  mkdir -p "$KOSUKE_DIR"
  echo "$state" > "$STATE_FILE"
}

get_resume_step() {
  local state
  state=$(load_state)
  local completed_steps
  completed_steps=$(echo "$state" | jq -r '.completedSteps // []')

  # Find the highest completed step
  local max_completed=0
  for step in $(echo "$completed_steps" | jq -r '.[]'); do
    if [[ "$step" -gt "$max_completed" ]]; then
      max_completed="$step"
    fi
  done

  echo $((max_completed + 1))
}

mark_step_completed() {
  local step="$1"
  local state
  state=$(load_state)
  state=$(echo "$state" | jq --argjson s "$step" '.completedSteps = ((.completedSteps // []) + [$s] | unique) | .currentStep = ($s + 1) | .lastUpdatedAt = now | todate')
  save_state "$state"
  log_success "Step $step completed"
}

mark_step_failed() {
  local step="$1"
  local error="${2:-Unknown error}"
  local state
  state=$(load_state)
  state=$(echo "$state" | jq --argjson s "$step" --arg e "$error" '.failedAt = $s | .failedError = $e | .lastUpdatedAt = now | todate')
  save_state "$state"
}

clear_state() {
  rm -f "$STATE_FILE"
}

# =============================================================================
# TICKET MANAGEMENT
# =============================================================================

update_ticket_status() {
  local ticket_id="$1"
  local status="$2"
  local error="${3:-}"

  if [[ -f "$TICKETS_FILE" ]]; then
    local updated
    if [[ -n "$error" ]]; then
      updated=$(jq --arg id "$ticket_id" --arg s "$status" --arg e "$error" \
        '(.tickets[] | select(.id == $id)) |= . + {status: $s, error: $e}' "$TICKETS_FILE")
    else
      updated=$(jq --arg id "$ticket_id" --arg s "$status" \
        '(.tickets[] | select(.id == $id)) |= . + {status: $s}' "$TICKETS_FILE")
    fi
    echo "$updated" > "$TICKETS_FILE"
  fi
}

update_ticket_execution_status() {
  local ticket_id="$1"
  local field="$2"
  local value="$3"

  if [[ -f "$TICKETS_FILE" ]]; then
    local updated
    updated=$(jq --arg id "$ticket_id" --arg f "$field" --arg v "$value" \
      '(.tickets[] | select(.id == $id)) |= . + {($f): $v}' "$TICKETS_FILE")
    echo "$updated" > "$TICKETS_FILE"
  fi
}

get_tickets_to_process() {
  if [[ -f "$TICKETS_FILE" ]]; then
    jq -r '.tickets[] | select(.status == "Todo" or .status == "Error") | .id' "$TICKETS_FILE"
  fi
}

get_ticket_data() {
  local ticket_id="$1"
  if [[ -f "$TICKETS_FILE" ]]; then
    jq -r ".tickets[] | select(.id == \"$ticket_id\")" "$TICKETS_FILE"
  fi
}

# =============================================================================
# GIT OPERATIONS
# =============================================================================

git_has_changes() {
  cd "$PROJECT_DIR"
  ! git diff --quiet HEAD 2>/dev/null || ! git diff --cached --quiet HEAD 2>/dev/null || [[ -n "$(git ls-files --others --exclude-standard)" ]]
}

git_commit_simple() {
  local message="$1"
  cd "$PROJECT_DIR"

  if git_has_changes; then
    git add -A
    if git commit --no-verify -m "$message"; then
      log_success "Committed: $message"
      return 0
    else
      log_warn "Commit failed or nothing to commit"
      return 1
    fi
  else
    log_info "No changes to commit"
    return 0
  fi
}

git_stage_all() {
  cd "$PROJECT_DIR"
  git add -A
}

git_get_diff() {
  cd "$PROJECT_DIR"
  git diff --cached
}

# =============================================================================
# CLAUDE CODE WRAPPER
# =============================================================================

run_claude() {
  local prompt="$1"
  local output_file
  output_file=$(mktemp)

  log_info "Running Claude Code agent..."

  cd "$PROJECT_DIR"

  # Run Claude Code with streaming JSON output
  # CLAUDE_CONFIG_DIR isolates from global ~/.claude/CLAUDE.md while still loading project CLAUDE.md
  if ! CLAUDE_CONFIG_DIR="$VAMOS_CONFIG_DIR" claude --dangerously-skip-permissions \
    --output-format stream-json \
    -p "$prompt" \
    2>&1 | tee "$output_file"; then
    log_error "Claude Code execution failed"
    rm -f "$output_file"
    return 1
  fi

  # Check for errors in output
  if grep -q '"type":"error"' "$output_file" 2>/dev/null; then
    local error_msg
    error_msg=$(grep '"type":"error"' "$output_file" | head -1 | jq -r '.error.message // .message // "Unknown error"' 2>/dev/null || echo "Unknown error")
    log_error "Claude agent error: $error_msg"
    rm -f "$output_file"
    return 1
  fi

  rm -f "$output_file"
  return 0
}

# =============================================================================
# COMMAND: MAP
# =============================================================================

map_command() {
  log_info "Generating project map..."

  if [[ ! -f "$DOCS_FILE" ]]; then
    log_error "Requirements document not found: $DOCS_FILE"
    log_error "Please create .kosuke/docs.md with your project requirements"
    return 1
  fi

  local requirements_content
  requirements_content=$(cat "$DOCS_FILE")

  local prompt
  prompt=$(cat << 'PROMPT_END'
You are an expert software architect mapping project structure from requirements.

## INPUTS:

**Requirements Document:**
PROMPT_END
)
  prompt="$prompt
$requirements_content"
  prompt="$prompt"'

## YOUR TASK:

Discover and document the project'"'"'s complete structure including layouts, navigation routes, API endpoints, database schema, and integrations. **All documentation represents the FINAL STATE after implementation based on requirements.**

### PHASE 1: DISCOVER LAYOUT STRUCTURE (FINAL STATE)

**Step 1: Identify Layout Architecture (FINAL STATE)**
- Check if project uses App Router (app/ directory) or Pages Router (pages/ directory)
- Discover ALL existing layouts:
  - Root layout: app/layout.tsx
  - Group layouts: app/(logged-in)/layout.tsx, app/(logged-out)/layout.tsx
  - Nested layouts: app/(logged-in)/settings/layout.tsx, app/(logged-in)/org/[slug]/layout.tsx
  - Dynamic route layouts: app/(logged-in)/org/[slug]/settings/layout.tsx

**CRITICAL: Only document layouts that should exist in the FINAL STATE based on requirements.**
- If requirements say "remove organization features" → don'"'"'t include org/[slug]/layout.tsx
- If requirements add new features → include new layouts needed
- Be aware of current state but adapt for requirements

**For each layout, document:**
- **path**: Layout file path (e.g., "app/(logged-in)/layout.tsx")
- **type**: "root" | "public" | "protected" | "nested-protected"
- **description**: Purpose and UI elements (navbar, sidebar, breadcrumbs, tabs)
- **authRequired**: true if requires authentication (omit for root/public)
- **wraps**: Which routes/sections use this layout (e.g., "Protected routes (dashboard, tasks)")

### PHASE 2: DISCOVER NAVIGATION ROUTES

**Step 2: Navigation Routes Discovery**
Use codebase_search, grep, and read_file to find:
1. All page routes (app/, src/app/, pages/ directories)
2. Which routes require authentication (protected routes)
3. Which layout wraps each route (determines navbar/sidebar)
4. Directory path for each route'"'"'s page file
5. Core functionalities provided by each route
6. Main UI components used in each route
7. tRPC endpoints/procedures called by each route

**IMPORTANT: Admin Interface Routes**
The template includes an admin interface (typically at /admin/*). Include admin routes in your discovery:
- Admin routes are protected and require admin/superadmin role
- Admin layout typically has its own navigation (separate from user-facing routes)
- Common admin routes: /admin/users, /admin/settings, /admin/dashboard
- Admin functionalities should be kept MINIMAL - only include what'"'"'s in requirements
- Core modules like users and organization management MUST be kept based on what'"'"'s in requirements

**Each route must include:**
- **path**: Route URL (e.g., "/properties", "/properties/[id]")
- **auth**: Authentication requirement (true = protected, false = public)
- **layout**: Next.js layout file path that wraps this route
- **directory**: Page file path in filesystem
- **functionalities**: High-level features array
- **components**: Main page components array
- **endpoints**: tRPC procedures used array

### PHASE 3: DISCOVER tRPC ENDPOINTS

**Step 3: tRPC Endpoints Discovery**
Use codebase_search, grep, and read_file to find:
1. All tRPC router files (server/api/routers/, src/server/api/routers/)
2. Router names and their procedures (queries/mutations)
3. Which routers should exist in the final state (based on requirements)

**Each endpoint must include:**
- **router**: Router name (e.g., "properties", "favorites", "auth")
- **procedure**: Procedure name (e.g., "list", "get", "create", "update", "delete")
- **type**: "query" or "mutation"
- **file**: Relative path to router file

**CRITICAL: Only document the FINAL state** - what should exist after implementation, not what'"'"'s being removed.

### PHASE 4: DISCOVER DATABASE SCHEMA (FINAL STATE)

**Step 4: Discover Database Schema (FINAL STATE)**
Use codebase_search, grep, and read_file to:
1. Find existing schema files (drizzle.schema.ts, schema.prisma, lib/db/schema.ts, etc.)
2. **Document FINAL state** - what should exist after implementation
   - Be aware of current schema but adapt for requirements
   - Add new tables/columns needed by requirements
   - Remove tables/columns not needed in final state

**For each table:**
- **name**: Table name
- **description**: Purpose and key fields
- **relationships**: Array of relationship strings

**For each enum:**
- **name**: Enum name
- **values**: Array of enum values

### PHASE 5: DISCOVER INTEGRATIONS (FINAL STATE)

**Step 5: Discover Integrations (FINAL STATE)**
Use codebase_search, grep, and read_file to:
1. Scan existing code for integrations (imports, config files, env vars)
2. **Document FINAL state** - what should exist after implementation

**Common integration categories:**
- **maps**: OpenStreetMap, Google Maps, Mapbox
- **storage**: Vercel Blob, AWS S3, Cloudinary
- **email**: Resend, SendGrid, Postmark
- **payments**: Stripe, PayPal
- **analytics**: Vercel Analytics, Posthog
- **monitoring**: Sentry, LogRocket

### PHASE 6: GENERATE MAP FILE

**Step 6: Write map.json**

Create '"$MAP_FILE"' with the following structure:

```json
{
  "generatedAt": "2025-12-17T...",
  "requirementsFile": ".kosuke/docs.md",
  "layouts": [
    {
      "path": "app/layout.tsx",
      "type": "root",
      "description": "Root layout wrapping all routes",
      "wraps": "All routes"
    }
  ],
  "navigation": [
    {
      "path": "/",
      "auth": false,
      "layout": "app/(logged-out)/layout.tsx",
      "directory": "app/(logged-out)/page.tsx",
      "functionalities": ["View landing page"],
      "components": ["LandingHero"],
      "endpoints": []
    }
  ],
  "endpoints": [
    {
      "router": "properties",
      "procedure": "list",
      "type": "query",
      "file": "server/api/routers/properties.ts"
    }
  ],
  "databaseSchema": {
    "tables": [],
    "enums": []
  },
  "integrations": {}
}
```

## TO SUMMARIZE:

1. **DISCOVER** layout structure (all layouts including nested ones) - FINAL STATE
2. **EXPLORE** navigation routes using codebase_search, grep, read_file
3. **DISCOVER** tRPC endpoints (routers and procedures)
4. **DISCOVER** database schema (tables, enums, relationships) - FINAL STATE
5. **DISCOVER** integrations (maps, storage, email, etc.) - FINAL STATE
6. **WRITE** map.json with complete structure

**CRITICAL:** All generated fields represent the **FINAL STATE** after implementation based on requirements, not the current state.'

  run_claude "$prompt"

  if [[ ! -f "$MAP_FILE" ]]; then
    log_error "Map file was not created at $MAP_FILE"
    return 1
  fi

  log_success "Project map generated"
}

# =============================================================================
# COMMAND: TICKETS
# =============================================================================

tickets_command() {
  log_info "Generating implementation tickets..."

  if [[ ! -f "$DOCS_FILE" ]]; then
    log_error "Requirements document not found: $DOCS_FILE"
    return 1
  fi

  if [[ ! -f "$MAP_FILE" ]]; then
    log_error "Project map not found: $MAP_FILE"
    log_error "Please run map command first"
    return 1
  fi

  local requirements_content
  requirements_content=$(cat "$DOCS_FILE")

  local map_content
  map_content=$(cat "$MAP_FILE")

  local prompt
  prompt='You are an expert software architect generating implementation tickets from requirements.

## INPUTS:

**Requirements Document:**
'"$requirements_content"'

**Project Map (Navigation & Endpoints):**
The project structure has already been mapped. Use this as reference:

'"$map_content"'

**CRITICAL: Use this pre-discovered structure. Do NOT re-discover navigation or endpoints.**

## TICKET GENERATION WORKFLOW:

### PHASE 1: ARCHITECTURAL DISCOVERY

**Step 1: Detect Authentication Type**
Analyze requirements to determine authentication approach:
- **User-based auth**: Individual user accounts (most common)
- **Organization-based auth**: Multi-tenancy with org context (B2B SaaS)

**Detection criteria:**
- Look for: "organizations", "teams", "workspaces", "tenants", "multi-company"
- If present → Organization-based (keep orgs table, org-scoped queries)
- If absent → User-based (remove orgs table, user-scoped queries)

**Step 2: Detect Billing Requirements**
Analyze requirements for billing/subscription features:
- **No billing**: Remove all billing tables, routers, pages
- **Keep template billing**: Stripe integration exists, no customization needed
- **Adapt billing**: Pricing tiers, feature limits, or consumption-based billing specified

**Detection criteria:**
- Look for: Pricing tiers (Free/Pro/Enterprise), price points, feature limits, billing toggles
- If pricing tiers found → **ADAPT** (schema: update tiers enum + add limits table, backend: limit enforcement, frontend: pricing page)
- If "billing" mentioned but no tiers → **KEEP** (use template as-is)
- If no billing mention → **REMOVE** (delete billing tables/routers/pages)

**Step 3: Detect Navigation Type**
Analyze requirements to determine navigation pattern:
- **Sidebar navigation**: B2B/SaaS, admin dashboards, internal tools, enterprise apps
- **Navbar navigation**: Consumer apps, marketplaces, e-commerce, mobile-first, social platforms

**Step 4: Detect Admin Requirements**
Analyze requirements for admin interface needs:
- **Minimal admin**: Keep users module only (user management almost always needed)
- **Custom admin**: Keep users + add requirements-based features (moderation, analytics, etc.)
- **No admin**: Remove admin entirely (rare)

**Output architectural decisions as comments in Phase 1:**
```
📋 ARCHITECTURAL DECISIONS:
- Authentication: [User-based / Organization-based]
- Billing: [None / Keep template / Adapt: tiers + limits]
- Navigation: [Sidebar / Navbar]
- Admin: [Minimal / Custom: features list]
```

### PHASE 2: TEMPLATE PATTERN MAPPING

**Use repo-inspector-agent to analyze kosuke-template patterns.**

For each requirement, identify reusable template files by calling repo-inspector-agent:
```
Use repo-inspector-agent with query: "Analyze kosuke-template [specific module] implementation"
```

**Template Pattern Reference Library:**

| Requirement Pattern | What to Look For | Reusable Components |
|---------------------|------------------|---------------------|
| **Data tables with CRUD** | Modules with list pages, filters, pagination | Table components, filter logic, pagination, CRUD routers, detail views |
| **Chat interface (RAG)** | AI chat modules with streaming | Chat UI, message streaming, conversation history, AI integration |
| **Authentication** | Auth system implementation | Session management, protected routes, role checks, middleware |
| **Billing/Subscriptions** | Subscription management with Stripe | Billing routers, pricing pages, subscription tables, Stripe integration |
| **Admin panel** | Admin interface for management | Admin layouts, user management, role assignment, admin routers |
| **Forms & validation** | Form handling and validation | Form components, zod schemas, server-side validation patterns |
| **File uploads** | File handling system | Upload components, storage integration (S3/Spaces), file routers |
| **Settings pages** | User/app settings management | Settings layouts, profile management, preferences storage |
| **Dashboard/Analytics** | Dashboard with metrics | Charts, stats cards, data visualization, analytics queries |
| **Organizations/Teams** | Multi-tenancy system | Org tables, org switching, member management, org-scoped queries |

### PHASE 3: GENERATE TICKETS INCREMENTALLY

**CRITICAL: Write tickets ONE BY ONE to avoid output token limits.**

**Ticket Structure (JSON Format):**
- id: string (IMPL-{TYPE}-{NUMBER})
- title: string (clear, concise)
- description: string (detailed with **Template References**, **Keep**, **Remove**, **Add** sections)
- type: "schema" | "backend" | "frontend"
- estimatedEffort: number (1-10)
- status: "Todo"
- category: string (e.g., "auth", "billing", "properties")

**Type Guidelines:**
- **schema**: Database schema changes ONLY (schema.ts + db-seed.ts)
  - ❌ Never: API routes, UI, middleware, indexes
  - ✅ Only: Tables, enums, relationships, seed data
- **backend**: tRPC routers, API routes, middleware, business logic
- **frontend**: Pages, components, layouts, styling

**Ticket Granularity:**
- Schema: EXACTLY ONE ticket (all DB changes)
- Backend: 2-5 tickets (by feature complexity)
- Frontend: 2-5 tickets (by feature complexity)

**Ticket Description Format:**

```
**Template References:**
Check kosuke-template: [specific file paths for repo-inspector-agent to analyze]

**Architectural Decisions (from Phase 1):**
- Auth: [decision]
- Billing: [decision]
- Navigation: [decision]
- Admin: [decision]

**Keep (based on Phase 1 decisions):**
- [Features to preserve]

**Remove (based on Phase 1 decisions):**
- [Features not needed]

**Add:**
- [New features to implement]

**Implementation:**
- [Detailed steps referencing template patterns]

**Acceptance Criteria:**
- [Success conditions]
```

**STEP-BY-STEP PROCESS:**

1. **Initialize tickets file at: '"$TICKETS_FILE"'**
   ```json
   {
     "generatedAt": "2025-12-16T...",
     "totalTickets": 0,
     "tickets": []
   }
   ```

2. **For each ticket:**
   a. Read '"$TICKETS_FILE"'
   b. Add ticket to "tickets" array
   c. Increment "totalTickets"
   d. Write back to '"$TICKETS_FILE"' (2-space indent)
   e. Output: "✅ Created {TICKET_ID}: {TITLE} ({current}/{total})"

3. **Creation order (type-grouped):**
   - IMPL-SCHEMA-1 (if needed)
   - IMPL-BACKEND-1, IMPL-BACKEND-2, ..., IMPL-BACKEND-FINAL
   - IMPL-FRONTEND-1, IMPL-FRONTEND-2, ..., IMPL-FRONTEND-FINAL

4. **Final output:**
   "✅ Successfully created {total} tickets in '"$TICKETS_FILE"'"

## WORKFLOW SUMMARY:

### Phase 1: Architectural Discovery
1. Detect **Authentication Type** (user-based vs org-based)
2. Detect **Billing Requirements** (none / keep / adapt)
3. Detect **Navigation Type** (sidebar vs navbar)
4. Detect **Admin Requirements** (minimal / custom)
5. Output architectural decisions as comments

### Phase 2: Template Pattern Mapping
1. Use **repo-inspector-agent** to analyze kosuke-template patterns
2. Map requirements to template files (see reference library)
3. Identify reusable components and patterns
4. Document template references for each ticket

### Phase 3: Generate Tickets Incrementally
1. **Initialize** tickets file
2. **Generate IMPL-SCHEMA-1** (all DB changes, reference architectural decisions)
3. **Generate IMPL-BACKEND-X** tickets (include template references, architectural decisions)
4. **Generate IMPL-BACKEND-FINAL** (validate endpoints from map.json)
5. **Generate IMPL-FRONTEND-X** tickets (include template references, architectural decisions)
6. **Generate IMPL-FRONTEND-FINAL** (validate routes from map.json)
7. **Save incrementally** after each ticket

### Critical Rules:
- **Template references**: Include specific file paths for repo-inspector-agent
- **Architectural decisions**: Reference Phase 1 decisions in each ticket
- **Type-grouped ordering**: Schema → Backend → Frontend
- **One ticket at a time**: Avoid output token limits
- **Map.json**: Navigation/endpoints are separate, not in tickets.json
- **Keep vs Remove**: Based on Phase 1 architectural decisions, not assumptions'

  run_claude "$prompt"

  if [[ ! -f "$TICKETS_FILE" ]]; then
    log_error "Tickets file was not created at $TICKETS_FILE"
    return 1
  fi

  log_success "Implementation tickets generated"
}

# =============================================================================
# COMMAND: SHIP (Implement a ticket)
# =============================================================================

ship_command() {
  local ticket_id="$1"

  local ticket_data
  ticket_data=$(get_ticket_data "$ticket_id")

  if [[ -z "$ticket_data" ]]; then
    log_error "Ticket not found: $ticket_id"
    return 1
  fi

  local ticket_title
  ticket_title=$(echo "$ticket_data" | jq -r '.title')
  local ticket_description
  ticket_description=$(echo "$ticket_data" | jq -r '.description')
  local ticket_type
  ticket_type=$(echo "$ticket_data" | jq -r '.type')

  log_info "Implementing: $ticket_id - $ticket_title"

  local schema_instructions=""
  if [[ "$ticket_id" == *"SCHEMA"* ]]; then
    schema_instructions='

**Database Schema Changes (CRITICAL FOR SCHEMA TICKETS):**
This is a SCHEMA ticket. After making changes to database schema files:
1. Run `bun run db:generate` to generate Drizzle migrations
2. Verify migration files were created in lib/db/migrations/
3. Ensure schema changes follow Drizzle ORM best practices from project guidelines

⛔ **FORBIDDEN COMMANDS** (will be run automatically in a later phase):
- DO NOT run `db:migrate` or `bun run db:migrate`
- DO NOT run `db:seed` or `bun run db:seed`
- DO NOT run `db:push` or `bun run db:push`
- DO NOT connect to or query the database directly
Only run `db:generate` - the build system handles migrations separately.'
  fi

  local frontend_instructions=""
  if [[ "$ticket_type" == "frontend" ]]; then
    frontend_instructions='

**Frontend UI Design Guidelines (CRITICAL FOR FRONTEND TICKETS):**
This is a FRONTEND ticket. Your goal is to create BEAUTIFUL, POLISHED, PRODUCTION-READY interfaces.
Your UI should be worthy of an Apple Design Award - impeccable attention to detail, elegant simplicity, and delightful interactions.

**1. Design System First (CRITICAL):**
- EXPLORE the design system: `index.css`, `tailwind.config.ts`, `components/ui/`
- NEVER use hardcoded colors like `text-white`, `bg-black`, `bg-blue-500`
- ALWAYS use semantic tokens: `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`
- If you need a custom style, ADD IT to the design system first (index.css/tailwind.config.ts)
- Create or customize shadcn component VARIANTS instead of inline overrides

**2. Spacing & Visual Rhythm (CRITICAL):**
- CONSISTENT spacing throughout - pick a scale and stick to it (e.g., 4, 8, 12, 16, 24, 32, 48)
- Maintain vertical rhythm - equal spacing between similar elements
- Generous whitespace - let content breathe, avoid cramped layouts
- Group related elements with tighter spacing, separate sections with more space
- Padding inside cards/containers should be consistent across the app
- Align elements on a grid - nothing should feel randomly placed

**3. Component Architecture:**
- ALWAYS explore existing components first: `components/ui/`, `components/`, `app/` directories
- Reuse shadcn/ui components - do NOT create custom equivalents
- Extend existing components with NEW VARIANTS when needed
- Check https://ui.shadcn.com/docs/components before building custom UI

**4. Visual Polish & Micro-interactions:**
- Smooth transitions on ALL interactive elements (buttons, links, cards)
- Hover states that provide clear feedback
- Loading states: Skeleton components that match content shape exactly
- Empty states: Clean, centered, helpful messages (NO icons)
- Subtle animations that feel natural, not distracting
- Consistent border radius (use shadcn defaults)
- Proper elevation/shadows for depth hierarchy

**5. Typography Hierarchy:**
- Clear distinction between headings, subheadings, body, and captions
- Consistent font weights: bold for emphasis, regular for body
- Appropriate line heights for readability
- Text colors: primary for main content, muted for secondary information

**6. Mobile-First Responsive Design:**
- Start mobile, enhance for larger screens
- Touch-friendly: minimum 44x44px tap targets
- Responsive breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Stack vertically on mobile, use grids on desktop

**7. Dark/Light Mode Compatibility:**
- MUST work flawlessly in both themes
- Use semantic tokens that adapt automatically
- Test contrast in both modes - no white-on-white or black-on-black

**8. Accessibility (WCAG 2.1 AA):**
- Color contrast: 4.5:1 minimum for text
- Keyboard navigation: all interactive elements focusable
- Focus indicators: visible and consistent
- ARIA labels for icon-only buttons
- Form labels for every input

**9. Professional Patterns:**
- Forms: shadcn Form + react-hook-form + zod
- Tables: DataTable with sorting, filtering, pagination
- Navigation: Next.js Link (never button onClick for routing)
- Dialogs: AlertTriangle for destructive, Trash for delete

Begin by exploring the design system and existing pages. Match the quality bar of the best pages in the app.'
  fi

  local prompt
  prompt='You are an expert software engineer implementing a feature ticket.

**Your Task:**
Implement the following ticket according to the project'"'"'s coding standards and architecture patterns (CLAUDE.md will be loaded automatically).

**Ticket Information:**
- ID: '"$ticket_id"'
- Title: '"$ticket_title"'
- Description:
'"$ticket_description"'

**Implementation Requirements:**
1. Follow ALL project guidelines from CLAUDE.md
2. Explore the current codebase to understand existing patterns and architecture
3. Write clean, well-documented code
4. Ensure TypeScript type safety
5. Add error handling where appropriate
6. Make the implementation production-ready'"$schema_instructions""$frontend_instructions"'

**Critical Instructions:**
- Read relevant files in the current workspace to understand the codebase
- Learn from existing code patterns and conventions
- Implement ALL requirements from the ticket description
- Use search_replace or write tools to create/modify files
- Ensure acceptance criteria are met
- Maintain consistency with the existing codebase style

⛔ **FORBIDDEN COMMANDS** (Quality checks are run automatically in a later phase):
- DO NOT run test commands (test, vitest, jest, etc.)
- DO NOT run lint commands (lint, lint:fix, eslint, etc.)
- DO NOT run typecheck commands (typecheck, tsc --noEmit, etc.)
- DO NOT run format commands (format, format:check, prettier, etc.)
- DO NOT run knip or dependency analysis commands
- DO NOT run check:all or any validation scripts
- DO NOT run any quality check, linting, testing, or validation commands

The build system handles all quality checks automatically. Focus ONLY on implementing the feature.

Begin by exploring the current codebase, then implement the ticket systematically.'

  run_claude "$prompt"

  log_success "Implementation completed for $ticket_id"
}

# =============================================================================
# COMMAND: REVIEW
# =============================================================================

review_command() {
  local ticket_id="$1"
  local ticket_type="$2"

  log_info "Reviewing changes for $ticket_id ($ticket_type)..."

  # Stage changes to get diff
  git_stage_all

  local git_diff
  git_diff=$(git_get_diff)

  if [[ -z "$git_diff" ]]; then
    log_info "No changes to review"
    return 0
  fi

  local ticket_data
  ticket_data=$(get_ticket_data "$ticket_id")
  local ticket_title
  ticket_title=$(echo "$ticket_data" | jq -r '.title')
  local ticket_description
  ticket_description=$(echo "$ticket_data" | jq -r '.description')

  local prompt
  if [[ "$ticket_type" == "frontend" ]]; then
    # Frontend review: Code quality + full UI/UX design review
    prompt='You are a senior code reviewer and UI/UX expert conducting a comprehensive review of frontend changes.

**Your Task:**
Review the git diff below for:
1. Compliance with project coding guidelines (CLAUDE.md will be loaded automatically)
2. UI/UX design quality and consistency

**Ticket Context:**
- ID: '"$ticket_id"'
- Title: '"$ticket_title"'
- Description:
'"$ticket_description"'

**Git Diff to Review:**
```diff
'"$git_diff"'
```

**PART 1: Code Quality Review**

1. **CLAUDE.md Compliance**: Check for guideline violations
2. **Type Safety**: Ensure proper TypeScript usage (no `any` types)
3. **Error Handling**: Ensure proper error handling patterns
4. **Best Practices**: Verify coding patterns and conventions
5. **Security**: Identify potential security issues

**PART 2: UI/UX Design Review (CRITICAL)**

Your goal is to ensure BEAUTIFUL, POLISHED, PRODUCTION-READY interfaces worthy of an Apple Design Award.

**1. Design System (CRITICAL):**
- EXPLORE the design system: `index.css`, `tailwind.config.ts`, `components/ui/`
- NEVER use hardcoded colors like `text-white`, `bg-black`, `bg-blue-500`
- ALWAYS use semantic tokens: `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`
- If custom styles are needed, ADD THEM to the design system first (index.css/tailwind.config.ts)
- Create or customize shadcn component VARIANTS instead of inline overrides

**2. Spacing & Visual Rhythm (CRITICAL):**
- CONSISTENT spacing throughout - pick a scale and stick to it (e.g., 4, 8, 12, 16, 24, 32, 48)
- Maintain vertical rhythm - equal spacing between similar elements
- Generous whitespace - let content breathe, avoid cramped layouts
- Group related elements with tighter spacing, separate sections with more space
- Padding inside cards/containers should be consistent across the app
- Align elements on a grid - nothing should feel randomly placed

**3. Component Architecture:**
- ALWAYS explore existing components first: `components/ui/`, `components/`, `app/` directories
- Reuse shadcn/ui components - do NOT create custom equivalents
- Extend existing components with NEW VARIANTS when needed
- Check shadcn/ui documentation patterns before building custom UI

**4. Visual Polish & Micro-interactions:**
- Smooth transitions on ALL interactive elements (buttons, links, cards)
- Hover states that provide clear feedback
- Loading states: Skeleton components that match content shape exactly
- Empty states: Clean, centered, helpful messages (NO icons)
- Subtle animations that feel natural, not distracting
- Consistent border radius (use shadcn defaults)
- Proper elevation/shadows for depth hierarchy

**5. Typography Hierarchy:**
- Clear distinction between headings, subheadings, body, and captions
- Consistent font weights: bold for emphasis, regular for body
- Appropriate line heights for readability
- Text colors: primary for main content, muted for secondary information

**6. Mobile-First Responsive Design:**
- Start mobile, enhance for larger screens
- Touch-friendly: minimum 44x44px tap targets
- Responsive breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Stack vertically on mobile, use grids on desktop

**7. Dark/Light Mode Compatibility:**
- MUST work flawlessly in both themes
- Use semantic tokens that adapt automatically
- Test contrast in both modes - no white-on-white or black-on-black

**8. Accessibility (WCAG 2.1 AA):**
- Color contrast: 4.5:1 minimum for text
- Keyboard navigation: all interactive elements focusable
- Focus indicators: visible and consistent
- ARIA labels for icon-only buttons
- Form labels for every input

**9. Professional Patterns:**
- Forms: shadcn Form + react-hook-form + zod
- Tables: DataTable with sorting, filtering, pagination
- Navigation: Next.js Link (never button onClick for routing)
- Dialogs: AlertTriangle for destructive, Trash for delete

**Critical Instructions:**
- Focus ONLY on the files and changes shown in the git diff above
- For EACH issue found (code quality OR design), FIX it immediately
- Do not just report issues - FIX them!
- Make minimal necessary changes
- Ensure fixes do not break functionality
- If you need to see more context or explore the design system, use read_file tool

⛔ **FORBIDDEN COMMANDS** (Quality checks are run automatically in a later phase):
- DO NOT run test commands (test, vitest, jest, etc.)
- DO NOT run lint commands (lint, lint:fix, eslint, etc.)
- DO NOT run typecheck commands (typecheck, tsc --noEmit, etc.)
- DO NOT run format commands (format, format:check, prettier, etc.)
- DO NOT run knip or dependency analysis commands
- DO NOT run check:all or any validation scripts

The build system handles all quality checks automatically. Focus ONLY on reviewing and fixing issues.

Review the changes shown in the diff and fix any issues you find.'
  else
    # Backend review: Code quality only
    prompt='You are a senior code reviewer conducting a code quality review of recent changes.

**Your Task:**
Review the git diff below for compliance with the project'"'"'s coding guidelines (CLAUDE.md will be loaded automatically).

**Ticket Context:**
- ID: '"$ticket_id"'
- Title: '"$ticket_title"'
- Description:
'"$ticket_description"'

**Git Diff to Review:**
```diff
'"$git_diff"'
```

**Review Scope:**
1. **Code Quality**: Check for violations of CLAUDE.md guidelines
2. **Type Safety**: Ensure proper TypeScript usage (no `any` types)
3. **Error Handling**: Ensure proper error handling patterns
4. **Best Practices**: Verify coding patterns and conventions
5. **Security**: Identify potential security issues (SQL injection, XSS, etc.)
6. **Performance**: Look for obvious performance issues

**Critical Instructions:**
- Focus ONLY on the files and changes shown in the git diff above
- Review the QUALITY of code that exists, not what'"'"'s missing
- Identify ALL violations of CLAUDE.md rules in the changed code
- For EACH issue found, FIX it immediately using search_replace or write tools
- Do not just report issues - FIX them!
- Make minimal necessary changes
- Ensure fixes do not break functionality
- If you need to see more context from a file, use the read_file tool

⛔ **FORBIDDEN COMMANDS** (Quality checks are run automatically in a later phase):
- DO NOT run test commands (test, vitest, jest, etc.)
- DO NOT run lint commands (lint, lint:fix, eslint, etc.)
- DO NOT run typecheck commands (typecheck, tsc --noEmit, etc.)
- DO NOT run format commands (format, format:check, prettier, etc.)
- DO NOT run knip or dependency analysis commands
- DO NOT run check:all or any validation scripts
- DO NOT run any quality check, linting, testing, or validation commands

The build system handles all quality checks automatically. Focus ONLY on reviewing and fixing code issues.

**What to Look For in the Changes:**
- Use of `any` type (should be avoided)
- Missing error handling
- Inconsistent naming conventions
- Poor code organization
- Missing JSDoc comments on exported functions
- Improper use of dependencies
- Code duplication
- Overly complex functions
- Missing type exports
- Security vulnerabilities

Review the changes shown in the diff and fix any issues you find.'
  fi

  run_claude "$prompt"

  log_success "Review completed for $ticket_id"
}

# =============================================================================
# COMMAND: MIGRATE
# =============================================================================

migrate_command() {
  local context="${1:-}"

  log_info "Running database migrations..."

  if [[ -n "$context" ]]; then
    log_info "Context: $context"
  fi

  local context_section=""
  if [[ -n "$context" ]]; then
    context_section="**Context:** Applying migrations for ticket $context

"
  fi

  local prompt
  prompt=$(cat << PROMPT
You are a database migration specialist. Execute database migrations quickly and directly.

${context_section}**EXECUTE THESE 3 COMMANDS IN ORDER:**

1. **Generate migrations:**
   \`\`\`bash
   POSTGRES_URL="$POSTGRES_URL" bun run db:generate
   \`\`\`
   If this hangs for more than 10 seconds, use: \`POSTGRES_URL="$POSTGRES_URL" drizzle-kit push --force\`

2. **Apply migrations:**
   \`\`\`bash
   POSTGRES_URL="$POSTGRES_URL" bun run db:migrate
   \`\`\`

3. **Seed database:**
   \`\`\`bash
   POSTGRES_URL="$POSTGRES_URL" bun run db:seed
   \`\`\`
   If seed script doesn't exist, skip this step (not an error).

**ERROR HANDLING:**
- If any command fails, read the error message
- If it's a schema/seed mismatch, read the relevant file (schema.ts or seed.ts), fix it, then retry the failed command
- Common fixes: missing required fields, wrong enum values, foreign key issues

**SUCCESS:** All 3 commands complete without errors. Report "MIGRATION COMPLETED SUCCESSFULLY".

⛔ **DO NOT:**
- Run psql commands or query the database directly
- Create temporary validation scripts
- Explore the database structure manually
- Do extensive file reading before running commands

Just run the 3 commands. Fix errors only if they occur.
PROMPT
)

  run_claude "$prompt"

  log_success "Database migrations completed"
}

# =============================================================================
# COMMAND: COMMIT
# =============================================================================

commit_command() {
  local message="$1"
  local context="${2:-}"

  log_info "Committing: $message"

  local context_section=""
  if [[ -n "$context" ]]; then
    context_section="**Project Context:**
$context
"
  fi

  local prompt
  prompt=$(cat << PROMPT
You are a code quality expert specialized in committing changes while maintaining project integrity.

$context_section
**YOUR TASK:**

Stage all changes and commit them with the message: "$message"

If pre-commit hooks fail, fix all the issues and retry the commit until successful.

**IMPORTANT: This process may take a long time for breaking changes (schema changes, feature removals, major refactors). Be patient and methodical - fixing 50+ errors is normal for such changes.**

**STEP 1: STAGE AND COMMIT**

1. Stage all changes: \`git add -A\`
2. Attempt to commit: \`git commit -m "$message"\`
3. **Possible outcomes:**
   - ✅ Commit succeeds → DONE!
   - ✅ "nothing to commit, working tree clean" → DONE! (this is success, not an error)
   - ❌ Pre-commit hooks fail with errors → Continue to STEP 2 to fix

**STEP 2: FIX PRE-COMMIT HOOK FAILURES**

**Analyze the error output from git commit:**
- **Format errors** → Code style, indentation, spacing, trailing commas
- **Lint errors** → Linting violations, unused variables, missing types
- **Type errors** → TypeScript type issues, missing imports/types
- **Test failures** → Failing tests, outdated snapshots
- **Knip errors** → Unused exports, files, and dependencies

**For knip errors specifically:**
- **Unused dependencies** → Add them to \`ignoreDependencies\` in knip.config.ts
- **Unused exports** → Remove or export them properly (DO NOT ignore in knip.config.ts)
- **Unused files** → Remove or import them properly (DO NOT ignore in knip.config.ts)

**For breaking changes (removed tables, deleted features, major refactors):**

When schema tables or features are removed, many files may reference the deleted entities. Handle this CLEANLY:

1. **DELETE unused files completely** - Do NOT rename them to \`.disabled\` or \`.bak\`
   - If a file only exists for a removed feature, DELETE the entire file
   - If a component/hook/route is no longer needed, DELETE it
   - Use \`rm\` or the file deletion tool - clean deletion, not renaming

2. **Remove imports and references** - Update files that import deleted entities
   - Remove import statements for deleted modules
   - Remove router registrations for deleted routers
   - Remove exports for deleted items from barrel files (index.ts)

3. **Clean up systematically** - Work through the dependency chain:
   - Schema → Types → Hooks → Components → Routes → API handlers
   - Delete or update each layer as needed
   - A clean codebase has NO disabled/backup files

4. **For cascading errors** - When one deletion causes many errors:
   - Identify all files that depend on the deleted entity
   - Decide for each: delete entirely OR update to remove the reference
   - Work methodically - this may take many iterations and that's OK

**For each error:**
1. Read the file(s) with errors
2. Determine the root cause of the error
3. Apply fixes using search_replace or write tools
4. Follow project coding guidelines (CLAUDE.md will be loaded automatically)
5. Make minimal, surgical fixes

**After fixes:**
- Stage the fixes: \`git add -A\`
- Retry commit: \`git commit -m "$message"\`
- If still failing, continue fixing and retrying until successful

**CRITICAL RULES:**

⛔ **NEVER** skip pre-commit hooks (don't use --no-verify)
⛔ **NEVER** comment out failing code to hide errors
⛔ **NEVER** disable linting rules to hide errors
⛔ **NEVER** remove tests to make them pass
⛔ **NEVER** run database operations (db:generate, db:migrate, db:push, db:seed)
⛔ **NEVER** run docker commands
⛔ **NEVER** modify configuration files (tsconfig.json, eslint.config.js, prettier.config.js, next.config.js, etc.)
⛔ **NEVER** add exclude patterns to tsconfig.json to hide type errors
⛔ **NEVER** rename files to .disabled, .bak, .old, or similar - DELETE them instead
⛔ **NEVER** use workarounds that leave dead code in the repository

✅ **DO** read error messages from git commit carefully
✅ **DO** fix one category of errors at a time (format → lint → types → tests)
✅ **DO** make minimal, surgical changes to fix specific errors
✅ **DO** follow the project's coding standards
✅ **DO** stage changes after each fix (\`git add -A\`)
✅ **DO** retry commit after fixing issues
✅ **DO** keep retrying until commit succeeds
✅ **DO** DELETE unused files completely (clean codebase)
✅ **DO** be patient with large refactors - 50+ errors is normal for breaking changes

Begin by staging all changes and attempting to commit. If pre-commit hooks fail, fix the issues and retry until successful.
PROMPT
)

  run_claude "$prompt"

  log_success "Commit completed"
}

# =============================================================================
# BUILD TICKETS LOOP
# =============================================================================

build_tickets() {
  local tickets
  tickets=$(get_tickets_to_process)

  if [[ -z "$tickets" ]]; then
    log_info "No tickets to process"
    return 0
  fi

  local ticket_count
  ticket_count=$(echo "$tickets" | wc -l | tr -d ' ')
  log_info "Found $ticket_count ticket(s) to process"

  local backend_checkpoint_done=false
  local ticket_num=0

  for ticket_id in $tickets; do
    ((ticket_num++)) || true

    local ticket_data
    ticket_data=$(get_ticket_data "$ticket_id")
    local ticket_type
    ticket_type=$(echo "$ticket_data" | jq -r '.type')
    local ticket_title
    ticket_title=$(echo "$ticket_data" | jq -r '.title')

    log_separator
    log_info "Processing ticket $ticket_num/$ticket_count: $ticket_id"
    log_info "Title: $ticket_title"
    log_info "Type: $ticket_type"

    # Interactive confirmation
    if [[ "$INTERACTIVE" == "true" ]]; then
      read -rp "Process this ticket? [Y/n] " confirm
      if [[ "$confirm" =~ ^[Nn] ]]; then
        log_warn "Skipped $ticket_id"
        continue
      fi
    fi

    # Backend checkpoint (before first frontend ticket)
    if [[ "$ticket_type" == "frontend" ]] && [[ "$backend_checkpoint_done" == "false" ]]; then
      log_info "Running backend migration checkpoint..."
      migrate_command "BACKEND-CHECKPOINT"
      commit_command "chore: apply migrations before frontend (vamos backend checkpoint)"
      backend_checkpoint_done=true
    fi

    # Update status to InProgress
    update_ticket_status "$ticket_id" "InProgress"

    # 1. Ship (implement)
    if ! ship_command "$ticket_id"; then
      update_ticket_status "$ticket_id" "Error" "Implementation failed"
      log_error "Failed to implement $ticket_id"
      return 1
    fi
    update_ticket_execution_status "$ticket_id" "implementationStatus" "success"

    # 2. Migrate (schema tickets only)
    if [[ "$ticket_type" == "schema" ]]; then
      if ! migrate_command "$ticket_id"; then
        update_ticket_status "$ticket_id" "Error" "Migration failed"
        log_error "Failed to migrate $ticket_id"
        return 1
      fi
      update_ticket_execution_status "$ticket_id" "migrationStatus" "success"
    fi

    # 3. Review (backend/frontend only)
    if [[ "$ticket_type" == "backend" ]] || [[ "$ticket_type" == "frontend" ]]; then
      if ! review_command "$ticket_id" "$ticket_type"; then
        update_ticket_status "$ticket_id" "Error" "Review failed"
        log_error "Failed to review $ticket_id"
        return 1
      fi
      update_ticket_execution_status "$ticket_id" "reviewStatus" "success"
    fi

    # Update status to Done
    update_ticket_status "$ticket_id" "Done"

    # 4. Commit
    local map_context=""
    if [[ -f "$MAP_FILE" ]]; then
      map_context=$(cat "$MAP_FILE")
    fi

    if ! commit_command "feat($ticket_id): $ticket_title" "$map_context"; then
      update_ticket_status "$ticket_id" "Error" "Commit failed"
      log_error "Failed to commit $ticket_id"
      return 1
    fi
    update_ticket_execution_status "$ticket_id" "commitStatus" "success"

    log_success "Completed: $ticket_id"
  done

  log_success "All tickets processed!"
}

# =============================================================================
# ERROR HANDLING
# =============================================================================

on_failure() {
  local exit_code=$?
  local state
  state=$(load_state)
  local current_step
  current_step=$(echo "$state" | jq -r '.currentStep // 1')

  mark_step_failed "$current_step" "Exit code: $exit_code"

  log_error "Vamos workflow failed at step $current_step with exit code $exit_code"
  notify_slack "Workflow FAILED at step $current_step. Check tmux session for details." "failure"

  # Cleanup PostgreSQL container
  stop_postgres_container

  exit $exit_code
}

cleanup() {
  # Called on script exit (normal or error)
  stop_postgres_container

  # Remove isolated Claude config directory
  if [[ -n "$VAMOS_CONFIG_DIR" ]] && [[ -d "$VAMOS_CONFIG_DIR" ]]; then
    rm -rf "$VAMOS_CONFIG_DIR"
  fi
}

# =============================================================================
# MAIN WORKFLOW
# =============================================================================

main() {
  parse_args "$@"

  # Validate project directory
  if [[ ! -d "$PROJECT_DIR" ]]; then
    log_error "Project directory not found: $PROJECT_DIR"
    exit 1
  fi

  # Ensure .kosuke directory exists
  mkdir -p "$KOSUKE_DIR"

  # Create isolated Claude config directory (prevents ~/.claude/CLAUDE.md loading)
  VAMOS_CONFIG_DIR=$(mktemp -d)
  log_info "Using isolated Claude config: $VAMOS_CONFIG_DIR"

  # Install pre-commit hooks
  log_info "Installing pre-commit hooks..."
  cd "$PROJECT_DIR"
  bun run prepare

  # Set up cleanup trap (runs on any exit)
  trap 'cleanup' EXIT

  # Start PostgreSQL container
  start_postgres_container

  local resume_step
  resume_step=$(get_resume_step)

  log_info "Starting Vamos workflow..."
  log_info "Project: $PROJECT_DIR"
  log_info "Resume from step: $resume_step"
  log_info "Interactive: $INTERACTIVE"
  log_info "PostgreSQL URL: $POSTGRES_URL"
  echo ""

  # Set up error trap
  trap 'on_failure' ERR

  # Step 1: Generate project map
  if [[ $resume_step -le 1 ]]; then
    log_step "STEP 1/6: Generating Project Map"
    map_command
    git_commit_simple "chore: generate project map (vamos step 1/6)" || true
    mark_step_completed 1
  else
    log_info "Skipping Step 1 (already completed)"
  fi

  # Step 2: Generate implementation tickets
  if [[ $resume_step -le 2 ]]; then
    log_step "STEP 2/6: Generating Implementation Tickets"
    tickets_command
    git_commit_simple "chore: generate implementation tickets (vamos step 2/6)" || true
    mark_step_completed 2
  else
    log_info "Skipping Step 2 (already completed)"
  fi

  # Step 3: Build implementation tickets
  if [[ $resume_step -le 3 ]]; then
    log_step "STEP 3/6: Building Implementation Tickets"
    build_tickets
    mark_step_completed 3
  else
    log_info "Skipping Step 3 (already completed)"
  fi

  # Steps 4-5: Tests (skipped)
  log_info "Skipping Step 4 (test generation) - tests disabled"
  log_info "Skipping Step 5 (test execution) - tests disabled"

  # Step 6: Final commit
  if [[ $resume_step -le 6 ]]; then
    log_step "STEP 6/6: Final Commit"
    commit_command "chore: vamos workflow complete" || true
    mark_step_completed 6
  else
    log_info "Skipping Step 6 (already completed)"
  fi

  # Success!
  echo ""
  echo "================================================================================"
  log_success "Vamos Workflow Completed Successfully!"
  echo "================================================================================"
  echo ""
  echo "Summary:"
  echo "  1. ✅ Project map generated (.kosuke/map.json)"
  echo "  2. ✅ Implementation tickets generated (.kosuke/tickets.json)"
  echo "  3. ✅ All implementation tickets built and committed"
  echo "  4. ⏭️  Test generation skipped"
  echo "  5. ⏭️  Test execution skipped"
  echo "  6. ✅ Final commit completed"
  echo ""

  notify_slack "Workflow completed successfully!" "success"

  # Cleanup state
  clear_state
}

# =============================================================================
# ENTRY POINT
# =============================================================================

main "$@"
