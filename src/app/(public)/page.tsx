import type { ReactNode } from "react";
import { formatLandingMetric, landingContent } from "./landing-content";
import styles from "./landing.module.css";

type IconName =
  | "building"
  | "person"
  | "wallet"
  | "clipboard"
  | "receipt"
  | "meal"
  | "support"
  | "roles"
  | "lock"
  | "audit"
  | "privacy";

const statusClassNames: Record<string, string> = {
  available: styles.statusAvailable,
  reserved: styles.statusReserved,
  occupied: styles.statusOccupied,
  maintenance: styles.statusMaintenance,
};

function BrandMark() {
  return (
    <svg aria-hidden="true" className={styles.brandMark} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="12" fill="currentColor" />
      <path d="M11 27.5V12.5h4.2l9.6 9.9v-9.9H29v15h-4.1l-9.7-10v10H11Z" fill="white" />
      <circle cx="30.5" cy="10" r="2.5" fill="#C28E38" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={styles.arrowIcon}>
      <path d="M4.25 10h11.5m-4.75-4.75L15.75 10 11 14.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const shared = {
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  let drawing: ReactNode;

  switch (name) {
    case "building":
      drawing = <><path d="M5 27h22M8 27V9l8-4 8 4v18" {...shared} /><path d="M12 12h.01M20 12h.01M12 17h.01M20 17h.01M14 27v-6h4v6" {...shared} /></>;
      break;
    case "person":
      drawing = <><circle cx="16" cy="10" r="4" {...shared} /><path d="M7 27c.7-5.4 3.7-8 9-8s8.3 2.6 9 8" {...shared} /></>;
      break;
    case "wallet":
      drawing = <><rect x="5" y="8" width="22" height="17" rx="3" {...shared} /><path d="M6 11h17a3 3 0 0 0 3-3M20 17h.01" {...shared} /></>;
      break;
    case "clipboard":
    case "receipt":
      drawing = <><path d="M11 7H8v21l4-2 4 2 4-2 4 2V7h-3" {...shared} /><rect x="11" y="4" width="10" height="6" rx="2" {...shared} /><path d="M13 15h6M13 19h6" {...shared} /></>;
      break;
    case "meal":
      drawing = <><path d="M7 5v9M11 5v9M7 10h4M9 14v13M21 5v22M21 5c4 2.5 4 7 0 9" {...shared} /></>;
      break;
    case "support":
      drawing = <><path d="M6 17v-2a10 10 0 0 1 20 0v2" {...shared} /><rect x="5" y="16" width="5" height="8" rx="2" {...shared} /><rect x="22" y="16" width="5" height="8" rx="2" {...shared} /><path d="M22 25c-1.5 2-3.5 2-6 2" {...shared} /></>;
      break;
    case "roles":
      drawing = <><circle cx="12" cy="11" r="3.5" {...shared} /><circle cx="22" cy="12" r="2.5" {...shared} /><path d="M5.5 25c.5-4.3 2.7-6.5 6.5-6.5s6 2.2 6.5 6.5M20 19c3.5-.5 5.5 1.5 6 5" {...shared} /></>;
      break;
    case "lock":
      drawing = <><rect x="6" y="13" width="20" height="14" rx="3" {...shared} /><path d="M10 13V9a6 6 0 0 1 12 0v4M16 18v4" {...shared} /></>;
      break;
    case "audit":
      drawing = <><path d="M8 5h12l5 5v17H8zM20 5v6h5M12 17h9M12 21h6" {...shared} /><path d="m4 9 1 1 2-2" {...shared} /></>;
      break;
    case "privacy":
      drawing = <><path d="M16 4 6 8v7c0 6 4 10 10 13 6-3 10-7 10-13V8l-10-4Z" {...shared} /><path d="M12 16a4 4 0 0 1 8 0v4h-8zM14 14v-2a2 2 0 0 1 4 0v2" {...shared} /></>;
      break;
  }

  return (
    <svg aria-hidden="true" className={`${styles.icon} ${className}`} viewBox="0 0 32 32" fill="none">
      {drawing}
    </svg>
  );
}

function MetricCard({
  metricValue,
  className = "",
}: {
  metricValue: (typeof landingContent.hero.metrics)[number];
  className?: string;
}) {
  return (
    <div className={`${styles.metricCard} ${className}`}>
      <span className={styles.metricLabel}>{metricValue.label}</span>
      <strong>{formatLandingMetric(metricValue)}</strong>
      {metricValue.note ? <span className={styles.metricNote}>{metricValue.note}</span> : null}
    </div>
  );
}

function EmptyMatrix({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.emptyMatrix} ${compact ? styles.emptyMatrixCompact : ""}`} aria-hidden="true">
      <div className={styles.matrixHeader}><span /><span /><span /><span /></div>
      <div className={styles.matrixRows}>
        <div><span /><i /><i /><i /><i /></div>
        <div><span /><i /><i /><i /><i /></div>
        <div><span /><i /><i /><i /><i /></div>
      </div>
    </div>
  );
}

function ConceptPreview({ kind }: { kind: string }) {
  if (kind === "space") {
    return (
      <div className={styles.conceptPreview} aria-hidden="true">
        <div className={styles.conceptTopline}><span /><span /></div>
        <div className={styles.floorSketch}>
          <span /><span /><span /><span /><span /><span />
        </div>
        <div className={styles.conceptFootline}><span /><span /><span /></div>
      </div>
    );
  }

  if (kind === "residents") {
    return (
      <div className={`${styles.conceptPreview} ${styles.residentPreview}`} aria-hidden="true">
        <div className={styles.profilePlaceholder}><span /><i /><i /><i /></div>
        <div className={styles.documentPlaceholder}><span /><i /><i /></div>
      </div>
    );
  }

  if (kind === "money") {
    const invoice = landingContent.finance;
    return (
      <div className={`${styles.conceptPreview} ${styles.invoicePreview}`} aria-hidden="true">
        <div className={styles.invoicePreviewHeader}><span>{invoice.invoiceTitle}</span><span>—</span></div>
        {invoice.invoiceRows.map((row) => (
          <div className={styles.invoicePreviewRow} key={row.label}>
            <span>{row.label}</span><strong>{formatLandingMetric(row.metric)}</strong>
          </div>
        ))}
        <div className={`${styles.invoicePreviewRow} ${styles.invoicePreviewTotal}`}>
          <span>{invoice.invoiceTotal.label}</span><strong>{formatLandingMetric(invoice.invoiceTotal)}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.conceptPreview} ${styles.operationsPreview}`} aria-hidden="true">
      <div className={styles.operationPreviewTitle}><Icon name="clipboard" /> <span>{landingContent.features.cards[3].previewTitle}</span></div>
      <div className={styles.operationPreviewRows}>
        <span>Resident requests</span><i />
        <span>Property follow-up</span><i />
        <span>Team coordination</span><i />
      </div>
    </div>
  );
}

