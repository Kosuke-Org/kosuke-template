#!/usr/bin/env tsx
/**
 * Claude CLI - Interactive terminal agent using Claude Agent SDK
 *
 * Usage: pnpm run claude-cli
 * or: tsx claude-cli.ts
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import chalk from 'chalk';
import * as readline from 'readline';
import ora from 'ora';

// ===== Configuration =====

const WORKSPACE_ROOT = process.cwd();
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ===== Session Management =====

let sessionId: string | null = null;

// ===== Main CLI Interface =====

async function processUserMessage(userInput: string): Promise<void> {
  const spinner = ora('Claude is thinking...').start();

  try {
    // Use the SDK's query function with built-in tools
    const result = query({
      prompt: userInput,
      options: {
        cwd: WORKSPACE_ROOT,
        settingSources: ['project'],
        permissionMode: 'acceptEdits', // bypassPermissions
        allowedTools: [
          'Task',
          'Bash',
          'Glob',
          'Grep',
          'LS',
          'ExitPlanMode',
          'Read',
          'Edit',
          'MultiEdit',
          'Write',
          'NotebookRead',
          'NotebookEdit',
          'WebFetch',
          'TodoWrite',
          'WebSearch',
        ],
        systemPrompt: {
          type: 'preset',
          preset: 'claude_code',
        },
      },
    });

    spinner.stop();

    // Process the async generator
    for await (const message of result) {
      if (message.type === 'user') {
        // User message - already shown
        if (!sessionId) {
          sessionId = message.session_id;
        }
      } else if (message.type === 'assistant') {
        // Assistant message - display the content
        const content = message.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text') {
              process.stdout.write(chalk.cyan('\nClaude: '));
              process.stdout.write(chalk.cyan(block.text));
              process.stdout.write('\n');
            } else if (block.type === 'tool_use') {
              // Tool use - show what tool is being called
              console.log(chalk.dim(`\n🔧 Using tool: ${block.name}`));
              if (block.name === 'write_file') {
                const input = block.input as { path?: string };
                if (input.path) {
                  console.log(chalk.green(`✏️  Writing: ${input.path}`));
                }
              } else if (block.name === 'read_file') {
                const input = block.input as { path?: string };
                if (input.path) {
                  console.log(chalk.dim(`📖 Reading: ${input.path}`));
                }
              } else if (block.name === 'bash') {
                const input = block.input as { command?: string };
                if (input.command) {
                  console.log(chalk.yellow(`⚡ Running: ${input.command}`));
                }
              }
            }
          }
        }
      } else if (message.type === 'result') {
        // Final result
        if (message.subtype === 'success') {
          console.log(chalk.dim(`\n✅ Completed in ${message.duration_ms}ms`));
          if (message.usage) {
            console.log(
              chalk.dim(
                `📊 Tokens: ${message.usage.input_tokens} in, ${message.usage.output_tokens} out`
              )
            );
          }
        } else if (
          message.subtype === 'error_max_turns' ||
          message.subtype === 'error_during_execution'
        ) {
          console.log(chalk.red(`\n❌ Error: ${message.subtype}`));
        }
      }
    }
  } catch (error) {
    spinner.stop();
    if (error instanceof Error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
    } else {
      console.error(chalk.red(`\n❌ Error: ${String(error)}`));
    }
  }
}

async function main() {
  console.log(
    chalk.bold.cyan('\n╔═══════════════════════════════════════════════════════════════╗')
  );
  console.log(chalk.bold.cyan('║             Claude CLI - Interactive Code Agent              ║'));
  console.log(
    chalk.bold.cyan('╚═══════════════════════════════════════════════════════════════╝\n')
  );

  // Check for API key
  if (!ANTHROPIC_API_KEY) {
    console.error(chalk.red('❌ Error: ANTHROPIC_API_KEY environment variable not set'));
    console.log(chalk.yellow('Please set it in your .env file or export it:'));
    console.log(chalk.dim('export ANTHROPIC_API_KEY="your-api-key-here"\n'));
    process.exit(1);
  }

  console.log(chalk.dim(`Workspace: ${WORKSPACE_ROOT}`));
  console.log(chalk.dim('Model: claude-3-7-sonnet-20250219'));
  console.log(chalk.dim('\nCommands: /help /clear /exit\n'));

  // Initial greeting
  console.log(
    chalk.cyan(
      "Claude: Hello! I'm ready to help you with your code. What would you like to work on?"
    )
  );

  // Setup readline
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question(chalk.bold.green('\nYou: '), async (input) => {
      const trimmedInput = input.trim();

      if (!trimmedInput) {
        prompt();
        return;
      }

      // Handle commands
      if (trimmedInput === '/exit') {
        console.log(chalk.yellow('\nGoodbye! 👋\n'));
        rl.close();
        process.exit(0);
      }

      if (trimmedInput === '/clear') {
        sessionId = null;
        console.clear();
        console.log(chalk.green('✅ Session cleared\n'));
        prompt();
        return;
      }

      if (trimmedInput === '/help') {
        console.log(chalk.cyan('\nAvailable commands:'));
        console.log(chalk.dim('  /help  - Show this help message'));
        console.log(chalk.dim('  /clear - Clear session and start fresh'));
        console.log(chalk.dim('  /exit  - Exit the CLI\n'));
        console.log(chalk.cyan('Built-in tools (provided by Claude Agent SDK):'));
        console.log(chalk.dim('  • read_file       - Read file contents'));
        console.log(chalk.dim('  • write_file      - Write or create files'));
        console.log(chalk.dim('  • list_files      - List files in directory'));
        console.log(chalk.dim('  • search_files    - Search for files by name'));
        console.log(chalk.dim('  • str_replace     - Find and replace in files'));
        console.log(chalk.dim('  • bash            - Execute shell commands'));
        console.log(chalk.dim('  • read_multiple   - Read multiple files at once'));
        console.log(chalk.dim('  • task_done       - Mark task as complete\n'));
        console.log(chalk.cyan('Example requests:'));
        console.log(chalk.dim('  • "Create a new React component for user profiles"'));
        console.log(chalk.dim('  • "Add a new tRPC endpoint for tasks"'));
        console.log(chalk.dim('  • "Refactor the settings page to use the new hook"'));
        console.log(chalk.dim('  • "Find all files using useAuth and update them"'));
        console.log(chalk.dim('  • "Run the tests and fix any failures"\n'));
        prompt();
        return;
      }

      // Process user input
      try {
        await processUserMessage(trimmedInput);
      } catch (error) {
        if (error instanceof Error) {
          console.error(chalk.red(`\n❌ Error: ${error.message}`));
        } else {
          console.error(chalk.red(`\n❌ Error: ${String(error)}`));
        }
      }

      prompt();
    });
  };

  prompt();
}

// ===== Entry Point =====

main().catch((error) => {
  console.error(
    chalk.red(`\n❌ Fatal error: ${error instanceof Error ? error.message : String(error)}`)
  );
  process.exit(1);
});
