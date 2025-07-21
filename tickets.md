# Project Tickets: CLI Generator

## Epic 1: CLI Tool Development in `/cli` Directory

### Ticket 1.1: Initialize CLI Project Structure

**Priority:** High  
**Estimate:** 1 day

**Description:**
Set up the CLI tool in `/cli/create-kosuke-app/` subdirectory with necessary dependencies.

**Acceptance Criteria:**

- [ ] Create `/cli/create-kosuke-app/` directory structure
- [ ] Initialize Node.js project with proper `package.json`
- [ ] Install dependencies: `inquirer`, `degit`, `chalk`, `ora`, `commander`
- [ ] Set up TypeScript configuration
- [ ] Create source structure: `src/index.ts`, `src/prompts.ts`, `src/clone.ts`, `src/replace.ts`
- [ ] Add shebang (`#!/usr/bin/env node`) to main executable
- [ ] Configure `bin` field for `create-kosuke-app` command

**Technical Notes:**

- Use TypeScript for better development experience
- Set up ESLint and Prettier consistent with main project
- Prepare for npm publishing as `create-kosuke-app`

---

### Ticket 1.2: Implement Interactive User Prompts

**Priority:** High  
**Estimate:** 2 days

**Description:**
Create interactive prompts to gather user input for project configuration.

**Acceptance Criteria:**

- [ ] Prompt for project name with validation (kebab-case, npm compatible)
- [ ] Ask for project display name (human-readable title)
- [ ] Ask for package manager preference (npm/yarn/pnpm)
- [ ] Optional: Database name customization
- [ ] Validate all inputs with helpful error messages
- [ ] Add progress indicators and beautiful CLI experience

**Technical Notes:**

- Use `inquirer.js` for interactive prompts
- Implement regex validation for project names
- Add help text and examples for each prompt
- Use `chalk` for colored output and better UX

---

### Ticket 1.3: Implement Template Cloning Logic

**Priority:** High  
**Estimate:** 2 days

**Description:**
Add functionality to clone the kosuke-template repository and set up the new project.

**Acceptance Criteria:**

- [ ] Use `degit` to download kosuke-template without git history
- [ ] Handle network errors and provide helpful messages
- [ ] Verify template download was successful
- [ ] Create target directory with proper permissions
- [ ] Add fallback mechanism if degit fails
- [ ] Support cloning from current repository
- [ ] Add progress indicators during download

**Technical Notes:**

- Use `degit` library: `npx degit filopedraz/kosuke-template target-dir`
- Handle case where target directory already exists
- Consider caching mechanism for faster subsequent uses
- Support both remote and local template sources

---

### Ticket 1.4: Build Smart Pattern Replacement Engine

**Priority:** High  
**Estimate:** 4 days

**Description:**
Create intelligent system to replace project-specific patterns while keeping GitHub references intact.

**Acceptance Criteria:**

- [ ] Replace `"name": "kosuke-template"` in package.json with user project name
- [ ] Update `# Kosuke Template` in README.md with project display name
- [ ] Replace `Kosuke Template` in app/layout.tsx metadata
- [ ] Replace Sentry project name in next.config.ts
- [ ] Update Docker container names: `kosuke_template_postgres` → `{project}_postgres`
- [ ] Replace database names: `kosuke_test` → `{project}_test`
- [ ] Update email templates and branding
- [ ] Handle CLI progress file names and constants
- [ ] **Keep all GitHub URLs as filopedraz/kosuke-template** (no replacement)
- [ ] Preserve file formatting and prevent corruption

**Technical Notes:**

- Create file-specific replacement strategies for .json, .md, .ts, .tsx files
- Use regex patterns for intelligent matching
- Validate replacements don't break syntax
- Support different naming conventions (kebab-case, snake_case, PascalCase)

**Updated Patterns (GitHub URLs kept intact):**

