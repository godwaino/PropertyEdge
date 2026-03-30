import { Link } from 'react-router-dom';

function PeLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="6" fill="#0a1929" />
      <path d="M16 6L4 16h4v10h16V16h4L16 6z" fill="#0369A1" />
      <circle cx="16" cy="19" r="3" fill="#0a1929" />
    </svg>
  );
}

function PolicyShell({ title, lastUpdated, children }: { title: string; lastUpdated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-navy">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-navy-border bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <PeLogo />
            <span className="font-bold text-charcoal text-sm tracking-tight">
              Property<span className="text-cyan">Edge</span>
            </span>
          </Link>
          <Link to="/" className="text-sm text-navy-300 hover:text-charcoal transition-colors">
            ← Back to home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="pt-14">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-charcoal mb-2">{title}</h1>
            <p className="text-sm text-navy-300">Last updated: {lastUpdated}</p>
          </div>
          <div className="prose-policy">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-navy-border bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-navy-300">
          <div className="flex items-center gap-2.5">
            <PeLogo />
            <span className="font-semibold text-charcoal">PropertyEdge</span>
            <span>© 2026</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-charcoal transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-charcoal transition-colors">Terms of Service</Link>
            <Link to="/" className="hover:text-charcoal transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Section / paragraph helpers ──────────────────────────────────────────────

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-charcoal mt-10 mb-3">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-charcoal-600 leading-relaxed mb-4">{children}</p>;
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="mb-4 space-y-1.5 pl-4">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-charcoal-600 leading-relaxed list-disc">{item}</li>
      ))}
    </ul>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Privacy Policy
// ════════════════════════════════════════════════════════════════════════════

