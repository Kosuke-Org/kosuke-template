'use client';

import { format } from 'date-fns';
import { Check, Copy } from 'lucide-react';

import { useAdminLlmLog } from '@/hooks/use-admin-llm-logs';
import { useClipboard } from '@/hooks/use-clipboard';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

interface LlmLogDrawerProps {
  logId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function LlmLogDrawerSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LlmLogDrawer({ logId, open, onOpenChange }: LlmLogDrawerProps) {
  const { data: log, isLoading } = useAdminLlmLog(logId || '');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Log details</SheetTitle>
          <SheetDescription>View the details of the LLM log.</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <LlmLogDrawerSkeleton />
        ) : !log ? (
          <div className="grid flex-1 auto-rows-min gap-6 px-4">
            <h3 className="mb-1 text-lg font-semibold">Log not found</h3>
            <p className="text-muted-foreground text-sm">
              The log you&apos;re looking for doesn&apos;t exist or has been deleted
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-8rem)] px-4">
            <div className="divide-border space-y-4 divide-y">
              {/* Overview Section */}
              <section className="space-y-4 pb-4">
                <h3 className="text-md font-semibold">Overview</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <h4 className="text-muted-foreground mb-1 text-sm">Timestamp</h4>
                    <div className="text-sm font-medium">
                      {format(new Date(log.timestamp), 'PPpp')}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-muted-foreground mb-1 text-sm">Endpoint</h4>
                    <Badge variant="outline">{log.endpoint}</Badge>
                  </div>
                  <div>
                    <h4 className="text-muted-foreground mb-1 text-sm">Model</h4>
                    <div className="font-mono text-sm">{log.model}</div>
                  </div>
                  <div>
                    <h4 className="text-muted-foreground mb-1 text-sm">Finish Reason</h4>
                    <Badge
                      variant={
                        log.finishReason === 'stop'
                          ? 'default'
                          : log.finishReason === 'error'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {log.finishReason || 'unknown'}
                    </Badge>
                  </div>
                  {log.responseTimeMs && (
                    <div>
                      <div className="text-muted-foreground mb-1 text-sm">Response Time</div>
                      <div className="text-sm font-medium">{log.responseTimeMs}ms</div>
                    </div>
                  )}
                </div>
              </section>
              {/* Token Usage Section */}
              {log.tokensUsed && (
                <section className="space-y-4 pb-4">
                  <h3 className="text-md font-semibold">Token Usage</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <h4 className="text-muted-foreground mb-1 text-sm">Total Tokens</h4>
                      <div className="text-sm font-medium">{log.tokensUsed.toLocaleString()}</div>
                    </div>
                    {log.promptTokens && (
                      <div>
                        <h4 className="text-muted-foreground mb-1 text-sm">Prompt Tokens</h4>
                        <div className="text-sm font-medium">
                          {log.promptTokens.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {log.completionTokens && (
                      <div>
                        <h4 className="text-muted-foreground mb-1 text-sm">Completion Tokens</h4>
                        <div className="text-sm font-medium">
                          {log.completionTokens.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {log.reasoningTokens && (
                      <div>
                        <h4 className="text-muted-foreground mb-1 text-sm">Reasoning Tokens</h4>
                        <div className="text-sm font-medium">
                          {log.reasoningTokens.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {log.cachedInputTokens && (
                      <div>
                        <h4 className="text-muted-foreground mb-1 text-sm">Cached Tokens</h4>
                        <div className="text-sm font-medium">
                          {log.cachedInputTokens.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Context Section */}
              <section className="space-y-2 pb-4">
                <h3 className="text-md font-semibold">Context</h3>
                <div className="space-y-3">
                  {log.user && (
                    <>
                      <h4 className="text-muted-foreground mb-1 text-sm">User</h4>
                      <div>
                        <div className="text-sm font-medium">{log.user.displayName}</div>
                        <div className="text-muted-foreground text-sm">{log.user.email}</div>
                      </div>
                    </>
                  )}
                  {log.organization && (
                    <>
                      <h4 className="text-muted-foreground mb-1 text-sm">Organization</h4>
                      <div>
                        <div className="text-sm font-medium">{log.organization.name}</div>
                      </div>
                    </>
                  )}
                  {log.chatSession && (
                    <div>
                      <div className="text-muted-foreground mb-1 text-sm">Chat Session</div>
                      <div className="text-sm font-medium">{log.chatSession.title}</div>
                    </div>
                  )}
                </div>
              </section>

              {/* System Prompt Section */}
              <section className="space-y-2 pb-4">
                <h3 className="text-md font-semibold">System Prompt</h3>
                {log.systemPrompt ? (
                  <CodeBlock content={log.systemPrompt} />
                ) : (
                  <p className="text-muted-foreground text-sm">No system prompt found</p>
                )}
              </section>

              {/* User Prompt Section */}
              <section className="space-y-2 pb-4">
                <h3 className="text-md font-semibold">User Prompt</h3>
                {log.userPrompt ? (
                  <CodeBlock content={log.userPrompt} />
                ) : (
                  <p className="text-muted-foreground text-sm">No user prompt found</p>
                )}
              </section>

              {/* Response Section */}
              {log.response && (
                <section className="space-y-2 pb-4">
                  <h3 className="text-md font-semibold">Response</h3>
                  <CodeBlock content={log.response} />
                </section>
              )}

              {/* Error Section */}
              {log.errorMessage && (
                <div className="space-y-4">
                  <h3 className="text-destructive text-lg font-semibold">Error Details</h3>
                  <div className="bg-destructive/10 rounded-md p-4">
                    <pre className="text-destructive overflow-x-auto text-xs">
                      {log.errorMessage}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}

const CodeBlock = ({ content }: { content: string }) => {
  const { isCopied, onCopy } = useClipboard();

  const formatContent = (text: string): string => {
    try {
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return text;
    }
  };

  const formattedContent = formatContent(content);

  return (
    <div className="group relative">
      <pre className="bg-muted rounded-md p-4 text-xs whitespace-pre-wrap">{formattedContent}</pre>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => onCopy(content)}
      >
        {isCopied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
};