```typescript
const patterns = {
  // Core identity
  '"name": "kosuke-template"': `"name": "${projectName}"`,
  'Kosuke Template': projectDisplayName,
  'kosuke-template': projectName,
  "title: 'Kosuke Template'": `title: '${projectDisplayName}'`,

  // Configuration (keeping GitHub URLs as-is)
  "project: 'kosuke-template'": `project: '${projectName}'`,
  kosuke_template_postgres: `${projectName}_postgres`,
  kosuke_test: `${projectName}_test`,
  '.kosuke-setup-progress.json': `.${projectName}-setup-progress.json`,

  // Branding in emails and UI
  'Welcome to Kosuke Template': `Welcome to ${projectDisplayName}`,
  "FROM_NAME: process.env.RESEND_FROM_NAME || 'Kosuke Template'": `FROM_NAME: process.env.RESEND_FROM_NAME || '${projectDisplayName}'`,
};
```

---

### Ticket 1.5: Update Home Page for CLI Functionality

**Priority:** High  
**Estimate:** 2 days

**Description:**
Update the home page to showcase the new CLI functionality and replace git clone workflow with npx command.

**Acceptance Criteria:**

- [ ] Update hero section terminal to show `npx create-kosuke-app my-project` instead of git clone
- [ ] Update primary CTA button from "git clone kosuke" to "npx create-kosuke-app"
- [ ] Add CLI installation and usage examples
- [ ] Update terminal component animation to reflect CLI workflow
- [ ] Add section highlighting CLI benefits (auto-setup, customization, etc.)
- [ ] Update documentation links to include CLI guide
- [ ] Ensure responsive design works with new content
- [ ] Update meta descriptions and SEO content

**Technical Notes:**

- Update TerminalComponent.tsx to show CLI commands
- Modify primary and secondary CTAs appropriately
- Keep existing design language and animations
- Add smooth transitions for new content
- Test on different screen sizes

---

### Ticket 1.6: Add Post-Installation Setup

**Priority:** Medium  
**Estimate:** 1 day

**Description:**
Implement post-installation steps and user guidance.

**Acceptance Criteria:**

- [ ] Optionally run `npm install` in the new project directory
- [ ] Display success message with next steps
- [ ] Show helpful commands (dev server, database setup, etc.)
- [ ] Provide links to documentation
- [ ] Display environment setup instructions
- [ ] Add ASCII art or branding for better UX
- [ ] Create summary of what was created and customized

**Technical Notes:**

- Use `child_process` to run npm/yarn/pnpm install
- Handle different package managers correctly
- Provide clear, actionable next steps
- Include environment variable setup reminders

---

### Ticket 1.7: CLI Testing and Publishing Setup

**Priority:** High  
**Estimate:** 2 days

**Description:**
Set up testing infrastructure and prepare for npm publishing.

**Acceptance Criteria:**

- [ ] Add unit tests for CLI functions and pattern replacement
- [ ] Create integration tests that generate actual projects
- [ ] Test with various project names and configurations
- [ ] Set up local testing with `npm link`
- [ ] Configure CI/CD for automated testing
- [ ] Prepare npm publishing configuration
- [ ] Add proper README and CLI documentation
- [ ] Set up semantic versioning

**Technical Notes:**

- Use Jest for testing framework
- Test CLI in temporary directories
- Mock external dependencies where appropriate
- Ensure CLI works on Windows, macOS, and Linux

---

## Epic 2: Testing, Documentation, and Launch

### Ticket 2.1: Comprehensive Integration Testing

**Priority:** High  
**Estimate:** 3 days

**Description:**
Create comprehensive tests for the entire CLI system.

**Acceptance Criteria:**

- [ ] Test CLI with various project configurations and names
- [ ] Verify generated projects work correctly with different customizations
- [ ] Test error handling and edge cases
- [ ] Performance testing for large projects
- [ ] Cross-platform testing (Windows, macOS, Linux)
- [ ] Test with different git configurations
- [ ] Validate all generated code passes linting and type checking

**Technical Notes:**

- Use automated testing environments
- Test with various project sizes and complexities
- Test network failure scenarios
- Test with different project naming patterns

---

### Ticket 2.2: Create User Documentation

**Priority:** High  
**Estimate:** 2 days

**Description:**
Create comprehensive documentation for users of the CLI.

