import { Component } from '@angular/core';
import { Input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss'
})
export class KpiCardComponent {
  @Input() title = '';
  @Input() value = '';
  @Input() subtitle = '';
  @Input() trend = '';
  @Input() tone: 'neutral' | 'success' | 'warning' | 'danger' = 'neutral';

}
