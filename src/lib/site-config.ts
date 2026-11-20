/**
 * The intended custom domain is supplied by the site owner but has not been
 * verified as connected. Set VITE_SITE_ORIGIN when the published canonical
 * origin changes; never derive public SEO URLs from a development hostname.
 */
export const SITE_ORIGIN = (
  import.meta.env.VITE_SITE_ORIGIN || 'https://thrivingmindsconsulting.com'
).replace(/\/+$/, '');

export const SITE_NAME = 'Thriving Minds Consulting';
export const SOCIAL_IMAGE_PATH = '/social-preview.png';

export const PUBLIC_ROUTES = [
  {
    path: '/',
    title: 'Recreation Therapy for Families | Thriving Minds Consulting',
    description:
      'Explore strengths-based recreation therapy, family coaching and wellness support for children and youth through Thriving Minds Consulting.',
    pageName: 'Thriving Minds Consulting recreation therapy and family wellness',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | Thriving Minds Consulting',
    description:
      'Read how Thriving Minds Consulting handles information shared through this website and how to contact us with privacy questions.',
    pageName: 'Privacy Policy',
  },
  {
    path: '/terms',
    title: 'Terms of Use | Thriving Minds Consulting',
    description:
      'Review the terms for using the Thriving Minds Consulting website and its informational content.',
    pageName: 'Terms of Use',
  },
  {
    path: '/accessibility',
    title: 'Accessibility Statement | Thriving Minds Consulting',
    description:
      'Learn about accessibility at Thriving Minds Consulting and how to share feedback or request an accommodation.',
    pageName: 'Accessibility Statement',
  },
  {
    path: '/resource-disclaimer',
    title: 'Resource Disclaimer | Thriving Minds Consulting',
    description:
      'Understand the limits of educational information shared in Thriving Minds Consulting resources.',
    pageName: 'Resource Disclaimer',
  },
] as const;

export const SERVICE_SCHEMA = [
  {
    name: 'Recreation Therapy',
    description:
      'Build connection and everyday skills through personally meaningful play, movement, creativity, and shared interests.',
  },
  {
    name: 'Emotional Regulation',
    description:
      'Explore calming strategies, sensory supports, and flexible routines for moments that feel big.',
  },
  {
    name: 'Behaviour Support',
    description:
      'Look for what behaviour may communicate and shape practical, supportive responses together.',
  },
  {
    name: 'Social Skills Development',
    description:
      'Practice communication, collaboration, and turn-taking through shared activities.',
  },
  {
    name: 'Family Coaching',
    description:
      'Work with caregivers on everyday routines, connection, and practical ways forward.',
  },
  {
    name: 'Therapeutic Programs',
    description:
      'Take part in structured activities with room for choice, adaptation, and meaningful practice.',
  },
  {
    name: 'Child & Youth Mental Wellness Coaching',
    description:
      'Support young people to explore strengths, feelings, coping tools, and next steps.',
  },
  {
    name: 'Autism Support',
    description:
      'Create sensory-aware, interest-led support with choice, flexibility, and respect for each person.',
  },
  {
    name: 'Program Development',
    description:
      'Shape engaging programs around participants, goals, and community needs.',
  },
  {
    name: 'Program Evaluation',
    description:
      'Gather feedback and review what is working to guide thoughtful improvements.',
  },
] as const;

export function canonicalUrl(path: string) {
  return `${SITE_ORIGIN}${path === '/' ? '/' : path}`;
}