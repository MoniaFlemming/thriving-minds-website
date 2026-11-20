import { ArrowRight } from 'lucide-react';

const logoSrc = `${import.meta.env.BASE_URL}thriving-minds-logo.png?v=0a6e7004`;
const sectionHref = (id: string) => `${import.meta.env.BASE_URL}#${id}`;

export default function NotFound() {
  return (
    <div className="site-shell min-h-screen">
      <header className="legal-header">
        <div className="section-wrap">
          <a href={sectionHref('home')} className="brand-lockup flex items-center gap-3" aria-label="Thriving Minds Consulting home">
            <img src={logoSrc} alt="" aria-hidden="true" width={515} height={515} className="brand-logo" />
            <span className="brand-wordmark"><span className="brand-name">Thriving Minds</span><span className="brand-descriptor">Consulting</span></span>
          </a>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="section-wrap flex min-h-[65vh] items-center py-16">
        <div className="max-w-2xl">
          <p className="eyebrow">A small detour</p>
          <h1 className="serif mt-6 text-5xl leading-[.98] tracking-[-.045em] text-[var(--plum)] md:text-7xl">Looks like this path took a little detour.</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted-foreground)]">The page may have moved, or the address may not be quite right. You can find your way back to the parts of Thriving Minds that matter.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={sectionHref('home')} className="button-main">Back to Home <ArrowRight size={14} /></a>
            <a href={sectionHref('services')} className="button-outline">Explore Services <ArrowRight size={14} /></a>
            <a href={sectionHref('contact')} className="button-outline">Contact Us <ArrowRight size={14} /></a>
          </div>
        </div>
      </main>
    </div>
  );
}