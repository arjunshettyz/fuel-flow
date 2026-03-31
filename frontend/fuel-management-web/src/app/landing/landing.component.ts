import { Component } from '@angular/core';

interface LandingStat {
  readonly value: string;
  readonly label: string;
}

interface LandingFeature {
  readonly tag: string;
  readonly title: string;
  readonly description: string;
}

interface LandingStep {
  readonly title: string;
  readonly detail: string;
}

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  readonly stats: LandingStat[] = [
    {
      value: '247',
      label: 'Active stations connected',
    },
    {
      value: '99.96%',
      label: 'Uptime across services',
    },
    {
      value: '18s',
      label: 'Average fraud alert response',
    },
    {
      value: '3.4M',
      label: 'Transactions monitored weekly',
    },
  ];

  readonly features: LandingFeature[] = [
    {
      tag: 'Operations',
      title: 'Unified command center',
      description: 'Track inventory, prices, and station activity through one real-time control panel.',
    },
    {
      tag: 'Security',
      title: 'Fraud intelligence engine',
      description: 'Detect suspicious dispensing patterns and trigger multi-channel alerts instantly.',
    },
    {
      tag: 'Experience',
      title: 'Customer-first digital flow',
      description: 'Deliver transparent pricing, instant receipts, and rapid support journeys.',
    },
  ];

  readonly steps: LandingStep[] = [
    {
      title: 'Create your account',
      detail: 'Register as a customer or dealer in under a minute with OTP verification.',
    },
    {
      title: 'Configure your network',
      detail: 'Map stations, assign roles, and import your inventory and pricing baselines.',
    },
    {
      title: 'Operate with confidence',
      detail: 'Monitor analytics, automate workflows, and keep every litre accountable.',
    },
  ];
}
