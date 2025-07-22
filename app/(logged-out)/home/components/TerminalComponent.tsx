'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

interface TerminalLine {
  type: 'command' | 'output' | 'success' | 'info' | 'tree';
  content: string;
  delay?: number;
  user?: string;
  path?: string;
  typing?: boolean;
}

const terminalSequence: TerminalLine[] = [
  {
    type: 'command',
    content: 'git clone https://github.com/filopedraz/kosuke-template.git',
    user: 'dev',
    path: '~/projects',
    delay: 0,
    typing: true,
  },
  {
    type: 'output',
    content: "Cloning into 'kosuke-template'...",
    delay: 800,
  },
  {
    type: 'output',
    content: 'remote: Enumerating objects: 247, done.',
    delay: 1200,
  },
  {
    type: 'output',
    content: 'Receiving objects: 100% (247/247), 1.2 MiB | 2.1 MiB/s, done.',
    delay: 1600,
  },
  {
    type: 'command',
    content: 'cd kosuke-template && tree -L 2',
    user: 'dev',
    path: '~/projects',
    delay: 2200,
    typing: true,
  },
  {
    type: 'tree',
    content: `kosuke-template/
├── 📁 app/                  # Next.js App Router
├── 📁 components/           # UI Components
├── 📁 lib/                  # Auth, DB, Utils
├── 📁 hooks/                # Custom React Hooks
├── 📱 cli/                  # Setup Wizard
├── 📄 package.json          # Dependencies
├── ⚙️  drizzle.config.ts    # Database Config
└── 🚀 README.md            # Getting Started`,
    delay: 2800,
  },
  {
    type: 'command',
    content: 'cd cli && python main.py',
    user: 'dev',
    path: '~/projects/kosuke-template',
    delay: 4200,
    typing: true,
  },
  {
    type: 'info',
    content: '🤖 Welcome to Kosuke Setup Wizard!',
    delay: 4800,
  },
  {
    type: 'info',
    content: '⚡ Configuring your environment...',
    delay: 5200,
  },
  {
    type: 'success',
    content: '✅ Ready to ship in 30 seconds!',
    delay: 5800,
  },
];

function TypingText({
  text,
  speed = 50,
  onComplete,
}: {
  text: string;
  speed?: number;
  onComplete?: () => void;
}) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <span>
      {displayText}
      {currentIndex < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
          className="text-primary"
        >
          ▋
        </motion.span>
      )}
    </span>
  );
}

export function TerminalComponent() {
  const [currentLine, setCurrentLine] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const commands = terminalSequence
      .filter((line) => line.type === 'command')
      .map((line) => line.content)
      .join('\n');

    navigator.clipboard.writeText(commands);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentLine < terminalSequence.length) {
        setCurrentLine((prev) => prev + 1);
      }
    }, terminalSequence[currentLine]?.delay || 1000);

    return () => clearTimeout(timer);
  }, [currentLine, isTypingComplete]);

  const renderPrompt = (user: string, path: string) => (
    <span className="select-none whitespace-nowrap">
      <span className="text-emerald-400">{user}</span>
      <span className="text-muted-foreground">@</span>
      <span className="text-blue-400">macbook</span>
      <span className="text-muted-foreground">:</span>
      <span className="text-yellow-400 hidden sm:inline">{path}</span>
      <span className="text-yellow-400 sm:hidden">~</span>
      <span className="text-muted-foreground">$</span>
    </span>
  );

  const renderTreeLine = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="pl-2 sm:pl-4 space-y-1 font-mono text-xs sm:text-sm">
        {lines.map((line, index) => (
          <div key={index} className="flex items-center">
            <span className="text-muted-foreground mr-1 sm:mr-2 select-none">
              {line.includes('├──') || line.includes('└──') ? line.split(' ')[0] : ''}
            </span>
            <span
              className={
                line.includes('#')
                  ? 'text-muted-foreground'
                  : line.includes('📁')
                    ? 'text-blue-400'
                    : line.includes('📱')
                      ? 'text-purple-400'
                      : line.includes('📄')
                        ? 'text-yellow-400'
                        : line.includes('⚙️')
                          ? 'text-orange-400'
                          : line.includes('🚀')
                            ? 'text-emerald-400'
                            : 'text-foreground'
              }
            >
              {line.replace(/^[├└]──\s*/, '')}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="bg-gray-900/95 border-gray-700/50 backdrop-blur-xs overflow-hidden shadow-2xl mx-auto max-w-full">
      <CardContent className="p-0">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-gray-800/80 border-b border-gray-700/50">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="flex gap-1 sm:gap-1.5 shrink-0">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors cursor-pointer"></div>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors cursor-pointer"></div>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors cursor-pointer"></div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 text-gray-400 min-w-0">
              <Terminal className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              <span className="text-xs sm:text-sm font-mono truncate">terminal — zsh</span>
              <span className="hidden sm:inline text-xs sm:text-sm font-mono">— 80×24</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-400 hover:text-white hover:bg-gray-700/50 h-6 sm:h-8 px-2 sm:px-3 text-xs font-mono shrink-0 ml-2"
            onClick={copyToClipboard}
          >
            {copied ? (
              <>
                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 text-emerald-400" />
                <span className="hidden sm:inline">Copied!</span>
                <span className="sm:hidden">✓</span>
              </>
            ) : (
              <>
                <Copy className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0 sm:mr-1" />
                <span className="hidden sm:inline">Copy Commands</span>
              </>
            )}
          </Button>
        </div>

        {/* Terminal Content */}
        <div className="p-3 sm:p-6 bg-gray-900/95 font-mono text-xs sm:text-sm min-h-[300px] sm:min-h-[400px] overflow-x-auto terminal-mobile-scroll">
          <div className="space-y-1 sm:space-y-2 min-w-max">
            <AnimatePresence>
              {terminalSequence.slice(0, currentLine + 1).map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="leading-relaxed"
                >
                  {line.type === 'command' && (
                    <div className="flex items-start flex-wrap sm:flex-nowrap">
                      <div className="shrink-0">{renderPrompt(line.user!, line.path!)}</div>
                      <span className="ml-1 sm:ml-2 text-white break-all sm:break-normal whitespace-pre-wrap">
                        {line.typing && index === currentLine ? (
                          <TypingText
                            text={line.content}
                            speed={80}
                            onComplete={() => setIsTypingComplete(true)}
                          />
                        ) : (
                          line.content
                        )}
                      </span>
                    </div>
                  )}

                  {line.type === 'output' && (
                    <div className="text-gray-300 pl-1 sm:pl-2 break-all sm:break-normal">
                      {line.content}
                    </div>
                  )}

                  {line.type === 'tree' && (
                    <div className="text-gray-300 overflow-x-auto">
                      {renderTreeLine(line.content)}
                    </div>
                  )}

                  {line.type === 'info' && (
                    <div className="text-blue-400 pl-1 sm:pl-2 break-all sm:break-normal">
                      {line.content}
                    </div>
                  )}

                  {line.type === 'success' && (
                    <div className="text-emerald-400 pl-1 sm:pl-2 font-semibold break-all sm:break-normal">
                      {line.content}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Blinking cursor at the end */}
            {currentLine >= terminalSequence.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex items-center flex-wrap sm:flex-nowrap"
              >
                <div className="shrink-0">{renderPrompt('dev', '~/projects/kosuke-template')}</div>
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                  className="ml-1 sm:ml-2 text-primary"
                >
                  ▋
                </motion.span>
              </motion.div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
