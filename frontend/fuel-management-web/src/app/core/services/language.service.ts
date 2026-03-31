import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppLanguage = 'en' | 'hi';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly key = 'fuel.lang';
  private readonly langSubject = new BehaviorSubject<AppLanguage>(this.readInitial());
  readonly language$ = this.langSubject.asObservable();

  get language(): AppLanguage {
    return this.langSubject.value;
  }

  setLanguage(language: AppLanguage): void {
    localStorage.setItem(this.key, language);
    this.langSubject.next(language);
  }

  private readInitial(): AppLanguage {
    const persisted = localStorage.getItem(this.key);
    return persisted === 'hi' ? 'hi' : 'en';
  }
}
