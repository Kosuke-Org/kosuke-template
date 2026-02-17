#!/bin/bash
# =============================================================================
# Test - AI-Driven Web Testing with Claude Code Chrome Integration
# =============================================================================
#
# Uses Claude Code's Chrome integration to perform browser-based testing:
#   - Navigate and interact with the web application
#   - Verify UI components and user flows
#   - Check console for errors
#   - Test form submissions and validations
#   - Record test sessions as GIFs (optional)
#
# Usage:
#   ./test.sh                              # Test app at localhost:3000
#   ./test.sh --url=http://localhost:3001  # Test app at custom URL
#   ./test.sh --record                     # Record test session as GIF
#   ./test.sh --directory=/path/to/project # Use project's docs for context
#
# Prerequisites:
#   - Claude Code CLI (v2.0.73+) must be installed and authenticated
#   - Google Chrome browser must be installed and running
#   - Claude in Chrome extension (v1.0.36+) must be installed
#   - Paid Claude plan (Pro, Team, or Enterprise)
#
# =============================================================================

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

PROJECT_DIR=""
APP_URL="http://localhost:3000"
RECORD_GIF=false

# PID of background Claude pipeline (for Ctrl+C kill)
CLAUDE_PIPE_PID=""

# State files (set after PROJECT_DIR is resolved)
KOSUKE_DIR=""
DOCS_FILE=""
MAP_FILE=""
TEST_RESULTS_FILE=""

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
      --url=*)
        APP_URL="${1#*=}"
        shift
        ;;
      --url)
        APP_URL="$2"
        shift 2
        ;;
      --record)
        RECORD_GIF=true
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
  DOCS_FILE="$KOSUKE_DIR/docs.md"
  MAP_FILE="$KOSUKE_DIR/map.json"
  TEST_RESULTS_FILE="$KOSUKE_DIR/test-results.md"
}

