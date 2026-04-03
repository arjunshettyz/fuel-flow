import { Component, ElementRef, ViewChild } from '@angular/core';
import { AiAssistantService } from './ai-assistant.service';

interface AssistantMessage {
  role: 'user' | 'assistant';
  text: string;
  time: string;
}

@Component({
  selector: 'app-ai-assistant',
  templateUrl: './ai-assistant.component.html',
  styleUrl: './ai-assistant.component.scss'
})
export class AiAssistantComponent {
  @ViewChild('assistantBody') private assistantBody?: ElementRef<HTMLDivElement>;
  open = false;
  draft = '';
  isSending = false;
  messages: AssistantMessage[] = [
    {
      role: 'assistant',
      text: 'Hi, I am Atlas, your FuelFlow AI assistant. Ask me about orders, pricing, or support workflows.',
      time: this.timeStamp(),
    },
  ];

  suggestions = ['Track an order', 'Explain pricing tiers', 'Help with account login'];

  constructor(private readonly assistant: AiAssistantService) {}

  toggle(): void {
    this.open = !this.open;
    if (this.open) {
      this.queueScroll();
    }
  }

  send(): void {
    const text = this.draft.trim();
    if (!text || this.isSending) {
      return;
    }

    this.pushMessage('user', text);
    this.draft = '';
    this.isSending = true;
    this.queueScroll();

    this.assistant.sendMessage(text).subscribe((reply) => {
      this.isSending = false;
      this.pushMessage('assistant', reply);
    });
  }

  useSuggestion(text: string): void {
    this.draft = text;
    this.send();
  }

  private pushMessage(role: 'user' | 'assistant', text: string): void {
    this.messages = [
      ...this.messages,
      {
        role,
        text,
        time: this.timeStamp(),
      },
    ];
    this.queueScroll();
  }

  private queueScroll(): void {
    setTimeout(() => this.scrollToBottom(), 0);
  }

  private scrollToBottom(): void {
    const body = this.assistantBody?.nativeElement;
    if (!body) {
      return;
    }
    body.scrollTop = body.scrollHeight;
  }

  private timeStamp(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
