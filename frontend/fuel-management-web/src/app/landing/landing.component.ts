import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';

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

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit, OnDestroy {
  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

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

  readonly platformHighlights: string[] = [
    'Launch AI-assisted RFPs in minutes.',
    'Compare supplier pricing with live market indexes.',
    'Award contracts with audit-ready documentation.',
  ];

  readonly benefits: { title: string; description: string }[] = [
    {
      title: 'Nationwide coverage',
      description: 'Tap into a vetted network of vendors and on-demand delivery coverage.',
    },
    {
      title: 'No more searching',
      description: 'One platform manages procurement, fulfillment, and billing in one flow.',
    },
    {
      title: '24/7 emergency fueling',
      description: 'Guaranteed SLA-backed response times when fuel cannot wait.',
    },
    {
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
