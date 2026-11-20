import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const validMeasurementId = Boolean(measurementId && /^G-[A-Z0-9]+$/.test(measurementId));
const preferenceKey = 'tm-analytics-consent';
let sessionConsent: boolean | undefined;
const safePageLocation = () => `${window.location.origin}${window.location.pathname}`;

type AnalyticsEvent = {
  event_category?: string;
  event_label?: string;
  [key: string]: string | number | boolean | undefined;
};

declare global {
  interface Window {
    doNotTrack?: string;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

function hasConsent() {
  if (!validMeasurementId || typeof window === 'undefined') return false;
  if (isDoNotTrackEnabled()) return false;
  try {
    return window.localStorage.getItem(preferenceKey) === 'granted';
  } catch {
    return sessionConsent === true;
  }
}

function isDoNotTrackEnabled() {
  return typeof window !== 'undefined' && (window.navigator.doNotTrack === '1' || window.doNotTrack === '1');
}

function ensureGtag() {
  if (!validMeasurementId || typeof window === 'undefined') return;
  if (window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.dataset.tmAnalytics = 'true';
  document.head.appendChild(script);
  window.gtag('js', new Date());
  window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  if (hasConsent()) window.gtag('consent', 'update', { analytics_storage: 'granted' });
  window.gtag('config', measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: safePageLocation(),
    page_referrer: '',
    ignore_referrer: true,
  });
}

export function trackEvent(name: string, parameters: AnalyticsEvent = {}) {
  if (!hasConsent()) return;
  ensureGtag();
  window.gtag?.('event', name, { ...parameters, page_location: safePageLocation(), page_referrer: '' });
}

export function setAnalyticsConsent(consented: boolean) {
  if (!validMeasurementId || typeof window === 'undefined') return;
  const allowed = consented && !isDoNotTrackEnabled();
  sessionConsent = allowed;
  try {
    window.localStorage.setItem(preferenceKey, allowed ? 'granted' : 'denied');
  } catch {
    // The preference remains session-only if storage is unavailable.
  }
  if (allowed) ensureGtag();
  window[`ga-disable-${measurementId}`] = !allowed;
  window.gtag?.('consent', 'update', { analytics_storage: allowed ? 'granted' : 'denied' });
}

export function AnalyticsConsentControl() {
  const [consented, setConsented] = useState(false);
  useEffect(() => {
    if (!validMeasurementId) return;
    setConsented(hasConsent());
    if (hasConsent()) ensureGtag();
  }, []);

  if (!validMeasurementId) {
    return <p className="text-sm text-[var(--muted-foreground)]">Optional analytics are not active because no valid Google Analytics measurement ID is configured.</p>;
  }

  return (
    <div className="analytics-choice">
      <p className="mb-3 text-sm leading-6 text-[var(--muted-foreground)]">
        Optional Google Analytics helps understand how this site is used. It stays off until you opt in. No form values or personal details are sent as analytics events.
      </p>
      {consented ? (
        <button type="button" className="button-outline" onClick={() => { setAnalyticsConsent(false); setConsented(false); }}>Turn off optional analytics</button>
      ) : (
        <button type="button" className="button-outline" disabled={isDoNotTrackEnabled()} onClick={() => { setAnalyticsConsent(true); setConsented(hasConsent()); }}>Allow optional analytics</button>
      )}
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">Your choice is saved in this browser. Do Not Track prevents analytics from being enabled.</p>
    </div>
  );
}

export function usePageAnalytics() {
  const [location] = useLocation();
  useEffect(() => {
    trackEvent('page_view', { page_path: location.split(/[?#]/, 1)[0] || '/' });
  }, [location]);
}
