import { SCREEN_DEFAULTS } from './project-screen.mjs';
const BASE = 'https://portfolio.invalid/';

function number(value, fallback, field, min, max) {
  if (value == null) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${field}: use a number between ${min} and ${max}.`);
  return value;
}

function webLink(value, field) {
  const href = safeLink(value, field);
  if (href && !['https:', 'http:'].includes(new URL(href, BASE).protocol)) throw new Error(`${field}: use an HTTP(S) URL or relative file path.`);
  return href;
}

function screenSettings(value = {}, defaults = SCREEN_DEFAULTS, path = 'screen') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path}: expected an object.`);
  const image = value.image === undefined ? defaults.image : value.image;
  if (!image || typeof image !== 'object' || Array.isArray(image)) throw new Error(`${path}.image: expected { src, alt, fit }.`);
  const fit = image.fit || 'cover';
  if (!['cover', 'contain', 'concept'].includes(fit)) throw new Error(`${path}.image.fit: use cover, contain or concept.`);
  return {
    titleSize: number(value.titleSize, defaults.titleSize, `${path}.titleSize`, 24, 60),
    descriptionSize: number(value.descriptionSize, defaults.descriptionSize, `${path}.descriptionSize`, 14, 28),
    buttonSize: number(value.buttonSize, defaults.buttonSize, `${path}.buttonSize`, 14, 26),
    buttonText: text(value.buttonText, `${path}.buttonText`, false, 36) || defaults.buttonText,
    image: { src: webLink(image.src, `${path}.image.src`), alt: text(image.alt, `${path}.image.alt`), fit }
  };
}

function text(value, field, required = false, max = 500) {
  if (value == null && !required) return '';
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    throw new Error(`${field}: expected ${required ? 'non-empty ' : ''}text (max ${max} characters).`);
  }
  return value.trim();
}

export function safeLink(value, field = 'link', email = '') {
  const href = text(value, field);
  if (!href || href === '#') return '';
  if (href === '$email') return email ? `mailto:${email}` : '';
  if (/[\u0000-\u0020\u007f]/.test(href)) throw new Error(`${field}: links cannot contain spaces or control characters.`);
  let url;
  try { url = new URL(href, BASE); } catch { throw new Error(`${field}: invalid URL.`); }
  if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
    throw new Error(`${field}: use https, http, mailto, tel, a relative path, or an anchor.`);
  }
  return href;
}

function list(value, field, max, min = 0) {
  if (value == null && min === 0) return [];
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new Error(`${field}: provide ${min}–${max} entries.`);
  }
  return value;
}

