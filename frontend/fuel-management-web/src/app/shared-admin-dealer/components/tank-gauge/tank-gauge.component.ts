import { Component } from '@angular/core';
import { Input } from '@angular/core';

@Component({
  selector: 'app-tank-gauge',
  templateUrl: './tank-gauge.component.html',
  styleUrl: './tank-gauge.component.scss'
})
export class TankGaugeComponent {
  @Input() fuelType = 'Petrol';
  @Input() currentLevel = 5500;
  @Input() capacity = 10000;

  get percent(): number {
    return Math.round((this.currentLevel / this.capacity) * 100);
  }

  get statusClass(): 'good' | 'warning' | 'critical' {
    if (this.percent <= 20) {
      return 'critical';
    }
    if (this.percent <= 45) {
      return 'warning';
    }
    return 'good';
  }

}
