const SITE_FILES = {
  config: '../contents/config.yml',
  home: '../contents/home.md',
  projects: '../contents/projects.md',
  profile: '../contents/profile.md',
  academic: '../contents/academic.md',
  articlesIndex: '../contents/articles/index.json'
};

const state = {
  articles: [],
  socialLinks: [],
  revealObserver: null,
  selectedTopic: 'AI',
  currentArticleFile: '',
  currentArticleTitle: ''
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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseInline(text) {
  const escaped = escapeHtml(text);

  return escaped
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function resolveMarkdownUrl(url, basePath = '') {
  if (!url) return url;
  if (/^(?:[a-z]+:|#|\/)/i.test(url)) return url;
  const normalized = url.replace(/^\.\//, '');
  if (normalized.startsWith('contents/')) {
    return assetUrl('../' + normalized);
  }
  return assetUrl(basePath + normalized);
}

function renderTableRow(line, cellTag, basePath) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = trimmed.split('|').map((cell) => cell.trim());
  return '<tr>' + cells.map((cell) => '<' + cellTag + '>' + parseInlineWithBase(cell, basePath) + '</' + cellTag + '>').join('') + '</tr>';
}

function parseInlineWithBase(text, basePath = '') {
  return parseInline(text)
    .replace(/<img src="([^"]+)" alt="([^"]*)">/g, (_, url, alt) => '<img src="' + resolveMarkdownUrl(url, basePath) + '" alt="' + alt + '">')
    .replace(/<a href="([^"]+)" target="_blank" rel="noreferrer">/g, (_, url) => '<a href="' + resolveMarkdownUrl(url, basePath) + '" target="_blank" rel="noreferrer">');
}

function renderMarkdown(md, options = {}) {
  const basePath = options.basePath || '';
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
      html.push('<p>' + parseInlineWithBase(paragraph.join(' ').trim(), basePath) + '</p>');
      paragraph = [];
    }
  }

  function flushList() {
    if (listItems.length) {
      html.push('<' + listType + '>' + listItems.map((item) => '<li>' + parseInlineWithBase(item.trim(), basePath) + '</li>').join('') + '</' + listType + '>');
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

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

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
      html.push('<h' + level + '>' + parseInlineWithBase(headingMatch[2].trim(), basePath) + '</h' + level + '>');
      continue;
    }

    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flushParagraph();
      flushList();
      html.push('<hr>');
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\-:\s|]+\|?\s*$/.test(lines[i + 1]) && /-/.test(lines[i + 1])) {
      flushParagraph();
      flushList();
      const headerLine = line;
      const separatorLine = lines[i + 1];
      const bodyRows = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        bodyRows.push(lines[i]);
        i += 1;
      }
      i -= 1;
      const header = renderTableRow(headerLine, 'th', basePath);
      const body = bodyRows.map((row) => renderTableRow(row, 'td', basePath)).join('');
      html.push('<div class="table-wrap"><table><thead>' + header + '</thead><tbody>' + body + '</tbody></table></div>');
      continue;
    }

    const quoteMatch = line.match(/^\s*>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      const quoteLines = [quoteMatch[1]];
      while (i + 1 < lines.length) {
        const nextQuote = lines[i + 1].match(/^\s*>\s?(.*)$/);
        if (!nextQuote) break;
        quoteLines.push(nextQuote[1]);
        i += 1;
      }
      html.push('<blockquote><p>' + parseInlineWithBase(quoteLines.join(' ').trim(), basePath) + '</p></blockquote>');
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
      const imgMatch = line.trim().match(/^<img([^>]*?)src="([^"]+)"([^>]*)>$/i);
      if (imgMatch) {
        html.push('<img' + imgMatch[1] + 'src="' + resolveMarkdownUrl(imgMatch[2], basePath) + '"' + imgMatch[3] + '>');
      } else {
        html.push(line);
      }
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

function buildArticleUrl(file) {
  const url = new URL(window.location.href);
  url.searchParams.set('article', file);
  return url.toString();
}

function getArticleFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get('article') || '';
}

function clearArticleUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('article');
  return url.pathname + url.search + url.hash;
}

function syncSelectedTopicForArticle(file) {
  const article = state.articles.find((item) => item.file === file);
  if (article && article.topic) {
    state.selectedTopic = article.topic;
  }
  return article;
}

function buildHero(config, homeMd, articles) {
  const personName = (config['page-top-title'] || 'Nashwan Mustafa').trim();
  const subtitle = config['home-subtitle'] || 'Platform Engineering | MLOps and AI | Secure Cloud Platforms | Technical Writing';
  const eyebrow = config['top-section-bg-text'] || 'Platform and AI Engineering';
  const nameParts = personName.split(' ');
  const firstName = nameParts.shift() || personName;
  const lastName = nameParts.join(' ') || '';
  document.title = config.title || document.title;
  document.getElementById('navLogo').textContent = personName;
  document.getElementById('heroEyebrow').textContent = eyebrow;
  document.getElementById('heroRole').textContent = subtitle;
  document.getElementById('heroMonogram').setAttribute('data-monogram', (firstName[0] || 'N') + (lastName[0] || 'M'));
  document.getElementById('heroOrbitCopy').textContent = 'AI / Kubernetes / AWS Cloud / Everything as a Code';
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
    highlightsSection ? highlightsSection.body : '',
    exploreSection ? '### ' + exploreSection.title + '\n' + exploreSection.body : ''
  ].filter(Boolean).join('\n\n');
  if (combinedBody) {
    cards.push({
      label: 'Highlights',
      title: highlightsSection ? highlightsSection.title : 'Selected highlights',
      body: combinedBody
    });
  }

  document.getElementById('aboutGrid').innerHTML = cards.map((card, index) => (
    '<article class="about-card reveal reveal-delay-' + (index % 3) + '">' +
      '<div class="about-card-label">' + card.label + '</div>' +
      '<h2 class="about-card-title">' + escapeHtml(card.title).replace(/Nashwan/g, '<em>Nashwan</em>') + '</h2>' +
      '<div class="rich-markdown">' + renderMarkdown(card.body, { basePath: '../contents/' }) + '</div>' +
    '</article>'
  )).join('');

  observeRevealElements(document.getElementById('about'));
}

