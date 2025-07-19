'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

const commands = [
  'git clone https://github.com/filopedraz/kosuke-template.git',
  'cd kosuke-template',
  'cd cli',
  'pip install -r requirements.txt',
  'python main.py',
];

export function TerminalComponent() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [visibleCommands, setVisibleCommands] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleCommands((prev) => {
        if (prev < commands.length) {
          return prev + 1;
        }
        return prev;
      });
    }, 600);

    return () => clearInterval(timer);
  }, []);

  const copyCommand = (command: string, index: number) => {
    navigator.clipboard.writeText(command);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllCommands = () => {
    const allCommands = commands.join('\n');
    navigator.clipboard.writeText(allCommands);
    setCopiedIndex(-1);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <Card className="bg-card/50 border-border backdrop-blur-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Terminal className="w-4 h-4" />
              <span className="text-sm font-mono">terminal</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground h-8 px-3 text-xs"
            onClick={copyAllCommands}
          >
            {copiedIndex === -1 ? (
              <Check className="w-3 h-3 mr-1 text-primary" />
            ) : (
              <Copy className="w-3 h-3 mr-1" />
            )}
            Copy All
          </Button>
        </div>

        {/* Terminal Content */}
        <div className="p-6 font-mono text-sm">
          <div className="space-y-3">
            {commands.map((command, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: index < visibleCommands ? 1 : 0,
                  x: index < visibleCommands ? 0 : -20,
                }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="flex items-center group"
              >
                <span className="text-primary mr-2 select-none">$</span>
                <span className="text-foreground flex-1 select-all">{command}</span>
                {index < visibleCommands && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => copyCommand(command, index)}
                  >
                    {copiedIndex === index ? (
                      <Check className="w-3 h-3 text-primary" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </motion.div>
            ))}

            {visibleCommands >= commands.length && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="flex items-center mt-4 pt-3 border-t border-border"
              >
                <span className="text-primary mr-2">✓</span>
                <span className="text-primary text-sm">
                  Interactive setup will guide you through the rest!
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
