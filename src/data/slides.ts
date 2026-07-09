// Homepage hero slides.
//
// CORE slides live here in code and are permanent — the admin tool can never
// edit or remove them. Extra, time-limited slides are managed through the admin
// app and stored in `extra-slides.json`; non-expired ones are appended after the
// core slides at build time.
import extra from './extra-slides.json';

export interface HeroSlide {
  eyebrow: string;
  title: string;
  text: string;
  ctas: { label: string; href: string; style?: 'primary' | 'cyan' | 'ghost' }[];
  /** Which pop-art composition to show alongside the copy. */
  art: 'atom' | 'orbit' | 'exit' | 'spark';
  /** Accent colour for the slide's starburst. */
  burst?: string;
  /** Optional featured image (web path) shown instead of the SVG art. */
  image?: string;
}

/** Shape of an admin-added slide in extra-slides.json. */
interface ExtraSlide {
  id: string;
  eyebrow?: string;
  title: string;
  text?: string;
  ctaLabel?: string;
  ctaHref?: string;
  art?: HeroSlide['art'];
  burst?: string;
  image?: string;
  /** ISO date (YYYY-MM-DD); slide auto-hides once this date has passed. */
  expires?: string;
}

const coreSlides: HeroSlide[] = [
  {
    eyebrow: 'The Atom',
    title: 'File and object storage for Media Workflows. One system. Fully supported.',
    text:
      'The Atom is a turnkey storage platform for Media workflows; designed, delivered and supported so you can just use it.',
    ctas: [
      { label: 'Explore The Atom', href: '/atom/', style: 'primary' },
      { label: 'Talk to an Expert', href: '/contact/', style: 'ghost' },
    ],
    art: 'atom',
    burst: '#e8a33d',
  },
  {
    eyebrow: 'Built on proven open source',
    title: 'The software behind CERN. Supported like a product.',
    text:
      'Ceph runs at CERN, inside hyperscale clouds and across more than 10,000 deployments worldwide. The Atom packages it with validated hardware, 24×7 monitoring and a four-hour SLA.',
    ctas: [
      { label: 'Why open by design', href: '/atom/#open', style: 'cyan' },
      { label: 'File · Object · Block', href: '/atom/#use-cases', style: 'ghost' },
    ],
    art: 'orbit',
    burst: '#2bd4ff',
  },
  {
    eyebrow: 'The exit door is never locked',
    title: 'If you ever leave us, your data stays yours.',
    text:
      'Standard hardware you own. Open formats and standard protocols. Documented off-boarding. We believe making it easy to leave is the best reason to stay.',
    ctas: [
      { label: 'Read our exit promise', href: '/about/#leave', style: 'primary' },
    ],
    art: 'exit',
    burst: '#f0439c',
  },
  {
    eyebrow: 'Beyond storage',
    title: 'AI consultancy from people who build real systems.',
    text:
      'AI strategy, agentic automation, digital transformation, technology review and fractional CTO support — senior judgement without the heavyweight consulting model.',
    ctas: [
      { label: 'AI Consultancy', href: '/ai-consultancy/', style: 'cyan' },
    ],
    art: 'spark',
    burst: '#9d7bff',
  },
];

/** Map an admin-added slide to the HeroSlide shape, dropping expired ones. */
function fromExtra(s: ExtraSlide): HeroSlide | null {
  if (s.expires) {
    const today = new Date().toISOString().slice(0, 10);
    if (s.expires < today) return null;
  }
  const ctas = s.ctaLabel && s.ctaHref
    ? [{ label: s.ctaLabel, href: s.ctaHref, style: 'primary' as const }]
    : [];
  return {
    eyebrow: s.eyebrow || 'News',
    title: s.title,
    text: s.text || '',
    ctas,
    art: s.art || 'spark',
    burst: s.burst || '#9d7bff',
    ...(s.image ? { image: s.image } : {}),
  };
}

const extraSlides: HeroSlide[] = ((extra as { slides: ExtraSlide[] }).slides || [])
  .map(fromExtra)
  .filter((s): s is HeroSlide => s !== null);

export const slides: HeroSlide[] = [...coreSlides, ...extraSlides];
