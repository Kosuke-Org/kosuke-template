#!/bin/bash
# =============================================================================
# Analyse - AI-Driven Code Quality Analysis
# =============================================================================
#
# Analyzes and fixes code quality issues using Claude Code:
#   - Discovers files to analyze (respects .kosukeignore)
#   - Creates batches of 10 files each (grouped by directory)
#   - Claude analyzes each batch against CLAUDE.md rules
#   - Validates changes with lint/typecheck after each batch
#   - Optionally creates a PR with all fixes
#
# Usage:
#   ./analyse.sh                              # Run in current directory
#   ./analyse.sh --directory=/path/to/project
#   ./analyse.sh --scope=src/lib,src/app      # Analyze specific directories
#   ./analyse.sh --types=ts,tsx               # Analyze specific file types
#   ./analyse.sh --pr                         # Create PR with fixes
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
ANALYSE_CONFIG_DIR=""
SCOPE=""
TYPES=""
CREATE_PR=false
BASE_BRANCH="main"
MAX_BATCH_SIZE=10

# Statistics
TOTAL_BATCHES=0
PROCESSED_BATCHES=0
TOTAL_FIXES=0

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
      --scope=*)
        SCOPE="${1#*=}"
        shift
        ;;
      --scope)
        SCOPE="$2"
        shift 2
        ;;
      --types=*)
        TYPES="${1#*=}"
        shift
        ;;
      --types)
        TYPES="$2"
        shift 2
        ;;
      --pr)
        CREATE_PR=true
        shift
        ;;
      --base-branch=*)
        BASE_BRANCH="${1#*=}"
        shift
        ;;
      --base-branch)
        BASE_BRANCH="$2"
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
Analyse - AI-Driven Code Quality Analysis

Usage:
  ./analyse.sh [options] [directory]

Options:
  --directory=PATH    Project directory (default: current directory)
  --scope=DIRS        Comma-separated directories to analyze (e.g., src/lib,src/app)
  --types=EXTS        Comma-separated file extensions (e.g., ts,tsx)
  --pr                Create a pull request with all fixes
  --base-branch=NAME  Base branch for PR (default: main)
  --help, -h          Show this help message

Prerequisites:
  - CLAUDE.md must exist in the project root
  - Claude Code CLI must be authenticated

Examples:
  ./analyse.sh                                    # Run in current directory
  ./analyse.sh /path/to/project                   # Run in specific directory
  ./analyse.sh --scope=src/lib                    # Analyze only src/lib
  ./analyse.sh --types=ts,tsx                     # Analyze only TypeScript files
  ./analyse.sh --pr                               # Create PR with fixes
  ./analyse.sh --scope=src/app --pr               # Analyze src/app and create PR

Output:
  Fixes code quality issues in place, optionally creates a PR
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
# CLEANUP
# =============================================================================

cleanup() {
  # Remove isolated Claude config directory
  if [[ -n "$ANALYSE_CONFIG_DIR" ]] && [[ -d "$ANALYSE_CONFIG_DIR" ]]; then
    rm -rf "$ANALYSE_CONFIG_DIR"
  fi
}

# =============================================================================
# FILE DISCOVERY
# =============================================================================

# Read .kosukeignore patterns
read_kosukeignore() {
  local ignore_file="$PROJECT_DIR/.kosukeignore"
  if [[ -f "$ignore_file" ]]; then
    grep -v '^#' "$ignore_file" | grep -v '^$' || true
  fi
}

