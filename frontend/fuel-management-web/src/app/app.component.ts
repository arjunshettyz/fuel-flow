import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { SuccessNote, SuccessNoteService } from './core/services/success-note.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly successNote$: Observable<SuccessNote | null>;

  constructor(successNotes: SuccessNoteService) {
    this.successNote$ = successNotes.note$;
  }
}