show_help() {
  cat << 'EOF'
Test - AI-Driven Web Testing with Claude Code Chrome Integration

Usage:
  ./test.sh [options] [directory]

Options:
  --directory=PATH    Project directory (default: current directory)
  --url=URL           Application URL to test (default: http://localhost:3000)
  --record            Record test session as GIF
  --help, -h          Show this help message

Prerequisites:
  - Claude Code CLI (v2.0.73+): Run `claude --version` to check
  - Google Chrome browser must be running
  - Claude in Chrome extension (v1.0.36+) must be installed
  - Paid Claude plan (Pro, Team, or Enterprise)

Examples:
  ./test.sh                                    # Test localhost:3000
  ./test.sh --url=http://localhost:3001        # Test custom URL
  ./test.sh --record                           # Record session as GIF
  ./test.sh --directory=/path/to/project       # Use project context

Test Flow:
  1. Reads requirements from .kosuke/docs.md (if available)
  2. Reads navigation routes from .kosuke/map.json (if available)
  3. Opens Chrome and navigates to the application
  4. Tests each page/route defined in the requirements
  5. Verifies UI components, forms, and user interactions
  6. Checks browser console for errors
  7. Generates test report in .kosuke/test-results.md

Note:
  The application must be running before executing this script.
  Start your dev server with: bun run dev (or npm run dev)
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
  echo "🧪 $step"
  echo "================================================================================"
  echo ""
}

# =============================================================================
# TIMING HELPERS
# =============================================================================

timer_start() {
  date +%s
}

timer_elapsed() {
  local start_time="$1"
  local end_time
  end_time=$(date +%s)
  local elapsed=$((end_time - start_time))
  local minutes=$((elapsed / 60))
  local seconds=$((elapsed % 60))
  if [[ $minutes -gt 0 ]]; then
    echo "${minutes}m ${seconds}s"
  else
    echo "${seconds}s"
  fi
}

# =============================================================================
# PREREQUISITES CHECK
# =============================================================================

check_prerequisites() {
  log_info "Checking prerequisites..."

  # Check Claude Code version
  if ! command -v claude &> /dev/null; then
    log_error "Claude Code CLI is not installed"
    log_error "Install it from: https://claude.ai/code"
    exit 1
  fi

  local claude_version
  claude_version=$(claude --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "0.0.0")
  log_info "Claude Code version: $claude_version"

  # Check if Chrome is running (basic check)
  if ! pgrep -x "Google Chrome" > /dev/null 2>&1 && ! pgrep -x "chrome" > /dev/null 2>&1; then
    log_warn "Google Chrome does not appear to be running"
    log_warn "Please start Chrome before running tests"
  fi

  # Check if app is accessible
  log_info "Checking if application is accessible at $APP_URL..."
  if ! curl -s --connect-timeout 5 "$APP_URL" > /dev/null 2>&1; then
    log_error "Application is not accessible at $APP_URL"
    log_error "Please start your development server first:"
    log_error "  cd $PROJECT_DIR && bun run dev"
    exit 1
  fi

  log_success "Application is accessible at $APP_URL"
}

# =============================================================================
# STREAM PARSING (real-time tool activity logging)
# =============================================================================

# Parse stream-json output from Claude Code and display tool activity in real-time
# Reads JSON lines from stdin, extracts tool_use events, and prints formatted logs
parse_claude_stream() {
  local label="$1"
  local start_time="$2"
  local last_activity
  last_activity=$(date +%s)
  local tool_count=0
  local ts
  ts="[$(date '+%H:%M:%S')]"

  while IFS= read -r line; do
    # Skip empty lines
    [[ -z "$line" ]] && continue

    # Extract the type field
    local msg_type
    msg_type=$(echo "$line" | jq -r '.type // empty' 2>/dev/null) || continue

    local now
    now=$(date +%s)
    local elapsed=$((now - start_time))
    local minutes=$((elapsed / 60))
    local seconds=$((elapsed % 60))
    local ts
    ts="[$(date '+%H:%M:%S')]"

    case "$msg_type" in
      assistant)
        # Agent is thinking/responding - extract tool_use from content blocks
        local tool_uses
        tool_uses=$(echo "$line" | jq -c '.message.content[]? | select(.type == "tool_use")' 2>/dev/null) || true
        if [[ -n "$tool_uses" ]]; then
          while IFS= read -r tool_json; do
            tool_count=$((tool_count + 1))
            local tool_name tool_detail
            tool_name=$(echo "$tool_json" | jq -r '.name // "unknown"' 2>/dev/null)

            case "$tool_name" in
              Read)
                tool_detail=$(echo "$tool_json" | jq -r '.input.file_path // ""' 2>/dev/null)
                echo "$ts 📖 Read: $tool_detail"
                ;;
              Write)
                tool_detail=$(echo "$tool_json" | jq -r '.input.file_path // ""' 2>/dev/null)
                echo "$ts ✏️  Write: $tool_detail"
                ;;
              Edit)
                tool_detail=$(echo "$tool_json" | jq -r '.input.file_path // ""' 2>/dev/null)
                echo "$ts 🔧 Edit: $tool_detail"
                ;;
              Bash)
                tool_detail=$(echo "$tool_json" | jq -r '(.input.command // "") | .[0:120]' 2>/dev/null)
                echo "$ts 💻 Bash: $tool_detail"
                ;;
              Glob)
                tool_detail=$(echo "$tool_json" | jq -r '.input.pattern // ""' 2>/dev/null)
                echo "$ts 🔍 Glob: $tool_detail"
                ;;
              Grep)
                tool_detail=$(echo "$tool_json" | jq -r '.input.pattern // ""' 2>/dev/null)
                local grep_path
                grep_path=$(echo "$tool_json" | jq -r '.input.path // ""' 2>/dev/null)
                [[ -n "$grep_path" ]] && tool_detail="$tool_detail in $grep_path"
                echo "$ts 🔎 Grep: $tool_detail"
                ;;
              Task)
                tool_detail=$(echo "$tool_json" | jq -r '.input.description // ""' 2>/dev/null)
                echo "$ts 🤖 Task: $tool_detail"
                ;;
              WebFetch|WebSearch)
                tool_detail=$(echo "$tool_json" | jq -r '.input.url // .input.query // ""' 2>/dev/null)
                echo "$ts 🌐 $tool_name: $tool_detail"
                ;;
              *)
                echo "$ts 🔨 $tool_name"
                ;;
            esac
            last_activity=$now
          done <<< "$tool_uses"
        fi
        ;;
      result)
        # Final result - capture cost info if available
        local cost_info
        cost_info=$(echo "$line" | jq -r '
          if .total_cost_usd then "cost: $" + (.total_cost_usd | tostring)
          else empty
          end' 2>/dev/null) || true
        if [[ -n "$cost_info" ]]; then
          echo "$ts 💰 $label $cost_info"
        fi
        ;;
    esac

    # Periodic heartbeat if no tool activity for 2 minutes
    if [[ $((now - last_activity)) -ge 120 ]]; then
      echo "$ts 💓 $label still running... (${minutes}m ${seconds}s elapsed, $tool_count tools called)"
      last_activity=$now
    fi
  done

  echo "$ts ✅ $label stream ended ($tool_count tool calls)"
}

