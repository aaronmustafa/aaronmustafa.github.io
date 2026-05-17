const SITE_FILES = {
  config: '../contents/config.yml',
  home: '../contents/home.md',
  projects: '../contents/projects.md',
  resume: '../contents/resume.md',
  publications: '../contents/publications.md',
  awards: '../contents/awards.md',
  academic: '../contents/academic.md',
  articlesIndex: '../contents/articles/index.json'
};

const state = {
  articles: [],
  socialLinks: [],
  revealObserver: null,
  selectedTopic: 'AI'
};

function assetUrl(path) {
  return new URL(path, import.meta.url).href;
}

async function fetchText(path) {
  const response = await fetch(assetUrl(path), { cache: 'no-cache' });
  if (!response.ok) throw new Error('Failed to load ' + path + ' (' + response.status + ')');
  return response.text();
}

async function fetchJson(path) {
  const response = await fetch(assetUrl(path), { cache: 'no-cache' });
  if (!response.ok) throw new Error('Failed to load ' + path + ' (' + response.status + ')');
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

function stripSocialLinksBlock(md) {
  const blockMatch = md.match(/<div class="social-links">[\s\S]*?<\/div>/);
  if (!blockMatch) return { markdown: md, socialLinks: [] };

  const socialLinks = [...blockMatch[0].matchAll(/<a[^>]*href="([^"]+)"[^>]*aria-label="([^"]+)"[^>]*>/g)].map((match) => ({
    platform: match[2],
    href: match[1],
    handle: formatHandle(match[2], match[1])
  }));

  return {
    markdown: md.replace(blockMatch[0], '').trim(),
    socialLinks
  };
}

function formatHandle(label, href) {
  if (href.startsWith('mailto:')) return href.replace('mailto:', '');
  try {
    const url = new URL(href);
    return url.pathname.replace(/\/$/, '').split('/').filter(Boolean).pop() || label;
  } catch {
    return label;
  }
}

function observeRevealElements(root = document) {
  if (!state.revealObserver) return;
  root.querySelectorAll('.reveal').forEach((el) => state.revealObserver.observe(el));
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeAttr(value) {
  return String(value).replace(/"/g, '&quot;');
}

function buildHero(config, homeMd, articles) {
  const personName = (config['page-top-title'] || 'Nashwan Mustafa').trim();
  const subtitle = config['home-subtitle'] || 'Platform Engineering | MLOps and AI | Secure Cloud Platforms | Technical Writing';
  const eyebrow = config['top-section-bg-text'] || 'Platform and AI Engineering';
  const nameParts = personName.split(' ');
  const firstName = nameParts.shift() || personName;
  const lastName = nameParts.join(' ') || '';
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

  const sections = splitSections(homeMd, 2);
  const introSection = sections[0];
  const detailSections = splitSections(homeMd, 3);
  const focusSection = detailSections.find((section) => /what i focus on/i.test(section.title));
  const highlightsSection = detailSections.find((section) => /selected highlights/i.test(section.title));
  const exploreSection = detailSections.find((section) => /explore more/i.test(section.title));

  const cards = [];
  if (introSection) {
    const introBody = introSection.body
      .replace(/^###\s+What I focus on[\s\S]*$/m, '')
      .trim();
    cards.push({
      label: 'About',
      title: introSection.title.replace("I'm", 'I’m'),
      body: introBody
    });
  }
  if (focusSection) {
    cards.push({
      label: 'Focus',
      title: focusSection.title,
      body: focusSection.body
    });
  }
  const combinedBody = [
    highlightsSection ? '### ' + highlightsSection.title + '\n' + highlightsSection.body : '',
    exploreSection ? '### ' + exploreSection.title + '\n' + exploreSection.body : ''
  ].filter(Boolean).join('\n\n');
  if (combinedBody) {
    cards.push({
      label: 'Highlights',
      title: 'Selected highlights and next steps',
      body: combinedBody
    });
  }

  document.getElementById('aboutGrid').innerHTML = cards.map((card, index) => (
    '<article class="about-card reveal reveal-delay-' + (index % 3) + '">' +
      '<div class="about-card-label">' + card.label + '</div>' +
      '<h2 class="about-card-title">' + parseInline(card.title.replace('Nashwan', '<em>Nashwan</em>')) + '</h2>' +
      '<div class="rich-markdown">' + renderMarkdown(card.body) + '</div>' +
    '</article>'
  )).join('');

  observeRevealElements(document.getElementById('about'));
}

function buildProjects(projectsMd) {
  const rootSections = splitSections(projectsMd, 2);
  const selectedProjectsSection = rootSections.find((section) => /selected projects/i.test(section.title));
  const intro = selectedProjectsSection ? selectedProjectsSection.body.replace(/###\s[\s\S]*/m, '').trim() : '';
  const sections = selectedProjectsSection ? splitSubsections('## ' + selectedProjectsSection.title + '\n' + selectedProjectsSection.body, 3) : splitSubsections(projectsMd, 3);

  document.getElementById('projectsIntro').innerHTML = intro ? renderMarkdown(intro) : '';
  document.getElementById('projectsGrid').innerHTML = sections.map((section, index) => {
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
}

function buildMarquee(projectsMd, articles) {
  const projectTitles = splitSubsections(projectsMd, 3).slice(0, 4).map((section) => section.title.replace(/^\d+\.\s*/, ''));
  const articleTopics = Array.from(new Set(articles.map((article) => article.topic))).slice(0, 4);
  const items = [...new Set(['Platform Engineering', ...projectTitles, ...articleTopics])].filter(Boolean);
  const doubled = [...items, ...items];
  document.getElementById('marqueeTrack').innerHTML = doubled.map((item) => '<div class="marquee-item"><span class="marquee-text">' + item + '</span><span class="marquee-dot"></span></div>').join('');
}

function buildResume(resumeMd, awardsMd) {
  const sections = splitSections(resumeMd, 2);
  const byTitle = new Map(sections.map((section) => [section.title, section.body]));
  if (!byTitle.get('Awards') && awardsMd.trim()) byTitle.set('Awards', awardsMd.trim());

  const order = [
    'Professional Summary',
    'Core Capability Areas',
    'Working Experience',
    'Selected Certifications',
    'Education',
    'Awards'
  ];

  document.getElementById('resumeGrid').innerHTML = order
    .filter((title) => byTitle.has(title))
    .map((title) => {
      let layoutClass = '';
      if (/Professional Summary|Core Capability Areas/.test(title)) layoutClass = ' wide';
      if (/Selected Certifications|Education|Awards/.test(title)) layoutClass = ' third';
      if (/Working Experience/.test(title)) layoutClass = ' full';
      return (
        '<article class="resume-card reveal' + layoutClass + '">' +
          '<div class="resume-label">' + title + '</div>' +
          '<h3 class="resume-title">' + title + '</h3>' +
          '<div class="rich-markdown">' + renderMarkdown(byTitle.get(title)) + '</div>' +
        '</article>'
      );
    }).join('');

  observeRevealElements(document.getElementById('resume'));
}

function buildPublications(publicationsMd) {
  document.getElementById('publicationsGrid').innerHTML =
    '<article class="publication-card reveal">' +
      '<div class="publication-label">Publications</div>' +
      '<h3 class="publication-title">Detailed publication record</h3>' +
      '<div class="rich-markdown">' + renderMarkdown(publicationsMd.trim()) + '</div>' +
    '</article>';

  observeRevealElements(document.getElementById('publications'));
}

function renderArticleBrowser() {
  const column = document.getElementById('articlesColumn');
  const panels = document.getElementById('writingPanels');
  const grouped = [...state.articles]
    .sort((a, b) => {
      if (a.topic !== b.topic) return a.topic.localeCompare(b.topic);
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return (b.date || '').localeCompare(a.date || '');
    })
    .reduce((acc, article) => {
      acc[article.topic] ||= [];
      acc[article.topic].push(article);
      return acc;
    }, {});

  const topics = Object.keys(grouped);
  if (!topics.length) {
    column.innerHTML = '<div class="article-topic-card reveal"><div class="article-topic-meta">No sections</div><div class="article-topic-name">No articles available.</div></div>';
    panels.innerHTML = '<article class="writing-panel reveal"><div class="writing-label">Articles</div><div class="writing-title">No articles available.</div></article>';
    observeRevealElements(document.getElementById('writing'));
    return;
  }

  if (!topics.includes(state.selectedTopic)) {
    state.selectedTopic = topics.includes('AI') ? 'AI' : topics[0];
  }

  column.innerHTML = topics.map((topic, groupIndex) => {
    const topicArticles = grouped[topic];
    return (
      '<section class="article-topic-card reveal reveal-delay-' + (groupIndex % 3) + '">' +
        '<button type="button" class="article-topic-button' + (state.selectedTopic === topic ? ' is-active' : '') + '" data-topic-button="' + escapeAttr(topic) + '">' +
          '<div class="article-topic-meta">' + String(topicArticles.length).padStart(2, '0') + ' Articles</div>' +
          '<h3 class="article-topic-name">' + topic + '</h3>' +
        '</button>' +
      '</section>'
    );
  }).join('');

  const selectedArticles = grouped[state.selectedTopic].slice(0, 4);
  panels.innerHTML =
    '<article class="writing-panel article-browser-panel reveal">' +
      '<div class="writing-label">Selected Section</div>' +
      '<h3 class="writing-title">' + state.selectedTopic + '</h3>' +
      '<div class="article-browser-results">' +
      selectedArticles.map((article) => (
        '<article class="article-card">' +
          '<div class="article-meta">' +
            '<span class="article-topic">' + article.topic + '</span>' +
            '<span>' + formatDate(article.date) + '</span>' +
            (article.featured ? '<span>Featured</span>' : '') +
          '</div>' +
          '<h4 class="article-title">' + article.title + '</h4>' +
          '<p class="article-summary">' + article.summary + '</p>' +
          '<a href="#" class="article-link" data-article-file="' + article.file + '" data-article-title="' + escapeAttr(article.title) + '">Open article <span>→</span></a>' +
        '</article>'
      )).join('') +
      '</div>' +
    '</article>';

  observeRevealElements(document.getElementById('writing'));
}

function buildWriting(academicMd, articles) {
  state.articles = articles;
  const academicSections = splitSections(academicMd, 4);
  const supportSection = academicSections.find((section) => /support or contact/i.test(section.title));
  document.getElementById('supportNote').innerHTML = supportSection ? renderMarkdown('#### ' + supportSection.title + '\n' + supportSection.body) : '';

  observeRevealElements(document.querySelector('.support-note'));
  renderArticleBrowser();
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
  } catch {
    content.innerHTML = '<p>Unable to load this article right now.</p>';
  }
}

function closeArticle() {
  const viewer = document.getElementById('articleViewer');
  viewer.classList.remove('is-open');
  viewer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
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

    const render = () => {
      ring.x += (target.x - ring.x) * 0.18;
      ring.y += (target.y - ring.y) * 0.18;
      cursor.style.transform = 'translate3d(' + (target.x - 5) + 'px, ' + (target.y - 5) + 'px, 0)';
      cursorRing.style.transform = 'translate3d(' + (ring.x - 18) + 'px, ' + (ring.y - 18) + 'px, 0)';
      window.requestAnimationFrame(render);
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
      if (event.target.closest('a, button')) cursorRing.classList.add('hover');
    });
    document.addEventListener('mouseout', (event) => {
      if (event.target.closest('a, button')) cursorRing.classList.remove('hover');
    });
    render();
  } else {
    cursor.style.display = 'none';
    cursorRing.style.display = 'none';
  }

  document.addEventListener('click', (event) => {
    const topicButton = event.target.closest('[data-topic-button]');
    if (topicButton) {
      state.selectedTopic = topicButton.dataset.topicButton;
      renderArticleBrowser();
      return;
    }

    const articleLink = event.target.closest('[data-article-file]');
    if (articleLink) {
      event.preventDefault();
      openArticle(articleLink.dataset.articleFile, articleLink.dataset.articleTitle);
    }

    if (event.target.closest('[data-close-viewer="true"]') || event.target.closest('#viewerClose')) {
      closeArticle();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeArticle();
  });
}

async function init() {
  setupInteractions();

  try {
    const [configText, homeText, projectsText, resumeText, publicationsText, awardsText, academicText, articlesIndex] = await Promise.all([
      fetchText(SITE_FILES.config),
      fetchText(SITE_FILES.home),
      fetchText(SITE_FILES.projects),
      fetchText(SITE_FILES.resume),
      fetchText(SITE_FILES.publications),
      fetchText(SITE_FILES.awards),
      fetchText(SITE_FILES.academic),
      fetchJson(SITE_FILES.articlesIndex)
    ]);

    const config = parseYaml(configText);
    const homeData = stripSocialLinksBlock(homeText);
    state.articles = Array.isArray(articlesIndex.articles) ? articlesIndex.articles : [];
    state.socialLinks = homeData.socialLinks;

    buildHero(config, homeData.markdown, state.articles);
    buildProjects(projectsText);
    buildMarquee(projectsText, state.articles);
    buildResume(resumeText, awardsText);
    buildPublications(publicationsText);
    buildWriting(academicText, state.articles);
    buildContact(state.socialLinks);
  } catch (error) {
    console.error(error);
    document.getElementById('aboutGrid').innerHTML =
      '<article class="about-card">' +
        '<div class="about-card-label">Unavailable</div>' +
        '<div class="about-card-title">Content could not be loaded.</div>' +
        '<div class="rich-markdown"><p>Please check that the markdown files are available.</p></div>' +
      '</article>';
  }
}

init();
