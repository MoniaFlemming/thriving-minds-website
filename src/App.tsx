import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Activity, ArrowDown, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Compass, HeartHandshake, Leaf, Menu, MessageCircle, Palette, Play, Search, X } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { trackEvent, usePageAnalytics } from '@/lib/analytics';
import { AccessibilityPage, PrivacyPage, ResourceDisclaimerPage, TermsPage } from '@/pages/legal-pages';
import { PageMetadata } from '@/lib/seo';
import './resource-library.css';

const queryClient = new QueryClient();
const homeSectionHref = (id: string) => `${import.meta.env.BASE_URL}#${id}`;
const routeHref = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
const createRequestId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  if (typeof crypto === 'undefined') {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const value = Math.floor(Math.random() * 16);
      return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
    });
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const navItems = [
  ['About', 'about'], ['Services', 'services'], ['Programs', 'programs'], ['For Families', 'families'],
  ['Resources', 'resources'], ['Recreation Therapy', 'recreation-therapy'], ['Contact', 'contact'],
] as const;

const logoSrc = `${import.meta.env.BASE_URL}thriving-minds-logo.png?v=0a6e7004`;
const founderLogo = `${import.meta.env.BASE_URL}founder-logo.png?v=93d213ea`;
const generatedImage = (name: string) => `${import.meta.env.BASE_URL}generated/${name.replace(/\.jpg$/, '.webp')}`;
const responsiveImageSet = (source: string) => `${source.replace(/\.webp$/, '-480.webp')} 480w, ${source} 1024w`;

const services = [
  'Recreation Therapy', 'Emotional Regulation', 'Behaviour Support', 'Social Skills Development',
  'Family Coaching', 'Therapeutic Programs', 'Child & Youth Mental Wellness Coaching',
  'Autism Support', 'Program Development', 'Program Evaluation',
];

const serviceDescriptions: Record<string, string> = {
  'Recreation Therapy': 'Build connection and everyday skills through personally meaningful play, movement, creativity, and shared interests.',
  'Emotional Regulation': 'Explore calming strategies, sensory supports, and flexible routines for moments that feel big.',
  'Behaviour Support': 'Look for what behaviour may communicate and shape practical, supportive responses together.',
  'Social Skills Development': 'Practice communication, collaboration, and turn-taking through shared activities.',
  'Family Coaching': 'Work with caregivers on everyday routines, connection, and practical ways forward.',
  'Therapeutic Programs': 'Take part in structured activities with room for choice, adaptation, and meaningful practice.',
  'Child & Youth Mental Wellness Coaching': 'Support young people to explore strengths, feelings, coping tools, and next steps.',
  'Autism Support': 'Create sensory-aware, interest-led support with choice, flexibility, and respect for each person.',
  'Program Development': 'Shape engaging programs around participants, goals, and community needs.',
  'Program Evaluation': 'Gather feedback and review what is working to guide thoughtful improvements.',
};

const servicePhotos: Record<string, { src: string; alt: string; objectPosition?: string }> = {
  'Recreation Therapy': {
    src: generatedImage('service-recreation-therapy.jpg'),
    alt: 'Young people and an adult enjoying a cooperative outdoor ball game.',
  },
  'Emotional Regulation': {
    src: generatedImage('service-emotional-regulation-refined.jpg'),
    alt: 'A child and caregiver practising a calming breath together with a pinwheel.',
  },
  'Behaviour Support': {
    src: generatedImage('service-behaviour-support-family.jpg'),
    alt: 'A caregiver and child choosing an activity together at a table.',
    objectPosition: 'center 10%',
  },
  'Social Skills Development': {
    src: generatedImage('service-social-skills-full-heads.jpg'),
    alt: 'Three young people collaborating on a marble run.',
  },
  'Family Coaching': {
    src: generatedImage('service-family-coaching-refined.jpg'),
    alt: 'A caregiver and two children planning an everyday activity together.',
  },
  'Therapeutic Programs': {
    src: generatedImage('service-therapeutic-programs.jpg'),
    alt: 'A small group creating a collaborative art project in a community studio.',
  },
  'Child & Youth Mental Wellness Coaching': {
    src: generatedImage('service-mental-wellness-youth.jpg'),
    alt: 'A teenager and caregiver walking together through a garden.',
    objectPosition: 'center 10%',
  },
  'Autism Support': {
    src: generatedImage('service-autism-support-refined.jpg'),
    alt: 'A child choosing activity materials while a caregiver listens and offers support.',
  },
  'Program Development': {
    src: generatedImage('service-program-development.jpg'),
    alt: 'A team arranging activity cards and materials while planning a program.',
  },
  'Program Evaluation': {
    src: generatedImage('service-program-evaluation.jpg'),
    alt: 'People adding reflections to a shared community feedback board.',
  },
};

const storyPhotos = {
  recreation: { src: generatedImage('story-recreation-therapy-full-heads.jpg'), alt: 'Children and a teenager playing a cooperative board game with a caregiver.' },
  programs: { src: generatedImage('story-programs-youth.jpg'), alt: 'Children and youth painting a collaborative art project with a mentor.', objectPosition: 'center 8%' },
  journey: { src: generatedImage('story-journey-family.jpg'), alt: 'Children and caregivers sharing a hands-on garden activity outdoors.', objectPosition: 'center 10%' },
  fullStory: { src: generatedImage('story-full-family.jpg'), alt: 'Children, caregivers, and family members sharing an outdoor art activity.', objectPosition: 'center 10%' },
};

const interestAreas = [
  { id: 'move', label: 'Move', icon: Activity, description: 'Movement and shared games can make participation feel more natural.' },
  { id: 'create', label: 'Create', icon: Palette, description: 'Making something together can offer another way to express an idea.' },
  { id: 'play', label: 'Play', icon: Play, description: 'A shared game can leave room for turn-taking, flexibility, and joy.' },
  { id: 'connect', label: 'Connect', icon: HeartHandshake, description: 'Following a shared interest can make connection easier to begin.' },
  { id: 'explore', label: 'Explore', icon: Compass, description: 'New places and materials can be approached at a comfortable pace.' },
] as const;

type InterestAreaId = (typeof interestAreas)[number]['id'];

const toolkitAreas = [
  'Big emotions', 'Meltdowns', 'Anxiety/worry', 'Transitions', 'Social situations',
  'Communication', 'Behaviour challenges', 'Family connection', 'Calming activities', 'Sensory-friendly activities',
];

const toolkitStrategies: Record<string, { intro: string; steps: string[] }> = {
  'Big emotions': { intro: 'When feelings arrive loudly, the first goal is connection—not correction.', steps: ['Lower your voice and reduce the number of words you use.', 'Name what you notice without asking for an explanation: “Your body is telling us this is a lot.”', 'Offer two simple choices once the moment begins to soften.'] },
  'Meltdowns': { intro: 'A meltdown is a moment of overload. Safety and recovery come before learning.', steps: ['Clear extra noise, people, and demands where possible.', 'Stay nearby with a calm, predictable presence; avoid teaching in the peak.', 'Afterwards, repair gently and notice one thing that helped the body return.'] },
  'Anxiety/worry': { intro: 'Worry grows in uncertainty. Small, repeatable anchors can make the next step feel possible.', steps: ['Separate the worry from the child: “Worry is visiting,” rather than “You are anxious.”', 'Make the next action tiny and specific, then celebrate participation—not bravery points.', 'Create a short “worry parking” ritual for thoughts that can wait.'] },
  'Transitions': { intro: 'Predictability is a form of kindness when a familiar activity is ending.', steps: ['Give a clear preview using time, sequence, or a visual cue.', 'Use the same goodbye ritual each time, even when the day is busy.', 'Build a small bridge between activities: a song, object, movement, or first job.'] },
  'Social situations': { intro: 'Social learning works best when children can practice in low-pressure, meaningful play.', steps: ['Rehearse one flexible phrase or action before the situation.', 'Notice the environment and adjust the demand, rather than placing all responsibility on the child.', 'Review what felt workable while the experience is still fresh.'] },
  'Communication': { intro: 'Communication includes words, movement, pauses, gestures, and ways of saying “not yet.”', steps: ['Pause long enough for a response without filling the quiet.', 'Offer visuals, pointing, choices, or a familiar signal alongside spoken language.', 'Respond to the message first, then support the next communication step.'] },
  'Behaviour challenges': { intro: 'Behaviour is information. Curiosity can reveal what a child is trying to solve or avoid.', steps: ['Look for the pattern: what happens before, during, and after the behaviour?', 'Change one condition at a time—demand, timing, environment, or support.', 'Describe the replacement action you want to see, and practice it when everyone is calm.'] },
  'Family connection': { intro: 'Connection does not need a grand activity. Repeated moments of being together count.', steps: ['Choose a small shared ritual that can survive an ordinary day.', 'Follow the child’s interest for a few minutes without directing the play.', 'End with a specific appreciation: what did you enjoy about being together?'] },
  'Calming activities': { intro: 'Calming is personal. Offer a menu of body-based options instead of one perfect technique.', steps: ['Try steady rhythm, pushing or carrying, slow movement, or a quiet corner.', 'Practice the activity during neutral moments so it is familiar when needed.', 'Let the child rate or show whether it helped; adjust without judgment.'] },
  'Sensory-friendly activities': { intro: 'A sensory-friendly plan starts by respecting the body’s signals and the environment’s demands.', steps: ['Notice light, sound, texture, movement, and crowding before choosing an activity.', 'Keep an exit or pause option available and visible.', 'Offer materials with different textures and let the child choose how to participate.'] },
};

