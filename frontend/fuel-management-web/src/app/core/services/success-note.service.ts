import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface SuccessNote {
  readonly message: string;
}

@Injectable({ providedIn: 'root' })
export class SuccessNoteService {
  private readonly noteSubject = new BehaviorSubject<SuccessNote | null>(null);
  readonly note$ = this.noteSubject.asObservable();

  private clearTimer: ReturnType<typeof setTimeout> | null = null;

  show(message: string): void {
    this.noteSubject.next({ message });

    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
    }

    this.clearTimer = setTimeout(() => {
      this.noteSubject.next(null);
      this.clearTimer = null;
    }, 5000);
  }

  clear(): void {
    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }

    this.noteSubject.next(null);
  }
}
