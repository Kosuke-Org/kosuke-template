'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import { useChatSession } from '@/hooks/use-chat';
import { useDocuments } from '@/hooks/use-documents';
import { useOrganization } from '@/hooks/use-organization';

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputController,
} from '@/components/ai-elements/prompt-input';
import { Button } from '@/components/ui/button';

const AssistantInput = () => {
  const { textInput } = usePromptInputController();

  const router = useRouter();
  const { organization: activeOrganization } = useOrganization();
  const { createSession, isCreatingSession } = useChatSession({
    organizationId: activeOrganization?.id ?? '',
  });

  const handleSubmitPromptInput = async (inputMessage: PromptInputMessage) => {
    const message = inputMessage.text.trim();

    try {
      const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
      const session = await createSession({ title });

      // Store initial message in sessionStorage for the chat page to pick up
      sessionStorage.setItem(`chat-initial-${session.id}`, message);

      router.push(`/org/${activeOrganization?.slug}/assistant/${session.id}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <PromptInput onSubmit={handleSubmitPromptInput}>
      <PromptInputBody>
        <PromptInputTextarea className="min-h-10" disabled={isCreatingSession} autoFocus={true} />
      </PromptInputBody>
      <PromptInputFooter className="justify-end">
        <PromptInputSubmit
          disabled={isCreatingSession || !textInput.value.trim()}
          status={isCreatingSession ? 'submitted' : 'ready'}
        />
      </PromptInputFooter>
    </PromptInput>
  );
};

export default function AssistantPage() {
  const { isLoading: isLoadingAuth } = useAuth();
  const { organization: activeOrganization, isLoading: isLoadingOrg } = useOrganization();

  // TODO: Add endpoint to return indexed documents count
  const { documents, isLoading: isLoadingDocuments } = useDocuments({
    organizationId: activeOrganization?.id ?? '',
    pageSize: 1,
  });

  if (isLoadingOrg || isLoadingDocuments || isLoadingAuth) {
    return null;
  }

  if (documents.length === 0) {
    return (
      <div className="bg-background flex h-full items-center justify-center">
        <div className="max-w-xl space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Kosuke Assistant</h1>
          <p className="text-muted-foreground text-sm">
            You haven&apos;t uploaded any documents yet. Upload documents to start asking questions.
          </p>
          <Button asChild variant="link">
            <Link href={`/org/${activeOrganization?.slug}/documents`}>Go to Documents</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-full items-center justify-center">
      <div className="w-full max-w-2xl space-y-6 px-6 text-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Kosuke Assistant</h1>
          <p className="text-muted-foreground text-center text-sm">
            AI answers, powered by your documents
          </p>
        </div>
        <PromptInputProvider>
          <AssistantInput />
        </PromptInputProvider>
      </div>
    </div>
  );
}
