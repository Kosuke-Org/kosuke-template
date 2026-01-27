#!/bin/bash
# =============================================================================
# Requirements - AI-Driven Requirements Gathering
# =============================================================================
#
# Interactive requirements gathering using Claude Code:
#   - User describes their product idea
#   - Claude analyzes and extracts functionalities
#   - Claude asks clarification questions
#   - User answers questions (iteratively)
#   - Generates .kosuke/docs.md with complete requirements
#
# Usage:
#   ./requirements.sh                           # Run in current directory
#   ./requirements.sh --directory=/path/to/project
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
Requirements - AI-Driven Requirements Gathering

Usage:
  ./requirements.sh [options] [directory]

Options:
  --directory=PATH    Project directory (default: current directory)
  --help, -h          Show this help message

Examples:
  ./requirements.sh                                    # Run in current directory
  ./requirements.sh /path/to/project                   # Run in specific directory
  ./requirements.sh --directory=/path/to/project       # Same as above

Output:
  Creates .kosuke/docs.md with comprehensive product requirements
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
  # Placeholder for future cleanup tasks
  :
}

# =============================================================================
# CLAUDE CODE WRAPPER
# =============================================================================

run_claude() {
  local prompt="$1"

  cd "$PROJECT_DIR"

  # Run Claude Code (uses isolated config set up in setup_isolated_claude_config)
  claude \
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
# REQUIREMENTS COMMAND
# =============================================================================

requirements_command() {
  local kosuke_dir="$PROJECT_DIR/.kosuke"
  local docs_file="$kosuke_dir/docs.md"

  # Ensure .kosuke directory exists
  mkdir -p "$kosuke_dir"

  local prompt
  prompt='You are an expert product requirements analyst specializing in modern web applications.

**IMPORTANT - NON-WEB APPLICATION CHECK:**
Before proceeding with any analysis, first determine if the user is describing a web application or something else (mobile app, desktop app, CLI tool, IoT device, game, etc.).

If the user is trying to build something that is NOT a web application (such as a mobile app, desktop app, native app, CLI tool, embedded system, game, VR/AR app, smart TV app, watch app, or any other non-web platform), you MUST immediately respond with ONLY this message and nothing else:

"The app you want to build is not supported by our system yet. Join the waitlist at https://kosuke.ai. We will notify you when we will release support for products that are not web applications."

Do NOT ask clarifying questions, do NOT offer alternatives, do NOT suggest building a web version instead. Just return that exact message and stop.

**RECOMMENDED TECH STACK:**
When building web applications, use these proven technologies:
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Shadcn UI
- **Authentication**: BetterAuth (user management, auth, sessions)
- **Database**: PostgreSQL with Drizzle ORM
- **Payment Processing**: Stripe APIs (when payments are needed)
- **Email Service**: Resend APIs (when transactional emails are needed)
- **AI/LLM**: Google AI APIs (when AI features are needed)

**INTEGRATION GUIDELINES:**
- Use Stripe for payment processing when the product needs to handle payments
- Use Resend for transactional emails when the product needs to send emails/notifications
- Use Google AI APIs when the product needs AI/LLM capabilities
- ONLY include integrations that the product ACTUALLY NEEDS - do not assume all products need all integrations
- For integrations not covered by the standard recommendations (e.g., maps, SMS, video calls), research options and present 2-3 choices
- NEVER list database as an integration - database (PostgreSQL/Drizzle) is internal infrastructure, not an external third-party integration

**YOUR PRIMARY OBJECTIVE:** Create a comprehensive `docs.md` file that the user will review before implementation begins. This document must contain ALL requirements needed for developers to build the product.

**Your Workflow:**

1. **Initial Analysis (First User Request)**: When a user describes a product idea, analyze it carefully and present your understanding in this format:

---
## Product Description
[Brief description of what will be built - the core concept and purpose]

## Core Functionalities
- [Functionality 1]
- [Functionality 2]
- [Functionality 3]
...

## Integrations
Only list EXTERNAL third-party integrations that are ACTUALLY NEEDED for the product to function.
DO NOT include database - it is internal infrastructure, not an integration.
- **Payment Processing**: Stripe APIs (only if product needs payments)
- **Email Service**: Resend APIs (only if product needs email notifications/alerts)
- **AI Features**: Google AI APIs (only if product needs AI/LLM capabilities)
- **[Additional Service Type]**: [Options to research] (for services not covered above, e.g., maps, SMS, video)

## Interface & Design
List all pages/screens with their components and interactions:

### [Page Name]
- **Route:** [URL path, e.g., "/dashboard", "/settings"]
- **Components:** [List of UI components on this page]
- **User Interactions:** [Key actions users can perform]
- **Data Displayed:** [What data is shown on this page]

## Clarification Questions & MVP Recommendations

### Feature Questions
For each feature clarification needed, provide BOTH a question AND a recommended approach for MVP:

1. **[Question topic]**
   - Question: [Specific question]
   - MVP Recommendation: [Simple, practical approach that reduces scope]

2. **[Question topic]**
   - Question: [Specific question]
   - MVP Recommendation: [Simple, practical approach that reduces scope]

...

### Integration Questions (for additional services)
ONLY ask about integrations that are not covered by the recommended stack (Stripe, Resend, Google AI). For example:
- Maps service (if location/mapping features needed)
- SMS service (if text message notifications needed)
- Video service (if video calls/streaming needed)
- Social media APIs (if social login/sharing needed)
- Domain-specific third-party APIs (industry-specific data services)

**Quick Response Option:** The user can reply "go for recommendations" or "use recommendations" to accept all MVP recommendations at once.
---

2. **Iterative Refinement**: As the user answers questions:
   - If user says "go for recommendations" or "use recommendations", immediately accept ALL MVP recommendations and proceed to creating docs.md
   - If user provides specific answers, acknowledge them and update your understanding
   - Ask follow-up questions ONLY for remaining ambiguities
   - Always prioritize simplicity and MVP scope
   - Continue the conversation until EVERYTHING is crystal clear

3. **Final Deliverable - docs.md**: Once ALL questions are answered and requirements are 100% clear, create the docs.md file at '"$docs_file"'.

**docs.md MUST contain these sections in this exact order:**
   - **Product Description** - High-level description of what will be built, the core concept and purpose
   - **Core Functionalities** - Detailed feature descriptions (what the product should do)
   - **Interface & Design** - List of ALL pages/screens with their components, user interactions, and data displayed
   - **Integrations** - ONLY list EXTERNAL third-party integrations that are actually needed for this specific product. Use Stripe (if payments needed), Resend (if emails needed), Google AI (if AI features needed). Add external integrations only if required (maps, SMS, video, social media, domain-specific APIs, etc.). NEVER include database in integrations - database is internal infrastructure, not an external integration.

**Critical Rules:**
- NEVER start implementation - you only gather requirements
- NEVER create docs.md until ALL clarification questions are answered (or user accepts recommendations)
- ALWAYS provide both questions AND MVP recommendations for each clarification point
- MVP recommendations should simplify scope, reduce complexity, and focus on core features
- If user says "go for recommendations" or similar, immediately accept ALL recommendations and create docs.md
- ALWAYS list all pages with their components and interactions
- Focus on WHAT the product should do, not HOW to code it
- Be conversational and help the user think through edge cases
- Bias towards simplicity - this is an MVP, not a full-featured product
- The docs.md file is your SUCCESS CRITERIA - make it comprehensive and clear
- NEVER include technical implementation details (database schemas, API endpoints, code architecture, tech stack specifics) in docs.md
- Keep docs.md focused on user-facing features, functionality, and interface design only
- Use the recommended integrations (Stripe, Resend, Google AI) when the product needs those capabilities - no need to ask about alternatives
- ONLY ask about additional integrations when the product needs services not covered by the recommended stack (maps, SMS, video, etc.)
- NEVER ask about native mobile apps or "mobile responsiveness vs native apps" - we ONLY build responsive web applications. Mobile responsiveness is assumed and not a question to ask

**Success = User reviews docs.md and says "Yes, this is exactly what I want to build"**

Now, ask the user to describe their product idea.'

  run_claude "$prompt"

  # Check if docs.md was created
  if [[ -f "$docs_file" ]]; then
    log_success "Requirements document created: $docs_file"
  else
    log_info "Requirements gathering session ended"
    log_info "Run again to continue or start fresh"
  fi
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

  # Set up cleanup trap
  trap 'cleanup' EXIT

  echo ""
  echo "================================================================================"
  echo "  Requirements - AI-Driven Requirements Gathering"
  echo "================================================================================"
  echo ""
  log_info "Project: $PROJECT_DIR"
  echo ""

  requirements_command

  echo ""
  log_success "Requirements session completed"
  echo ""
}

# =============================================================================
# ENTRY POINT
# =============================================================================

main "$@"
