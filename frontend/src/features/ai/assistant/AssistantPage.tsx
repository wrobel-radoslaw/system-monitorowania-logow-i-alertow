import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ASSISTANT_GREETING, assistantSuggestions, fakeAnswer } from '../fake-data';

type Message = { role: 'user' | 'bot'; text: string };

const bubbleClass: Record<Message['role'], string> = {
  user: 'self-end border-accent bg-accent-soft',
  bot: 'self-start border-border bg-surface2',
};

function exchange(question: string): Message[] {
  return [
    { role: 'user', text: question },
    { role: 'bot', text: fakeAnswer(question) },
  ];
}

export function AssistantPage() {
  // Root Cause's "Ask Assistant" passes a question to answer on arrival.
  const location = useLocation();
  const initialQuestion = (location.state as { question?: string } | null)?.question;

  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: ASSISTANT_GREETING },
    ...(initialQuestion ? exchange(initialQuestion) : []),
  ]);
  const [draft, setDraft] = useState('');

  function ask(question: string) {
    if (!question.trim()) return;
    setMessages((current) => [...current, ...exchange(question)]);
    setDraft('');
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    ask(draft);
  }

  return (
    <>
      <PageHeader title="Assistant" subtitle="Ask questions about your logs in plain language" />
      <Card className="flex min-h-[420px] flex-col gap-4">
        <div aria-live="polite" className="flex flex-1 flex-col gap-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`max-w-[72%] rounded-xl border px-4 py-3 text-[15px] leading-normal whitespace-pre-line ${bubbleClass[message.role]}`}
            >
              {message.text}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {assistantSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => ask(suggestion)}
              className="cursor-pointer rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted transition-colors duration-150 hover:bg-hover hover:text-text"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            aria-label="Message"
            placeholder="e.g. Why did checkout fail at 14:05?"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="primary">
            Send
          </Button>
        </form>
      </Card>
    </>
  );
}
