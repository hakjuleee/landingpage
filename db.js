let _config = null;

async function loadConfig() {
  if (_config) return _config;
  let api = {}, file = {};
  try { const r = await fetch('/api/config'); if (r.ok) api = await r.json(); } catch(e) {}
  try { const r = await fetch('config/git_config.json'); if (r.ok) file = await r.json(); } catch(e) {}
  const apiTok = String(api.github_token || '').trim();
  const fileTok = String(file.github_token || '').trim();
  _config = {
    github_token: (apiTok && apiTok !== 'YOUR_GITHUB_TOKEN') ? apiTok : fileTok,
    github_owner: file.github_owner || '',
    github_repo: file.github_repo || '',
    data_file_path: file.data_file_path || 'data/posts.json',
    admin_password: String(api.admin_password || file.admin_password || '6429').trim()
  };
  return _config;
}

function isAdmin() {
  return sessionStorage.getItem('isAdmin') === 'true';
}

function requireAdmin() {
  if (!isAdmin()) {
    window.location.href = 'admin.html';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function markdownToText(src) {
  if (!src) return '';
  let text = String(src);
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/<table[\s\S]*?<\/table>/gi, ' [표] ');
  text = text.replace(/<img[\s\S]*?>/gi, ' [이미지] ');
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, ' [이미지] ');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  text = text.replace(/~~(.*?)~~/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  text = text.replace(/^\s*>\s+/gm, '');
  text = text.replace(/---+/g, ' ');
  text = text.replace(/\|[-:\s|]+\|/g, ' ');
  text = text.replace(/\|/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// 안전한 HTML 살균 (위험한 태그 및 이벤트 핸들러 제거)
function sanitizeHtml(html) {
  if (!html) return '';
  let clean = String(html);
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  clean = clean.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  clean = clean.replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
  clean = clean.replace(/(href|src)\s*=\s*(?:'javascript:[^']*'|"javascript:[^"]*"|javascript:[^\s>]+)/gi, '');
  return clean;
}

// HTML <table> 태그를 세련되고 반응형으로 포맷팅
function enhanceHtmlTable(rawTable) {
  let table = rawTable;

  // <table> 태그 클래스 보완
  if (!/<table[^>]*class=/i.test(table)) {
    table = table.replace(/<table\b/i, '<table class="w-full text-left border-collapse text-sm text-on-surface"');
  } else {
    table = table.replace(/<table\b([^>]*)class=(["'])(.*?)\2/i, '<table$1class=$2w-full text-left border-collapse text-sm text-on-surface $3$2');
  }

  // <th> 스타일 보강 (\b 사용으로 <thead> 와 구분)
  table = table.replace(/<th\b([^>]*)>/gi, (match, attrs) => {
    if (/class=/i.test(attrs)) {
      return `<th${attrs.replace(/class=(["'])(.*?)\1/i, 'class=$1bg-surface-container-high text-on-surface font-semibold py-3 px-4 border border-outline-variant/30 text-center text-xs sm:text-sm tracking-wide $2$1')}>`;
    }
    return `<th class="bg-surface-container-high text-on-surface font-semibold py-3 px-4 border border-outline-variant/30 text-center text-xs sm:text-sm tracking-wide"${attrs}>`;
  });

  // <td> 스타일 보강
  table = table.replace(/<td\b([^>]*)>/gi, (match, attrs) => {
    if (/class=/i.test(attrs)) {
      return `<td${attrs.replace(/class=(["'])(.*?)\1/i, 'class=$1py-2.5 px-4 border border-outline-variant/20 text-on-surface-variant text-xs sm:text-sm $2$1')}>`;
    }
    return `<td class="py-2.5 px-4 border border-outline-variant/20 text-on-surface-variant text-xs sm:text-sm"${attrs}>`;
  });

  // <tr> 스타일 보강
  table = table.replace(/<tr\b([^>]*)>/gi, (match, attrs) => {
    if (/class=/i.test(attrs)) {
      return `<tr${attrs.replace(/class=(["'])(.*?)\1/i, 'class=$1hover:bg-surface-container-high/40 transition-colors $2$1')}>`;
    }
    return `<tr class="hover:bg-surface-container-high/40 transition-colors"${attrs}>`;
  });

  return `<div class="rich-table-wrapper overflow-x-auto my-5 rounded-xl border border-outline-variant/30 shadow-md bg-surface-container/40">${table}</div>`;
}

// HTML <img> 태그를 반응형 및 라이트박스 지원 형태로 포맷팅
function enhanceHtmlImage(rawImg) {
  const srcMatch = rawImg.match(/src=["']([^"']+)["']/i);
  const altMatch = rawImg.match(/alt=["']([^"']*)["']/i);
  const titleMatch = rawImg.match(/title=["']([^"']*)["']/i);

  const src = srcMatch ? srcMatch[1] : '';
  const alt = altMatch ? altMatch[1] : (titleMatch ? titleMatch[1] : '이미지');

  if (!src) return '';
  return `<figure class="my-5 text-center group">
    <div class="overflow-hidden rounded-xl inline-block max-w-full border border-outline-variant/30 bg-surface-container-high/50 shadow-md">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" class="max-w-full h-auto object-contain mx-auto block cursor-pointer transition-transform duration-300 group-hover:scale-[1.01]" onclick="if(window.openImageViewer)window.openImageViewer(this.src, this.alt)" />
    </div>
    ${alt && alt !== '이미지' ? `<figcaption class="mt-2 text-xs text-text-secondary text-center">${escapeHtml(alt)}</figcaption>` : ''}
  </figure>`;
}

// 마크다운 표 파싱 (| 제목1 | 제목2 | ...)
function parseMarkdownTable(lines) {
  if (lines.length < 2) return null;
  const headerLine = lines[0].trim();
  const sepLine = lines[1].trim();

  if (!headerLine.startsWith('|') || !sepLine.startsWith('|')) return null;
  if (!/^\|[\s\-:|]+\|$/.test(sepLine)) return null;

  const parseCells = line => line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  const headers = parseCells(headerLine);
  const alignments = parseCells(sepLine).map(col => {
    if (col.startsWith(':') && col.endsWith(':')) return 'text-center';
    if (col.endsWith(':')) return 'text-right';
    return 'text-left';
  });

  let html = `<div class="rich-table-wrapper overflow-x-auto my-5 rounded-xl border border-outline-variant/30 shadow-md bg-surface-container/40">
    <table class="w-full text-left border-collapse text-sm text-on-surface">
      <thead>
        <tr class="bg-surface-container-high">
          ${headers.map((h, i) => `<th class="py-3 px-4 border border-outline-variant/30 font-semibold text-xs sm:text-sm ${alignments[i] || 'text-center'}">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>`;

  for (let i = 2; i < lines.length; i++) {
    const rowLine = lines[i].trim();
    if (!rowLine.startsWith('|')) continue;
    const cells = parseCells(rowLine);
    html += `<tr class="hover:bg-surface-container-high/40 transition-colors">
      ${cells.map((cell, idx) => `<td class="py-2.5 px-4 border border-outline-variant/20 text-on-surface-variant text-xs sm:text-sm ${alignments[idx] || 'text-left'}">${cell}</td>`).join('')}
    </tr>`;
  }

  html += `</tbody></table></div>`;
  return html;
}

// 종합 본문 렌더러 (HTML 표/이미지 + 마크다운 지원)
function renderMarkdown(src) {
  if (!src) return '';
  let content = String(src);

  // 1. 악성 스크립트 차단
  content = sanitizeHtml(content);

  // 2. 코드 블록 보호 (``` ... ```)
  const codeBlocks = [];
  content = content.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre class="bg-surface-container-highest p-4 rounded-xl overflow-x-auto text-sm my-4 font-mono text-on-surface border border-outline-variant/20"><code>${escapeHtml(code.trim())}</code></pre>`);
    return `\n\n@@CODEBLOCK${idx}@@\n\n`;
  });

  // 3. 인라인 코드 보호 (`code`)
  content = content.replace(/`([^`]+)`/g, (match, code) => {
    return `<code class="bg-surface-container-highest px-1.5 py-0.5 rounded text-sm font-mono text-primary">${escapeHtml(code)}</code>`;
  });

  // 4. HTML 표 추출 및 포맷팅 보호 (<table ... </table>)
  const tableBlocks = [];
  content = content.replace(/<table[\s\S]*?<\/table>/gi, (match) => {
    const idx = tableBlocks.length;
    tableBlocks.push(enhanceHtmlTable(match));
    return `\n\n@@TABLEBLOCK${idx}@@\n\n`;
  });

  // 5. HTML 이미지 추출 및 포맷팅 보호 (<img ... />)
  const imageBlocks = [];
  content = content.replace(/<img\s+[^>]*>/gi, (match) => {
    const idx = imageBlocks.length;
    imageBlocks.push(enhanceHtmlImage(match));
    return `\n\n@@IMAGEBLOCK${idx}@@\n\n`;
  });

  // 6. 마크다운 이미지 추출 (![alt](url))
  content = content.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (match, alt, url, title) => {
    const idx = imageBlocks.length;
    const caption = title || alt || '';
    const imgHtml = enhanceHtmlImage(`<img src="${url}" alt="${alt || caption}">`);
    imageBlocks.push(imgHtml);
    return `\n\n@@IMAGEBLOCK${idx}@@\n\n`;
  });

  // 7. 마크다운 링크 ([text](url))
  content = content.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|tel:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-secondary font-medium">$1</a>');

  // 8. 서식 (굵게, 기울임, 취소선)
  content = content.replace(/(\*\*|__)(.*?)\1/g, '<strong class="font-bold text-on-surface">$2</strong>');
  content = content.replace(/(\*|_)(.*?)\1/g, '<em class="italic text-on-surface-variant">$2</em>');
  content = content.replace(/~~(.*?)~~/g, '<del class="line-through text-outline">$1</del>');

  // 9. 전화번호 자동 링크
  content = content.replace(/(01[016789]-\d{3,4}-\d{4}|0\d{1,2}-\d{3,4}-\d{4})/g, '<a href="tel:$1" class="text-primary underline font-medium hover:text-secondary">$1</a>');

  // 10. 라인별 마크다운 블록 처리 (헤더, 목록, 인용문, 마크다운 표)
  const rawLines = content.split('\n');
  const result = [];
  let inUl = false;
  let inOl = false;
  let inBlockquote = false;
  let bqContent = [];

  function closeLists() {
    if (inUl) { result.push('</ul>'); inUl = false; }
    if (inOl) { result.push('</ol>'); inOl = false; }
  }

  function closeBq() {
    if (inBlockquote) {
      result.push(`<blockquote class="border-l-4 border-primary pl-4 py-1.5 my-4 bg-surface-container-low rounded-r text-on-surface-variant italic">${bqContent.join('<br>')}</blockquote>`);
      inBlockquote = false;
      bqContent = [];
    }
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 마크다운 표 감지 (| 로 시작하는 연속 라인)
    if (trimmed.startsWith('|') && i + 1 < rawLines.length && /^\|[\s\-:|]+\|$/.test(rawLines[i + 1].trim())) {
      closeLists();
      closeBq();
      const tableLines = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('|')) {
        tableLines.push(rawLines[i]);
        i++;
      }
      i--; // 루프 보정
      const parsedTable = parseMarkdownTable(tableLines);
      if (parsedTable) {
        result.push(parsedTable);
        continue;
      }
    }

    if (/^#{1,6}\s/.test(trimmed)) {
      closeLists();
      closeBq();
      const level = trimmed.match(/^(#{1,6})\s/)[1].length;
      const text = trimmed.replace(/^#{1,6}\s+/, '');
      const cls = level === 1 ? 'text-2xl font-bold mt-7 mb-3 text-on-surface' :
                  level === 2 ? 'text-xl font-bold mt-6 mb-2.5 text-on-surface' :
                  level === 3 ? 'text-lg font-semibold mt-5 mb-2 text-on-surface' :
                  'text-base font-semibold mt-4 mb-1.5 text-on-surface';
      result.push(`<h${level} class="${cls}">${text}</h${level}>`);
      continue;
    }

    if (/^---$/.test(trimmed) || /^\*\*\*$/.test(trimmed)) {
      closeLists();
      closeBq();
      result.push('<hr class="my-6 border-outline-variant/30">');
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      closeLists();
      inBlockquote = true;
      bqContent.push(trimmed.replace(/^>\s?/, ''));
      continue;
    } else {
      closeBq();
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      if (inOl) { result.push('</ol>'); inOl = false; }
      if (!inUl) { result.push('<ul class="list-disc list-inside space-y-1.5 my-3 text-on-surface-variant">'); inUl = true; }
      result.push(`<li>${trimmed.replace(/^[-*+]\s+/, '')}</li>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (inUl) { result.push('</ul>'); inUl = false; }
      if (!inOl) { result.push('<ol class="list-decimal list-inside space-y-1.5 my-3 text-on-surface-variant">'); inOl = true; }
      result.push(`<li>${trimmed.replace(/^\d+\.\s+/, '')}</li>`);
      continue;
    }

    closeLists();

    if (trimmed.startsWith('@@CODEBLOCK') && trimmed.endsWith('@@')) {
      const idx = parseInt(trimmed.replace('@@CODEBLOCK', '').replace('@@', ''));
      result.push(codeBlocks[idx] || '');
      continue;
    }

    if (trimmed.startsWith('@@TABLEBLOCK') && trimmed.endsWith('@@')) {
      const idx = parseInt(trimmed.replace('@@TABLEBLOCK', '').replace('@@', ''));
      result.push(tableBlocks[idx] || '');
      continue;
    }

    if (trimmed.startsWith('@@IMAGEBLOCK') && trimmed.endsWith('@@')) {
      const idx = parseInt(trimmed.replace('@@IMAGEBLOCK', '').replace('@@', ''));
      result.push(imageBlocks[idx] || '');
      continue;
    }

    if (trimmed === '') {
      if (result.length > 0 && result[result.length - 1] !== '<div class="h-3"></div>') {
        result.push('<div class="h-3"></div>');
      }
    } else {
      result.push(`<p class="my-2 leading-relaxed text-on-surface-variant">${trimmed}</p>`);
    }
  }

  closeLists();
  closeBq();

  let html = result.join('\n');

  // 남아있는 placeholder 복원 (문장 중간에 섞여 있는 경우 대응)
  html = html.replace(/@@CODEBLOCK(\d+)@@/g, (match, idx) => codeBlocks[idx] || '');
  html = html.replace(/@@TABLEBLOCK(\d+)@@/g, (match, idx) => tableBlocks[idx] || '');
  html = html.replace(/@@IMAGEBLOCK(\d+)@@/g, (match, idx) => imageBlocks[idx] || '');

  return html;
}

// 텍스트/HTML 복합 설명 포맷터 (매물 상세 등에서 사용)
function renderRichContent(src) {
  return renderMarkdown(src);
}

async function getPosts() {
  const local = localStorage.getItem('posts_cache');
  let fallback = [];
  if (local) {
    try { fallback = JSON.parse(local); } catch(e) {}
  }

  try {
    const res = await fetch('data/posts.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('posts_cache', JSON.stringify(data));
      return data;
    }
  } catch(e) {}

  return fallback;
}

async function getPostById(id) {
  const posts = await getPosts();
  return posts.find(p => String(p.id) === String(id));
}

function b64EncodeUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
    return String.fromCharCode(parseInt(p1, 16));
  }));
}

