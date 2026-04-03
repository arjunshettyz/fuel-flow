import { Component, Input, OnInit } from '@angular/core';

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
  @Input() title = 'Support Chat';
  @Input() subtitle = 'Connect with the operations team.';
  @Input() placeholder = 'Type a message...';
  @Input() suggestions: string[] = [];
  @Input() context: 'customer' | 'dealer' = 'customer';

  draft = '';
  isResponding = false;
  messages: ChatMessage[] = [];

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
    this.mockReply(text);
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
  }

  private mockReply(text: string): void {
    this.isResponding = true;
    const lower = text.toLowerCase();
    const response = this.context === 'dealer'
      ? this.dealerReply(lower)
      : this.customerReply(lower);

    setTimeout(() => {
      this.isResponding = false;
      this.pushMessage('agent', response);
    }, 650);
  }

  private customerReply(text: string): string {
    if (text.includes('track') || text.includes('delivery')) {
      return 'I can check the ETA and latest dispatch note. Which order ID should I pull?';
    }
    if (text.includes('receipt')) {
      return 'Share the receipt number and I will fetch the PDF link for you.';
    }
    if (text.includes('update') || text.includes('window')) {
      return 'Got it. Tell me the new delivery window and we will confirm the change.';
    }
    return 'Thanks for reaching out. How can I help with your fuel order today?';
  }

  private dealerReply(text: string): string {
    if (text.includes('refill') || text.includes('inventory')) {
      return 'I can raise an emergency replenishment ticket. Which tank and current level?';
    }
    if (text.includes('pump') || text.includes('outage')) {
      return 'Understood. Share the pump ID and issue details so we can dispatch maintenance.';
    }
    if (text.includes('price')) {
      return 'I will confirm the latest price revision and notify your shift lead.';
    }
    return 'Dealer ops here. Let me know what needs attention on the forecourt.';
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
}