function buildProfile(profileMd) {
  const sections = splitSections(profileMd, 2);
  const summarySection = sections.find((section) => /professional summary/i.test(section.title));
  const projectsSection = sections.find((section) => /recent platform projects/i.test(section.title));
  const publicationsSection = sections.find((section) => /academic publications/i.test(section.title));

  document.getElementById('projectsGrid').innerHTML =
    '<article class="resume-card full reveal resume-launcher">' +
      '<div class="resume-label">Profile</div>' +
      '<h3 class="resume-title">Experience, projects, and publications</h3>' +
      '<div class="rich-markdown">' +
        (summarySection ? renderMarkdown(summarySection.body, { basePath: '../contents/' }) : '<p>A complete professional profile is available here.</p>') +
      '</div>' +
      '<div class="resume-meta">' +
        (projectsSection ? '<span>Recent Projects</span>' : '') +
        (publicationsSection ? '<span>Academic Publications</span>' : '') +
        '<span>Full Resume</span>' +
      '</div>' +
      '<a href="#" class="article-link resume-link" data-profile-file="profile.md" data-profile-title="Professional Profile">Open full profile <span>→</span></a>' +
    '</article>';

  observeRevealElements(document.getElementById('projects'));
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

  const selectedArticles = grouped[state.selectedTopic];
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
          '<a href="' + escapeAttr(buildArticleUrl(article.file)) + '" class="article-link" data-article-file="' + article.file + '" data-article-title="' + escapeAttr(article.title) + '">Open article <span>→</span></a>' +
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
  document.getElementById('supportNote').innerHTML = supportSection ? renderMarkdown('#### ' + supportSection.title + '\n' + supportSection.body, { basePath: '../contents/' }) : '';

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

async function openArticle(file, title, options = {}) {
  const viewer = document.getElementById('articleViewer');
  const content = document.getElementById('viewerContent');
  const status = document.getElementById('viewerStatus');
  const articleTitle = title || (state.articles.find((item) => item.file === file) || {}).title || 'Article viewer';

  state.currentArticleFile = file;
  state.currentArticleTitle = articleTitle;
  viewer.classList.add('is-open');
  viewer.setAttribute('aria-hidden', 'false');
  status.textContent = articleTitle;
  content.innerHTML = '<p class="loading">Loading article</p>';
  document.body.style.overflow = 'hidden';

  if (!options.skipHistory) {
    window.history.pushState({ article: file }, '', buildArticleUrl(file));
  }

  try {
    const markdown = await fetchText('../contents/articles/' + file);
    content.innerHTML = renderMarkdown(markdown, { basePath: '../contents/articles/' });
  } catch {
    content.innerHTML = '<p>Unable to load this article right now.</p>';
  }
}

async function openProfile(file, title) {
  const viewer = document.getElementById('articleViewer');
  const content = document.getElementById('viewerContent');
  const status = document.getElementById('viewerStatus');
  viewer.classList.add('is-open');
  viewer.setAttribute('aria-hidden', 'false');
  status.textContent = title || 'Professional Profile';
  content.innerHTML = '<p class="loading">Loading profile</p>';
  document.body.style.overflow = 'hidden';

  try {
    const markdown = await fetchText('../contents/' + file);
    content.innerHTML = renderMarkdown(markdown, { basePath: '../contents/' });
  } catch {
    content.innerHTML = '<p>Unable to load this profile right now.</p>';
  }
}

function closeArticle(options = {}) {
  const viewer = document.getElementById('articleViewer');
  viewer.classList.remove('is-open');
  viewer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  state.currentArticleFile = '';
  state.currentArticleTitle = '';

  if (!options.skipHistory && getArticleFromUrl()) {
    window.history.pushState({}, '', clearArticleUrl());
  }
}

function syncArticleFromUrl() {
  const articleFile = getArticleFromUrl();
  if (!articleFile) {
    if (state.currentArticleFile) closeArticle({ skipHistory: true });
    return;
  }

  const article = syncSelectedTopicForArticle(articleFile);
  if (article) renderArticleBrowser();

  if (state.currentArticleFile === articleFile) return;
  openArticle(articleFile, article ? article.title : '', { skipHistory: true });
}

function setupInteractions() {
  const cursor = document.getElementById('cursor');
  const cursorRing = document.getElementById('cursorRing');
  const heroMonogram = document.getElementById('heroMonogram');
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
      return;
    }

    const profileLink = event.target.closest('[data-profile-file]');
    if (profileLink) {
      event.preventDefault();
      openProfile(profileLink.dataset.profileFile, profileLink.dataset.profileTitle);
      return;
    }

    if (event.target.closest('[data-close-viewer="true"]') || event.target.closest('#viewerClose')) {
      closeArticle();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeArticle();
  });

  window.addEventListener('popstate', () => {
    syncArticleFromUrl();
  });

  if (heroMonogram) {
    heroMonogram.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
  }
}

async function init() {
  setupInteractions();

  try {
    const [configText, homeText, profileText, academicText, articlesIndex] = await Promise.all([
      fetchText(SITE_FILES.config),
      fetchText(SITE_FILES.home),
      fetchText(SITE_FILES.profile).catch(() => ''),
      fetchText(SITE_FILES.academic).catch(() => ''),
      fetchJson(SITE_FILES.articlesIndex).catch(() => ({ articles: [] }))
    ]);

    const config = parseYaml(configText);
    const homeData = stripSocialLinksBlock(homeText);
    state.articles = Array.isArray(articlesIndex.articles) ? articlesIndex.articles : [];
    state.socialLinks = homeData.socialLinks;

    buildHero(config, homeData.markdown, state.articles);
    buildProfile(profileText || '## Professional Summary\nA complete professional profile is being prepared.\n');
    buildWriting(academicText || '', state.articles);
    buildContact(state.socialLinks);
    syncArticleFromUrl();
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