type Resource = { title: string; category: string; readTime: string; summary: string; body: string };
const resources: Resource[] = [
  { title: 'A softer start to hard conversations', category: 'Family Connection', readTime: '4 min read', summary: 'A practical way to begin when everyone is already carrying a lot.', body: 'Begin with shared observation, not a verdict. “Mornings have felt rushed lately” opens a different door than “You never listen.” Choose one moment to improve, make the first step visible, and return to the conversation when bodies are settled.' },
  { title: 'What recreation therapy can look like at home', category: 'Recreation & Wellness', readTime: '5 min read', summary: 'Everyday play, movement, and interests can become meaningful practice.', body: 'Recreation therapy uses personally meaningful activity as a doorway to participation and skill-building. That can mean cooking, a walk, a game, art, music, or a shared project—adapted so the child or youth can enter with dignity and choice.' },
  { title: 'Building a transition ritual', category: 'Emotional Regulation', readTime: '3 min read', summary: 'A repeatable bridge for the moments between one thing and the next.', body: 'Pick one sensory or relational cue that can travel with the family: a phrase, a short song, a visual card, or a first small job. Keep the ritual predictable and flexible enough to work on both good and difficult days.' },
  { title: 'Making room for different communication', category: 'Social Skills', readTime: '6 min read', summary: 'Ways to listen for the message beneath the method.', body: 'Communication is bigger than spoken language. Make space for pointing, movement, devices, visuals, signs, pauses, and changes in behaviour. The most useful response is often to acknowledge the message before asking for more.' },
  { title: 'A strengths-based lens for support', category: 'Parent/Caregiver Support', readTime: '4 min read', summary: 'Shift the question from “What is wrong?” to “What helps this person participate?”', body: 'A strengths-based lens does not ignore difficulty. It widens the picture to include interests, preferences, relationships, environments, and past moments of participation. Those details help shape support that feels possible and respectful.' },
  { title: 'When behaviour is telling us something', category: 'Behaviour Support', readTime: '5 min read', summary: 'A curious way to look for the need beneath a difficult moment.', body: 'Behaviour can carry information about timing, demands, sensory load, communication, or connection. Start by noticing what came before and what helped afterwards, then change one condition at a time so the next attempt is easier to understand.' },
  { title: 'A small check-in for a big inner world', category: 'Child & Youth Mental Wellness', readTime: '4 min read', summary: 'A low-pressure way to make space for how a child or young person is doing.', body: 'Try a choice of words, colours, movement, or a simple scale instead of asking for a complete explanation. The goal is not to force disclosure; it is to make it easier to show up, be heard, and identify a next small step.' },
];

const faqItems = [
  ['What is Recreation Therapy?', 'Recreation Therapy uses meaningful activities—such as play, movement, creative projects, nature, games, and shared interests—to support participation, connection, and skill development.'],
  ['Who can benefit from Recreation Therapy?', 'Children, youth, and families may explore Recreation Therapy when everyday participation, emotional regulation, communication, social connection, or family routines feel harder than they would like.'],
  ['What ages do you support?', 'Thriving Minds Consulting supports children and youth, with family and caregiver involvement shaped around the person and the context. A first conversation is a chance to discuss fit.'],
  ['What happens during the first session?', 'An initial consultation is a conversation about strengths, interests, needs, goals, and what support could look like. There is room to ask questions before deciding on a next step.'],
  ['Do parents/caregivers participate?', 'Caregiver participation is welcome and can be part of the plan. The way it looks can vary: joining an activity, sharing context, practicing a strategy, or creating a bridge back home.'],
  ['Where do sessions take place?', 'The setting can be discussed during consultation based on the support being explored and what feels practical and accessible for the family.'],
  ['How does the sliding scale work?', 'Sliding-scale pricing keeps a range visible so families can talk about fit with clarity and care. The appropriate place within a range can be discussed during the booking conversation.'],
  ['How do I ask about a consultation?', 'Send a contact request using the form below, call 647-667-8437, or email info@thrivingmindsconsulting.com. A saved message is not a confirmed booking.'],
  ['What types of activities may be used?', 'Activities may include movement, games, creative work, nature, cooking, music, sensory-friendly options, shared interests, and everyday routines adapted around participation and choice.'],
  ['Is Recreation Therapy the same as traditional therapy?', 'Recreation Therapy is a distinct approach that uses meaningful activity as part of the support. It can complement other care, but it is not a replacement for medical or mental-health care when that care is needed.'],
] as const;

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return <div ref={ref} className={`reveal ${visible ? 'is-visible' : ''} ${delay ? `reveal-delay-${delay}` : ''} ${className}`}>{children}</div>;
}

