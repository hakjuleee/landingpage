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
  text = text.replace(/\n+/g, ' ').trim();
  return text;
}

function renderMarkdown(src) {
  if (!src) return '';
  let escaped = escapeHtml(src);
  
  const codeBlocks = [];
  escaped = escaped.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre class="bg-surface-container-highest p-4 rounded-xl overflow-x-auto text-sm my-4 font-mono text-on-surface"><code>${code.trim()}</code></pre>`);
    return `@@CODE_BLOCK_${idx}@@`;
  });

  const parts = escaped.split('`');
  for (let i = 1; i < parts.length; i += 2) {
    parts[i] = `<code class="bg-surface-container-highest px-1.5 py-0.5 rounded text-sm font-mono text-primary">${parts[i]}</code>`;
  }
  escaped = parts.join('');

  escaped = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-secondary">$1</a>');
  escaped = escaped.replace(/(\*\*|__)(.*?)\1/g, '<strong class="font-bold text-on-surface">$2</strong>');
  escaped = escaped.replace(/(\*|_)(.*?)\1/g, '<em class="italic">$2</em>');
  escaped = escaped.replace(/~~(.*?)~~/g, '<del class="line-through text-outline">$1</del>');

  const lines = escaped.split('\n');
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
      result.push(`<blockquote class="border-l-4 border-primary pl-4 py-1 my-4 bg-surface-container-low rounded-r text-on-surface-variant italic">${bqContent.join('<br>')}</blockquote>`);
      inBlockquote = false;
      bqContent = [];
    }
  }

  for (let line of lines) {
    const trimmed = line.trim();

    if (/^#{1,6}\s/.test(trimmed)) {
      closeLists();
      closeBq();
      const level = trimmed.match(/^(#{1,6})\s/)[1].length;
      const text = trimmed.replace(/^#{1,6}\s+/, '');
      const cls = level === 1 ? 'text-2xl font-bold mt-6 mb-3 text-on-surface' :
                  level === 2 ? 'text-xl font-bold mt-5 mb-2 text-on-surface' :
                  level === 3 ? 'text-lg font-semibold mt-4 mb-2 text-on-surface' :
                  'text-base font-semibold mt-3 mb-1 text-on-surface';
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

    if (trimmed.startsWith('@@CODE_BLOCK_') && trimmed.endsWith('@@')) {
      const idx = parseInt(trimmed.replace('@@CODE_BLOCK_', '').replace('@@', ''));
      result.push(codeBlocks[idx] || '');
      continue;
    }

    if (trimmed === '') {
      result.push('<div class="h-3"></div>');
    } else {
      result.push(`<p class="my-2 leading-relaxed text-on-surface-variant">${trimmed}</p>`);
    }
  }

  closeLists();
  closeBq();

  let html = result.join('\n');
  html = html.replace(/@@CODE_BLOCK_(\d+)@@/g, (match, idx) => codeBlocks[idx] || '');
  return html;
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