export function PrivacyPage() {
  return (
    <PolicyShell title="Privacy Policy" lastUpdated="30 March 2026">

      <P>
        PropertyEdge ("we", "our", or "us") is committed to protecting your privacy. This policy explains what information we collect, how we use it, and what rights you have over it.
      </P>

      <H2>1. What we collect</H2>
      <P>We may collect the following information when you use PropertyEdge:</P>
      <Ul items={[
        'Account information — email address and display name when you create an account via Firebase Authentication.',
        'Property analysis inputs — addresses, postcodes, asking prices, and other property details you submit for analysis.',
        'Analysis results — reports generated from your inputs, stored in Firestore under your account.',
        'Usage data — pages visited and features used, collected via standard server logs and analytics.',
        'Device information — browser type, operating system, and IP address for security and performance purposes.',
      ]} />

      <H2>2. How we use your data</H2>
      <P>We use the information we collect to:</P>
      <Ul items={[
        'Provide, operate, and improve the PropertyEdge service.',
        'Store your analysis reports so you can access them across sessions and devices.',
        'Send transactional emails where necessary (e.g. account verification).',
        'Detect and prevent fraud, abuse, or security incidents.',
        'Comply with applicable legal obligations.',
      ]} />
      <P>We do not sell your personal data to third parties. We do not use your property inputs to train AI models.</P>

      <H2>3. Third-party services</H2>
      <P>PropertyEdge uses the following third-party services that may process your data:</P>
      <Ul items={[
        'Firebase Authentication & Firestore (Google) — account management and report storage.',
        'Vercel — hosting and serverless function execution.',
        'Google Gemini API — AI analysis of property data. Inputs are processed per Google\'s API data-use policy.',
        'HM Land Registry & EPC Register — publicly available UK property data used to enrich analysis.',
        'OpenStreetMap Overpass API — publicly available map data for neighbourhood layers.',
      ]} />

      <H2>4. Data retention</H2>
      <P>
        Your saved reports are stored until you delete them or close your account. You can delete individual reports from your Workspace at any time. You can request deletion of your account and all associated data by contacting us.
      </P>

      <H2>5. Cookies</H2>
      <P>
        PropertyEdge uses only essential cookies required for authentication and session management. We do not use third-party advertising or tracking cookies.
      </P>

      <H2>6. Your rights (UK GDPR)</H2>
      <P>Under UK GDPR, you have the right to:</P>
      <Ul items={[
        'Access the personal data we hold about you.',
        'Correct inaccurate personal data.',
        'Request deletion of your personal data.',
        'Object to or restrict certain processing.',
        'Data portability — receive your data in a machine-readable format.',
        'Lodge a complaint with the Information Commissioner\'s Office (ICO) at ico.org.uk.',
      ]} />

      <H2>7. Data security</H2>
      <P>
        We use industry-standard security measures including HTTPS encryption in transit, Firebase Security Rules to restrict data access to authenticated account owners, and Vercel's infrastructure security controls.
      </P>

      <H2>8. Children</H2>
      <P>
        PropertyEdge is not directed at children under the age of 18. We do not knowingly collect data from anyone under 18.
      </P>

      <H2>9. Changes to this policy</H2>
      <P>
        We may update this policy from time to time. Material changes will be communicated via the app or by email where we hold your address. Continued use of the service after changes constitutes acceptance.
      </P>

      <H2>10. Contact</H2>
      <P>
        For privacy-related queries or to exercise your rights, please contact us at{' '}
        <a href="mailto:privacy@propertyedge.co" className="text-cyan hover:underline">privacy@propertyedge.co</a>.
      </P>

    </PolicyShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Terms of Service
// ════════════════════════════════════════════════════════════════════════════

export function TermsPage() {
  return (
    <PolicyShell title="Terms of Service" lastUpdated="30 March 2026">

      <P>
        These Terms of Service ("Terms") govern your use of PropertyEdge, operated by PropertyEdge ("we", "us", or "our"). By accessing or using the service you agree to these Terms. If you do not agree, please do not use the service.
      </P>

      <H2>1. The service</H2>
      <P>
        PropertyEdge is a buyer-side property decision tool for UK homebuyers. It provides AI-assisted analysis of property value, neighbourhood context, risk indicators, and personal fit based on information you provide and publicly available UK data sources.
      </P>

      <H2>2. Not financial or legal advice</H2>
      <P>
        <strong className="text-charcoal">PropertyEdge does not provide financial, legal, surveying, or investment advice.</strong> All analysis, reports, valuations, and recommendations produced by the service are informational only. They are based on publicly available data and AI inference and may be incomplete, inaccurate, or outdated.
      </P>
      <P>
        You must always take independent professional advice — including from a qualified surveyor, mortgage adviser, and solicitor — before exchanging contracts or committing to any property purchase. PropertyEdge expressly disclaims liability for any decisions made on the basis of its outputs.
      </P>

      <H2>3. Eligibility</H2>
      <P>
        You must be at least 18 years old to use PropertyEdge. By using the service you confirm that you meet this requirement.
      </P>

      <H2>4. Your account</H2>
      <Ul items={[
        'You are responsible for keeping your account credentials secure.',
        'You must not share your account with others or use it for commercial re-sale of analysis outputs.',
        'You must provide accurate information when creating your account.',
        'We reserve the right to suspend or terminate accounts that violate these Terms.',
      ]} />

      <H2>5. Acceptable use</H2>
      <P>You agree not to:</P>
      <Ul items={[
        'Use the service for any unlawful purpose or in violation of any applicable laws.',
        'Attempt to reverse-engineer, scrape, or extract the underlying data or models.',
        'Submit false, misleading, or fraudulent property information.',
        'Use automated tools to make bulk requests to the service.',
        'Attempt to gain unauthorised access to other users\' data.',
        'Republish or commercially resell analysis outputs without our prior written consent.',
      ]} />

      <H2>6. Intellectual property</H2>
      <P>
        The PropertyEdge software, design, and brand are owned by us. Analysis reports generated for your inputs are yours to use for personal decision-making purposes. You retain ownership of any property information you submit.
      </P>

      <H2>7. Third-party data</H2>
      <P>
        PropertyEdge incorporates data from HM Land Registry, the EPC Register, OpenStreetMap, and other public sources. This data is used under their respective open licences. We make no warranty as to the completeness or currency of third-party data.
      </P>

      <H2>8. Limitation of liability</H2>
      <P>
        To the maximum extent permitted by law, PropertyEdge shall not be liable for any indirect, incidental, consequential, or special damages arising from your use of the service, including but not limited to loss arising from property purchase decisions.
      </P>
      <P>
        Our total aggregate liability to you in connection with these Terms shall not exceed the amount you have paid to us in the 12 months preceding the claim, or £100, whichever is greater.
      </P>

      <H2>9. Service availability</H2>
      <P>
        We aim to provide a reliable service but do not guarantee uninterrupted availability. We may update, suspend, or discontinue features at any time without notice.
      </P>

      <H2>10. Changes to these Terms</H2>
      <P>
        We may update these Terms from time to time. We will notify you of material changes via the app or email. Continued use after changes constitutes acceptance of the updated Terms.
      </P>

      <H2>11. Governing law</H2>
      <P>
        These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
      </P>

      <H2>12. Contact</H2>
      <P>
        For questions about these Terms, contact us at{' '}
        <a href="mailto:legal@propertyedge.co" className="text-cyan hover:underline">legal@propertyedge.co</a>.
      </P>

    </PolicyShell>
  );
}