function StoryPhoto({ photo, className = '' }: { photo: { src: string; alt: string; objectPosition?: string }; className?: string }) {
  return <figure className={`story-photo ${className}`}><img src={photo.src} srcSet={responsiveImageSet(photo.src)} sizes="(max-width: 767px) calc(100vw - 32px), 50vw" alt={photo.alt} width={1024} height={1024} style={{ objectPosition: photo.objectPosition }} loading="lazy" decoding="async" /></figure>;
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <a href={homeSectionHref('home')} className="brand-lockup flex items-center gap-3" data-testid="link-brand">
      <img src={logoSrc} alt="" aria-hidden="true" width={515} height={515} className="brand-logo" />
      <span className={`brand-wordmark ${light ? 'brand-wordmark-light' : ''}`}>
        <span className="brand-name">Thriving Minds</span>
        <span className="brand-descriptor">Consulting</span>
      </span>
    </a>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(78,42,74,.12)] bg-[rgba(253,251,247,.92)] backdrop-blur-md">
      <div className="section-wrap flex h-[106px] items-center justify-between md:h-[112px]">
        <Brand />
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Main navigation">
          {navItems.map(([label, id]) => <a key={id} href={homeSectionHref(id)} onClick={() => trackEvent('section_navigation', { event_category: 'navigation', event_label: id })} className="nav-link" data-testid={`link-nav-${id}`}>{label}</a>)}
        </nav>
        <a href={homeSectionHref('book-now')} onClick={() => trackEvent('book_now_click', { event_category: 'conversion', event_label: 'header' })} className="header-book-cta button-main" data-testid="link-book-now-header">Book Now <ArrowRight size={14} /></a>
        <button type="button" className="inline-flex items-center justify-center border border-[rgba(78,42,74,.2)] p-2 text-[var(--plum)] lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)} data-testid="button-mobile-menu">
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
      <div id="mobile-navigation" hidden={!open} className="border-t border-[rgba(78,42,74,.12)] bg-[var(--ivory)] px-5 py-5 lg:hidden">
        <nav className="section-wrap flex flex-col gap-4" aria-label="Mobile navigation">
          {navItems.map(([label, id]) => <a key={id} href={homeSectionHref(id)} onClick={() => { close(); trackEvent('section_navigation', { event_category: 'navigation', event_label: id }); }} className="flex items-center justify-between border-b border-[rgba(78,42,74,.12)] pb-3 text-sm font-semibold text-[var(--plum)]" data-testid={`link-mobile-${id}`}>{label}<ArrowRight size={14} /></a>)}
          <a href={homeSectionHref('book-now')} onClick={() => { close(); trackEvent('book_now_click', { event_category: 'conversion', event_label: 'mobile_menu' }); }} className="button-main mt-1" data-testid="link-mobile-book-now">Start a conversation <ArrowRight size={14} /></a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="home" className="hero-wash relative overflow-hidden">
      <span className="floating-leaf left-[10%] top-24" />
      <span className="floating-leaf right-[12%] top-36" style={{ animationDelay: '1.3s' }} />
      <div className="section-wrap grid min-h-[calc(100dvh-106px)] items-center gap-8 py-14 md:min-h-[calc(100dvh-112px)] md:grid-cols-[1.08fr_.92fr] md:py-20">
        <Reveal>
          <p className="eyebrow">Family wellness, made practical</p>
          <h1 className="serif text-balance mt-7 max-w-[680px] text-[clamp(3.25rem,7vw,6.5rem)] leading-[.91] tracking-[-.055em] text-[var(--plum)]">
            Support that meets your family <span className="italic text-[var(--sage)]">where they are.</span>
          </h1>
          <p className="mt-7 max-w-[560px] text-[16px] leading-7 text-[rgba(48,39,47,.75)]">
            Recreation Therapy and family wellness support for children, youth, and the people who care for them. Practical, strengths-based, and connected to everyday life.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href={homeSectionHref('book-now')} onClick={() => trackEvent('cta_click', { event_category: 'conversion', event_label: 'hero_book' })} className="button-main" data-testid="link-hero-book">Find Your Next Step <ArrowRight size={15} /></a>
            <a href={homeSectionHref('recreation-therapy')} onClick={() => trackEvent('cta_click', { event_category: 'navigation', event_label: 'hero_recreation_therapy' })} className="button-outline" data-testid="link-hero-learn">What is Recreation Therapy? <ArrowDown size={14} /></a>
          </div>
          <p className="mt-7 text-[11px] uppercase tracking-[.12em] text-[var(--sage)]">A calmer place to begin — no judgment required.</p>
        </Reveal>
        <Reveal delay={1} className="relative">
          <div className="hero-orbit">
            <div className="orbit-note one"><span className="mb-2 block text-[9px] font-bold uppercase tracking-[.12em] text-[var(--sage)]">A reminder</span>Small moments of connection are still progress.</div>
            <div className="orbit-note two"><span className="mb-2 block text-[9px] font-bold uppercase tracking-[.12em] text-[var(--sage)]">Start here</span>Notice what already helps your family feel more like itself.</div>
            <div className="orbit-core">
              <img src={generatedImage('story-recreation-480.jpg')} srcSet={responsiveImageSet(generatedImage('story-recreation.jpg'))} sizes="(max-width: 767px) 238px, 292px" alt="Young people and adults taking part in movement and creative activities together in a community arts studio." width={1024} height={1024} className="orbit-core-photo" decoding="async" />
              <span className="orbit-core-shade" aria-hidden="true" />
              <div className="orbit-core-copy">
                <div><span className="block text-[10px] uppercase tracking-[.17em] text-[var(--gold)]">The everyday practice</span><span className="mt-5 block font-display text-[35px] leading-[1.03]">Make room for what matters.</span></div>
                <div><div className="mb-3 h-px bg-[rgba(253,251,247,.32)]" /><p className="max-w-[190px] text-[11px] leading-5 text-[rgba(253,251,247,.85)]">Play, movement, and shared interests can be meaningful places to grow.</p></div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
      <div className="border-t border-[rgba(78,42,74,.13)]">
        <div className="section-wrap flex flex-wrap items-center justify-between gap-4 py-4 text-[11px] uppercase tracking-[.12em] text-[var(--sage)]">
          <span>Children</span><span className="h-px w-12 bg-[var(--gold)]" /><span>Youth</span><span className="h-px w-12 bg-[var(--gold)]" /><span>Families</span><span className="h-px w-12 bg-[var(--gold)]" /><span>Everyday life</span>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="about-section section-wrap py-24 md:py-32">
      <div className="grid gap-12 md:grid-cols-[.78fr_1.22fr] md:gap-24">
        <Reveal className="about-heading-block">
          <p className="eyebrow">About Thriving Minds</p>
          <h2 className="serif mt-7 text-4xl leading-[1.06] tracking-[-.035em] text-[var(--sage)] md:text-5xl">Support should feel like a handrail, not another hurdle.</h2>
          <span className="about-heading-accent" aria-hidden="true" />
        </Reveal>
        <Reveal delay={1} className="about-support-block">
          <p className="about-intro-copy max-w-[650px] text-[18px] leading-8 text-[rgba(48,39,47,.78)]">Thriving Minds Consulting is a warm, practical space for families looking for support that fits real life. We use Recreation Therapy to build from interests, relationships, movement, play, and the strengths already present in each person.</p>
          <div className="approach-pillars">
            <div className="approach-pillar">
              <div className="approach-pillar-marker">
                <span className="approach-number" aria-hidden="true">01</span>
                <HeartHandshake aria-hidden="true" size={22} />
              </div>
              <h3 className="font-display">Without judgment</h3>
              <p>There is no perfect family here. There is only a next step.</p>
            </div>
            <div className="approach-pillar">
              <div className="approach-pillar-marker">
                <span className="approach-number" aria-hidden="true">02</span>
                <Compass aria-hidden="true" size={22} />
              </div>
              <h3 className="font-display">In context</h3>
              <p>Support belongs in mornings, play, school breaks, and home.</p>
            </div>
            <div className="approach-pillar">
              <div className="approach-pillar-marker">
                <span className="approach-number" aria-hidden="true">03</span>
                <Leaf aria-hidden="true" size={22} />
              </div>
              <h3 className="font-display">Strengths-first</h3>
              <p>Interests and capabilities are places to begin, not afterthoughts.</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section id="services" className="services-section py-24 md:py-32">
      <div className="section-wrap">
        <Reveal>
          <p className="eyebrow services-eyebrow">Ways we can work together</p>
          <div className="services-intro">
            <h2 className="serif services-title">Carefully shaped around your family.</h2>
            <p className="services-lede">Some families need a focused skill-building plan. Others need a steady place to think, adjust, and try again. Services can be tailored to the season you are in.</p>
          </div>
        </Reveal>
        <Reveal delay={1} className="mt-14">
          <ul className="service-grid">
            {services.map((service, index) => <li key={service} className="service-card" data-testid={`service-${index + 1}`}>
              <div className="service-card-image">
                <img src={servicePhotos[service].src} srcSet={responsiveImageSet(servicePhotos[service].src)} sizes="(max-width: 639px) calc(100vw - 32px), 50vw" alt={servicePhotos[service].alt} width={1024} height={1024} style={{ objectPosition: servicePhotos[service].objectPosition }} loading="lazy" decoding="async" />
                <span className="service-number">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="service-card-caption">
                <div className="service-card-copy">
                  <h3 className="service-card-title">{service}</h3>
                  <p className="service-card-description">{serviceDescriptions[service]}</p>
                </div>
              </div>
            </li>)}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

function Programs() {
  return (
    <section id="programs" className="programs-section section-wrap py-24 md:py-32">
      <Reveal><div className="grid gap-8 md:grid-cols-[1.08fr_.92fr] md:items-end"><div><p className="eyebrow">Programs with purpose</p><h2 className="serif mt-6 max-w-[620px] text-5xl leading-[.98] tracking-[-.045em] text-[var(--plum)] md:text-6xl">A place to practice being <span className="italic text-[var(--sage)]">yourself.</span></h2></div><div className="programs-intro-aside"><p className="max-w-[460px] text-sm leading-6 text-[var(--muted-foreground)]">Programs create a little structure around meaningful activity, with room for choice, adaptation, and real relationships.</p><StoryPhoto photo={storyPhotos.programs} className="program-visual" /></div></div></Reveal>
      <Reveal delay={1} className="mt-14 grid gap-4 md:grid-cols-[1fr_1.17fr_1fr]">
        <article className="program-card plum-panel tall"><div><span className="text-[10px] uppercase tracking-[.16em] text-[var(--gold)]">01 / Belonging</span><h3 className="serif mt-8 text-4xl leading-none">Small groups, real practice.</h3></div><div><p className="text-sm leading-6 text-[rgba(253,251,247,.72)]">Structured opportunities for social participation, communication, and shared interests—without forcing one way to join in.</p><a href={homeSectionHref('book-now')} onClick={() => trackEvent('cta_click', { event_category: 'conversion', event_label: 'program_groups' })} className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-[var(--gold)]" data-testid="link-program-groups">Talk about a group <ArrowRight size={14} /></a></div></article>
        <article className="program-card sage-panel"><div><span className="text-[10px] uppercase tracking-[.16em] text-[rgba(253,251,247,.75)]">02 / Capacity</span><h3 className="serif mt-8 text-4xl leading-none">Skills through what already matters.</h3></div><div><p className="text-sm leading-6 text-[rgba(253,251,247,.78)]">Movement, games, creative projects, and everyday challenges become accessible places to build confidence and flexibility.</p><a href={homeSectionHref('recreation-therapy')} onClick={() => trackEvent('cta_click', { event_category: 'navigation', event_label: 'program_approach' })} className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-[var(--ivory)]" data-testid="link-program-practice">Explore the approach <ArrowRight size={14} /></a></div></article>
        <article className="program-card bg-[#eee6d8]"><div><span className="text-[10px] uppercase tracking-[.16em] text-[var(--sage)]">03 / Family rhythm</span><h3 className="serif mt-8 text-4xl leading-none text-[var(--plum)]">Support that travels home.</h3></div><div><p className="text-sm leading-6 text-[rgba(48,39,47,.7)]">Caregiver consultations and practical plans make it easier to carry useful ideas into the moments that matter most.</p><a href={homeSectionHref('families')} onClick={() => trackEvent('cta_click', { event_category: 'navigation', event_label: 'program_families' })} className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-[var(--plum)]" data-testid="link-program-family">See family support <ArrowRight size={14} /></a></div></article>
      </Reveal>
    </section>
  );
}

