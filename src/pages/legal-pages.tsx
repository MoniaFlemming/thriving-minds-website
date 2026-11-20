import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { AnalyticsConsentControl } from '@/lib/analytics';

const logoSrc = `${import.meta.env.BASE_URL}thriving-minds-logo.png?v=0a6e7004`;
const homeHref = `${import.meta.env.BASE_URL}#home`;
const routeHref = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

type LegalPageProps = { title: string; intro: string; children: ReactNode };

function LegalPage({ title, intro, children }: LegalPageProps) {
  return (
    <div className="site-shell">
      <header className="legal-header">
        <div className="section-wrap flex items-center justify-between gap-4">
          <a href={homeHref} className="brand-lockup flex items-center gap-3" aria-label="Thriving Minds Consulting home">
            <img src={logoSrc} alt="" aria-hidden="true" width={515} height={515} className="brand-logo" />
            <span className="brand-wordmark"><span className="brand-name">Thriving Minds</span><span className="brand-descriptor">Consulting</span></span>
          </a>
          <a href={homeHref} className="button-outline">Back to home <ArrowRight size={14} /></a>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="legal-main section-wrap">
        <p className="eyebrow">Thriving Minds Consulting</p>
        <h1 className="serif legal-title">{title}</h1>
        <p className="legal-intro">{intro}</p>
        <div className="legal-copy">{children}</div>
        <p className="legal-review-note">These website documents are a plain-language starting point and are pending review by the operator’s legal adviser. They are not a statement of legal compliance or a guarantee.</p>
        <p className="legal-contact">Questions? <a href="mailto:info@thrivingmindsconsulting.com">info@thrivingmindsconsulting.com</a> · <a href="tel:+16476678437">647-667-8437</a></p>
      </main>
      <footer className="legal-footer">
        <div className="section-wrap flex flex-wrap gap-x-6 gap-y-3">
          <a href={homeHref}>Home</a><a href={routeHref('/privacy')}>Privacy</a><a href={routeHref('/terms')}>Terms</a><a href={routeHref('/accessibility')}>Accessibility</a><a href={routeHref('/resource-disclaimer')}>Resource disclaimer</a>
        </div>
      </footer>
    </div>
  );
}

export function PrivacyPage() {
  return <LegalPage title="Privacy" intro="What happens when you browse this website or send a contact request.">
    <h2>Contact information</h2>
    <p>When you submit the contact form, your name, email address, selected support area, and optional message are sent to this website’s same-origin contact endpoint and stored in its private database. Your name, email address, and selected support area may also be sent to Resend to notify Thriving Minds Consulting at info@thrivingmindsconsulting.com; your optional message is not included in that notification. A successful form response confirms that the inquiry was saved, not that an email reached an inbox or that a consultation was booked. Do not include a child’s diagnosis, medical records, or other sensitive health information.</p>
    <h2>Website technology</h2>
    <p>This website loads font files from Google Fonts, which may receive the technical information associated with that request. Optional Google Analytics may be configured in the future. If a valid measurement ID is present, analytics remains off unless you explicitly opt in using the controls below. Analytics events are designed not to include form content, contact details, or message/reference IDs. Your analytics preference is stored in this browser; there is no separate advertising or marketing tracker configured here.</p>
    <h2>Your choices and questions</h2>
    <p>You can choose not to send a contact request, and you can decline optional analytics. Browser Do Not Track is respected by leaving analytics disabled. For a question about a submitted request or privacy, contact the email above. The operator should review and complete this notice with appropriate legal advice before publication.</p>
    <h2>Optional analytics choice</h2>
    <AnalyticsConsentControl />
  </LegalPage>;
}

export function TermsPage() {
  return <LegalPage title="Terms of use" intro="A few boundaries for using Thriving Minds Consulting’s website.">
    <h2>General information</h2>
    <p>Website pages are provided for general information and do not create a therapeutic, clinical, or other professional relationship. Information is not a substitute for individualized assessment, medical care, mental-health care, or professional advice.</p>
    <h2>No emergency service or promised outcome</h2>
    <p>This website is not monitored as an emergency or crisis service. If someone is in immediate danger or needs urgent care, contact local emergency services or an appropriate urgent-care provider. Descriptions of services are informational and do not guarantee availability, suitability, or a particular outcome.</p>
    <h2>Contact requests</h2>
    <p>A successful contact-form response means a request was saved privately. It does not confirm that an email was sent or received, that a response time is guaranteed, or that a booking has been made. Avoid including sensitive health information in the form.</p>
    <h2>Operator review</h2>
    <p>These terms are a plain-language draft pending review by the operator’s legal adviser. No legal compliance guarantee is made.</p>
  </LegalPage>;
}

export function AccessibilityPage() {
  return <LegalPage title="Accessibility" intro="We aim to make this website usable across different devices, input methods, and access needs.">
    <h2>Our approach</h2>
    <p>The site is built with semantic page regions, keyboard-visible focus, labelled controls, reduced-motion support, and responsive layouts. We continue to review contrast, screen-reader announcements, keyboard navigation, and content clarity. This statement does not claim that every part of the site has been independently audited or that a particular accessibility standard is met.</p>
    <h2>Feedback and support</h2>
    <p>If you encounter a barrier or would like information in another format, please email <a href="mailto:info@thrivingmindsconsulting.com">info@thrivingmindsconsulting.com</a> or call <a href="tel:+16476678437">647-667-8437</a>. You can describe the issue without sharing sensitive personal or health information.</p>
    <h2>Review status</h2>
    <p>This statement and the site’s accessibility practices are pending operator and legal review. We welcome practical feedback.</p>
  </LegalPage>;
}

export function ResourceDisclaimerPage() {
  return <LegalPage title="Resource disclaimer" intro="Educational content is a starting point for reflection, not individualized care.">
    <h2>Educational use only</h2>
    <p>Articles, examples, toolkit ideas, and service descriptions on this site are general educational information. They are not medical advice, mental-health treatment, diagnosis, assessment, or an individualized recommendation. Examples identified as fictional are not client stories.</p>
    <h2>Use your judgment</h2>
    <p>People and circumstances differ. A strategy that is useful for one person may not suit another. Consider your own circumstances and consult an appropriately qualified professional when you need individualized support. This website is not an emergency service; contact local emergency services or an appropriate urgent-care provider in an emergency.</p>
    <h2>No guarantees</h2>
    <p>Reading or trying an idea does not establish a professional relationship or guarantee a result. This notice is a plain-language draft pending review by the operator’s legal adviser.</p>
  </LegalPage>;
}