function b64DecodeUnicode(str) {
  return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
}

async function savePostsToGithub(posts) {
  const cfg = await loadConfig();
  const token = String(cfg.github_token || '').replace(/\s+/g, '');
  
  localStorage.setItem('posts_cache', JSON.stringify(posts));

  if (!token || token === 'YOUR_GITHUB_TOKEN') {
    throw new Error('GitHub 토큰이 설정되지 않았습니다. Vercel 환경 변수나 config를 확인하세요.');
  }
  if (!cfg.github_owner || !cfg.github_repo) {
    throw new Error('GitHub 저장소 정보(owner/repo)가 올바르지 않습니다.');
  }

  const path = cfg.data_file_path || 'data/posts.json';
  const url = `https://api.github.com/repos/${cfg.github_owner}/${cfg.github_repo}/contents/${path}`;

  let sha = null;
  try {
    const getRes = await fetch(url + '?ref=main&t=' + Date.now(), {
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (getRes.ok) {
      const getData = await getRes.json();
      sha = getData.sha;
    }
  } catch(e) {}

  const jsonStr = JSON.stringify(posts, null, 2);
  const content = b64EncodeUnicode(jsonStr);

  const bodyData = {
    message: `feat(board): update posts ${new Date().toISOString()}`,
    content: content,
    branch: 'main'
  };
  if (sha) bodyData.sha = sha;

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': 'token ' + token,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify(bodyData)
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`저장 실패 (${putRes.status}): ${errText}`);
  }

  return true;
}