function Families() {
  return (
    <section id="families" className="family-section bg-[#eee6d8] py-24 md:py-32">
      <div className="section-wrap grid gap-14 md:grid-cols-[.88fr_1.12fr] md:items-center">
        <div className="family-copy">
          <Reveal><p className="eyebrow">For families</p><h2 className="serif mt-7 text-5xl leading-[.98] tracking-[-.045em] text-[var(--plum)] md:text-6xl">You do not have to know the perfect words.</h2></Reveal>
          <Reveal delay={1}><p className="mt-7 max-w-[470px] text-[15px] leading-7 text-[rgba(48,39,47,.73)]">You can begin with what you are noticing: a hard transition, a child who feels overwhelmed, a young person who is pulling away, or a family rhythm that no longer feels workable.</p><a href={homeSectionHref('book-now')} onClick={() => trackEvent('cta_click', { event_category: 'conversion', event_label: 'families_start' })} className="button-main mt-8" data-testid="link-families-start">Start with a conversation <ArrowRight size={14} /></a></Reveal>
        </div>
        <Reveal delay={2}><div className="family-support-stack"><figure className="family-photo"><img src={generatedImage('family-first-conversation.jpg')} alt="A mother and two children sharing a calm planning moment at the kitchen table." width={1024} height={1024} loading="lazy" decoding="async" /></figure><div className="family-path-card soft-border bg-[rgba(253,251,247,.55)] p-6 md:p-8"><div className="mb-8 flex items-center justify-between"><span className="font-display text-2xl text-[var(--plum)]">A gentle first path</span><span className="family-path-note text-[10px] uppercase tracking-[.15em] text-[var(--sage)]">No wrong door</span></div><div className="space-y-1">{[['01', 'Tell us what is feeling hard', 'Share as much or as little context as feels useful.'], ['02', 'Find the right starting point', 'We will talk through support options and what a first conversation could hold.'], ['03', 'Try something that fits', 'Move forward with a practical next step, with room to adjust as you learn.']].map(([number, title, body]) => <div key={number} className="family-path-step grid grid-cols-[42px_1fr] gap-4 border-t border-[rgba(78,42,74,.15)] py-5"><span className="font-display text-xl text-[var(--gold)]">{number}</span><div><h3 className="text-sm font-bold text-[var(--plum)]">{title}</h3><p className="mt-1 text-[12px] leading-5 text-[var(--muted-foreground)]">{body}</p></div></div>)}</div></div></div></Reveal>
      </div>
    </section>
  );
}

function ResourceSectionReveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className={`library-reveal ${visible ? 'is-visible' : ''} ${className}`}>{children}</div>;
}