/** Validate before creating any UI or loading expensive 3D assets. */
export function normalizeConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Expected a JSON object.');
  const name = text(raw.profile?.name, 'profile.name', true, 80);
  const title = text(raw.profile?.title, 'profile.title', false, 100);
  const initials = text(raw.profile?.initials, 'profile.initials', false, 8) ||
    name.split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase();
  const email = text(raw.profile?.email, 'profile.email');
  if (email && !/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email)) throw new Error('profile.email: enter an email address without mailto:.');
  const links = (items, field, max) => list(items, field, max).map((item, i) => {
    const path = `${field}[${i}]`;
    if (!item || typeof item !== 'object') throw new Error(`${path}: expected an object.`);
    for (const flag of ['screen', 'newTab']) {
      if (item[flag] != null && typeof item[flag] !== 'boolean') throw new Error(`${path}.${flag}: use true or false without quotes.`);
    }
    return {
      label: text(item.label, `${path}.label`, true, 40),
      href: safeLink(item.href, `${path}.href`, email),
      icon: ['github', 'linkedin', 'email'].includes(item.icon) ? item.icon : 'link',
      screen: item.screen === true,
      newTab: item.newTab ?? /^https?:\/\//i.test(item.href || '')
    };
  }).filter(item => item.href);
  const navigation = links(raw.navigation, 'navigation', 6);
  const screen = screenSettings(raw.screen);
  const resume = raw.resume ?? {};
  if (typeof resume !== 'object' || Array.isArray(resume)) throw new Error('resume: expected an object.');
  if (resume.enabled != null && typeof resume.enabled !== 'boolean') throw new Error('resume.enabled: use true or false.');
  if (resume.defaultLanguage != null && !['zh', 'en'].includes(resume.defaultLanguage)) throw new Error('resume.defaultLanguage: use zh or en.');
  const resumeFiles = {};
  for (const language of ['zh', 'en']) {
    const entry = resume[language] ?? {};
    if (typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`resume.${language}: expected an object.`);
    const filename = text(entry.filename, `resume.${language}.filename`, false, 120) || `resume-${language}.pdf`;
    if (/[\\/:\u0000-\u001f]/.test(filename) || !/\.pdf$/i.test(filename)) throw new Error(`resume.${language}.filename: use a PDF filename without path separators.`);
    resumeFiles[language] = { src: webLink(entry.src, `resume.${language}.src`), filename };
  }
  if (navigation.filter(item => item.screen).length > 3) throw new Error('navigation: at most 3 links can have screen: true.');
  return {
    profile: { name, title, initials, email },
    site: {
      language: text(raw.site?.language, 'site.language') || 'en',
      pageTitle: text(raw.site?.pageTitle, 'site.pageTitle') || [name, title].filter(Boolean).join(' · '),
      description: text(raw.site?.description, 'site.description') || [name, title, 'Portfolio'].filter(Boolean).join(' · ')
    },
    footer: { text: text(raw.footer?.text, 'footer.text', false, 200), note: text(raw.footer?.note, 'footer.note', false, 120) },
    navigation,
    resume: { enabled: resume.enabled !== false, label: text(resume.label, 'resume.label', false, 30) || '简历 / CV', defaultLanguage: resume.defaultLanguage || 'zh', ...resumeFiles },
    screen,
    socials: links(raw.socials, 'socials', 5),
    projects: list(raw.projects, 'projects', 8, 1).map((project, i) => {
      const path = `projects[${i}]`;
      if (!project || typeof project !== 'object') throw new Error(`${path}: expected an object.`);
      const color = text(project.color, `${path}.color`, true);
      if (!/^#[\da-f]{6}$/i.test(color)) throw new Error(`${path}.color: use a six-digit hex color, e.g. #e53935.`);
      const link = safeLink(project.link, `${path}.link`, email) || '#';
      const embed = project.embed || {};
      if (typeof embed !== 'object' || Array.isArray(embed)) throw new Error(`${path}.embed: expected an object.`);
      if (embed.enabled != null && typeof embed.enabled !== 'boolean') throw new Error(`${path}.embed.enabled: use true or false.`);
      const defaultEmbedURL = link !== '#' && ['https:', 'http:'].includes(new URL(link, BASE).protocol) ? link : '';
      return {
        title: text(project.title, `${path}.title`, true, 100),
        desc: text(project.desc, `${path}.desc`, false, 600), color,
        link,
        screen: screenSettings(project.screen, screen, `${path}.screen`),
        embed: {
          enabled: embed.enabled !== false,
          url: webLink(embed.url ?? defaultEmbedURL, `${path}.embed.url`),
          width: number(embed.width, 1300, `${path}.embed.width`, 320, 1920),
          height: number(embed.height, 980, `${path}.embed.height`, 240, 1440)
        }
      };
    })
  };
}

export async function loadConfig(fetcher = fetch) {
  const response = await fetcher('./config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`config.json could not be loaded (HTTP ${response.status}).`);
  let raw;
  try { raw = await response.json(); } catch { throw new Error('config.json is not valid JSON. Check double quotes and commas.'); }
  return normalizeConfig(raw);
}

/** Text is always textContent; configuration is never interpreted as HTML. */
export function applyConfig(config, doc = document) {
  const setText = (id, value) => { doc.getElementById(id).textContent = value; };
  doc.title = config.site.pageTitle;
  doc.documentElement.lang = config.site.language;
  doc.querySelector('meta[name="description"]').content = config.site.description;
  setText('profileName', config.profile.name);
  setText('profileTitle', config.profile.title);
  setText('copyright', config.footer.text || `© ${config.profile.name}${config.footer.note ? ` · ${config.footer.note}` : ''}`);
  const makeLink = item => {
    const link = doc.createElement('a');
    link.textContent = item.label;
    link.setAttribute('href', item.href);
    if (item.newTab) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    return link;
  };
  doc.getElementById('mainNav').replaceChildren(...config.navigation.map(makeLink));
  doc.getElementById('screenNav').replaceChildren(...config.navigation.filter(item => item.screen).map(makeLink));
  doc.getElementById('projectNavigation').hidden = !config.navigation.some(item => item.screen);
  doc.getElementById('socialLinks').replaceChildren(...config.socials.map(item => {
    const link = makeLink(item);
    const template = doc.getElementById(`icon-${item.icon}`);
    if (template) link.replaceChildren(template.content.cloneNode(true));
    else link.textContent = '↗';
    link.setAttribute('aria-label', item.label);
    link.title = item.label;
    return link;
  }));
}
