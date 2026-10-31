/**
 * SplitSmart AI - Minimalist Fintech SVG Icon System
 * Replaces all emojis with crisp, professional vector icons.
 */

const Icons = {
  svg(pathD, size = 16, extra = '') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-icon" style="vertical-align: -0.125em; ${extra}">${pathD}</svg>`;
  },

  wallet(s = 16, e = '') {
    return this.svg(`<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>`, s, e);
  },

  users(s = 16, e = '') {
    return this.svg(`<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`, s, e);
  },

  user(s = 16, e = '') {
    return this.svg(`<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`, s, e);
  },

  receipt(s = 16, e = '') {
    return this.svg(`<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-8"/><path d="M16 12h-8"/><path d="M11 16h-3"/>`, s, e);
  },

  scale(s = 16, e = '') {
    return this.svg(`<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>`, s, e);
  },

  plus(s = 16, e = '') {
    return this.svg(`<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`, s, e);
  },

  trash(s = 16, e = '') {
    return this.svg(`<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>`, s, e);
  },

  check(s = 16, e = '') {
    return this.svg(`<polyline points="20 6 9 17 4 12"/>`, s, e);
  },

  checkCircle(s = 16, e = '') {
    return this.svg(`<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`, s, e);
  },

  shield(s = 16, e = '') {
    return this.svg(`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`, s, e);
  },

  paypal(s = 20, extra = '') {
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" style="${extra}"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.768.768 0 0 1 .758-.642h6.145c3.275 0 5.488 1.636 5.02 4.908-.432 3.033-2.616 4.733-5.59 4.733h-2.12l-1.42 7.978a.64.64 0 0 1-.661.64z" fill="#003087"/><path d="M9.167 12.718h2.12c2.974 0 5.158-1.7 5.59-4.733.468-3.272-1.745-4.908-5.02-4.908H5.702a.768.768 0 0 0-.758.642L1.837 20.597a.641.641 0 0 0 .633.74h4.606l1.42-7.978a.64.64 0 0 1 .671-.641z" fill="#0079C1"/></svg>`;
  },

  paypalFlagship(s = 20, extra = '') {
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" style="${extra}"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.768.768 0 0 1 .758-.642h6.145c3.275 0 5.488 1.636 5.02 4.908-.432 3.033-2.616 4.733-5.59 4.733h-2.12l-1.42 7.978a.64.64 0 0 1-.661.64z" fill="#003087"/><path d="M9.167 12.718h2.12c2.974 0 5.158-1.7 5.59-4.733.468-3.272-1.745-4.908-5.02-4.908H5.702a.768.768 0 0 0-.758.642L1.837 20.597a.641.641 0 0 0 .633.74h4.606l1.42-7.978a.64.64 0 0 1 .671-.641z" fill="#0070BA"/></svg>`;
  },

  lock(s = 16, e = '') {
    return this.svg(`<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`, s, e);
  },

  mail(s = 16, e = '') {
    return this.svg(`<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>`, s, e);
  },

  send(s = 16, e = '') {
    return this.svg(`<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>`, s, e);
  },

  copy(s = 16, e = '') {
    return this.svg(`<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>`, s, e);
  },

  external(s = 16, e = '') {
    return this.svg(`<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>`, s, e);
  },

  chart(s = 16, e = '') {
    return this.svg(`<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`, s, e);
  },

  history(s = 16, e = '') {
    return this.svg(`<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`, s, e);
  },

  folder(s = 16, e = '') {
    return this.svg(`<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>`, s, e);
  },

  creditCard(s = 16, e = '') {
    return this.svg(`<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>`, s, e);
  },

  sparkles(s = 16, e = '') {
    return this.svg(`<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>`, s, e);
  },

  camera(s = 16, e = '') {
    return this.svg(`<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>`, s, e);
  },

  message(s = 16, e = '') {
    return this.svg(`<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`, s, e);
  },

  bell(s = 16, e = '') {
    return this.svg(`<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>`, s, e);
  },

  close(s = 16, e = '') {
    return this.svg(`<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`, s, e);
  },

  palette(s = 16, e = '') {
    return this.svg(`<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2Z"/>`, s, e);
  },

  sun(s = 16, e = '') {
    return this.svg(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`, s, e);
  },

  moon(s = 16, e = '') {
    return this.svg(`<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`, s, e);
  },

  arrowRight(s = 16, e = '') {
    return this.svg(`<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`, s, e);
  },

  // Category Minimalist Icons
  category(cat, s = 16, e = '') {
    switch (cat) {
      case 'Food & Dining':
        // Utensils
        return this.svg(`<path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v18"/><path d="M7 2v18"/><path d="M4 2v4a3 3 0 0 0 6 0V2"/>`, s, e);
      case 'Transportation':
        // Car
        return this.svg(`<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>`, s, e);
      case 'Housing':
        // Home
        return this.svg(`<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`, s, e);
      case 'Entertainment':
        // Film / Ticket
        return this.svg(`<rect width="20" height="15" x="2" y="4.5" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="2" y1="15" x2="22" y2="15"/><line x1="6" y1="4.5" x2="6" y2="9"/><line x1="18" y1="4.5" x2="18" y2="9"/><line x1="6" y1="15" x2="6" y2="19.5"/><line x1="18" y1="15" x2="18" y2="19.5"/>`, s, e);
      case 'Shopping':
        // Shopping Bag
        return this.svg(`<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>`, s, e);
      case 'Travel':
        // Airplane
        return this.svg(`<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.6.1-2 .7l-.7.8c-.4.5-.3 1.2.2 1.6l5.7 4.2-3.2 3.2-2.3-.4c-.4-.1-.8.1-1.1.4l-.4.4c-.3.3-.3.8 0 1.1l2.5 2.5c.3.3.8.3 1.1 0l.4-.4c.3-.3.5-.7.4-1.1l-.4-2.3 3.2-3.2 4.2 5.7c.4.5 1.1.6 1.6.2l.8-.7c.6-.4.9-1.2.7-2z"/>`, s, e);
      default:
        // Receipt / General
        return this.receipt(s, e);
    }
  }
};

window.Icons = Icons;