async function createPost(postData) {
  const posts = await getPosts();
  const newId = posts.length > 0 ? Math.max(...posts.map(p => Number(p.id) || 0)) + 1 : 1;
  const newPost = {
    id: newId,
    title: postData.title,
    category: postData.category || '부동산 뉴스',
    author: postData.author || '한양공인중개사',
    date: postData.date || new Date().toISOString().slice(0, 10),
    content: postData.content || ''
  };
  posts.unshift(newPost);
  await savePostsToGithub(posts);
  return newPost;
}

async function updatePost(id, updatedData) {
  const posts = await getPosts();
  const index = posts.findIndex(p => String(p.id) === String(id));
  if (index === -1) throw new Error('해당 게시글을 찾을 수 없습니다.');
  
  posts[index] = {
    ...posts[index],
    title: updatedData.title,
    category: updatedData.category,
    content: updatedData.content,
    updatedAt: new Date().toISOString().slice(0, 10)
  };
  await savePostsToGithub(posts);
  return posts[index];
}

async function deletePost(id) {
  let posts = await getPosts();
  posts = posts.filter(p => String(p.id) !== String(id));
  await savePostsToGithub(posts);
  return true;
}


// ==================== 매물 관리 (Properties) ====================

async function getProperties() {
  const local = localStorage.getItem('properties_cache');
  let fallback = [];
  if (local) {
    try { fallback = JSON.parse(local); } catch(e) {}
  }

  try {
    const res = await fetch('data/properties.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('properties_cache', JSON.stringify(data));
      return data;
    }
  } catch(e) {}

  return fallback;
}