function Resources() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [openTitle, setOpenTitle] = useState<string | null>(null);
  const categories = [
    'All',
    'Family Connection',
    'Recreation & Wellness',
    'Emotional Regulation',
    'Social Skills',
    'Parent/Caregiver Support',
    'Behaviour Support',
    'Child & Youth Mental Wellness',
  ];
  const featured = resources.find((resource) => resource.title === 'A small check-in for a big inner world');
  const filtered = useMemo(
    () =>
      resources.filter((resource) => {
        const matchesCategory = category === 'All' || resource.category === category;
        const searchableText = `${resource.title} ${resource.summary} ${resource.category} ${resource.body}`;
        return matchesCategory && searchableText.toLowerCase().includes(query.trim().toLowerCase());
      }),
    [category, query],
  );
  const showFeatured = featured !== undefined && filtered.includes(featured);
  const remaining = filtered.filter((resource) => !showFeatured || resource.title !== featured?.title);

  const clearFilters = () => {
    setQuery('');
    setCategory('All');
    setOpenTitle(null);
  };

  const renderResourceAction = (resource: Resource) => {
    const index = resources.indexOf(resource);
    const expanded = openTitle === resource.title;
    const triggerId = `resource-trigger-${index}`;
    const panelId = `resource-body-${index}`;

    return (
      <>
        <button
          type="button"
          id={triggerId}
          className="library-cta"
          onClick={() => setOpenTitle((current) => current === resource.title ? null : resource.title)}
          aria-expanded={expanded}
          aria-controls={panelId}
          data-testid={`button-resource-${index}`}
        >
          <span>{expanded ? 'Close resource' : 'Explore Resource'}</span>
          <ArrowRight className="library-cta-arrow" size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <div
          id={panelId}
          className="library-resource-body"
          role="region"
          aria-labelledby={triggerId}
          hidden={!expanded}
        >
          {resource.body}
        </div>
      </>
    );
  };

  return (
    <section id="resources" className="resources-section library-page" aria-labelledby="resource-heading">
      <div className="library-shell">
        <div className="library-masthead">
          <span>Thriving Minds Consulting · Resources</span>
          <span>{String(resources.length).padStart(2, '0')} practical reads</span>
        </div>

        <header className="library-intro">
          <div>
            <p className="library-kicker">Family resource library</p>
            <h2 id="resource-heading" className="library-heading">
              Useful things for the <span>in-between.</span>
            </h2>
          </div>
          <p className="library-intro-note">
            Short, practical reads for the car ride home, the busy morning, or the moment you need a fresh way to look at things.
          </p>
        </header>

        <div className="library-tools">
          <label className="library-search">
            <Search className="library-search-icon" size={18} strokeWidth={1.8} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpenTitle(null);
              }}
              placeholder="Search family resources…"
              aria-label="Search family resources"
              data-testid="input-resource-search"
            />
          </label>
          <div className="library-category-group">
            <p className="library-category-label" id="resource-categories-label">Filter by category</p>
            <div className="library-categories" role="group" aria-labelledby="resource-categories-label">
              {categories.map((item) => {
                const categoryId = item.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => {
                      setCategory(item);
                      setOpenTitle(null);
                    }}
                    aria-pressed={category === item}
                    data-testid={`button-resource-filter-${categoryId}`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="library-results-top" role="status" aria-live="polite">
          <span className="library-results-kicker">A little room to explore</span>
          <span><strong>{filtered.length}</strong> {filtered.length === 1 ? 'resource' : 'resources'}</span>
        </div>

        {filtered.length > 0 ? (
          <>
            {showFeatured && featured && (
              <ResourceSectionReveal className="library-feature-layout">
                <figure className="library-feature-image-wrap">
                  <img
                    className="library-feature-image"
                    src={generatedImage('service-mental-wellness-youth.jpg')}
                    srcSet={responsiveImageSet(generatedImage('service-mental-wellness-youth.jpg'))}
                    sizes="(max-width: 820px) calc(100vw - 40px), 46vw"
                    alt="A young person and an adult sharing a conversation on a garden path."
                    width={1024}
                    height={1024}
                    loading="lazy"
                    decoding="async"
                    data-testid="img-resource-featured"
                  />
                </figure>
                <article className="library-feature-content" aria-labelledby="resource-featured-title">
                  <p className="library-feature-kicker">Featured resource</p>
                  <div className="library-card-meta">
                    <span>{featured.category}</span>
                    <span className="library-read-time">{featured.readTime}</span>
                  </div>
                  <h3 id="resource-featured-title" className="library-feature-title">{featured.title}</h3>
                  <p className="library-feature-summary">{featured.summary}</p>
                  {renderResourceAction(featured)}
                </article>
              </ResourceSectionReveal>
            )}

            {remaining.length > 0 && (
              <>
                <div className="library-list-heading">
                  <div>
                    <p className="library-section-kicker">{showFeatured ? 'Resources' : 'Family resource library'}</p>
                    <h3 className="library-section-title">
                      {showFeatured ? 'Explore More Resources' : 'Explore Resources'}
                    </h3>
                  </div>
                  <span className="library-list-count">{remaining.length} {remaining.length === 1 ? 'read' : 'reads'}</span>
                </div>
                <div className="library-card-list" id="all-resources">
                  {remaining.map((resource) => {
                    const index = resources.indexOf(resource);
                    return (
                      <article
                        key={resource.title}
                        className="library-resource-card"
                        data-testid={`resource-card-${index}`}
                      >
                        <div className="library-card-meta">
                          <span>{resource.category}</span>
                          <span className="library-read-time">{resource.readTime}</span>
                        </div>
                        <h4 className="library-card-title">{resource.title}</h4>
                        <p className="library-card-summary">{resource.summary}</p>
                        {renderResourceAction(resource)}
                      </article>
                    );
                  })}
                </div>
              </>
            )}

            {filtered.length < resources.length && (
              <div className="library-view-all">
                <button type="button" onClick={clearFilters} data-testid="button-resource-view-all">
                  <span>Explore all resources</span>
                  <ArrowRight className="library-cta-arrow" size={15} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="library-empty">
            <h3>Nothing matched that search.</h3>
            <p>Try another word, or start again with every topic.</p>
            <button type="button" onClick={clearFilters} data-testid="button-clear-resource">Clear filters</button>
          </div>
        )}
      </div>
    </section>
  );
}

function Toolkit() {
  const [selected, setSelected] = useState('Big emotions');
  const strategy = toolkitStrategies[selected];

  return (
    <section className="toolkit-section sage-panel py-24 md:py-32" aria-labelledby="toolkit-heading">
      <div className="section-wrap pi-editorial">
        <Reveal className="pi-editorial-heading">
          <div className="pi-title-block">
            <p className="eyebrow !text-[var(--gold)]">Family Wellness Toolkit</p>
            <h2 id="toolkit-heading" className="pi-section-title serif mt-5">A practical idea for the moment you are in.</h2>
            <p className="pi-supporting-copy mt-4 max-w-[420px] text-sm leading-6 text-[var(--ivory)]">Choose an area below to see a few non-clinical strategies you can try, adapt, or set aside. There is no single right way.</p>
          </div>
          <div className="pi-introduction">
            <p className="pi-notice border-l border-[var(--gold)] pl-4 text-[11px] leading-5 text-[var(--ivory)]">This toolkit is educational information, not clinical advice, diagnosis, or a substitute for individualized support.</p>
          </div>
        </Reveal>

        <Reveal delay={1} className="pi-workspace">
          <nav className="pi-area-panel" aria-label="Choose a wellness toolkit area">
            <div className="pi-area-list">
              {toolkitAreas.map((area) => (
                <button
                  type="button"
                  key={area}
                  onClick={() => setSelected(area)}
                  className={`toolkit-chip ${selected === area ? 'active' : ''}`}
                  aria-pressed={selected === area}
                  data-testid={`button-toolkit-${area.toLowerCase().replaceAll(/[^a-z]+/g, '-')}`}
                >
                  {area}
                </button>
              ))}
            </div>
          </nav>

          <article className="pi-idea-panel" aria-live="polite" aria-labelledby="strategy-heading">
            <div className="pi-idea-heading">
              <h3 id="strategy-heading" className="pi-topic-title">{selected}</h3>
            </div>
            <p className="pi-idea-intro mt-5 text-sm leading-6 text-[rgba(48,39,47,.75)]">{strategy.intro}</p>
            <ul className="pi-steps mt-5">
              {strategy.steps.map((step) => (
                <li key={step} className="pi-step flex gap-3 text-[13px] leading-5">
                  <Check size={15} className="mt-0.5 shrink-0 text-[var(--sage)]" />
                  {step}
                </li>
              ))}
            </ul>
          </article>
        </Reveal>
      </div>
    </section>
  );
}

function RecreationTherapy() {
  const [activeInterestId, setActiveInterestId] = useState<InterestAreaId>('move');
  const activeInterest = interestAreas.find((interest) => interest.id === activeInterestId)!;
  const ActiveInterestIcon = activeInterest.icon;

  return (
    <section id="recreation-therapy" className="recreation-section section-wrap py-24 md:py-32">
      <div className="grid gap-12 md:grid-cols-[1.15fr_.85fr] md:items-start">
        <Reveal><p className="eyebrow">About Recreation Therapy</p><h2 className="serif mt-7 max-w-[710px] text-5xl leading-[.98] tracking-[-.045em] text-[var(--plum)] md:text-7xl">Growth feels different when it starts with <span className="italic text-[var(--plum)]">interest.</span></h2><p className="mt-8 max-w-[650px] text-[16px] leading-8 text-[rgba(48,39,47,.75)]">Recreation Therapy uses meaningful activities—such as play, movement, creative work, nature, games, and shared interests—to support participation, connection, and skill development. The activity is not a reward after the work. It is part of the work.</p><StoryPhoto photo={storyPhotos.recreation} className="recreation-visual mt-9" /></Reveal>
        <Reveal delay={1} className="recreation-approach md:mt-16">
          <p className="recreation-interest-label">Interests — to support participation</p>
          <div className="recreation-quote">
            <p className="font-display text-3xl leading-tight text-[var(--plum)]">“What would make joining in feel more possible?”</p>
            <p className="mt-4 text-[12px] leading-5 text-[var(--muted-foreground)]">A question we can keep returning to.</p>
          </div>
          <div className="interest-explorer" data-active-interest={activeInterest.id}>
            <div className="interest-stage" aria-hidden="true">
              <span className="interest-stage-orbit" />
              <span className="interest-stage-icon"><ActiveInterestIcon size={23} strokeWidth={1.7} /></span>
              <div className="interest-stage-copy"><span>A way in</span><strong>{activeInterest.label}</strong></div>
            </div>
            <div className="interest-picker" role="group" aria-label="Explore meaningful interests">
              {interestAreas.map(({ id, label, icon: InterestIcon }) => (
                <button
                  type="button"
                  key={id}
                  className={`interest-choice ${activeInterestId === id ? 'is-active' : ''}`}
                  aria-pressed={activeInterestId === id}
                  aria-controls="interest-description"
                  onPointerEnter={() => setActiveInterestId(id)}
                  onFocus={() => setActiveInterestId(id)}
                  onClick={() => setActiveInterestId(id)}
                  data-testid={`button-interest-${id}`}
                >
                  <InterestIcon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <p id="interest-description" className="interest-description" aria-live="polite">{activeInterest.description}</p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-[rgba(78,42,74,.15)] pt-7">{[['01', 'Meaningful', 'Start with what already has energy.'], ['02', 'Adaptable', 'Change the environment, pace, or entry point.'], ['03', 'Relational', 'Build skills with someone, not in isolation.'], ['04', 'Everyday', 'Make the next step usable beyond the session.']].map(([number, title, body]) => <div key={number}><span className="recreation-number">{number}</span><h3 className="mt-2 font-display text-xl text-[var(--plum)]">{title}</h3><p className="mt-2 text-[12px] leading-5 text-[var(--muted-foreground)]">{body}</p></div>)}</div>
        </Reveal>
      </div>
    </section>
  );
}

function Founder() {
  return (
    <section id="founder" className="founder-section py-24 md:py-32">
      <div className="section-wrap founder-layout">
        <Reveal className="founder-opening">
          <div className="founder-opening-copy">
            <p className="eyebrow">Meet the founder</p>
            <h2 className="founder-title serif mt-7">Hi, I’m the founder of Thriving Minds Consulting.</h2>
            <div className="founder-brand-lockup">
              <img className="founder-portrait" src={founderLogo} alt="Thriving Minds Consulting official tree logo" width={844} height={1024} loading="lazy" decoding="async" />
              <div className="founder-signature">
                <p className="font-display text-xl text-[var(--plum)]">Support. Empower. Thrive.</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--sage)]">Ann Marie Flemming</p>
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={1}>
          <div className="founder-card founder-story">
            <div>
              <p className="text-[14px] leading-7 text-[rgba(48,39,47,.78)]">I created Thriving Minds because I believe children, youth, and families deserve support that looks beyond behaviour and takes the time to understand the person behind it.</p>
              <p className="mt-5 text-[14px] leading-7 text-[rgba(48,39,47,.78)]">Sometimes families are simply looking for someone who will listen without judgment, recognize their strengths, and help them find practical ways forward.</p>
              <p className="mt-5 text-[14px] leading-7 text-[rgba(48,39,47,.78)]">My approach is rooted in connection, safety, regulation, and growth. I create opportunities for children and youth to build skills, discover their strengths, develop confidence, and experience success in ways that feel meaningful to them.</p>
              <p className="mt-5 text-[14px] leading-7 text-[rgba(48,39,47,.78)]">Thriving Minds Consulting was created to be a warm, supportive space where families can take the next step at their own pace.</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FamilyStoryBreak() {
  return (
    <section className="full-story-break" data-testid="family-story-break">
      <img src={storyPhotos.fullStory.src} srcSet={responsiveImageSet(storyPhotos.fullStory.src)} sizes="100vw" alt={storyPhotos.fullStory.alt} width={1024} height={1024} style={{ objectPosition: storyPhotos.fullStory.objectPosition }} loading="lazy" decoding="async" />
      <div className="section-wrap full-story-content">
        <div>
          <p className="eyebrow !text-[var(--gold)]">Thriving Minds Consulting</p>
          <h2 className="serif mt-5 max-w-[820px] text-5xl leading-[.98] tracking-[-.045em] text-[var(--ivory)] md:text-7xl">Support that fits real family life.</h2>
        </div>
      </div>
    </section>
  );
}

function Difference() {
  const principles = [
    ['Connection', 'Start with relationship, interest, and a sense of being understood.'],
    ['Safety', 'Create enough predictability and choice for participation to feel possible.'],
    ['Regulation', 'Notice what helps the body, environment, and moment become more workable.'],
    ['Growth', 'Build skills and confidence through meaningful, everyday experiences.'],
  ];
  return (
    <section id="different" className="plum-panel py-24 md:py-32">
      <div className="section-wrap">
        <Reveal><div className="grid gap-8 md:grid-cols-[1.08fr_.92fr] md:items-end"><div><p className="eyebrow !text-[var(--gold)]">What makes Thriving Minds different?</p><h2 className="serif mt-7 max-w-[620px] text-5xl leading-[.98] tracking-[-.045em] md:text-7xl">Support. <span className="text-[var(--sage)]">Empower.</span> Thrive.</h2></div><div><p className="max-w-[460px] text-sm leading-6 text-[rgba(253,251,247,.72)]">A strengths-based, family-focused approach that stays practical, engaging, and connected to meaningful recreation and everyday life.</p><StoryPhoto photo={storyPhotos.journey} className="journey-visual mt-5" /></div></div></Reveal>
        <Reveal delay={1} className="mt-14">
          <div className="grid gap-0 border-y border-[rgba(253,251,247,.2)] md:grid-cols-4">
            {principles.map(([title, body], index) => <div key={title} className="path-step border-b border-[rgba(253,251,247,.2)] py-6 md:border-b-0 md:border-r md:px-6 md:first:pl-0 md:last:border-r-0"><span className="text-[11px] text-[var(--gold)]">0{index + 1}</span><h3 className="serif mt-4 text-3xl">{title}</h3><p className="mt-4 text-[12px] leading-5 text-[rgba(253,251,247,.68)]">{body}</p></div>)}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function BookingJourney() {
  const steps = [
    ['01', 'Connect', 'Initial consultation and conversation.'],
    ['02', 'Understand', 'Explore strengths, interests, needs, and goals.'],
    ['03', 'Create', 'Develop an individualized therapeutic approach.'],
    ['04', 'Thrive', 'Build skills and confidence through meaningful therapeutic activities.'],
  ];
  const [activeStep, setActiveStep] = useState(0);
  const journeyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = journeyRef.current;
    if (!node) return;

    const timers: number[] = [];
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setActiveStep(steps.length);
        return;
      }

      setActiveStep(1);
      for (let step = 2; step <= steps.length; step += 1) {
        timers.push(window.setTimeout(() => setActiveStep(step), 520 * (step - 1)));
      }
    }, { threshold: 0.2 });

    observer.observe(node);
    return () => {
      observer.disconnect();
      timers.forEach(window.clearTimeout);
    };
  }, []);

  return (
    <section id="after-booking" className="booking-journey-section section-wrap py-24 md:py-32">
      <Reveal><div className="max-w-[650px]"><p className="eyebrow">What happens after you book?</p><h2 className="serif mt-7 text-5xl leading-[.98] tracking-[-.045em] text-[var(--plum)] md:text-7xl">A clear next step, not a complicated process.</h2><p className="mt-6 max-w-[480px] text-sm leading-6 text-[var(--muted-foreground)]">The first conversation is a chance to listen, understand, and talk about what would fit your family.</p></div></Reveal>
      <Reveal delay={1} className="mt-14">
        <div ref={journeyRef} className="journey-grid grid gap-3 md:grid-cols-4">
          {steps.map(([number, title, body], index) => (
            <div
              key={title}
              className={`journey-card ${activeStep === index + 1 ? 'is-active' : activeStep > index + 1 ? 'is-complete' : ''}`}
              aria-current={activeStep === index + 1 ? 'step' : undefined}
              data-testid={`journey-step-${number}`}
            >
              <span className="font-display text-3xl text-[var(--gold)]">{number}</span>
              <h3 className="serif mt-9 text-3xl text-[var(--plum)]">{title}</h3>
              <p className="mt-3 text-[12px] leading-5 text-[var(--muted-foreground)]">{body}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function MeetFamily() {
  const scenes = ['School stress', 'Emotional regulation', 'Family communication', 'Behaviour challenges', 'Social situations', 'Recreation', 'Wellness', 'Celebrating small wins'];
  return (
    <section id="meet-family" className="sage-panel py-24 md:py-32">
      <div className="section-wrap grid gap-12 md:grid-cols-[.9fr_1.1fr] md:items-center">
        <Reveal>
          <p className="eyebrow !text-[var(--gold)]">Meet the family</p>
          <h2 className="serif mt-7 text-5xl leading-[.98] tracking-[-.045em] md:text-7xl">Small stories. Real-life practice.</h2>
          <p className="mt-7 max-w-[440px] text-[15px] leading-7 text-[rgba(253,251,247,.76)]">A fictional family can make everyday moments, practical ideas, and small wins easier to recognize in future educational stories.</p>
          <p className="mt-7 border-l border-[var(--gold)] pl-4 text-[11px] leading-5 text-[rgba(253,251,247,.68)]">These stories are fictional educational examples, not real clients or client experiences.</p>
        </Reveal>
        <Reveal delay={1}>
          <div className="family-card">
          <div className="family-card-top"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--gold)]">An everyday story</span><span className="font-display text-2xl text-[var(--plum)]">01</span></div>
            <div className="family-illustration" aria-hidden="true"><span className="family-orbit orbit-a" /><span className="family-orbit orbit-b" /><span className="family-person person-one" /><span className="family-person person-two" /><span className="family-person person-three" /></div>
            <div className="mt-7"><h3 className="serif text-4xl text-[var(--plum)]">Meet the Family</h3><p className="mt-3 text-[12px] leading-5 text-[var(--muted-foreground)]">A fictional family learning, adjusting, and celebrating small wins together.</p></div>
            <div className="mt-7 flex flex-wrap gap-2">{scenes.map((scene) => <span key={scene} className="scene-tag">{scene}</span>)}</div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FAQ() {
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  return (
    <section id="faq" className="faq-section section-wrap py-24 md:py-32">
      <div className="grid gap-12 md:grid-cols-[.72fr_1.28fr]">
        <Reveal><p className="eyebrow">Questions, answered</p><h2 className="serif mt-7 text-5xl leading-[.98] tracking-[-.045em] text-[var(--plum)] md:text-6xl">A little more clarity before you begin.</h2><p className="mt-6 max-w-[360px] text-sm leading-6 text-[var(--muted-foreground)]">If your question is not here, the consultation pathway is a good place to bring it.</p><a href={homeSectionHref('book-now')} onClick={() => trackEvent('cta_click', { event_category: 'conversion', event_label: 'faq_ask' })} className="button-outline mt-8" data-testid="link-faq-book">Ask a question <ArrowRight size={14} /></a></Reveal>
        <Reveal delay={1}><div className="faq-list">{faqItems.map(([question, answer], index) => {
          const questionId = `faq-question-${index + 1}`;
          const answerId = `faq-answer-${index + 1}`;
          const isOpen = openQuestion === question;
          return <div key={question} className="faq-row"><button id={questionId} type="button" onClick={() => setOpenQuestion(isOpen ? null : question)} className="flex w-full items-center justify-between gap-5 py-5 text-left" aria-expanded={isOpen} aria-controls={answerId} data-testid={`button-faq-${question.toLowerCase().replaceAll(/[^a-z]+/g, '-').slice(0, 30)}`}><span className="font-display text-lg text-[var(--plum)]">{question}</span>{isOpen ? <ChevronUp size={17} className="shrink-0 text-[var(--sage)]" /> : <ChevronDown size={17} className="shrink-0 text-[var(--sage)]" />}</button><div id={answerId} className={`faq-answer ${isOpen ? 'is-open' : ''}`} role="region" aria-labelledby={questionId} aria-hidden={!isOpen}><div className="faq-answer-inner"><p className="pb-5 pr-8 text-[13px] leading-6 text-[var(--muted-foreground)]">{answer}</p></div></div></div>;
        })}</div></Reveal>
      </div>
    </section>
  );
}

function TrustSafety() {
  const policies = [
    ['Privacy', 'Share only what feels useful. Contact details and information provided through the website are intended for communication about support and are not displayed publicly.'],
    ['Accessibility', 'Support should be practical and welcoming. Accessibility needs, communication preferences, and flexible ways to participate can be discussed during consultation.'],
    ['Website terms', 'Website content is provided for general information. Using these educational resources does not create a therapeutic relationship or guarantee a particular outcome.'],
    ['Educational resources', 'Toolkit ideas and articles are educational starting points, not individualized assessment, diagnosis, or medical or mental-health treatment.'],
    ['Health and emergencies', 'This website is not an emergency service. If someone is in immediate danger or needs urgent medical or mental-health care, contact local emergency services or an appropriate urgent care provider.'],
  ];
  return (
    <section id="trust-safety" className="bg-[#eee6d8] py-20 md:py-24">
      <div className="section-wrap">
        <Reveal><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="eyebrow">Trust and safety</p><h2 className="serif mt-6 text-4xl leading-[.98] tracking-[-.04em] text-[var(--plum)] md:text-5xl">Clear boundaries are part of care.</h2></div><p className="max-w-[350px] text-sm leading-6 text-[var(--muted-foreground)]">A few plain-language notes about how to use this website and its resources.</p></div></Reveal>
        <Reveal delay={1} className="trust-policy-grid mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{policies.map(([title, body]) => <article key={title} className="policy-card"><h3 className="font-display text-lg text-[var(--plum)]">{title}</h3><p className="mt-3 text-[11px] leading-5 text-[var(--muted-foreground)]">{body}</p></article>)}</Reveal>
      </div>
    </section>
  );
}

function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [support, setSupport] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string; id?: string; conflict?: boolean } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [requestId, setRequestId] = useState(() => createRequestId());
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || feedback?.kind === 'success') return;
    const website = String(new FormData(event.currentTarget).get('website') || '');
    if (!consent) {
      setFieldErrors({ consent: 'Please agree before sending your contact request.' });
      setFeedback({ kind: 'error', text: 'Please review the required consent before sending.' });
      return;
    }
    setPending(true);
    setFeedback(null);
    setFieldErrors({});
    trackEvent('contact_submission', { event_category: 'conversion', event_label: 'contact_form' });
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestId },
        body: JSON.stringify({ name, email, support, message, consent: true, website, startedAt, requestId }),
      });
      const result = await response.json().catch(() => ({})) as { id?: string; message?: string; error?: string; fields?: Record<string, string> };
      if (response.status === 409) {
        setFeedback({ kind: 'error', text: 'An earlier request was already saved using this reference. To send your changed message, start a new request below.', conflict: true });
        return;
      }
      if (response.status !== 201) {
        if (result.fields && typeof result.fields === 'object') {
          setFieldErrors(Object.fromEntries(Object.entries(result.fields).map(([key, value]) => [key, String(value)])));
        }
        throw new Error(result.error || 'We could not save your message just now. Please review the highlighted fields and try again.');
      }
      setFeedback({ kind: 'success', text: result.message || 'Your message was saved privately.', id: result.id });
      trackEvent('contact_saved', { event_category: 'conversion', event_label: 'contact_form' });
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'We could not save your message just now. Please try again.' });
    } finally {
      setPending(false);
    }
  };
  const fieldError = (name: string) => fieldErrors[name] ? <span id={`contact-${name}-error`} className="contact-field-error mt-1 block">{fieldErrors[name]}</span> : null;
  const clearFieldError = (field: string) => setFieldErrors((previous) => {
    const next = { ...previous };
    delete next[field];
    return next;
  });
  const beginAnother = () => {
    setName('');
    setEmail('');
    setSupport('');
    setMessage('');
    setConsent(false);
    setFieldErrors({});
    setFeedback(null);
    setStartedAt(Date.now());
    setRequestId(createRequestId());
  };
  return (
    <section id="contact" className="contact-section bg-[#eee6d8] py-24 md:py-32">
      <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <filter id="contact-logo-colour" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="gamma" amplitude="0.82" exponent="0.32" offset="0.18" />
              <feFuncG type="gamma" amplitude="0.82" exponent="0.32" offset="0.18" />
              <feFuncB type="gamma" amplitude="0.82" exponent="0.32" offset="0.18" />
              <feFuncA type="identity" />
            </feComponentTransfer>
            <feColorMatrix type="saturate" values="1.25" />
          </filter>
        </defs>
      </svg>
      <div className="section-wrap grid gap-14 md:grid-cols-[.83fr_1.17fr]">
        <Reveal><div className="contact-intro"><img src={logoSrc} alt="Thriving Minds Consulting" width={515} height={515} className="contact-logo" /><div><p className="eyebrow">Contact</p><h2 className="serif mt-7 text-5xl leading-[.98] tracking-[-.045em] text-[var(--plum)] md:text-6xl">Let’s find a way forward.</h2></div></div><p className="mt-7 max-w-[420px] text-sm leading-6 text-[rgba(48,39,47,.72)]">Reach out with a question, a context, or just the part that feels hardest to explain. We will help make the next step clearer.</p><div className="mt-10 space-y-4 border-t border-[rgba(78,42,74,.16)] pt-6 text-sm"><a href="tel:+16476678437" onClick={() => trackEvent('phone_click', { event_category: 'contact', event_label: 'contact_section' })} className="flex items-center gap-3 text-[var(--plum)] hover:text-[var(--sage)]" data-testid="link-contact-phone"><MessageCircle size={16} />647-667-8437</a><a href="mailto:info@thrivingmindsconsulting.com" onClick={() => trackEvent('email_click', { event_category: 'contact', event_label: 'contact_section' })} className="flex items-center gap-3 text-[var(--plum)] hover:text-[var(--sage)]" data-testid="link-contact-email"><ArrowRight size={16} />info@thrivingmindsconsulting.com</a></div></Reveal>
        <Reveal delay={1}><div id="book-now" className="bg-[var(--ivory)] p-6 shadow-[0_18px_45px_rgba(78,42,74,.08)] md:p-9"><div className="flex items-start justify-between gap-5"><div><span className="text-[10px] font-bold uppercase tracking-[.15em] text-[var(--sage)]">Contact request</span><h3 className="serif mt-3 text-4xl leading-none text-[var(--plum)]">Begin with a conversation.</h3></div><img src={logoSrc} alt="" width={515} height={515} className="booking-logo" /></div>
        {feedback && <div className={`contact-status mt-7 ${feedback.kind === 'error' ? 'is-error' : ''}`} role={feedback.kind === 'error' ? 'alert' : 'status'} aria-live={feedback.kind === 'error' ? 'assertive' : 'polite'}><p>{feedback.text}</p>{feedback.kind === 'success' && <><p className="mt-2">Saving a request does not confirm a booking or guarantee email delivery.</p>{feedback.id && <p className="mt-1 font-semibold">Reference ID: {feedback.id}</p>}<button type="button" onClick={beginAnother} className="mt-4 text-xs font-bold text-[var(--plum)] underline underline-offset-4" data-testid="button-send-another">Send another message</button></>}</div>}
          {pending && <p className="contact-status mt-7" role="status" aria-live="polite">Sending your contact request…</p>}
          {feedback?.conflict && <button type="button" className="button-outline mt-4" onClick={() => { setRequestId(createRequestId()); setFeedback(null); }} data-testid="button-new-request">Use these details for a new request <ArrowRight size={14} /></button>}
          {feedback?.kind !== 'success' && <form onSubmit={submit} className="mt-8 space-y-5" aria-busy={pending}>
            <div className="honeypot-field" aria-hidden="true"><label htmlFor="contact-website">Leave this field empty</label><input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" /></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-[11px] font-bold text-[var(--plum)]" htmlFor="contact-name">Your name <span aria-hidden="true">*</span><input id="contact-name" name="name" autoComplete="name" maxLength={100} required aria-required="true" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined} value={name} onChange={(event) => { setName(event.target.value); clearFieldError('name'); }} className="input-field mt-2" placeholder="How should we greet you?" data-testid="input-contact-name" />{fieldError('name')}</label>
              <label className="text-[11px] font-bold text-[var(--plum)]" htmlFor="contact-email">Email address <span aria-hidden="true">*</span><input id="contact-email" name="email" autoComplete="email" maxLength={254} required aria-required="true" aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined} type="email" value={email} onChange={(event) => { setEmail(event.target.value); clearFieldError('email'); }} className="input-field mt-2" placeholder="you@example.com" data-testid="input-contact-email" />{fieldError('email')}</label>
            </div>
            <label className="block text-[11px] font-bold text-[var(--plum)]" htmlFor="contact-support">What would you like support with? <span aria-hidden="true">*</span><select id="contact-support" name="support" required aria-required="true" aria-invalid={Boolean(fieldErrors.support)} aria-describedby={fieldErrors.support ? 'contact-support-error' : undefined} value={support} onChange={(event) => { setSupport(event.target.value); clearFieldError('support'); }} className="input-field mt-2" data-testid="select-contact-support"><option value="">Choose an area</option>{toolkitAreas.map((area) => <option key={area} value={area}>{area}</option>)}<option value="Something else">Something else</option></select>{fieldError('support')}</label>
            <label className="block text-[11px] font-bold text-[var(--plum)]" htmlFor="contact-message">A little more context<textarea id="contact-message" name="message" maxLength={2000} aria-invalid={Boolean(fieldErrors.message)} aria-describedby={fieldErrors.message ? 'contact-message-error' : 'contact-sensitive-note'} value={message} onChange={(event) => { setMessage(event.target.value); clearFieldError('message'); }} className="input-field mt-2 min-h-[104px] resize-y" placeholder="Share what feels useful. There is no perfect way to say it." data-testid="textarea-contact-message" />{fieldError('message')}</label>
            <p id="contact-sensitive-note" className="text-xs leading-5 text-[var(--muted-foreground)]">Please do not include a child’s diagnosis, medical records, or other sensitive health information.</p>
            <div><label className="contact-consent-label"><input name="consent" type="checkbox" required checked={consent} onChange={(event) => { setConsent(event.target.checked); clearFieldError('consent'); }} aria-required="true" aria-invalid={Boolean(fieldErrors.consent)} aria-describedby={fieldErrors.consent ? 'contact-consent-error' : undefined} /><span>I agree that this contact information and message may be stored privately, and that my name, email, and support area may be used to notify Thriving Minds Consulting about my request. <span aria-hidden="true">*</span></span></label><p className="ml-6 mt-1 text-xs"><a href={routeHref('/privacy')} className="font-bold text-[#31543a] underline underline-offset-2">Read the Privacy notice</a></p>{fieldError('consent')}</div>
            <button type="submit" disabled={pending} className="button-main w-full disabled:cursor-wait disabled:opacity-65 sm:w-auto" data-testid="button-contact-submit">{pending ? 'Sending…' : 'Send contact request'} <ArrowRight size={14} /></button>
            <p className="text-[10px] leading-4 text-[var(--muted-foreground)]">This is not an emergency service. If someone is in immediate danger, contact local emergency services. A saved request is not an email notification or booking confirmation.</p>
          </form>}
        </div></Reveal>
      </div>
    </section>
  );
}