# Parse raw stream-json output into a human-readable failure summary.
# Extracts text content and tool names instead of dumping raw JSON.
# Falls back to raw line display if jq parsing finds nothing.
parse_failure_summary() {
  local raw_file="$1"
  local parsed
  parsed=$(jq -r '
    if .type == "assistant" then
      (.message.content[]? |
        if .type == "text" then "  💬 " + (.text | .[0:200])
        elif .type == "tool_use" then "  🔧 " + .name + ": " + ((.input.file_path // .input.command // .input.pattern // .input.description // "") | .[0:120])
        else empty
        end
      )
    elif .type == "result" then
      if .total_cost_usd then "  💰 Cost: $" + (.total_cost_usd | tostring)
      elif .result then "  📋 Result: " + (.result | .[0:200])
      else empty
      end
    elif .type == "error" then
      "  ❌ Error: " + (.error.message // .error // "unknown" | .[0:200])
    else empty
    end
  ' "$raw_file" 2>/dev/null | tail -15)

  if [[ -n "$parsed" ]]; then
    echo "$parsed"
  else
    # Fallback: show truncated raw lines (handles non-JSON error messages)
    echo "  (raw output, no JSON events found):"
    # Use sed instead of while-read to avoid subshell buffering issues
    tail -10 "$raw_file" | sed 's/^/  /' | cut -c1-200
  fi
}

# =============================================================================
# CLAUDE CODE WRAPPER
# =============================================================================

run_claude() {
  local prompt="$1"
  local label="${2:-Claude Code}"

  local prompt_chars=${#prompt}
  local prompt_words
  prompt_words=$(echo "$prompt" | wc -w | tr -d ' ')
  log_info "Running $label... (prompt: ${prompt_chars} chars, ~${prompt_words} words)"

  local claude_start
  claude_start=$(timer_start)

  cd "$PROJECT_DIR"

  # Run Claude Code with stream-json for real-time tool visibility.
  # Pipeline runs in a BACKGROUND SUBSHELL so that `wait` is interruptible
  # by Ctrl+C (bash defers INT traps for foreground pipelines, but not for wait).
  #
  # stderr is captured separately so CLI errors (auth, flags, rate limits) are
  # always visible on failure, not swallowed by the JSON stream parser.
  #
  # NOTE: --chrome flag is added for browser-based testing.
  local raw_output_file stderr_file
  raw_output_file=$(mktemp /tmp/test-claude-XXXXXX)
  stderr_file=$(mktemp /tmp/test-stderr-XXXXXX)

  (
    set -o pipefail
    claude --dangerously-skip-permissions \
      --chrome \
      --verbose \
      --output-format stream-json \
      -p "$prompt" 2>"$stderr_file" | tee "$raw_output_file" | parse_claude_stream "$label" "$claude_start"
  ) &
  CLAUDE_PIPE_PID=$!

  # wait is interruptible by signals — Ctrl+C fires the INT trap immediately
  local pipe_exit=0
  wait "$CLAUDE_PIPE_PID" || pipe_exit=$?
  CLAUDE_PIPE_PID=""

  if [[ $pipe_exit -eq 0 ]]; then
    rm -f "$raw_output_file" "$stderr_file"
    log_info "$label finished in $(timer_elapsed "$claude_start")"
    return 0
  else
    log_error "$label failed after $(timer_elapsed "$claude_start")"

    # Show stderr first (CLI errors, auth issues, rate limits)
    if [[ -s "$stderr_file" ]]; then
      log_error "Claude stderr:"
      tail -20 "$stderr_file" | while IFS= read -r line; do echo "  $line"; done >&2
    fi

    # Show parsed stream events or raw stdout fallback
    if [[ -s "$raw_output_file" ]]; then
      log_error "Claude stream output (last 15 events):"
      parse_failure_summary "$raw_output_file" >&2
    fi

    # If neither file had content, generic error
    if [[ ! -s "$stderr_file" ]] && [[ ! -s "$raw_output_file" ]]; then
      log_error "Claude produced no output at all — check auth (run 'claude' interactively) or rate limits"
    fi

    rm -f "$raw_output_file" "$stderr_file"
    return 1
  fi
}

# =============================================================================
# ERROR HANDLING & SIGNAL TRAPS
# =============================================================================

kill_claude_pipeline() {
  if [[ -n "$CLAUDE_PIPE_PID" ]] && kill -0 "$CLAUDE_PIPE_PID" 2>/dev/null; then
    # Kill the subshell's children first (claude, tee, parse_claude_stream)
    pkill -TERM -P "$CLAUDE_PIPE_PID" 2>/dev/null || true
    # Then kill the subshell itself
    kill -TERM "$CLAUDE_PIPE_PID" 2>/dev/null || true
    wait "$CLAUDE_PIPE_PID" 2>/dev/null || true
    CLAUDE_PIPE_PID=""
  fi
}

on_interrupt() {
  echo ""
  log_warn "Interrupted by user (Ctrl+C)"
  kill_claude_pipeline
  log_info "Cleanup complete. Exiting."
  exit 130
}

cleanup() {
  # Called on script exit (normal or error)
  kill_claude_pipeline
}

# =============================================================================
# BUILD TEST CONTEXT
# =============================================================================

build_test_context() {
  local context=""

  # Add requirements if available
  if [[ -f "$DOCS_FILE" ]]; then
    log_info "Found requirements document: $DOCS_FILE"
    context="## Product Requirements

$(cat "$DOCS_FILE")

"
  else
    log_warn "No requirements document found at $DOCS_FILE"
    log_warn "Tests will be based on discovered UI elements"
  fi

  # Add navigation map if available
  if [[ -f "$MAP_FILE" ]]; then
    log_info "Found navigation map: $MAP_FILE"
    context="${context}## Navigation Routes

$(cat "$MAP_FILE")

"
  else
    log_warn "No navigation map found at $MAP_FILE"
  fi

  echo "$context"
}

# =============================================================================
# WEB TESTING COMMAND
# =============================================================================

run_web_tests() {
  log_step "Running Web Tests"

  local test_context
  test_context=$(build_test_context)

  local record_instruction=""
  if [[ "$RECORD_GIF" == "true" ]]; then
    record_instruction="

**IMPORTANT: Record a GIF of the entire test session.** Save the recording to $KOSUKE_DIR/test-recording.gif"
  fi

  local prompt
  prompt="You are an expert QA engineer performing comprehensive web testing using browser automation.

## Test Configuration

- **Application URL:** $APP_URL
- **Project Directory:** $PROJECT_DIR
- **Test Results File:** $TEST_RESULTS_FILE

$test_context

## Your Testing Mission

Perform a comprehensive test of the web application, covering:

### 1. Page Navigation Tests
- Visit each route/page defined in the requirements or navigation map
- If no routes are defined, discover them by exploring the application
- Verify each page loads without errors
- Check for console errors on each page

### 2. UI Component Tests
- Verify all expected UI components are present
- Check that buttons, links, and interactive elements are functional
- Test responsive behavior if applicable

### 3. Form Tests
- Find all forms in the application
- Test form validation (submit empty, invalid data)
- Test successful form submission with valid data
- Verify error messages are displayed correctly

### 4. User Flow Tests
- Test complete user journeys (e.g., sign up, login, create item, etc.)
- Verify navigation between pages works correctly
- Test any authentication flows if present

### 5. Console & Network Monitoring
- Monitor browser console for JavaScript errors
- Check for failed network requests
- Report any warnings or issues found

## Test Execution Steps

1. **Open the application** at $APP_URL
2. **For each page/route:**
   - Navigate to the page
   - Wait for it to fully load
   - Check console for errors
   - Verify expected elements are present
   - Test interactive elements
3. **Test forms** by filling with invalid then valid data
4. **Complete user flows** end-to-end
5. **Document all findings** in the test results file
$record_instruction

## Test Results Format

Create a markdown test report at $TEST_RESULTS_FILE with this structure:

\`\`\`markdown
# Web Test Results

**Date:** [current date/time]
**Application URL:** $APP_URL
**Overall Status:** [PASS/FAIL]

## Summary
- Total Pages Tested: X
- Passed: X
- Failed: X
- Warnings: X

## Page Tests

### [Page Name] - [URL]
- **Status:** PASS/FAIL
- **Load Time:** Xms
- **Console Errors:** None / [list errors]
- **UI Components:** All present / [list missing]
- **Notes:** [any observations]

### [Next Page...]

## Form Tests

### [Form Name]
- **Location:** [page/URL]
- **Validation Test:** PASS/FAIL
- **Submission Test:** PASS/FAIL
- **Notes:** [any issues]

## User Flow Tests

### [Flow Name] (e.g., \"User Registration\")
- **Steps Completed:** X/Y
- **Status:** PASS/FAIL
- **Issues:** [list any problems]

## Console Errors
[List all JavaScript errors found, grouped by page]

## Recommendations
[List any improvements or fixes needed]
\`\`\`

## Important Guidelines

- Be thorough but efficient
- Stop and report if you encounter login pages or CAPTCHAs that need manual intervention
- If a test fails, continue with other tests and report the failure
- Take screenshots of any failures or issues found
- Focus on functional testing, not visual pixel-perfect testing

Begin testing now. Start by navigating to $APP_URL and systematically testing the application."

  log_info "Starting Claude Code with Chrome integration..."
  log_info "This will open Chrome and perform automated testing"
  echo ""

  run_claude "$prompt" "Web Tester"

  # Check if test results were created
  if [[ -f "$TEST_RESULTS_FILE" ]]; then
    log_success "Test results saved to: $TEST_RESULTS_FILE"
  else
    log_warn "Test results file was not created"
  fi

  if [[ "$RECORD_GIF" == "true" ]] && [[ -f "$KOSUKE_DIR/test-recording.gif" ]]; then
    log_success "Test recording saved to: $KOSUKE_DIR/test-recording.gif"
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

  # Ensure .kosuke directory exists
  mkdir -p "$KOSUKE_DIR"

  # Set up traps
  trap 'cleanup' EXIT
  trap 'on_interrupt' INT TERM

  echo ""
  echo "================================================================================"
  echo "  Test - AI-Driven Web Testing with Claude Code"
  echo "================================================================================"
  echo ""
  log_info "Project: $PROJECT_DIR"
  log_info "Application URL: $APP_URL"
  log_info "Record GIF: $RECORD_GIF"
  echo ""

  # Check prerequisites
  check_prerequisites

  # Run web tests
  local test_start
  test_start=$(timer_start)

  run_web_tests

  local total_elapsed
  total_elapsed=$(timer_elapsed "$test_start")

  echo ""
  echo "================================================================================"
  log_success "Web Testing Completed! (Total: $total_elapsed)"
  echo "================================================================================"
  echo ""
  echo "Results:"
  if [[ -f "$TEST_RESULTS_FILE" ]]; then
    echo "  📄 Test Report: $TEST_RESULTS_FILE"
  fi
  if [[ "$RECORD_GIF" == "true" ]] && [[ -f "$KOSUKE_DIR/test-recording.gif" ]]; then
    echo "  🎬 Recording: $KOSUKE_DIR/test-recording.gif"
  fi
  echo ""
  echo "Review the test results and fix any issues found."
  echo ""
}

# =============================================================================
# ENTRY POINT
# =============================================================================

main "$@"