async function getPropertyById(id) {
  const props = await getProperties();
  return props.find(p => String(p.id) === String(id));
}

async function savePropertiesToGithub(properties) {
  const cfg = await loadConfig();
  const token = String(cfg.github_token || '').replace(/\s+/g, '');
  
  localStorage.setItem('properties_cache', JSON.stringify(properties));

  if (!token || token === 'YOUR_GITHUB_TOKEN') {
    throw new Error('GitHub 토큰이 설정되지 않았습니다. Vercel 환경 변수나 config를 확인하세요.');
  }
  if (!cfg.github_owner || !cfg.github_repo) {
    throw new Error('GitHub 저장소 정보(owner/repo)가 올바르지 않습니다.');
  }

  const path = 'data/properties.json';
  const url = `https://api.github.com/repos/${cfg.github_owner}/${cfg.github_repo}/contents/${path}`;

  let sha = null;
  try {
    const getRes = await fetch(url + '?ref=main&t=' + Date.now(), {
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (getRes.ok) {
      const getData = await getRes.json();
      sha = getData.sha;
    }
  } catch(e) {}

  const jsonStr = JSON.stringify(properties, null, 2);
  const content = b64EncodeUnicode(jsonStr);

  const bodyData = {
    message: `feat(properties): update properties ${new Date().toISOString()}`,
    content: content,
    branch: 'main'
  };
  if (sha) bodyData.sha = sha;

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': 'token ' + token,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify(bodyData)
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`저장 실패 (${putRes.status}): ${errText}`);
  }

  return true;
}

