import { Component, Input, OnInit } from '@angular/core';
import { ElementRef, ViewChild } from '@angular/core';
import { AiAssistantService } from '../ai-assistant/ai-assistant.service';

type ChatSender = 'user' | 'agent';

interface ChatMessage {
  sender: ChatSender;
  text: string;
  time: string;
}

@Component({
  selector: 'app-chat-panel',
  templateUrl: './chat-panel.component.html',
  styleUrl: './chat-panel.component.scss'
})
export class ChatPanelComponent implements OnInit {
  @ViewChild('chatBody') private chatBody?: ElementRef<HTMLDivElement>;
  @Input() title = 'Support Chat';
  @Input() subtitle = 'Connect with the operations team.';
  @Input() placeholder = 'Type a message...';
  @Input() suggestions: string[] = [];
  @Input() context: 'customer' | 'dealer' = 'customer';

  draft = '';
  isResponding = false;
  messages: ChatMessage[] = [];

  constructor(private readonly assistant: AiAssistantService) {}

  ngOnInit(): void {
    if (!this.messages.length) {
      this.messages = this.getDefaultMessages();
    }

    if (!this.suggestions.length) {
      this.suggestions = this.getDefaultSuggestions();
    }
  }

  send(): void {
    const text = this.draft.trim();
    if (!text) {
      return;
    }

    this.pushMessage('user', text);
    this.draft = '';
    this.aiReply(text);
  }

  useSuggestion(text: string): void {
    this.draft = text;
    this.send();
  }

  private pushMessage(sender: ChatSender, text: string): void {
    this.messages = [
      ...this.messages,
      {
        sender,
        text,
        time: this.timeStamp(),
      },
    ];
    this.queueScroll();
  }

  private aiReply(text: string): void {
    this.isResponding = true;
    const prompt = this.context === 'dealer'
      ? `Dealer Ops: ${text}`
      : `Customer Support: ${text}`;

    this.assistant.sendMessage(prompt).subscribe((response) => {
      this.isResponding = false;
      this.pushMessage('agent', response);
    });
  }

  private getDefaultMessages(): ChatMessage[] {
    const intro = this.context === 'dealer'
      ? 'Hi, dealer ops here. Need help with inventory or shifts?'
      : 'Hi, I can help with orders, receipts, and delivery updates.';
    return [{ sender: 'agent', text: intro, time: this.timeStamp() }];
  }

  private getDefaultSuggestions(): string[] {
    return this.context === 'dealer'
      ? ['Request emergency refill', 'Report pump outage', 'Confirm price update']
      : ['Track my latest order', 'Update delivery window', 'Need receipt help'];
  }

  private timeStamp(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private queueScroll(): void {
    setTimeout(() => {
      const body = this.chatBody?.nativeElement;
      if (!body) {
        return;
      }
      body.scrollTop = body.scrollHeight;
    }, 0);
  }
}