function Pricing() {
  const prices = [
    { name: 'Initial Consultation', detail: '45–60 minutes', price: '$40–$70' },
    { name: '1:1 Recreation Therapy Session', detail: '60 minutes', price: '$50–$90' },
    { name: 'Family/Caregiver Consultation', detail: '', price: '$50–$80' },
    { name: 'Basic Support Package', detail: '4 sessions', price: '$180–$300' },
    { name: 'Growth Support Package', detail: '8 sessions', price: '$320–$550' },
    { name: 'Ongoing Support Package', detail: '12 sessions', price: '$480–$750' },
    { name: 'Group Sessions', detail: '', price: '$20–$40 per session' },
  ];
  return (
    <section className="pricing-section section-wrap py-24 md:py-32">
      <Reveal>
        <div className="grid gap-10 md:grid-cols-[.8fr_1.2fr]">
          <div className="pricing-intro pricing-intro-panel">
            <p className="eyebrow">Accessible by design</p>
            <h2 className="serif mt-7 text-5xl leading-[.98] tracking-[-.045em] text-[var(--plum)] md:text-6xl">Support with room to breathe.</h2>
            <p className="mt-6 max-w-[390px] text-sm leading-6 text-[var(--muted-foreground)]">Sliding-scale pricing is available so families can talk about fit with clarity and care. We can discuss where a service or package sits within the range.</p>
          </div>
          <div className="pricing-list">
            <div className="pricing-group">
              {prices.slice(0, 3).map(({ name, detail, price }) => <div key={name} className="pricing-row"><span className="pricing-label"><span>{name}</span>{detail && <small>{detail}</small>}</span><span>{price}</span></div>)}
            </div>
            <div className="pricing-group pricing-group-packages">
              {prices.slice(3).map(({ name, detail, price }) => <div key={name} className="pricing-row"><span className="pricing-label"><span>{name}</span>{detail && <small>{detail}</small>}</span><span>{price}</span></div>)}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="plum-panel py-14 md:py-16">
      <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <filter id="footer-logo-lettering" colorInterpolationFilters="sRGB">
            <feComponentTransfer in="SourceGraphic" x="0%" y="58%" width="100%" height="30%" result="clearer-lettering">
              <feFuncR type="gamma" amplitude="0.82" exponent="0.32" offset="0.18" />
              <feFuncG type="gamma" amplitude="0.82" exponent="0.32" offset="0.18" />
              <feFuncB type="gamma" amplitude="0.82" exponent="0.32" offset="0.18" />
              <feFuncA type="gamma" amplitude="1" exponent="0.4" offset="0" />
            </feComponentTransfer>
            <feMorphology in="clearer-lettering" operator="dilate" radius="0.15" x="0%" y="58%" width="100%" height="30%" result="defined-lettering" />
            <feOffset in="defined-lettering" dx="0" dy="0" x="18%" y="58%" width="65%" height="24.5%" result="business-name" />
            <feOffset in="defined-lettering" dx="0" dy="0" x="27%" y="83%" width="48%" height="4.5%" result="consulting" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="business-name" />
              <feMergeNode in="consulting" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <div className="section-wrap">
        <div className="flex flex-col justify-between gap-12 md:flex-row md:items-end">
          <div>
            <Brand light />
            <p className="mt-8 font-display text-sm leading-7 text-[var(--gold)]">Support. Empower. Thrive.</p>
            <p className="mt-3 max-w-[340px] text-xs leading-6 text-[rgba(253,251,247,.78)]">Recreation Therapy for Children, Youth &amp; Families.</p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-4 text-xs text-[rgba(253,251,247,.82)]" aria-label="Footer navigation">
            {navItems.map(([label, id]) => <a key={id} href={homeSectionHref(id)} className="hover:text-[var(--gold)]" data-testid={`link-footer-${id}`}>{label}</a>)}
            <a href={homeSectionHref('founder')} className="hover:text-[var(--gold)]" data-testid="link-footer-founder">Founder</a>
            <a href={homeSectionHref('faq')} className="hover:text-[var(--gold)]" data-testid="link-footer-faq">FAQ</a>
            <a href={homeSectionHref('trust-safety')} className="hover:text-[var(--gold)]" data-testid="link-footer-trust">Trust &amp; safety</a>
            <a href={routeHref('/privacy')} className="hover:text-[var(--gold)]">Privacy</a>
            <a href={routeHref('/terms')} className="hover:text-[var(--gold)]">Terms</a>
            <a href={routeHref('/accessibility')} className="hover:text-[var(--gold)]">Accessibility</a>
            <a href={routeHref('/resource-disclaimer')} className="hover:text-[var(--gold)]">Resource disclaimer</a>
          </nav>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-[rgba(253,251,247,.2)] pt-7 text-xs text-[rgba(253,251,247,.82)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
          <a href="tel:+16476678437" onClick={() => trackEvent('phone_click', { event_category: 'contact', event_label: 'footer' })} className="hover:text-[var(--gold)]">647-667-8437</a>
          <a href="mailto:info@thrivingmindsconsulting.com" onClick={() => trackEvent('email_click', { event_category: 'contact', event_label: 'footer' })} className="hover:text-[var(--gold)]">info@thrivingmindsconsulting.com</a>
          <a href={homeSectionHref('home')} className="hover:text-[var(--gold)]">Home</a>
        </div>
      </div>
    </footer>
  );
}

function Home() {
  return <div className="site-shell"><Header /><main id="main-content" tabIndex={-1}><Hero /><About /><Founder /><FamilyStoryBreak /><Difference /><Services /><Programs /><Families /><BookingJourney /><MeetFamily /><Resources /><Toolkit /><RecreationTherapy /><FAQ /><Pricing /><TrustSafety /><Contact /></main><Footer /></div>;
}

function Router() {
  const [location] = useLocation();
  usePageAnalytics();
  return <RoutedErrorBoundary><a className="skip-link" href="#main-content">Skip to main content</a><PageMetadata path={location} /><Switch><Route path="/" component={Home} /><Route path="/privacy" component={PrivacyPage} /><Route path="/terms" component={TermsPage} /><Route path="/accessibility" component={AccessibilityPage} /><Route path="/resource-disclaimer" component={ResourceDisclaimerPage} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App({ ssrPath }: { ssrPath?: string } = {}) {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')} ssrPath={ssrPath}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;