**Acceptance Criteria:**

- [ ] Write CLI usage guide with examples
- [ ] Document all command-line options and flags
- [ ] Create troubleshooting guide
- [ ] Add FAQ section covering common customization scenarios
- [ ] Create video tutorials or demos
- [ ] Document best practices for template customization
- [ ] Add migration guide from manual forking

**Technical Notes:**

- Use clear examples with real command outputs
- Include screenshots or GIFs where helpful
- Organize documentation by user type (new users vs existing)
- Cover different project naming and customization scenarios

---

### Ticket 2.3: Create Developer Documentation

**Priority:** Medium  
**Estimate:** 2 days

**Description:**
Document the system architecture and contribute guidelines.

**Acceptance Criteria:**

- [ ] Document CLI architecture and design decisions
- [ ] Create contributing guidelines
- [ ] Document API interfaces and data structures
- [ ] Add development setup instructions
- [ ] Document testing procedures
- [ ] Create code style guidelines
- [ ] Add security considerations and best practices

**Technical Notes:**

- Include architectural diagrams
- Document all environment variables and configuration
- Explain error handling strategies
- Document pattern replacement logic

---

### Ticket 2.4: Performance Optimization and Monitoring

**Priority:** Medium  
**Estimate:** 2 days

**Description:**
Optimize performance and add monitoring capabilities.

**Acceptance Criteria:**

- [ ] Optimize CLI startup time and template download speed
- [ ] Implement caching for frequently used templates
- [ ] Add performance monitoring and metrics
- [ ] Add usage analytics (with privacy considerations)
- [ ] Optimize memory usage for large codebases
- [ ] Add performance benchmarks

**Technical Notes:**

- Use caching strategies for template downloads
- Implement streaming for large file operations
- Consider using worker threads for CPU-intensive operations

---

### Ticket 2.5: Security Audit and Hardening

**Priority:** High  
**Estimate:** 2 days

**Description:**
Conduct security review and implement necessary hardening measures.

**Acceptance Criteria:**

- [ ] Audit CLI for security vulnerabilities
- [ ] Secure API key handling and storage
- [ ] Validate all user inputs and file operations
- [ ] Implement least-privilege access principles
- [ ] Add security scanning to CI/CD pipeline
- [ ] Document security considerations for users

**Technical Notes:**

- Use tools like npm audit and snyk for dependency scanning
- Implement input sanitization and validation
- Use GitHub's security features (secret scanning, etc.)

---

### Ticket 2.6: Launch Preparation and Publishing

**Priority:** High  
**Estimate:** 1 day

**Description:**
Prepare for public launch and publish packages.

**Acceptance Criteria:**

- [ ] Publish CLI to npm registry as `create-kosuke-app`
- [ ] Set up proper versioning and release process
- [ ] Create launch announcement materials
- [ ] Update main kosuke-template repository with CLI documentation
- [ ] Set up community resources (issues, discussions)
- [ ] Create example projects showcasing the system
- [ ] Prepare launch blog post or documentation
- [ ] Set up monitoring and alerting for production usage

**Technical Notes:**

- Use semantic versioning for releases
- Set up automated publishing via GitHub Actions
- Consider using npm organizations for package management
- Prepare rollback procedures for issues

---

## Summary

**Total Estimated Effort:** ~20 days across all tickets  
**Critical Path:** CLI Development → Testing → Launch  
**Key Advantages:** Template stays deployable, smart pattern replacement, CLI in same repo  
**Success Metrics:** CLI adoption, generated project success rate, user satisfaction

**Key Features:**

- ✅ **No template modification** - kosuke-template remains fully deployable
- ✅ **CLI in `/cli` subdirectory** - keeps everything in one repository
- ✅ **Smart pattern replacement** - no placeholder pollution
- ✅ **GitHub URLs preserved** - keeps filopedraz/kosuke-template references
- ✅ **Updated home page** - showcases CLI functionality

**Next Steps:**

1. Start with Epic 1 (CLI Development)
2. Update home page for CLI showcase
3. Implement comprehensive testing
4. Launch with proper documentation and support