# Discover files to analyze
discover_files() {
  local patterns=()
  local scope_dirs=()
  local type_exts=()

  # Parse scope directories
  if [[ -n "$SCOPE" ]]; then
    IFS=',' read -ra scope_dirs <<< "$SCOPE"
  fi

  # Parse file types
  if [[ -n "$TYPES" ]]; then
    IFS=',' read -ra type_exts <<< "$TYPES"
  else
    type_exts=("ts" "tsx")
  fi

  # Build find patterns
  cd "$PROJECT_DIR"

  local find_args=()

  # Add scope directories or default to current dir
  if [[ ${#scope_dirs[@]} -gt 0 ]]; then
    for dir in "${scope_dirs[@]}"; do
      dir=$(echo "$dir" | xargs)  # trim whitespace
      if [[ -d "$dir" ]]; then
        find_args+=("$dir")
      fi
    done
  else
    find_args+=(".")
  fi

  # Build name patterns for file types
  local name_patterns=()
  for ext in "${type_exts[@]}"; do
    ext=$(echo "$ext" | xargs)  # trim whitespace
    name_patterns+=("-name" "*.${ext}" "-o")
  done
  # Remove trailing -o
  unset 'name_patterns[-1]'

  # Find files
  local files
  files=$(find "${find_args[@]}" \
    -type f \
    \( "${name_patterns[@]}" \) \
    ! -path "*/node_modules/*" \
    ! -path "*/.next/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" \
    ! -path "*/__pycache__/*" \
    ! -path "*/drizzle/*" \
    ! -path "*/.kosuke/*" \
    2>/dev/null | sort)

  # Apply .kosukeignore patterns
  local ignore_patterns
  ignore_patterns=$(read_kosukeignore)

  if [[ -n "$ignore_patterns" ]]; then
    local filtered_files=""
    while IFS= read -r file; do
      local should_ignore=false
      while IFS= read -r pattern; do
        [[ -z "$pattern" ]] && continue
        if [[ "$file" == *"$pattern"* ]]; then
          should_ignore=true
          break
        fi
      done <<< "$ignore_patterns"

      if [[ "$should_ignore" == "false" ]]; then
        filtered_files+="$file"$'\n'
      fi
    done <<< "$files"
    files="$filtered_files"
  fi

  echo "$files" | grep -v '^$' || true
}

# Get top-level directory for grouping
get_top_level_dir() {
  local file="$1"
  local parts
  IFS='/' read -ra parts <<< "$file"

  # For app routes
  if [[ "${parts[0]}" == "app" ]] || [[ "${parts[0]}" == "src" && "${parts[1]}" == "app" ]]; then
    local app_idx=0
    [[ "${parts[0]}" == "src" ]] && app_idx=1

    if [[ "${parts[$((app_idx+1))]}" == "(logged-in)" ]] && [[ -n "${parts[$((app_idx+2))]:-}" ]]; then
      echo "${parts[0]}/${parts[$((app_idx))]:-}/${parts[$((app_idx+1))]}/${parts[$((app_idx+2))]}"
    else
      echo "${parts[0]}/${parts[$((app_idx))]:-}/${parts[$((app_idx+1))]:-}"
    fi
    return
  fi

  # For lib files
  if [[ "${parts[0]}" == "lib" ]] || [[ "${parts[0]}" == "src" && "${parts[1]}" == "lib" ]]; then
    local lib_idx=0
    [[ "${parts[0]}" == "src" ]] && lib_idx=1
    echo "${parts[0]}/${parts[$lib_idx]:-}/${parts[$((lib_idx+1))]:-}"
    return
  fi

  # Default: first two directories
  echo "${parts[0]}/${parts[1]:-}"
}

# Create batches from files
create_batches() {
  local files="$1"
  local batches_dir
  batches_dir=$(mktemp -d)

  # Group files by directory
  declare -A dir_files

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    local dir
    dir=$(get_top_level_dir "$file")
    dir_files["$dir"]+="$file"$'\n'
  done <<< "$files"

  # Create batch files
  local batch_num=0
  for dir in "${!dir_files[@]}"; do
    local dir_file_list="${dir_files[$dir]}"
    local file_count
    file_count=$(echo -n "$dir_file_list" | grep -c '^' || echo 0)

    local chunk_num=0
    local current_chunk=""
    local chunk_count=0

    while IFS= read -r file; do
      [[ -z "$file" ]] && continue
      current_chunk+="$file"$'\n'
      ((chunk_count++))

      if [[ $chunk_count -ge $MAX_BATCH_SIZE ]]; then
        ((batch_num++))
        ((chunk_num++))
        local batch_name
        if [[ $file_count -gt $MAX_BATCH_SIZE ]]; then
          batch_name="${dir//\//_}_${chunk_num}"
        else
          batch_name="${dir//\//_}"
        fi
        echo "$batch_name" > "$batches_dir/batch_${batch_num}_name"
        echo -n "$current_chunk" > "$batches_dir/batch_${batch_num}_files"
        current_chunk=""
        chunk_count=0
      fi
    done <<< "$dir_file_list"

    # Write remaining files
    if [[ -n "$current_chunk" ]]; then
      ((batch_num++))
      ((chunk_num++))
      local batch_name
      if [[ $chunk_num -gt 1 ]]; then
        batch_name="${dir//\//_}_${chunk_num}"
      else
        batch_name="${dir//\//_}"
      fi
      echo "$batch_name" > "$batches_dir/batch_${batch_num}_name"
      echo -n "$current_chunk" > "$batches_dir/batch_${batch_num}_files"
    fi
  done

  echo "$batches_dir"
  TOTAL_BATCHES=$batch_num
}

# =============================================================================
# CLAUDE CODE WRAPPER
# =============================================================================

run_claude() {
  local prompt="$1"

  cd "$PROJECT_DIR"

  # Run Claude Code with isolated config (prevents ~/.claude/CLAUDE.md loading)
  CLAUDE_CONFIG_DIR="$ANALYSE_CONFIG_DIR" claude \
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
# BATCH ANALYSIS
# =============================================================================

analyze_batch() {
  local batch_name="$1"
  local batch_files="$2"

  echo ""
  echo "============================================================"
  echo "Analyzing: $batch_name"
  echo "============================================================"
  echo ""
  echo "Files:"
  echo "$batch_files" | while IFS= read -r f; do
    [[ -n "$f" ]] && echo "  - $f"
  done
  echo ""

  # Build file list for prompt
  local file_list=""
  while IFS= read -r f; do
    [[ -n "$f" ]] && file_list+="- $f"$'\n'
  done <<< "$batch_files"

  local prompt
  prompt='You are a code quality analyzer and fixer for this repository.

Your task is to analyze specific files for code quality issues and IMMEDIATELY FIX them according to the rules in CLAUDE.md.

CRITICAL REQUIREMENTS:
- You MUST use the search_replace or write tools to fix ALL violations you find
- Simply identifying issues without fixing them is NOT acceptable
- You will ONLY be given access to a specific batch of files. Do NOT explore the entire repository.

The rules you must follow are provided in CLAUDE.md.

---

Analyze and FIX code quality issues in these files:

'"$file_list"'

**Your task:**
1. Read CLAUDE.md to understand all the rules and best practices
2. Read ONLY the files listed above (these are the files in this batch)
3. Check each file against the CLAUDE.md rules
4. **IMMEDIATELY FIX any violations you find using search_replace or write tools**
5. Do NOT explore or modify other files outside this batch

**IMPORTANT:**
- Do not just describe issues - FIX them!
- Use search_replace for targeted fixes
- Use write for complete file rewrites if needed
- Every violation you identify MUST be fixed

**Rules reference:** CLAUDE.md

Start by reading CLAUDE.md, then analyze and fix the batch files.'

  run_claude "$prompt"
}

# =============================================================================
# VALIDATION
# =============================================================================

validate_batch() {
  log_info "Running validation (lint + typecheck)..."

  local prompt
  prompt='You are a code validation specialist. Run lint and typecheck commands to validate code changes.

**Your task:**

1. Run the lint command to check for linting errors:
   ```bash
   bun run lint
   ```

2. If lint errors are found, fix them using search_replace or write tools

3. Run typecheck to verify TypeScript types:
   ```bash
   bun run typecheck
   ```

4. If type errors are found, fix them using search_replace or write tools

5. Continue fixing and re-running until both commands pass

**Success criteria:** Both lint and typecheck pass with no errors.

**Important:**
- Focus only on fixing errors, not warnings
- Make minimal changes to fix issues
- Do not modify unrelated code

Run the validation commands now.'

  if run_claude "$prompt"; then
    log_success "Validation passed"
    return 0
  else
    log_warn "Validation failed"
    return 1
  fi
}

# =============================================================================
# GIT OPERATIONS
# =============================================================================

git_has_changes() {
  cd "$PROJECT_DIR"
  ! git diff --quiet HEAD 2>/dev/null || ! git diff --cached --quiet HEAD 2>/dev/null
}

git_commit() {
  local message="$1"
  cd "$PROJECT_DIR"

  if git_has_changes; then
    git add -A
    if git commit -m "$message"; then
      log_success "Committed: $message"
      return 0
    else
      log_warn "Commit failed"
      return 1
    fi
  else
    log_info "No changes to commit"
    return 0
  fi
}

git_create_branch() {
  local branch_name="$1"
  cd "$PROJECT_DIR"

  # Ensure we're on base branch and up to date
  git checkout "$BASE_BRANCH" 2>/dev/null || true
  git pull origin "$BASE_BRANCH" 2>/dev/null || true

  # Create and switch to new branch
  git checkout -b "$branch_name"
  log_success "Created branch: $branch_name"
}

git_push_and_create_pr() {
  local branch_name="$1"
  local pr_title="$2"
  local pr_body="$3"

  cd "$PROJECT_DIR"

  # Push branch
  git push -u origin "$branch_name"
  log_success "Pushed branch: $branch_name"

  # Create PR using gh CLI
  if command -v gh &> /dev/null; then
    local pr_url
    pr_url=$(gh pr create \
      --title "$pr_title" \
      --body "$pr_body" \
      --base "$BASE_BRANCH" \
      --head "$branch_name")
    log_success "Created PR: $pr_url"
    echo "$pr_url"
  else
    log_warn "gh CLI not found. Please create PR manually."
    echo "https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/compare/$BASE_BRANCH...$branch_name"
  fi
}

# =============================================================================
# ANALYSE COMMAND
# =============================================================================

analyse_command() {
  local claude_md="$PROJECT_DIR/CLAUDE.md"

  # Validate CLAUDE.md exists
  if [[ ! -f "$claude_md" ]]; then
    log_error "CLAUDE.md not found in project root: $claude_md"
    log_error "This file is required for code quality analysis."
    return 1
  fi

  log_info "Loaded CLAUDE.md rules"
  echo ""

  # Discover files
  log_info "Discovering files..."
  local files
  files=$(discover_files)

  local file_count
  file_count=$(echo -n "$files" | grep -c '^' || echo 0)

  if [[ $file_count -eq 0 ]]; then
    log_info "No files found to analyze."
    return 0
  fi

  log_info "Found $file_count files to analyze"
  echo ""

  # Create batches
  log_info "Creating batches..."
  local batches_dir
  batches_dir=$(create_batches "$files")
  log_info "Created $TOTAL_BATCHES batches"
  echo ""

  # Create branch if PR mode
  local branch_name=""
  if [[ "$CREATE_PR" == "true" ]]; then
    local date_stamp
    date_stamp=$(date +%Y-%m-%d-%H%M%S)
    branch_name="quality/kosuke-analysis-$date_stamp"
    git_create_branch "$branch_name"
  fi

  # Process each batch
  for batch_num in $(seq 1 "$TOTAL_BATCHES"); do
    local batch_name_file="$batches_dir/batch_${batch_num}_name"
    local batch_files_file="$batches_dir/batch_${batch_num}_files"

    if [[ ! -f "$batch_name_file" ]] || [[ ! -f "$batch_files_file" ]]; then
      continue
    fi

    local batch_name
    batch_name=$(cat "$batch_name_file")
    local batch_files
    batch_files=$(cat "$batch_files_file")

    echo ""
    log_info "Progress: $batch_num/$TOTAL_BATCHES"

    # Analyze batch
    if analyze_batch "$batch_name" "$batch_files"; then
      # Validate changes
      if validate_batch; then
        ((PROCESSED_BATCHES++))
        ((TOTAL_FIXES++))

        # Commit if PR mode
        if [[ "$CREATE_PR" == "true" ]]; then
          git_commit "fix(quality): $batch_name - improvements"
        fi

        log_success "Batch $batch_num completed"
      else
        log_warn "Batch $batch_num validation failed, skipping"
      fi
    else
      log_warn "Batch $batch_num analysis failed, skipping"
    fi
  done

  # Cleanup batches directory
  rm -rf "$batches_dir"

  # Create PR if requested
  if [[ "$CREATE_PR" == "true" ]] && [[ $PROCESSED_BATCHES -gt 0 ]]; then
    local date_display
    date_display=$(date +%Y-%m-%d)

    local pr_body
    pr_body="## Summary
- Processed $PROCESSED_BATCHES/$TOTAL_BATCHES batches
- Applied quality improvements based on CLAUDE.md rules

## Changes
- Code style fixes
- Type safety improvements
- Best practice enforcement

---
Generated by Kosuke CLI"

    git_push_and_create_pr "$branch_name" "chore: Quality Fixes ($date_display)" "$pr_body"
  fi

  # Print summary
  echo ""
  echo "============================================================"
  log_success "Analysis Complete!"
  echo "============================================================"
  echo ""
  echo "  Processed: $PROCESSED_BATCHES/$TOTAL_BATCHES batches"
  echo ""

  if [[ "$CREATE_PR" == "false" ]] && [[ $PROCESSED_BATCHES -gt 0 ]]; then
    echo "  Changes applied locally. Use --pr flag to create a pull request."
    echo ""
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

  # Create isolated Claude config directory (prevents ~/.claude/CLAUDE.md loading)
  ANALYSE_CONFIG_DIR=$(mktemp -d)

  # Set up cleanup trap
  trap 'cleanup' EXIT

  echo ""
  echo "================================================================================"
  echo "  Analyse - AI-Driven Code Quality Analysis"
  echo "================================================================================"
  echo ""
  log_info "Project: $PROJECT_DIR"
  log_info "Using isolated Claude config: $ANALYSE_CONFIG_DIR"
  [[ -n "$SCOPE" ]] && log_info "Scope: $SCOPE"
  [[ -n "$TYPES" ]] && log_info "Types: $TYPES"
  [[ "$CREATE_PR" == "true" ]] && log_info "PR mode: enabled (base: $BASE_BRANCH)"
  echo ""

  analyse_command
}

# =============================================================================
# ENTRY POINT
# =============================================================================

main "$@"
