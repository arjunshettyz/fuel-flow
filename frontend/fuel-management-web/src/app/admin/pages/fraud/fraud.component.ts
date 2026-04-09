import { Component } from '@angular/core';

interface FraudAlert {
  alertId: string;
  station: string;
  rule: string;
  severity: 'High' | 'Medium' | 'Low';
  transactionId: string;
  timestamp: string;
  status: 'Open' | 'Under Review' | 'Dismissed' | 'Escalated';
}

@Component({
  selector: 'app-fraud',
  templateUrl: './fraud.component.html',
  styleUrl: './fraud.component.scss'
})
export class FraudComponent {
  alerts: FraudAlert[] = [
    { alertId: 'FA-1001', station: 'MG Road', rule: 'HighVolume', severity: 'High', transactionId: 'TX-9911', timestamp: '29 Mar 09:40', status: 'Open' },
    { alertId: 'FA-1002', station: 'HSR Sector 2', rule: 'AfterHours', severity: 'Medium', transactionId: 'TX-9912', timestamp: '29 Mar 09:22', status: 'Under Review' },
    { alertId: 'FA-1003', station: 'Indiranagar', rule: 'PriceDeviation', severity: 'Low', transactionId: 'TX-9892', timestamp: '29 Mar 08:50', status: 'Open' },
  ];

  selectedAlert: FraudAlert | null = null;
  bulkMessage = '';

  openDetails(alert: FraudAlert): void {
    this.selectedAlert = alert;
  }

  mark(alert: FraudAlert, status: FraudAlert['status']): void {
    alert.status = status;
    if (this.selectedAlert?.alertId === alert.alertId) {
      this.selectedAlert = { ...alert };
    }
  }

  bulkDismissLowSeverity(): void {
    let dismissed = 0;
    for (const alert of this.alerts) {
      if (alert.severity === 'Low' && alert.status !== 'Dismissed') {
        alert.status = 'Dismissed';
        dismissed += 1;
      }
    }

    if (this.selectedAlert) {
      const refreshed = this.alerts.find((a) => a.alertId === this.selectedAlert?.alertId);
      this.selectedAlert = refreshed ? { ...refreshed } : this.selectedAlert;
    }

    this.bulkMessage = dismissed > 0 ? `Dismissed ${dismissed} low severity alerts.` : 'No low severity alerts to dismiss.';
  }

}
