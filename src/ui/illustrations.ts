/**
 * Original vector-avatar illustrations for Convertly.
 * Flat, geometric, built from simple shapes (circles, rounded rects) in the
 * product's own accent/lavender palette. Not based on, or a likeness of,
 * any existing character, product, or brand.
 */

/** Small companion avatar used near the hero visual on the landing page. */
export function heroAvatarSVG(): string {
  return `
  <svg viewBox="0 0 160 160" width="160" height="160" aria-hidden="true">
    <circle cx="80" cy="86" r="62" fill="var(--accent)" opacity="0.12"/>
    <ellipse cx="80" cy="140" rx="40" ry="8" fill="#000" opacity="0.14"/>
    <rect x="46" y="78" width="68" height="56" rx="22" fill="var(--bg-active)" stroke="var(--line-strong)" stroke-width="1.5"/>
    <circle cx="80" cy="58" r="34" fill="var(--bg-raised)" stroke="var(--line-strong)" stroke-width="1.5"/>
    <circle cx="68" cy="56" r="4.5" fill="var(--text)"/>
    <circle cx="94" cy="56" r="4.5" fill="var(--text)"/>
    <path d="M68 70 q12 10 24 0" stroke="var(--text)" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="34" y="94" width="16" height="30" rx="8" fill="var(--accent)"/>
    <rect x="110" y="94" width="16" height="30" rx="8" fill="#a5b4fc"/>
    <rect x="14" y="40" width="26" height="26" rx="7" fill="var(--bg-raised)" stroke="var(--line-strong)" stroke-width="1.4"/>
    <path d="M22 53h10M27 48v10" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
    <circle cx="130" cy="34" r="12" fill="#a5b4fc" opacity="0.9"/>
    <path d="M125 34l3.5 3.5L136 30" stroke="#0a0a0a" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/** Larger companion illustration for the workspace side panel. */
export function workspaceAvatarSVG(): string {
  return `
  <svg viewBox="0 0 220 260" width="100%" height="auto" aria-hidden="true">
    <ellipse cx="110" cy="128" rx="96" ry="96" fill="var(--accent)" opacity="0.10"/>
    <ellipse cx="110" cy="228" rx="58" ry="10" fill="#000" opacity="0.16"/>

    <rect x="58" y="128" width="104" height="88" rx="30" fill="var(--bg-active)" stroke="var(--line-strong)" stroke-width="1.5"/>
    <rect x="30" y="150" width="26" height="50" rx="13" fill="var(--bg-active)" stroke="var(--line-strong)" stroke-width="1.5"/>
    <rect x="164" y="150" width="26" height="50" rx="13" fill="var(--bg-active)" stroke="var(--line-strong)" stroke-width="1.5"/>

    <circle cx="110" cy="88" r="52" fill="var(--bg-raised)" stroke="var(--line-strong)" stroke-width="1.5"/>
    <circle cx="92" cy="86" r="6.5" fill="var(--text)"/>
    <circle cx="128" cy="86" r="6.5" fill="var(--text)"/>
    <path d="M90 104q20 16 40 0" stroke="var(--text)" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M70 52q40-26 80 0" stroke="var(--accent)" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.9"/>

    <rect x="6" y="60" width="34" height="34" rx="9" fill="var(--bg-raised)" stroke="var(--line-strong)" stroke-width="1.4"/>
    <path d="M16 77h14M23 70v14" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>

    <rect x="180" y="94" width="34" height="34" rx="9" fill="var(--bg-raised)" stroke="var(--line-strong)" stroke-width="1.4"/>
    <path d="M188 111l6 6 12-14" stroke="#a5b4fc" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

    <circle cx="184" cy="42" r="16" fill="#a5b4fc" opacity="0.95"/>
    <path d="M177 42h14M184 35v14" stroke="#0a0a0a" stroke-width="2.4" stroke-linecap="round"/>

    <circle cx="24" cy="148" r="11" fill="var(--accent)" opacity="0.9"/>
  </svg>`;
}

/**
 * Large hero character: a friendly standing avatar, one hand waving, the
 * other holding a "converted file" card. Built from gradient-shaded flat
 * shapes rather than any traced or copied artwork, so it can stand where a
 * screenshot used to, without depending on one.
 */
export function heroCharacterSVG(): string {
  return `
  <svg viewBox="0 0 380 430" width="100%" height="auto" aria-hidden="true">
    <defs>
      <linearGradient id="hcBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--accent)"/>
        <stop offset="1" stop-color="#b3560a"/>
      </linearGradient>
      <linearGradient id="hcHead" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--bg-raised)"/>
        <stop offset="1" stop-color="var(--bg-active)"/>
      </linearGradient>
    </defs>

    <ellipse cx="190" cy="150" rx="150" ry="150" fill="var(--accent)" opacity="0.08"/>
    <ellipse cx="190" cy="404" rx="118" ry="16" fill="#000" opacity="0.16"/>

    <rect x="156" y="300" width="32" height="94" rx="16" fill="var(--bg-active)" stroke="var(--line-strong)" stroke-width="1.5"/>
    <rect x="198" y="300" width="32" height="94" rx="16" fill="var(--bg-active)" stroke="var(--line-strong)" stroke-width="1.5"/>
    <rect x="148" y="386" width="46" height="20" rx="10" fill="var(--text)" opacity="0.92"/>
    <rect x="192" y="386" width="46" height="20" rx="10" fill="var(--text)" opacity="0.92"/>

    <rect x="118" y="182" width="150" height="132" rx="48" fill="url(#hcBody)"/>

    <g transform="rotate(-28 108 220)">
      <rect x="92" y="176" width="30" height="88" rx="15" fill="url(#hcBody)"/>
      <circle cx="107" cy="172" r="19" fill="var(--bg-raised)" stroke="var(--line-strong)" stroke-width="2"/>
    </g>

    <rect x="262" y="220" width="28" height="66" rx="14" fill="url(#hcBody)"/>
    <circle cx="276" cy="292" r="18" fill="var(--bg-raised)" stroke="var(--line-strong)" stroke-width="2"/>

    <g transform="translate(238,258)">
      <rect x="0" y="6" width="54" height="42" rx="7" fill="#a5b4fc"/>
      <path d="M0 12 L14 12 L20 6 L40 6 L40 14 L0 14 Z" fill="#c7d0ff"/>
      <path d="M13 28 l7 7 l16 -17" stroke="#0a0a0a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>

    <circle cx="190" cy="118" r="66" fill="url(#hcHead)" stroke="var(--line-strong)" stroke-width="2"/>
    <path d="M136 76q54-40 108 0" stroke="var(--accent)" stroke-width="8" fill="none" stroke-linecap="round"/>
    <circle cx="166" cy="118" r="8" fill="var(--text)"/>
    <circle cx="214" cy="118" r="8" fill="var(--text)"/>
    <path d="M162 140q28 22 56 0" stroke="var(--text)" stroke-width="5" fill="none" stroke-linecap="round"/>

    <circle cx="300" cy="66" r="22" fill="#a5b4fc" opacity="0.95"/>
    <path d="M291 66l7 7 15-16" stroke="#0a0a0a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
