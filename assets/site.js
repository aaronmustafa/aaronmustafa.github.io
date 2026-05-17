const SITE_FILES = {
  config: '../contents/config.yml',
  home: '../contents/home.md',
  projects: '../contents/projects.md',
  resume: '../contents/resume.md',
  publications: '../contents/publications.md',
  awards: '../contents/awards.md',
  academic: '../contents/academic.md',
  articlesIndex: '../contents/articles/index.json',
  ckadIndex: '../contents/ckad/ckad.md'
};

const state = {
  articles: [],
  socialLinks: [],
  revealObserver: null
};

function assetUrl(path) {
  return new URL(path, import.meta.url).href;
}

async function fetchText(path) {
  const response = await fetch(assetUrl(path), { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error('Failed to load ' + path + ' (' + response.status + ')');
  }
  return response.text();
}

async function fetchJson(path) {
  const response = await fetch(assetUrl(path), { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error('Failed to load ' + path + ' (' + response.status + ')');
  }
  return response.json();
}

function parseYaml(text) {
  return text.split(/\r?\n/).reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes(':')) return acc;
    const idx = trimmed.indexOf(':');
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');
    acc[key] = value;
    return acc;
  }, {});
}

function parseInline(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function renderMarkdown(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const html = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];
  let inCode = false;
  let codeLang = '';
  let codeLines = [];

  function flushParagraph() {
    if (paragraph.length) {
      html.push('<p>' + parseInline(paragraph.join(' ').trim()) + '</p>');
      paragraph = [];
    }
  }

  function flushList() {
    if (listItems.length) {
      html.push('<' + listType + '>' + listItems.map((item) => '<li>' + parseInline(item.trim()) + '</li>').join('') + '</' + listType + '>');
      listItems = [];
      listType = null;
    }
  }

  function flushCode() {
    if (codeLines.length || codeLang) {
      const code = codeLines.join('\n')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const className = codeLang ? ' class="language-' + codeLang + '"' : '';
      html.push('<pre><code' + className + '>' + code + '</code></pre>');
      codeLines = [];
      codeLang = '';
    }
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(headingMatch[1].length, 4);
      html.push('<h' + level + '>' + parseInline(headingMatch[2].trim()) + '</h' + level + '>');
      continue;
    }

    const bulletMatch = line.match(/^\s*-\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(bulletMatch[1]);
      continue;
    }

    const numberedMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (numberedMatch) {
      flushParagraph();
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(numberedMatch[1]);
      continue;
    }

    if (line.trim().startsWith('<') && line.trim().endsWith('>')) {
      flushParagraph();
      flushList();
      html.push(line);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  if (inCode) flushCode();

  return html.join('');
}

function stripSocialLinksBlock(md) {
  const blockMatch = md.match(/<div class="social-links">[\s\S]*?<\/div>/);
  if (!blockMatch) return { markdown: md, socialLinks: [] };

  const block = blockMatch[0];
  const socialLinks = [...block.matchAll(/<a[^>]*href="([^"]+)"[^>]*aria-label="([^"]+)"[^>]*>/g)].map((match) => {
    const href = match[1];
    const label = match[2];
    return {
      platform: label,
      href,
      handle: formatHandle(label, href)
    };
  });

  return {
    markdown: md.replace(block, '').trim(),
    socialLinks
  };
}

function formatHandle(label, href) {
  if (href.startsWith('mailto:')) return href.replace('mailto:', '');
  try {
    const url = new URL(href);
    const path = url.pathname.replace(/\/$/, '');
    const tail = path.split('/').filter(Boolean).pop();
    return tail || label;
  } catch (error) {
    return label;
  }
}

function splitSections(md, level = 2) {
  const lines = md.replace(/\r/g, '').split('\n');
  const marker = '#'.repeat(level) + ' ';
  const sections = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith(marker)) {
      if (current) sections.push(current);
      current = { title: line.slice(marker.length).trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }

  if (current) sections.push(current);
  return sections.map((section) => ({
    title: section.title,
    body: section.body.join('\n').trim()
  }));
}

function splitSubsections(md, level = 3) {
  return splitSections(md, level);
}

function observeRevealElements(root = document) {
  if (!state.revealObserver) return;
  root.querySelectorAll('.reveal').forEach((el) => state.revealObserver.observe(el));
}

function buildHero(config, homeMd, resumeMd, articles) {
  const personName = (config['page-top-title'] || 'Nashwan Mustafa').trim();
  const subtitle = config['home-subtitle'] || 'Platform Engineering | MLOps and AI | Secure Cloud Platforms | Technical Writing';
  const eyebrow = config['top-section-bg-text'] || 'Platform and AI Engineering';
  const nameParts = personName.split(' ');
  const firstName = nameParts.shift() || personName;
  const lastName = nameParts.join(' ') || '';
  const yearsMatch = resumeMd.match(/(\d+\+)\s*years/i);
  const topics = Array.from(new Set(articles.slice(0, 5).map((article) => article.topic))).filter(Boolean);

  document.title = config.title || document.title;
  document.getElementById('navLogo').textContent = personName;
  document.getElementById('heroEyebrow').textContent = eyebrow;
  document.getElementById('heroRole').textContent = subtitle;
  document.getElementById('heroName').innerHTML = firstName + (lastName ? '<em>' + lastName + '</em>' : '');
  document.getElementById('heroMonogram').setAttribute('data-monogram', (firstName[0] || 'N') + (lastName[0] || 'M'));
  document.getElementById('heroOrbitCopy').textContent = topics.length ? topics.join(' / ') : 'Kubernetes / Cloud / AI / MLOps / Security';
  document.getElementById('footerCopy').innerHTML = config['copyright-text'] || personName;
  document.getElementById('footerMark').textContent = ((firstName[0] || 'N') + (lastName[0] || 'M')).toUpperCase();

  const headings = splitSections(homeMd, 2);
  const introSection = headings[0];
  if (introSection) {
    document.getElementById('aboutHeading').innerHTML = introSection.title.replace("I'm", 'I’m').replace('Nashwan', '<em>Nashwan</em>');
    const bodyWithoutFirstHeading = homeMd.replace(/^##\s+.*(?:\r?\n)+/, '');
    document.getElementById('aboutContent').innerHTML = renderMarkdown(bodyWithoutFirstHeading);
  }

  const certSection = splitSections(resumeMd, 2).find((section) => /certifications/i.test(section.title));
  const certCount = certSection ? (certSection.body.match(/^\s*-\s+/gm) || []).length : 0;
  const articleCount = articles.length;
  const stats = [
    { value: yearsMatch ? yearsMatch[1] : '15+', label: 'Years in Engineering' },
    { value: certCount ? String(certCount).padStart(2, '0') : '08', label: 'Certifications' },
    { value: articleCount ? String(articleCount).padStart(2, '0') : '18', label: 'Published Articles' }
  ];

  document.getElementById('aboutStats').innerHTML = stats.map((stat, index) => (
    '<div class="about-stat reveal reveal-delay-' + Math.min(index + 1, 3) + '">' +
      '<div class="stat-num">' + stat.value + '</div>' +
      '<div class="stat-label">' + stat.label + '</div>' +
    '</div>'
  )).join('');

  observeRevealElements(document.getElementById('about'));
}

function buildProjects(projectsMd) {
  const rootSections = splitSections(projectsMd, 2);
  const selectedProjectsSection = rootSections.find((section) => /selected projects/i.test(section.title));
  const labsSection = rootSections.find((section) => /hands-on labs/i.test(section.title));
  const intro = selectedProjectsSection ? selectedProjectsSection.body.replace(/###\s[\s\S]*/m, '').trim() : '';
  const sections = selectedProjectsSection ? splitSubsections('## ' + selectedProjectsSection.title + '\n' + selectedProjectsSection.body, 3) : splitSubsections(projectsMd, 3);
  const grid = document.getElementById('projectsGrid');
  const introNode = document.getElementById('projectsIntro');

  introNode.innerHTML = intro ? renderMarkdown(intro) : '';

  grid.innerHTML = sections.map((section, index) => {
    const bulletMatches = [...section.body.matchAll(/^\s*-\s+(.*)$/gm)].map((match) => match[1]);
    const summary = section.body.replace(/^\s*-\s+.*$/gm, '').trim();
    return (
      '<article class="project-card reveal reveal-delay-' + (index % 4) + '">' +
        '<div class="project-index">' + String(index + 1).padStart(2, '0') + '</div>' +
        '<h3 class="project-title">' + parseInline(section.title) + '</h3>' +
        '<div class="project-summary rich-markdown">' + renderMarkdown(summary) + '</div>' +
        (bulletMatches.length ? '<ul class="project-points">' + bulletMatches.map((point) => '<li>' + parseInline(point) + '</li>').join('') + '</ul>' : '') +
      '</article>'
    );
  }).join('');

  observeRevealElements(document.getElementById('projects'));

  return { labsSection };
}

function buildMarquee(projectsMd, articles) {
  const projectTitles = splitSubsections(projectsMd, 3).slice(0, 4).map((section) => section.title.replace(/^\d+\.\s*/, ''));
  const articleTopics = Array.from(new Set(articles.map((article) => article.topic))).slice(0, 4);
  const items = [...new Set(['Platform Engineering', ...projectTitles, ...articleTopics])].filter(Boolean);
  const doubled = [...items, ...items];

  document.getElementById('marqueeTrack').innerHTML = doubled.map((item) => (
    '<div class="marquee-item"><span class="marquee-text">' + item + '</span><span class="marquee-dot"></span></div>'
  )).join('');
}

function buildResume(resumeMd, awardsMd, academicMd) {
  const sections = splitSections(resumeMd, 2);
  const grid = document.getElementById('resumeGrid');
  const sectionOrder = [
    'Professional Summary',
    'Core Capability Areas',
    'Working Experience',
    'Selected Certifications',
    'Education',
    'Awards',
    'Publications'
  ];

  const byTitle = new Map(sections.map((section) => [section.title, section.body]));
  if (!byTitle.get('Awards') && awardsMd.trim()) byTitle.set('Awards', awardsMd.trim());
  if (!byTitle.get('Education') || !byTitle.get('Publications')) {
    splitSections(academicMd, 4).forEach((section) => {
      if (!byTitle.get(section.title)) byTitle.set(section.title, section.body);
    });
  }

  const cards = sectionOrder
    .filter((title) => byTitle.has(title))
    .map((title) => {
      const wide = /Working Experience|Publications/.test(title) ? ' wide' : '';
      const full = /Working Experience/.test(title) ? ' full' : '';
      return (
        '<article class="resume-card reveal' + wide + full + '">' +
          '<div class="resume-label">' + title + '</div>' +
          '<h3 class="resume-title">' + title + '</h3>' +
          '<div class="rich-markdown">' + renderMarkdown(byTitle.get(title)) + '</div>' +
        '</article>'
      );
    });

  grid.innerHTML = cards.join('');
  observeRevealElements(document.getElementById('resume'));
}

function buildWriting(publicationsMd, academicMd, articles) {
  const column = document.getElementById('articlesColumn');
  const panels = document.getElementById('writingPanels');
  const ordered = [...articles].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return (b.date || '').localeCompare(a.date || '');
  });

  column.innerHTML = ordered.map((article, index) => (
    '<article class="article-card reveal reveal-delay-' + (index % 3) + '" tabindex="0" data-article-file="' + article.file + '" data-article-title="' + article.title.replace(/"/g, '&quot;') + '">' +
      '<div class="article-meta">' +
        '<span class="article-topic">' + article.topic + '</span>' +
        '<span>' + formatDate(article.date) + '</span>' +
        (article.featured ? '<span>Featured</span>' : '') +
      '</div>' +
      '<h3 class="article-title">' + article.title + '</h3>' +
      '<p class="article-summary">' + article.summary + '</p>' +
      '<span class="article-link">Open article <span>→</span></span>' +
    '</article>'
  )).join('');

  panels.innerHTML = [
    {
      label: 'Publications',
      title: 'Academic and published work',
      body: publicationsMd.trim()
    },
    {
      label: 'Academic Background',
      title: 'Education and research interests',
      body: academicMd.trim()
    }
  ].map((panel, index) => (
    '<article class="writing-panel reveal reveal-delay-' + (index + 1) + '">' +
      '<div class="writing-label">' + panel.label + '</div>' +
      '<h3 class="writing-title">' + panel.title + '</h3>' +
      '<div class="rich-markdown">' + renderMarkdown(panel.body) + '</div>' +
    '</article>'
  )).join('');

  observeRevealElements(document.getElementById('writing'));
}

function buildResources(labsSection, ckadMd) {
  const resourcePanels = document.getElementById('resourcePanels');
  const docsColumn = document.getElementById('docsColumn');
  const ckadSections = splitSections(ckadMd, 4);
  const ckadOverview = ckadSections.find((section) => /ckad exercises/i.test(section.title));
  const ckadContents = ckadSections.find((section) => /ckad contents/i.test(section.title));
  const ckadPractice = ckadSections.find((section) => /killercoda/i.test(section.title));
  const labsBody = labsSection ? '## ' + labsSection.title + '\n\n' + labsSection.body : '';

  resourcePanels.innerHTML = [
    {
      label: 'Hands-On Labs',
      title: 'Practical learning projects and demos',
      body: labsBody || 'Practical labs will appear here.'
    },
    {
      label: 'CKAD Track',
      title: 'Exam preparation and Kubernetes study material',
      body: [
        ckadOverview ? '#### ' + ckadOverview.title + '\n' + ckadOverview.body : '',
        ckadPractice ? '#### ' + ckadPractice.title + '\n' + ckadPractice.body : ''
      ].filter(Boolean).join('\n\n') || ckadMd.trim()
    }
  ].map((panel, index) => (
    '<article class="resource-panel reveal reveal-delay-' + (index + 1) + '">' +
      '<div class="resource-label">' + panel.label + '</div>' +
      '<h3 class="resource-title">' + panel.title + '</h3>' +
      '<div class="rich-markdown">' + renderMarkdown(panel.body) + '</div>' +
    '</article>'
  )).join('');

  const docs = [
    { file: '../contents/ckad/ckad_core_concepts.md', title: 'Core Concepts', tag: 'CKAD', summary: 'Core Kubernetes primitives, object behavior, and essential application developer concepts.' },
    { file: '../contents/ckad/multi_container_pod.md', title: 'Multi-Container Pods', tag: 'CKAD', summary: 'Patterns for sidecars, adapters, and grouped workloads within a single pod.' },
    { file: '../contents/ckad/pod_design.md', title: 'Pod Design', tag: 'CKAD', summary: 'Deployment styles, labels, selectors, and pod-oriented design exercises.' },
    { file: '../contents/ckad/configuration.md', title: 'Configuration', tag: 'CKAD', summary: 'ConfigMaps, Secrets, security context, service accounts, and application configuration techniques.' },
    { file: '../contents/ckad/observability.md', title: 'Observability', tag: 'CKAD', summary: 'Health checks, logging, monitoring, and debugging-oriented Kubernetes practice.' },
    { file: '../contents/ckad/services_and_networking.md', title: 'Services and Networking', tag: 'CKAD', summary: 'Service exposure, DNS, ingress, and internal networking behavior.' },
    { file: '../contents/ckad/state_persistence.md', title: 'State Persistence', tag: 'CKAD', summary: 'Persistent volumes, claims, and workload storage patterns.' },
    { file: '../contents/ckad/helm.md', title: 'Helm', tag: 'Addon', summary: 'Helm packaging and templating notes for practical cluster delivery workflows.' },
    { file: '../contents/ckad/crd.md', title: 'CRD', tag: 'Addon', summary: 'Custom Resource Definition concepts and extension patterns.' },
    { file: '../contents/ckad/podman.md', title: 'Podman', tag: 'Addon', summary: 'Container runtime notes and Podman-based workflow references.' }
  ];

  docsColumn.innerHTML = docs.map((doc, index) => (
    '<article class="doc-card reveal reveal-delay-' + (index % 3) + '" tabindex="0" data-doc-file="' + doc.file + '" data-doc-title="' + doc.title.replace(/"/g, '&quot;') + '">' +
      '<div class="doc-meta"><span class="doc-tag">' + doc.tag + '</span><span>Open note</span></div>' +
      '<h3 class="doc-title">' + doc.title + '</h3>' +
      '<p class="doc-summary">' + doc.summary + '</p>' +
      '<span class="article-link">Read note <span>→</span></span>' +
    '</article>'
  )).join('');

  observeRevealElements(document.getElementById('resources'));
}

function buildContact(homeLinks) {
  const links = homeLinks.length ? homeLinks : [
    { platform: 'LinkedIn', href: 'https://www.linkedin.com/in/nbmustafa/', handle: 'nbmustafa' },
    { platform: 'GitHub', href: 'https://github.com/nbmustafa', handle: 'nbmustafa' },
    { platform: 'Hugging Face', href: 'https://huggingface.co/nbmustafa', handle: 'nbmustafa' }
  ];

  document.getElementById('contactLinks').innerHTML = links.map((link) => (
    '<a href="' + link.href + '" target="_blank" rel="noreferrer" class="contact-link-item">' +
      '<div>' +
        '<div class="contact-link-platform">' + link.platform + '</div>' +
        '<div class="contact-link-handle">' + link.handle + '</div>' +
      '</div>' +
      '<span class="contact-arrow">→</span>' +
    '</a>'
  )).join('');

  observeRevealElements(document.getElementById('contact'));
}

async function openArticle(file, title) {
  const viewer = document.getElementById('articleViewer');
  const content = document.getElementById('viewerContent');
  const status = document.getElementById('viewerStatus');
  viewer.classList.add('is-open');
  viewer.setAttribute('aria-hidden', 'false');
  status.textContent = title;
  content.innerHTML = '<p class="loading">Loading article</p>';
  document.body.style.overflow = 'hidden';

  try {
    const markdown = await fetchText('../contents/articles/' + file);
    content.innerHTML = renderMarkdown(markdown);
  } catch (error) {
    content.innerHTML = '<p>Unable to load this article right now.</p>';
  }
}

async function openDocument(file, title) {
  const viewer = document.getElementById('articleViewer');
  const content = document.getElementById('viewerContent');
  const status = document.getElementById('viewerStatus');
  viewer.classList.add('is-open');
  viewer.setAttribute('aria-hidden', 'false');
  status.textContent = title;
  content.innerHTML = '<p class="loading">Loading document</p>';
  document.body.style.overflow = 'hidden';

  try {
    const markdown = await fetchText(file);
    content.innerHTML = renderMarkdown(markdown);
  } catch (error) {
    content.innerHTML = '<p>Unable to load this document right now.</p>';
  }
}

function closeArticle() {
  const viewer = document.getElementById('articleViewer');
  viewer.classList.remove('is-open');
  viewer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function setupInteractions() {
  const cursor = document.getElementById('cursor');
  const cursorRing = document.getElementById('cursorRing');
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  state.revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.18 });

  observeRevealElements(document);

  if (finePointer) {
    document.body.classList.add('custom-cursor-enabled');

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { x: target.x, y: target.y };
    let rafId = null;

    const render = () => {
      ring.x += (target.x - ring.x) * 0.18;
      ring.y += (target.y - ring.y) * 0.18;
      cursor.style.transform = 'translate3d(' + (target.x - 5) + 'px, ' + (target.y - 5) + 'px, 0)';
      cursorRing.style.transform = 'translate3d(' + (ring.x - 18) + 'px, ' + (ring.y - 18) + 'px, 0)';
      rafId = window.requestAnimationFrame(render);
    };

    window.addEventListener('mousemove', (event) => {
      target.x = event.clientX;
      target.y = event.clientY;
    });

    window.addEventListener('mouseleave', () => {
      cursor.style.opacity = '0';
      cursorRing.style.opacity = '0';
    });

    window.addEventListener('mouseenter', () => {
      cursor.style.opacity = '1';
      cursorRing.style.opacity = '1';
    });

    document.addEventListener('mouseover', (event) => {
      if (event.target.closest('a, button, .article-card, .doc-card')) {
        cursorRing.classList.add('hover');
      }
    });

    document.addEventListener('mouseout', (event) => {
      if (event.target.closest('a, button, .article-card, .doc-card')) {
        cursorRing.classList.remove('hover');
      }
    });

    if (!rafId) render();
  } else {
    cursor.style.display = 'none';
    cursorRing.style.display = 'none';
  }

  document.addEventListener('click', (event) => {
    const articleCard = event.target.closest('[data-article-file]');
    if (articleCard) {
      openArticle(articleCard.dataset.articleFile, articleCard.dataset.articleTitle);
    }

    const docCard = event.target.closest('[data-doc-file]');
    if (docCard) {
      openDocument(docCard.dataset.docFile, docCard.dataset.docTitle);
    }

    if (event.target.closest('[data-close-viewer="true"]') || event.target.closest('#viewerClose')) {
      closeArticle();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeArticle();
    if ((event.key === 'Enter' || event.key === ' ') && document.activeElement?.matches?.('[data-article-file]')) {
      event.preventDefault();
      openArticle(document.activeElement.dataset.articleFile, document.activeElement.dataset.articleTitle);
    }
    if ((event.key === 'Enter' || event.key === ' ') && document.activeElement?.matches?.('[data-doc-file]')) {
      event.preventDefault();
      openDocument(document.activeElement.dataset.docFile, document.activeElement.dataset.docTitle);
    }
  });
}

async function init() {
  setupInteractions();

  try {
    const [
      configText,
      homeText,
      projectsText,
      resumeText,
      publicationsText,
      awardsText,
      academicText,
      articlesIndex,
      ckadText
    ] = await Promise.all([
      fetchText(SITE_FILES.config),
      fetchText(SITE_FILES.home),
      fetchText(SITE_FILES.projects),
      fetchText(SITE_FILES.resume),
      fetchText(SITE_FILES.publications),
      fetchText(SITE_FILES.awards),
      fetchText(SITE_FILES.academic),
      fetchJson(SITE_FILES.articlesIndex),
      fetchText(SITE_FILES.ckadIndex)
    ]);

    const config = parseYaml(configText);
    const homeData = stripSocialLinksBlock(homeText);
    state.articles = Array.isArray(articlesIndex.articles) ? articlesIndex.articles : [];
    state.socialLinks = homeData.socialLinks;

    buildHero(config, homeData.markdown, resumeText, state.articles);
    const { labsSection } = buildProjects(projectsText);
    buildMarquee(projectsText, state.articles);
    buildResume(resumeText, awardsText, academicText);
    buildWriting(publicationsText, academicText, state.articles);
    buildResources(labsSection, ckadText);
    buildContact(state.socialLinks);
  } catch (error) {
    console.error(error);
    document.getElementById('aboutContent').innerHTML = '<p>Content could not be loaded. Please check that the markdown files are available.</p>';
    document.getElementById('projectsGrid').innerHTML = '<article class="project-card"><h3 class="project-title">Content unavailable</h3><p class="project-summary">Markdown content could not be loaded.</p></article>';
  }
}

init();