function FeatureCard({ feature }: { feature: (typeof landingContent.features.cards)[number] }) {
  return (
    <article className={styles.featureCard}>
      <div className={styles.featureCardCopy}>
        <span className={styles.featureIconWrap}><Icon name={feature.icon as IconName} /></span>
        <p className={styles.featureKicker}>{feature.label}</p>
        <h3>{feature.title}</h3>
        <p className={styles.featureBody}>{feature.body}</p>
        <ul className={styles.featureBullets}>
          {feature.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
        </ul>
      </div>
      <div className={styles.featureCardVisual}>
        <ConceptPreview kind={feature.key} />
      </div>
    </article>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "left",
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
}) {
  return (
    <div className={`${styles.sectionHeading} ${align === "center" ? styles.sectionHeadingCenter : ""}`}>
      <p className={styles.eyebrow}><span />{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export default function PublicHomePage() {
  const content = landingContent;

  return (
    <main className={styles.page}>
      <div className={styles.productNotice} id="product-status">
        <span className={styles.noticeDot} /> StayPilot is in development. Metrics and workflows are not live yet.
      </div>

      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="StayPilot home">
          <BrandMark /><span>StayPilot</span>
          <small>ASSET SYSTEMS</small>
        </a>
        <nav className={styles.navigation} aria-label="Main navigation">
          {content.navigation.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
        </nav>
        <a className={styles.headerAction} href="#closing">Explore StayPilot <ArrowIcon /></a>
      </header>

      <section className={styles.hero} id="top" aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span />{content.hero.eyebrow}</p>
          <h1 id="hero-title">{content.hero.title[0]}<br /><em>{content.hero.title[1]}</em></h1>
          <p className={styles.heroDescription}>{content.hero.description}</p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#features">{content.hero.primaryAction}<ArrowIcon /></a>
            <a className={styles.secondaryButton} href="#onboarding"><span className={styles.playIcon} />{content.hero.secondaryAction}</a>
          </div>
          <div className={styles.heroNotes}>
            {content.hero.notes.map((note) => (
              <span key={note}><span className={styles.checkMark}>✓</span>{note}</span>
            ))}
          </div>
        </div>

        <div className={styles.heroVisual} role="img" aria-label="Illustrative StayPilot portfolio dashboard concept with live metric fields left empty until data is connected">
          <div className={styles.dashboardWindow}>
            <div className={styles.dashboardBrowserBar}>
              <div className={styles.browserDots}><i /><i /><i /></div>
              <span className={styles.browserAddress}>StayPilot / {content.hero.previewTitle}</span>
              <span className={styles.previewBadge}>CONCEPT PREVIEW</span>
            </div>
            <div className={styles.dashboardTopbar}>
              <span className={styles.workspaceName}><Icon name="building" />{content.hero.previewTitle}</span>
              <span className={styles.workspaceSelector}>Property data unavailable <span>⌄</span></span>
            </div>
            <div className={styles.dashboardMetrics}>
              {content.hero.metrics.map((metricValue, index) => (
                <MetricCard metricValue={metricValue} className={index === 0 ? styles.primaryMetric : ""} key={metricValue.label} />
              ))}
            </div>
            <div className={styles.dashboardMatrixPanel}>
              <div className={styles.panelHeading}>
                <div><span className={styles.panelEyebrow}>PROPERTY VIEW</span><h2>{content.hero.matrixTitle}</h2></div>
                <span className={styles.emptyStatePill}>LIVE DATA NOT CONNECTED</span>
              </div>
              <EmptyMatrix />
              <p className={styles.matrixMessage}>{content.hero.matrixMessage}</p>
            </div>
          </div>
          <div className={`${styles.floatNote} ${styles.floatNotePayment}`}>
            <span className={styles.floatIcon}><Icon name="wallet" /></span>
            <span><strong>Payment activity</strong><small>Available when live data is connected</small></span>
            <b>—</b>
          </div>
          <div className={`${styles.floatNote} ${styles.floatNoteResident}`}>
            <span className={`${styles.floatIcon} ${styles.floatIconGreen}`}><Icon name="person" /></span>
            <span><strong>Resident records</strong><small>Illustrative product area</small></span>
          </div>
        </div>
      </section>

      <section className={styles.assuranceStrip} aria-label="Product design principles">
        {content.assurance.map((note, index) => (
          <div className={styles.assuranceItem} key={note}>
            <span className={styles.assuranceIcon}><Icon name={(["building", "person", "wallet", "clipboard", "roles"] as IconName[])[index]} /></span>
            <span>{note}</span>
          </div>
        ))}
      </section>

      <section className={styles.frictionSection} aria-labelledby="friction-title">
        <SectionHeading
          id="friction-title"
          eyebrow={content.friction.eyebrow}
          title={content.friction.title}
          description={content.friction.description}
          align="center"
        />
        <div className={styles.comparisonGrid}>
          <article className={`${styles.comparisonCard} ${styles.fragmentedCard}`}>
            <div className={styles.comparisonHeader}>
              <div><span className={styles.comparisonDot} /><div><h3>{content.friction.fragmentedTitle}</h3><p>{content.friction.fragmentedSubtitle}</p></div></div>
              <span className={styles.comparisonTag}>TODAY</span>
            </div>
            <ul className={styles.comparisonList}>
              {content.friction.challenges.map((item) => (
                <li key={item.title}>
                  <span className={styles.crossIcon}>×</span>
                  <span><strong>{item.title}</strong><small>{item.body}</small></span>
                </li>
              ))}
            </ul>
            <div className={styles.comparisonStats}>
              {content.friction.summaryMetrics.map((stat) => (
                <div key={stat.label}><small>{stat.label}</small><strong>{formatLandingMetric(stat)}</strong></div>
              ))}
            </div>
          </article>

          <article className={`${styles.comparisonCard} ${styles.systemCard}`}>
            <div className={styles.comparisonHeader}>
              <div><span className={`${styles.comparisonDot} ${styles.systemDot}`} /><div><h3>{content.friction.systemTitle}</h3><p>{content.friction.systemSubtitle}</p></div></div>
              <span className={`${styles.comparisonTag} ${styles.plannedTag}`}>IN DEVELOPMENT</span>
            </div>
            <ul className={styles.comparisonList}>
              {content.friction.systemItems.map((item) => (
                <li key={item.title}>
                  <span className={styles.checkIcon}>✓</span>
                  <span><strong>{item.title}</strong><small>{item.body}</small></span>
                </li>
              ))}
            </ul>
            <div className={`${styles.comparisonStats} ${styles.systemStats}`}>
              {content.friction.summaryMetrics.map((stat) => (
                <div key={stat.label}><small>{stat.label}</small><strong>{formatLandingMetric(stat)}</strong></div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className={styles.featuresSection} id="features" aria-labelledby="features-title">
        <SectionHeading
          id="features-title"
          eyebrow={content.features.eyebrow}
          title={content.features.title}
          description={content.features.description}
          align="center"
        />
        <div className={styles.featureGrid}>
          {content.features.cards.map((feature) => <FeatureCard feature={feature} key={feature.key} />)}
        </div>
      </section>

      <section className={styles.occupancySection} id="occupancy" aria-labelledby="occupancy-title">
        <SectionHeading
          id="occupancy-title"
          eyebrow={content.occupancy.eyebrow}
          title={content.occupancy.title}
          description={content.occupancy.description}
        />
        <div className={styles.occupancyPanel}>
          <div className={styles.occupancyPanelHeader}>
            <div className={styles.propertyIdentity}>
              <span className={styles.propertyIcon}><Icon name="building" /></span>
              <span><strong>{content.occupancy.propertyLabel}</strong><small>{content.occupancy.locationLabel}</small></span>
            </div>
            <span className={styles.occupancyBadge}>LIVE INVENTORY PENDING</span>
          </div>
          <div className={styles.occupancySummary}>
            {[content.occupancy.occupancy, content.occupancy.totalBeds, content.occupancy.occupiedBeds, content.occupancy.availableBeds, content.occupancy.reservedBeds].map((item) => (
              <div key={item.label}><small>{item.label}</small><strong>{formatLandingMetric(item)}</strong></div>
            ))}
          </div>
          <div className={styles.legend}>
            {content.occupancy.statuses.map((item) => (
              <span key={item.label}><i className={statusClassNames[item.color]} />{item.label}</span>
            ))}
          </div>
          <div className={styles.floorMatrix}>
            <div className={styles.floorLabels} aria-hidden="true"><span>PROPERTY</span><span>ROOM ALLOCATION</span></div>
            <EmptyMatrix compact />
            <p>{content.occupancy.matrixMessage}</p>
          </div>
          <div className={styles.occupancyFooter}><span /> <span>Availability structure preview</span><span>Live data not connected</span></div>
        </div>
      </section>

      <section className={styles.financeSection} id="finance" aria-labelledby="finance-title">
        <SectionHeading
          id="finance-title"
          eyebrow={content.finance.eyebrow}
          title={content.finance.title}
          description={content.finance.description}
          align="center"
        />
        <div className={styles.financeGrid}>
          <article className={styles.invoiceCard}>
            <div className={styles.invoiceHeading}>
              <span className={styles.invoiceIcon}><Icon name="receipt" /></span>
              <span><strong>{content.finance.invoiceTitle}</strong><small>{content.finance.invoiceState}</small></span>
              <span className={styles.invoiceStatus}>CONCEPT</span>
            </div>
            <div className={styles.invoiceMeta}><span>Resident</span><strong>Resident information</strong></div>
            <div className={styles.invoiceMeta}><span>Stay details</span><strong>Connected when available</strong></div>
            <div className={styles.invoiceRows}>
              {content.finance.invoiceRows.map((row) => (
                <div key={row.label}><span>{row.label}</span><strong>{formatLandingMetric(row.metric)}</strong></div>
              ))}
            </div>
            <div className={styles.invoiceTotal}><span>{content.finance.invoiceTotal.label}</span><strong>{formatLandingMetric(content.finance.invoiceTotal)}</strong></div>
            <div className={styles.invoicePayment}><span>{content.finance.invoicePaid.label}</span><strong>{formatLandingMetric(content.finance.invoicePaid)}</strong></div>
            <div className={styles.invoiceBalance}><span>{content.finance.invoiceBalance.label}</span><strong>{formatLandingMetric(content.finance.invoiceBalance)}</strong></div>
            <div className={styles.invoiceFootnote}><Icon name="privacy" />{content.finance.paymentNote}</div>
            <div className={styles.invoiceButton}>Payment actions appear when enabled</div>
          </article>

          <article className={styles.depositCard}>
            <div className={styles.depositHeading}><span className={styles.depositIcon}><Icon name="wallet" /></span><span><strong>{content.finance.depositTitle}</strong><small>Illustrative financial panel</small></span></div>
            <p>{content.finance.depositDescription}</p>
            <div className={styles.depositRows}>
              {content.finance.depositRows.map((row) => (
                <div key={row.label}><span>{row.label}</span><strong>{formatLandingMetric(row.metric)}</strong></div>
              ))}
            </div>
            <div className={styles.depositResult}><span>Settlement status</span><strong>—</strong></div>
            <div className={styles.depositAction}>Settlement actions not connected</div>
            <div className={styles.financeSeal}><Icon name="receipt" /><span>Financial data<br />not connected</span></div>
          </article>
        </div>
      </section>

      <section className={styles.residentSection} id="residents" aria-labelledby="resident-title">
        <div className={styles.residentCopy}>
          <SectionHeading
            id="resident-title"
            eyebrow={content.residents.eyebrow}
            title={content.residents.title}
            description={content.residents.description}
          />
          <div className={styles.residentBenefits}>
            {content.residents.benefits.map((item) => (
              <article key={item.title}>
                <span className={styles.residentBenefitIcon}><Icon name={item.icon as IconName} /></span>
                <span><strong>{item.title}</strong><small>{item.body}</small></span>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.phoneStage} role="img" aria-label="Illustrative mobile resident portal with no live resident data">
          <span className={styles.phoneHalo} />
          <div className={styles.phoneFrame}>
            <div className={styles.phoneNotch} />
            <div className={styles.phoneStatus}><span>Resident portal</span><span>{content.residents.phoneStatus}</span></div>
            <div className={styles.phoneGreeting}><span className={styles.phoneAvatar}><Icon name="person" /></span><span><small>RESIDENT PORTAL</small><strong>Your stay</strong></span></div>
            <div className={styles.phoneBalance}><small>{content.residents.phoneMetrics[0].label}</small><strong>{formatLandingMetric(content.residents.phoneMetrics[0])}</strong><span>Information appears with live data</span></div>
            <div className={styles.phoneActions}>
              {content.residents.phoneActions.map((action, index) => (
                <div key={action}><span><Icon name={(["receipt", "wallet", "support", "building"] as IconName[])[index]} /></span><small>{action}</small></div>
              ))}
            </div>
            <div className={styles.phoneUpdate}>
              <span className={styles.updateDot} />
              <span>
                <strong>{content.residents.phoneMetrics[1].label}</strong>
                <small>Resident activity will appear here</small>
              </span>
              <b>{formatLandingMetric(content.residents.phoneMetrics[1])}</b>
            </div>
            <div className={styles.phoneNavigation}><span>⌂</span><span>▤</span><span>◉</span><span>○</span></div>
          </div>
        </div>
      </section>

      <section className={styles.portfolioSection} aria-labelledby="portfolio-title">
        <SectionHeading
          id="portfolio-title"
          eyebrow={content.portfolio.eyebrow}
          title={content.portfolio.title}
          description={content.portfolio.description}
          align="center"
        />
        <div className={styles.portfolioMetrics}>
          {content.portfolio.metrics.map((metricValue) => <MetricCard metricValue={metricValue} key={metricValue.label} />)}
        </div>
        <div className={styles.portfolioEmpty}>
          <span className={styles.portfolioEmptyIcon}><Icon name="building" /></span>
          <strong>Portfolio data will appear here</strong>
          <p>{content.portfolio.propertyEmptyState}</p>
        </div>
      </section>

      <section className={styles.onboardingSection} id="onboarding" aria-labelledby="onboarding-title">
        <SectionHeading
          id="onboarding-title"
          eyebrow={content.onboarding.eyebrow}
          title={content.onboarding.title}
          description={content.onboarding.description}
          align="center"
        />
        <div className={styles.stepsGrid}>
          {content.onboarding.steps.map((step) => (
            <article className={styles.stepCard} key={step.index}>
              <span className={styles.stepIndex}>{step.index}</span>
              <span className={styles.stepLine} />
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              <span className={styles.stepResult}><i />{step.result}</span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.securitySection} id="security" aria-labelledby="security-title">
        <SectionHeading
          id="security-title"
          eyebrow={content.security.eyebrow}
          title={content.security.title}
          description={content.security.description}
          align="center"
        />
        <div className={styles.securityGrid}>
          {content.security.principles.map((principle) => (
            <article className={styles.securityCard} key={principle.title}>
              <span className={styles.securityIcon}><Icon name={principle.icon as IconName} /></span>
              <h3>{principle.title}</h3>
              <p>{principle.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.faqSection} id="faq" aria-labelledby="faq-title">
        <SectionHeading
          id="faq-title"
          eyebrow={content.faq.eyebrow}
          title={content.faq.title}
          description={content.faq.description}
          align="center"
        />
        <div className={styles.faqList}>
          {content.faq.items.map((item) => (
            <details className={styles.faqItem} key={item.question}>
              <summary>{item.question}<span className={styles.faqChevron} /></summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.closingSection} id="closing" aria-labelledby="closing-title">
        <span className={styles.closingEyebrow}>{content.closing.eyebrow}</span>
        <h2 id="closing-title">{content.closing.title}</h2>
        <p>{content.closing.description}</p>
        <div className={styles.closingActions}>
          <a className={styles.closingPrimary} href="#features">{content.closing.primaryAction}<ArrowIcon /></a>
          <a className={styles.closingSecondary} href="#faq"><span className={styles.playIcon} />{content.closing.secondaryAction}</a>
        </div>
        <small>{content.closing.note}</small>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrandColumn}>
          <a className={styles.brand} href="#top"><BrandMark /><span>StayPilot</span></a>
          <p>{content.footer.description}</p>
          <span className={styles.footerStatus}><i /> In development</span>
        </div>
        {content.footer.columns.map((column) => (
          <div className={styles.footerColumn} key={column.title}>
            <h2>{column.title}</h2>
            {column.links.map((item) => <a href={item.href} key={item.label}>{item.label}</a>)}
          </div>
        ))}
        <div className={styles.footerBottom}>
          <span>{content.footer.legal}</span>
          <a href="#product-status">Product status</a>
        </div>
      </footer>
    </main>
  );
}
