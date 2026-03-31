import { Component } from '@angular/core';
import { LanguageService, AppLanguage } from '../../../core/services/language.service';

@Component({
  selector: 'app-language-toggle',
  templateUrl: './language-toggle.component.html',
  styleUrl: './language-toggle.component.scss'
})
export class LanguageToggleComponent {
  constructor(private readonly languageService: LanguageService) {}

  get language(): AppLanguage {
    return this.languageService.language;
  }

  setLanguage(language: AppLanguage): void {
    this.languageService.setLanguage(language);
  }

}