async function createProperty(propData) {
  const props = await getProperties();
  const newId = props.length > 0 ? Math.max(...props.map(p => Number(p.id) || 0)) + 1 : 1;
  const newProp = {
    id: newId,
    type: propData.type || '매매',
    category: propData.category || '아파트',
    badge: propData.badge || '즉시입주가능',
    location: propData.location || '금곡동 · 청솔주공9단지',
    title: propData.title || '',
    price: propData.price || '',
    priceUnit: propData.priceUnit || '',
    priceNumber: Number(propData.priceNumber) || 0,
    area: propData.area || '',
    floor: propData.floor || '',
    direction: propData.direction || '남향',
    rooms: propData.rooms || '',
    moveIn: propData.moveIn || '즉시입주 가능',
    features: propData.features || '',
    description: propData.description || '',
    image: propData.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbw7Paqh3AYAIDGdtQJqxQPbFO9IhhlwMA3Ttx7j63bOMHBXHQGzQqFmhrwosSHRTY2Wgwc4tQQC307d47M9R69BLN0C_MCd_Vx0OZOXLrFvXKBBP94w54GonsC3Ug9hsQNbLmz7ka71u9fvTkW4GYaFm5HqSECgWL57qtJrry_6C2iuS3wpTmIAii_i92l3SL2r0lCCnqiOkcRK8jcfdBZrCS14JO_K0eF7bpEm4OjC5HGhgp84fM',
    date: propData.date || new Date().toISOString().slice(0, 10)
  };
  props.unshift(newProp);
  await savePropertiesToGithub(props);
  return newProp;
}

async function updateProperty(id, updatedData) {
  const props = await getProperties();
  const index = props.findIndex(p => String(p.id) === String(id));
  if (index === -1) throw new Error('해당 매물을 찾을 수 없습니다.');
  
  props[index] = {
    ...props[index],
    ...updatedData,
    id: props[index].id,
    priceNumber: Number(updatedData.priceNumber) || props[index].priceNumber,
    updatedAt: new Date().toISOString().slice(0, 10)
  };
  await savePropertiesToGithub(props);
  return props[index];
}

async function deleteProperty(id) {
  let props = await getProperties();
  props = props.filter(p => String(p.id) !== String(id));
  await savePropertiesToGithub(props);
  return true;
}
