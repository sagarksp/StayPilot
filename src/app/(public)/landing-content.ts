export type MetricFormat = "count" | "currency" | "percent" | "hours";

export type LandingMetric = {
  key: string;
  label: string;
  value: number | null;
  format: MetricFormat;
  suffix?: string;
  note?: string;
};

const metric = (
  label: string,
  format: MetricFormat,
  note?: string,
  suffix?: string,
): LandingMetric => ({
  key: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
  label,
  value: null,
  format,
  note,
  suffix,
});

export const landingContent = {
  navigation: [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#onboarding" },
    { label: "Security", href: "#security" },
    { label: "FAQ", href: "#faq" },
  ],
  hero: {
    eyebrow: "ENTERPRISE-GRADE PG & CO-LIVING OPERATIONS",
    title: ["Run your PG.", "Without the chaos."],
    description:
      "StayPilot is in development as a workspace for property teams. The product direction brings property operations and resident self-service together.",
    primaryAction: "Explore the platform",
    secondaryAction: "See how it is taking shape",
    notes: ["Multi-property operations", "Role-aware workflows", "Resident-first product direction"],
    previewTitle: "Portfolio overview",
    previewSubtitle: "Illustrative dashboard concept",
    metrics: [
      metric("Total beds", "count", "Live inventory will appear when connected."),
      metric("Rent collected", "currency"),
      metric("Outstanding dues", "currency"),
      metric("Security deposits", "currency"),
      metric("Open complaints", "count"),
      metric("Upcoming move-outs", "count"),
    ],
    matrixTitle: "Room and bed overview",
    matrixMessage: "Live room allocation will appear when property data is connected.",
  },
  assurance: [
    "Property structure",
    "Resident workflows",
    "Financial overview",
    "Daily operations",
    "Portfolio direction",
  ],
  friction: {
    eyebrow: "OPERATIONAL FRICTION & PRODUCT DIRECTION",
    title: "Move from scattered processes to a clearer operating picture.",
    description:
      "PG operations can span messages, paper records, and payment follow-ups. StayPilot is being designed to bring those workflows into a more structured workspace.",
    fragmentedTitle: "Scattered processes",
    fragmentedSubtitle: "Common operational challenges",
    challenges: [
      {
        title: "Payment details across channels",
        body: "Receipts and follow-ups can be difficult to reconcile when they live in separate conversations.",
      },
      {
        title: "Deposit handovers",
        body: "Move-in and move-out records need a clear path for reviewing balances and deductions.",
      },
      {
        title: "Manual utility tracking",
        body: "Meter readings and shared charges can take time to review and communicate.",
      },
      {
        title: "Disconnected daily tasks",
        body: "Resident requests, meal planning, and staff follow-ups can be hard to coordinate across tools.",
      },
    ],
    systemTitle: "The StayPilot operating system",
    systemSubtitle: "Planned product areas",
    systemItems: [
      {
        title: "Payment and invoice records",
        body: "A connected view of payment activity and resident billing information.",
      },
      {
        title: "Deposit tracking",
        body: "A clearer record of move-in balances and move-out settlements.",
      },
      {
        title: "Utility workflows",
        body: "Structured meter-reading and shared-charge workflows for property teams.",
      },
      {
        title: "Resident and team requests",
        body: "A shared place for resident needs and the staff work that follows.",
      },
    ],
    summaryMetrics: [
      metric("Operational time", "hours", "A future live measure"),
      metric("Reconciled activity", "percent", "A future live measure"),
    ],
  },
  features: {
    eyebrow: "BUILT FOR PROPERTY OPERATIONS",
    title: "Everything a PG operating workspace needs to bring together.",
    description:
      "The planned product spans property structure, resident records, financial workflows, and everyday operations.",
    cards: [
      {
        key: "space",
        icon: "building",
        label: "PROPERTY STRUCTURE",
        title: "Manage your space",
        body: "A property view designed around buildings, floors, rooms, sharing arrangements, and availability.",
        bullets: [
          "Organize properties, floors, and room layouts",
          "Represent different room-sharing arrangements",
          "Keep room allocation and reservation workflows together",
        ],
        previewTitle: "Property layout concept",
      },
      {
        key: "residents",
        icon: "person",
        label: "RESIDENT EXPERIENCE",
        title: "Support every stay",
        body: "A planned resident experience for stay information, onboarding, documents, and handovers.",
        bullets: [
          "Provide a clear path for resident onboarding",
          "Keep stay-related information easy to find",
          "Support organized move-in and move-out workflows",
        ],
        previewTitle: "Resident profile concept",
      },
      {
        key: "money",
        icon: "wallet",
        label: "FINANCIAL WORKFLOWS",
        title: "Bring money into focus",
        body: "A planned financial workspace for invoices, payment records, deposits, and utility charges.",
        bullets: [
          "Structure recurring rent and other charges",
          "Record partial payments and balances",
          "Keep deposit and utility details connected to a stay",
        ],
        previewTitle: "Invoice concept",
      },
      {
        key: "operations",
        icon: "clipboard",
        label: "DAY-TO-DAY OPERATIONS",
        title: "Coordinate daily work",
        body: "A shared structure for resident requests, staff assignments, meal planning, and visitor workflows.",
        bullets: [
          "Keep resident requests connected to follow-up work",
          "Coordinate recurring property tasks",
          "Bring common staff workflows into one view",
        ],
        previewTitle: "Daily operations concept",
      },
    ],
  },
  occupancy: {
    eyebrow: "ROOM & BED VISIBILITY",
    title: "See property availability in context.",
    description:
      "Set up properties and organize floors, rooms, and beds. Occupancy and availability views will follow when resident stay workflows are connected.",
    propertyLabel: "Property overview",
    locationLabel: "Property location will appear with live data",
    occupancy: metric("Occupancy", "percent"),
    totalBeds: metric("Total beds", "count"),
    occupiedBeds: metric("Occupied", "count"),
    availableBeds: metric("Available", "count"),
    reservedBeds: metric("Reserved", "count"),
    statuses: [
      { label: "Available", color: "available" },
      { label: "Reserved", color: "reserved" },
      { label: "Occupied", color: "occupied" },
      { label: "Maintenance", color: "maintenance" },
    ],
    matrixMessage: "Bed-level details will appear when live property data is connected.",
  },
  finance: {
    eyebrow: "FINANCIAL WORKFLOWS",
    title: "Make amounts due and paid easier to follow.",
    description:
      "The planned finance views bring invoices, payment records, shared charges, and deposit settlements into a clear review flow.",
    invoiceTitle: "Invoice preview",
    invoiceState: "Live invoice data not connected",
    invoiceRows: [
      { label: "Base stay charge", metric: metric("Base stay charge", "currency") },
      { label: "Utility charges", metric: metric("Utility charges", "currency") },
      { label: "Property services", metric: metric("Property services", "currency") },
    ],
    invoiceTotal: metric("Total due", "currency"),
    invoicePaid: metric("Paid", "currency"),
    invoiceBalance: metric("Balance", "currency"),
    depositTitle: "Deposit settlement concept",
    depositDescription:
      "A planned review of recorded deposits, property charges, and settlement details.",
    depositRows: [
      { label: "Deposit held", metric: metric("Deposit held", "currency") },
      { label: "Property charges", metric: metric("Property charges", "currency") },
      { label: "Resident balance", metric: metric("Resident balance", "currency") },
    ],
    paymentNote: "Payment and settlement details will appear when financial data is connected.",
  },
  residents: {
    eyebrow: "RESIDENT EXPERIENCE",
    title: "A simpler experience for residents too.",
    description:
      "StayPilot is being designed around a lightweight resident experience for stay information, payment records, requests, and everyday updates.",
    benefits: [
      {
        icon: "receipt",
        title: "Stay and payment information",
        body: "A planned view for resident documents, invoices, and recorded payments.",
      },
      {
        icon: "meal",
        title: "Everyday preferences",
        body: "A planned place for residents to share common preferences and responses.",
      },
      {
        icon: "support",
        title: "Requests and follow-up",
        body: "A clearer path for resident requests and the property team response.",
      },
    ],
    phoneTitle: "Resident portal concept",
    phoneStatus: "Resident data not connected",
    phoneMetrics: [
      metric("Current balance", "currency"),
      metric("Request status", "count", undefined, "open"),
    ],
    phoneActions: ["Stay details", "Payment records", "Support request", "Property updates"],
  },
  portfolio: {
    eyebrow: "PORTFOLIO SCALE",
    title: "One portfolio view, shaped for every property.",
    description:
      "The planned portfolio overview will help multi-property teams review property activity and compare live operating information.",
    metrics: [
      metric("Portfolio beds", "count"),
      metric("Collected revenue", "currency"),
      metric("Occupancy", "percent"),
    ],
    propertyEmptyState: "Property comparisons will appear when live portfolio data is connected.",
  },
  onboarding: {
    eyebrow: "A CLEARER SETUP PATH",
    title: "A structured path from setup to daily operations.",
    description:
      "The planned onboarding flow is organized around the work teams need to complete before day-to-day operations begin.",
    steps: [
      {
        index: "01",
        title: "Set up properties",
        body: "Organize property details, floors, rooms, and availability structures.",
        result: "Property structure",
      },
      {
        index: "02",
        title: "Prepare resident records",
        body: "Plan how resident details, contacts, and stay documents will be organized.",
        result: "Resident information",
      },
      {
        index: "03",
        title: "Configure operating workflows",
        body: "Set up the billing, request, and property workflows your team uses.",
        result: "Team workflows",
      },
      {
        index: "04",
        title: "Review portfolio activity",
        body: "Bring property-level work into a portfolio view as live data becomes available.",
        result: "Portfolio overview",
      },
    ],
  },
  security: {
    eyebrow: "ENTERPRISE TRUST & GOVERNANCE",
    title: "Responsible handling is part of the product design.",
    description:
      "Privacy, access, and accountability are important design requirements for a workspace that will support resident and financial information.",
    principles: [
      {
        icon: "roles",
        title: "Role-aware access",
        body: "Access should reflect each team member’s responsibilities and property scope.",
      },
      {
        icon: "lock",
        title: "Careful document handling",
        body: "Resident documents should be protected and available only to authorized people.",
      },
      {
        icon: "audit",
        title: "Accountable operations",
        body: "Important changes should be traceable to support clear operational reviews.",
      },
      {
        icon: "privacy",
        title: "Resident privacy",
        body: "Personal information should be visible only where it is needed for the work.",
      },
    ],
  },
  faq: {
    eyebrow: "COMMON QUESTIONS",
    title: "Frequently asked questions",
    description: "A few details about StayPilot and the product currently taking shape.",
    items: [
      {
        question: "What is StayPilot?",
        answer:
          "StayPilot is a product in development for PG and co-living operators. It is being designed to bring property operations and resident-facing workflows into one workspace.",
      },
      {
        question: "Can it manage multiple properties?",
        answer:
          "You can create multiple properties and set up their floors, rooms, and beds. Occupancy views and cross-property reporting are still being developed.",
      },
      {
        question: "Will resident and financial data appear on this page?",
        answer:
          "The metric areas are prepared for configurable values. They will remain empty until a live data source is connected.",
      },
      {
        question: "Can residents use a mobile experience?",
        answer:
          "A mobile-friendly resident experience is part of the design direction. Its workflows are still being developed.",
      },
      {
        question: "Can I book a live demo?",
        answer:
          "Demo scheduling is not available yet. This page will be updated when a working demo is ready.",
      },
    ],
  },
  closing: {
    eyebrow: "PG & CO-LIVING OPERATIONS",
    title: "A clearer operating picture starts with connected work.",
    description:
      "StayPilot is taking shape around the people, properties, and day-to-day work behind every stay.",
    primaryAction: "Explore product areas",
    secondaryAction: "Read common questions",
    note: "Property setup is available in the workspace. Resident, finance, and reporting workflows are still in development.",
  },
  footer: {
    description:
      "A workspace in development for property operations and resident self-service.",
    columns: [
      {
        title: "PRODUCT",
        links: [
          { label: "Platform overview", href: "#features" },
          { label: "Room and bed view", href: "#occupancy" },
          { label: "Resident experience", href: "#residents" },
        ],
      },
      {
        title: "WORKFLOWS",
        links: [
          { label: "Property structure", href: "#features" },
          { label: "Financial workflows", href: "#finance" },
          { label: "Daily operations", href: "#features" },
        ],
      },
      {
        title: "INFORMATION",
        links: [
          { label: "Security principles", href: "#security" },
          { label: "Common questions", href: "#faq" },
          { label: "Product status", href: "#product-status" },
        ],
      },
    ],
    legal: "© StayPilot. Product in development.",
  },
};

export function formatLandingMetric(metricValue: LandingMetric): string {
  if (metricValue.value === null || !Number.isFinite(metricValue.value)) {
    return "—";
  }

  const value = metricValue.value;

  switch (metricValue.format) {
    case "currency":
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value);
    case "percent":
      return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value)}%`;
    case "hours":
      return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value)}${metricValue.suffix ?? " hrs"}`;
    case "count":
      return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}${metricValue.suffix ? ` ${metricValue.suffix}` : ""}`;
  }
}
