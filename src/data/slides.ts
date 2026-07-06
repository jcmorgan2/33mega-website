// Homepage hero slides. Add a new object to this array to add a slide —
// the slider picks them up automatically.
export interface HeroSlide {
  eyebrow: string;
  title: string;
  text: string;
  ctas: { label: string; href: string; style?: 'primary' | 'cyan' | 'ghost' }[];
  /** Which pop-art composition to show alongside the copy. */
  art: 'atom' | 'orbit' | 'exit' | 'spark';
  /** Accent colour for the slide's starburst. */
  burst?: string;
}

export const slides: HeroSlide[] = [
  {
    eyebrow: 'The Atom — our first platform',
    title: 'File and object storage. One system. Fully supported.',
    text:
      'The Atom is a turnkey storage platform built on Ceph and standard Dell hardware, designed, delivered and supported end to end by people who have spent their careers in media.',
    ctas: [
      { label: 'Explore The Atom', href: '/atom/', style: 'primary' },
      { label: 'Talk to an engineer', href: '/contact/', style: 'ghost' },
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
