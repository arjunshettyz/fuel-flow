import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';

interface LandingStat {
  readonly value: string;
  readonly label: string;
}

interface LandingStep {
  readonly title: string;
  readonly detail: string;
}

interface LandingPlan {
  readonly name: string;
  readonly price: string;
  readonly description: string;
  readonly features: string[];
  readonly featured?: boolean;
}

interface LandingTestimonial {
  readonly quote: string;
  readonly name: string;
  readonly role: string;
  readonly company: string;
}

interface LandingFaq {
  readonly question: string;
  readonly answer: string;
}

interface LandingBenefit {
  readonly icon: 'coverage' | 'search' | 'emergency' | 'pricing';
  readonly title: string;
  readonly description: string;
}

interface SolutionCard {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

interface VendorRow {
  readonly name: string;
  readonly region: string;
  readonly phone: string;
}

interface ComparisonRow {
  readonly feature: string;
  readonly values: boolean[];
}

interface SolutionHighlight {
  readonly title: string;
  readonly detail: string;
}

interface PlatformModuleInfo {
  readonly title: string;
  readonly description: string;
  readonly points: string[];
  readonly image: string;
  readonly imageAlt: string;
}

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit, OnDestroy {
  contactSubmitting = false;
  contactSuccess = false;
  contactError = '';

  readonly contactForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.maxLength(40)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(4000)]],
  });

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly fb: FormBuilder,
    private readonly http: HttpClient
  ) {}

  submitContact(): void {
    this.contactSuccess = false;
    this.contactError = '';

    if (this.contactSubmitting) {
      return;
    }

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.contactSubmitting = true;

    const payload = {
      name: this.contactForm.controls.name.value.trim(),
      email: this.contactForm.controls.email.value.trim(),
      phone: this.contactForm.controls.phone.value.trim(),
      message: this.contactForm.controls.message.value.trim(),
    };

    this.http.post(`${environment.apiBaseUrl}/gateway/public/contact`, payload).subscribe({
      next: () => {
        this.contactSubmitting = false;
        this.contactSuccess = true;
        this.contactForm.reset({ name: '', email: '', phone: '', message: '' });
      },
      error: (err: HttpErrorResponse) => {
        this.contactSubmitting = false;
        this.contactError = this.resolveContactError(err);
      },
    });
  }

  private resolveContactError(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return `Server is not reachable (${environment.apiBaseUrl}). Please start the backend and try again.`;
    }

    if (err.status === 429) {
      return 'Too many requests. Please wait a minute and try again.';
    }

    const message = this.extractErrorMessage(err.error);
    if (message) {
      return message;
    }

    if (err.status === 503) {
      return 'Service is temporarily unavailable. Please try again in a moment.';
    }

    if (err.status >= 500) {
      return `Server error (${err.status}). Please try again later.`;
    }

    if (err.status >= 400) {
      return `Request failed (${err.status}). Please try again.`;
    }

    return 'Could not send your message. Please try again.';
  }

  private extractErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      const text = error.trim();
      return text && !text.toLowerCase().includes('<html') ? text : '';
    }

    if (!error || typeof error !== 'object') {
      return '';
    }

    const obj = error as Record<string, unknown>;

    if (typeof obj['message'] === 'string' && obj['message'].trim()) {
      return obj['message'].trim();
    }

    const errors = obj['errors'] ?? obj['Errors'];
    if (Array.isArray(errors) && errors.length > 0) {
      const first = errors[0] as unknown;
      if (typeof first === 'string' && first.trim()) {
        return first.trim();
      }

      if (first && typeof first === 'object') {
        const firstObj = first as Record<string, unknown>;
        if (typeof firstObj['message'] === 'string' && firstObj['message'].trim()) {
          return firstObj['message'].trim();
        }

        if (typeof firstObj['Message'] === 'string' && firstObj['Message'].trim()) {
          return firstObj['Message'].trim();
        }
      }
    }

    return '';
  }

  ngOnInit(): void {
    this.document.body.classList.add('landing-theme');
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('landing-theme');
  }

  readonly stats: LandingStat[] = [
    {
      value: '12.4%',
      label: 'Average fuel cost reduction',
    },
    {
      value: '98%',
      label: 'On-time delivery performance',
    },
    {
      value: '24/7',
      label: 'Dispatch and vendor coverage',
    },
    {
      value: '₹2.8M',
      label: 'Annual savings tracked',
    },
  ];

  readonly modules: string[] = [
    'FuelEvent',
    'FuelControl',
    'FuelIQ',
    'FuelRescue',
    'FuelIntel',
    'FuelConnect',
  ];

  selectedModule = this.modules[0];

  readonly moduleDetails: Record<string, PlatformModuleInfo> = {
    FuelEvent: {
      title: 'AI-powered RFP and procurement engine',
      description: 'Launch and manage competitive fuel bids, compare pricing, and award contracts in-platform with full historical audit trails.',
      points: [
        'Launch AI-assisted RFPs in minutes.',
        'Compare supplier pricing with live market indexes.',
        'Award contracts with audit-ready documentation.',
      ],
      image: 'assets/landing/platform-rfp.svg',
      imageAlt: 'RFP procurement workspace preview',
    },
    FuelControl: {
      title: 'Daily operations control center',
      description: 'Track dispatch, deliveries, invoices, and station-level exceptions from a unified operations command panel.',
      points: [
        'Unified order lifecycle timeline.',
        'Live station fulfillment status.',
        'Centralized payment and invoice controls.',
      ],
      image: 'assets/landing/workflow-issue.svg',
      imageAlt: 'Operations control dashboard preview',
    },
    FuelIQ: {
      title: 'Intelligence and anomaly detection',
      description: 'Use AI insights to detect usage anomalies, forecast demand, and optimize route-level fueling decisions.',
      points: [
        'Demand forecasting by location.',
        'Fraud pattern detection alerts.',
        'Cost variance analytics with trend views.',
      ],
      image: 'assets/landing/hero-line.svg',
      imageAlt: 'Fuel intelligence analytics preview',
    },
    FuelRescue: {
      title: 'Emergency response orchestration',
      description: 'Trigger critical fuel replenishment workflows with SLA-backed response windows and coordinated dispatch.',
      points: [
        'Emergency request escalation path.',
        'SLA countdown and response tracking.',
        'Multi-vendor fallback dispatch.',
      ],
      image: 'assets/landing/coverage-sla.svg',
      imageAlt: 'Emergency fueling SLA panel preview',
    },
    FuelIntel: {
      title: 'Executive intelligence layer',
      description: 'Access strategic reports for spend, performance, and compliance with export-ready dashboards.',
      points: [
        'Board-ready performance snapshots.',
        'Compliance-ready data trails.',
        'Spend trends across vendors and geographies.',
      ],
      image: 'assets/landing/coverage-chart.svg',
      imageAlt: 'Executive intelligence chart preview',
    },
    FuelConnect: {
      title: 'Connected supplier network',
      description: 'Operate through a nationwide fuel partner network with transparent pricing and automated coordination.',
      points: [
        'Unified partner directory and onboarding.',
        'Rate cards with transparent benchmarks.',
        'Automated dispatch communication loops.',
      ],
      image: 'assets/landing/coverage-network.svg',
      imageAlt: 'Fuel supplier network preview',
    },
  };

  get activeModule(): PlatformModuleInfo {
    return this.moduleDetails[this.selectedModule] ?? this.moduleDetails['FuelEvent'];
  }

  selectModule(module: string): void {
    this.selectedModule = module;
  }

  readonly platformHighlights: string[] = [
    'Launch AI-assisted RFPs in minutes.',
    'Compare supplier pricing with live market indexes.',
    'Award contracts with audit-ready documentation.',
  ];

  readonly benefits: LandingBenefit[] = [
    {
      icon: 'coverage',
      title: 'Nationwide coverage',
      description: 'Tap into a vetted network of vendors and on-demand delivery coverage.',
    },
    {
      icon: 'search',
      title: 'No more searching',
      description: 'One platform manages procurement, fulfillment, and billing in one flow.',
    },
    {
      icon: 'emergency',
      title: '24/7 emergency fueling',
      description: 'Guaranteed SLA-backed response times when fuel cannot wait.',
    },
    {
      icon: 'pricing',
      title: 'Transparent pricing',
      description: 'Know exactly what you are paying with instant cost visibility.',
    },
  ];

  readonly steps: LandingStep[] = [
    {
      title: 'Issue a smart RFP',
      detail: 'Create an AI-assisted bid in minutes and send it to your vendor network.',
    },
    {
      title: 'Select the best supplier',
      detail: 'Compare pricing and SLAs with live market benchmarks and recommendations.',
    },
    {
      title: 'Track delivery end-to-end',
      detail: 'See dispatch progress, verify delivery, and close invoices in one place.',
    },
  ];

  readonly solutionCards: SolutionCard[] = [
    {
      icon: 'OR',
      title: 'On-Road & Off-Road Delivery',
      description: 'Direct-to-vehicle fueling for fleets and equipment.',
    },
    {
      icon: 'BF',
      title: 'Bulk Fuel Delivery',
      description: 'High-volume orders with competitive pricing.',
    },
    {
      icon: 'RF',
      title: 'Reefer Fuel Delivery',
      description: 'Temperature-controlled shipments stay powered.',
    },
    {
      icon: 'BW',
      title: 'Bulk Water Delivery',
      description: 'Supply large-scale water for industrial or emergency use.',
    },
    {
      icon: 'GF',
      title: 'Generator Fueling',
      description: 'Ensure backup power systems stay operational.',
    },
    {
      icon: 'MF',
      title: 'Mobile Fleet Fueling',
      description: 'On-site fueling that keeps your fleet moving.',
    },
    {
      icon: 'ST',
      title: 'On-Site Tank Fueling',
      description: 'Convenient fuel supply for construction and industrial sites.',
    },
    {
      icon: 'TP',
      title: 'Tank Rentals, Testing & Polishing',
      description: 'Short or long-term rentals, testing, and fuel polishing.',
    },
  ];

  readonly networkVendors: VendorRow[] = [
    { name: 'Energy LLC.', region: 'New Lenox', phone: '(603) 555-0123' },
    { name: 'ACME Fuels', region: 'Headquarters', phone: '(704) 555-0127' },
    { name: 'ABC Petroleum', region: 'New Lenox', phone: '(205) 555-0100' },
    { name: 'Vendor LLC.', region: 'Headquarters', phone: '(505) 555-0125' },
    { name: 'Tom\'s Fuels', region: 'Headquarters', phone: '(316) 555-0116' },
    { name: 'Interlock', region: 'New Lenox', phone: '(555) 1234-555' },
  ];

  readonly smartSolutions: string[] = [
    'Hydrogen and clean energy solutions.',
    'Operational optimization to reduce idle time.',
    'Fuel data for ESG reporting and compliance.',
    'Biofuel and renewable options for blended fleets.',
  ];

  readonly comparisonHeaders: string[] = [
    'FuelFlow',
    'Software Only',
    'National Supplier',
    'Local Supplier',
    'Brokers',
  ];

  readonly comparisonRows: ComparisonRow[] = [
    { feature: 'National fueling', values: [true, false, true, false, true] },
    { feature: 'Data insights', values: [true, true, false, false, false] },
    { feature: 'RFP tool', values: [true, true, false, false, false] },
    { feature: 'Automated ordering', values: [true, true, false, false, false] },
    { feature: 'Inventory management', values: [true, true, true, true, false] },
    { feature: 'Invoice auditing', values: [true, false, false, false, false] },
    { feature: 'Integrations', values: [true, true, false, false, false] },
    { feature: 'Vendor scores', values: [true, false, false, false, false] },
    { feature: 'Competitive pricing', values: [true, false, false, true, false] },
    { feature: 'Price validation', values: [true, false, false, false, false] },
    { feature: 'Automated onboarding', values: [true, false, false, false, false] },
    { feature: 'Mission critical', values: [true, false, true, true, false] },
  ];

  readonly rescueHighlights: SolutionHighlight[] = [
    {
      title: 'Standby fueling agreements (SLAs)',
      detail: 'Guaranteed fuel within 4, 8, 12, 24, or 48 hours.',
    },
    {
      title: 'Real-time monitoring with FuelIQ',
      detail: 'Integrated tank-level tracking and automated refill alerts.',
    },
    {
      title: 'Proactive weather-triggered reordering',
      detail: 'Fuel planning activated before storms and extreme conditions.',
    },
    {
      title: 'Nationwide availability and centralized support',
      detail: 'One partner for all regions with dedicated service coordination.',
    },
  ];

  readonly payFeatures: SolutionHighlight[] = [
    {
      title: 'Nationwide access',
      detail: 'No hidden fees, competitive discounts, and easy tracking.',
    },
    {
      title: 'Expense management',
      detail: 'Monitor fuel spend, fraud detection, and driver tracking.',
    },
    {
      title: 'Automated invoicing',
      detail: 'No more physical receipts - FuelPay integrates with accounting.',
    },
    {
      title: 'Virtual fleet card',
      detail: 'Pay at the pump digitally with secure virtual cards.',
    },
    {
      title: 'Reporting',
      detail: 'Centralize data to optimize operations and compliance.',
    },
    {
      title: 'Fraud prevention and security',
      detail: 'AI-powered monitoring detects anomalies in real time.',
    },
  ];

  readonly testimonials: LandingTestimonial[] = [
    {
      quote: 'FuelFlow helped us reduce fuel spend and simplify vendor management overnight.',
      name: 'Leah Grant',
      role: 'Operations Director',
      company: 'Blue Ridge Transit',
    },
    {
      quote: 'The live pricing index keeps our team aligned and eliminates costly surprises.',
      name: 'Marcus Lane',
      role: 'Fleet Manager',
      company: 'Summit Logistics',
    },
    {
      quote: 'Our dispatch team can respond to emergencies faster with clear SLAs.',
      name: 'Jenna Patel',
      role: 'Procurement Lead',
      company: 'MetroRail Services',
    },
  ];

  readonly plans: LandingPlan[] = [
    {
      name: 'Essential',
      price: '₹0',
      description: 'Marketplace access and baseline analytics for lean teams.',
      features: [
        'Vendor directory access',
        'Basic reporting dashboard',
        'Standard delivery SLAs',
      ],
    },
    {
      name: 'Growth',
      price: '₹499/mo',
      description: 'AI procurement automation and real-time market benchmarking.',
      features: [
        'AI RFP automation',
        'Live pricing index',
        'Multi-site controls',
        'Priority dispatch support',
      ],
      featured: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'Custom integrations, security, and enterprise-grade workflows.',
      features: [
        'Dedicated success team',
        'Custom integrations',
        'Advanced compliance tooling',
      ],
    },
  ];

  readonly faqs: LandingFaq[] = [
    {
      question: 'How fast can we onboard our fuel locations?',
      answer: 'Most networks are onboarded in under two weeks with guided data imports.',
    },
    {
      question: 'Do you support emergency and after-hours fueling?',
      answer: 'Yes, FuelFlow provides 24/7 dispatch with SLA-backed response times.',
    },
    {
      question: 'Can we compare vendor pricing across markets?',
      answer: 'Live benchmark indexes show price ranges so you can negotiate with confidence.',
    },
    {
      question: 'What types of fuel deliveries are supported?',
      answer: 'We support bulk, mobile, and on-site fueling for fleets of any size.',
    },
    {
      question: 'Is FuelFlow compliant with audit requirements?',
      answer: 'Every order includes an audit trail with approvals, delivery proof, and invoices.',
    },
    {
      question: 'Can we integrate with our ERP or accounting tools?',
      answer: 'Enterprise plans include custom integrations with popular ERP platforms.',
    },
  ];
}
