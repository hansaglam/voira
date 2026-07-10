export function buildAudioAdminPageHtml(isDev: boolean): string {
  const devBanner = isDev
    ? `<div class="banner">Local development admin tool</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EchoSpeak Audio Admin</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0f1419;
      --card: #1a2332;
      --border: #2a3544;
      --text: #e8edf4;
      --muted: #8b9cb3;
      --accent: #5b9fd4;
      --success: #4caf82;
      --danger: #e06c75;
      --warning: #d4a656;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }

    .page {
      max-width: 760px;
      margin: 0 auto;
      padding: 24px 16px 48px;
    }

    .banner {
      background: #1e2a3a;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 20px;
      color: var(--muted);
      font-size: 14px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 24px;
    }

    .subtitle {
      color: var(--muted);
      margin: 0 0 24px;
      font-size: 14px;
    }

    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }

    .card h2 {
      margin: 0 0 16px;
      font-size: 16px;
    }

    label {
      display: block;
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 6px;
    }

    select, input[type="file"], button {
      width: 100%;
      font: inherit;
    }

    select {
      background: #111822;
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
    }

    input[type="file"] {
      background: #111822;
      border: 1px dashed var(--border);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 14px;
      color: var(--muted);
    }

    input[type="search"] {
      background: #111822;
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
      width: 100%;
      font: inherit;
    }

    .lesson-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 14px;
    }

    .meta-pill {
      background: #111822;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 12px;
      color: var(--muted);
    }

    .meta-pill.premium { color: var(--warning); border-color: rgba(212, 166, 86, 0.4); }
    .meta-pill.free { color: var(--success); border-color: rgba(76, 175, 130, 0.4); }

    .lesson-subtitle {
      color: var(--muted);
      font-size: 13px;
      margin: -8px 0 14px;
    }

    .segment-translation {
      color: var(--muted);
      font-size: 13px;
      margin-top: 8px;
    }

    .result-count {
      font-size: 12px;
      color: var(--muted);
      margin: -8px 0 12px;
    }

    .field-group { margin-bottom: 4px; }

    .segment-text {
      background: #111822;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      font-size: 15px;
      margin-bottom: 14px;
      min-height: 48px;
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .status-item {
      background: #111822;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px;
      text-align: center;
      font-size: 13px;
    }

    .status-item .label {
      color: var(--muted);
      display: block;
      margin-bottom: 4px;
      text-transform: capitalize;
    }

    .status-item.available { border-color: rgba(76, 175, 130, 0.5); }
    .status-item.missing { border-color: rgba(139, 156, 179, 0.3); }

    .status-item.available .value { color: var(--success); }
    .status-item.missing .value { color: var(--muted); }

    .radio-row {
      display: flex;
      gap: 12px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }

    .radio-row label {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      color: var(--text);
      cursor: pointer;
    }

    button {
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 12px 16px;
      cursor: pointer;
      font-weight: 600;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .message {
      border-radius: 8px;
      padding: 12px 14px;
      margin-top: 14px;
      font-size: 14px;
      display: none;
    }

    .message.show { display: block; }
    .message.success { background: rgba(76, 175, 130, 0.15); border: 1px solid rgba(76, 175, 130, 0.4); color: #b8e6cc; }
    .message.error { background: rgba(224, 108, 117, 0.15); border: 1px solid rgba(224, 108, 117, 0.4); color: #f5c2c7; }

    .preview-block {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }

    .preview-block h3 {
      margin: 0 0 10px;
      font-size: 14px;
      color: var(--muted);
    }

    audio {
      width: 100%;
      margin-bottom: 8px;
    }

    .preview-url {
      font-size: 12px;
      color: var(--muted);
      word-break: break-all;
    }

    .loading {
      color: var(--muted);
      font-size: 14px;
    }

    .storage-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #1e2a3a;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 16px;
    }

    .storage-status strong {
      color: var(--text);
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="page">
    ${devBanner}

    <h1>EchoSpeak Audio Admin</h1>
    <p class="subtitle">Upload and preview lesson segment audio without curl.</p>
    <div id="storageStatus" class="storage-status" hidden>
      Storage: <strong id="storageProviderLabel">—</strong>
    </div>

    <div id="loading" class="loading">Loading catalog and registry…</div>

    <div id="app" hidden>
      <div class="card">
        <h2>Lesson &amp; Segment</h2>

        <div class="field-group">
          <label for="lessonSearch">Search lessons</label>
          <input id="lessonSearch" type="search" placeholder="Search by title, lessonId, category, or segment text…" />
          <div id="resultCount" class="result-count"></div>
        </div>

        <div class="field-group">
          <label for="lessonSelect">Lesson</label>
          <select id="lessonSelect"></select>
        </div>

        <div id="lessonMeta" class="lesson-meta" hidden></div>
        <div id="lessonSubtitle" class="lesson-subtitle" hidden></div>

        <div class="field-group">
          <label for="segmentSelect">Segment</label>
          <select id="segmentSelect"></select>
        </div>

        <label>Target text</label>
        <div id="segmentText" class="segment-text">—</div>
        <div id="segmentTranslation" class="segment-translation" hidden></div>

        <label>Current audio status</label>
        <div class="status-grid" id="statusGrid">
          <div class="status-item missing" data-type="natural"><span class="label">natural</span><span class="value">missing</span></div>
          <div class="status-item missing" data-type="slow"><span class="label">slow</span><span class="value">missing</span></div>
          <div class="status-item missing" data-type="native"><span class="label">native</span><span class="value">missing</span></div>
        </div>
      </div>

      <div class="card">
        <h2>Upload Audio</h2>

        <label>Audio type</label>
        <div class="radio-row">
          <label><input type="radio" name="audioType" value="natural" checked /> natural</label>
          <label><input type="radio" name="audioType" value="slow" /> slow</label>
          <label><input type="radio" name="audioType" value="native" /> native</label>
        </div>

        <label for="audioFile">Audio file (MP3, M4A, WAV — max 10 MB)</label>
        <input id="audioFile" type="file" accept=".mp3,.m4a,.wav,.mp4,audio/*" />

        <button id="uploadBtn" type="button">Upload</button>
        <div id="uploadMessage" class="message"></div>
      </div>

      <div class="card" id="previewCard" hidden>
        <h2>Audio Preview</h2>
        <div id="previewList"></div>
      </div>
    </div>
  </div>

  <script>
    const AUDIO_TYPES = ['natural', 'slow', 'native'];
    const URL_FIELDS = {
      natural: 'naturalAudioUrl',
      slow: 'slowAudioUrl',
      native: 'nativeAudioUrl',
    };

    function getAdminSecret() {
      return new URLSearchParams(window.location.search).get('adminSecret') || '';
    }

    function adminFetchHeaders() {
      const secret = getAdminSecret();
      if (!secret) return {};
      return { 'x-admin-secret': secret };
    }

    const CATEGORY_ORDER = [
      'daily',
      'cafe_restaurant',
      'travel',
      'job_interview',
      'series_english',
      'pronunciation',
      'custom',
    ];

    let allLessons = [];
    let filteredLessons = [];
    let registry = {};

    const loadingEl = document.getElementById('loading');
    const appEl = document.getElementById('app');
    const storageStatusEl = document.getElementById('storageStatus');
    const storageProviderLabelEl = document.getElementById('storageProviderLabel');
    const lessonSearch = document.getElementById('lessonSearch');
    const resultCountEl = document.getElementById('resultCount');
    const lessonSelect = document.getElementById('lessonSelect');
    const lessonMetaEl = document.getElementById('lessonMeta');
    const lessonSubtitleEl = document.getElementById('lessonSubtitle');
    const segmentSelect = document.getElementById('segmentSelect');
    const segmentTextEl = document.getElementById('segmentText');
    const segmentTranslationEl = document.getElementById('segmentTranslation');
    const statusGrid = document.getElementById('statusGrid');
    const audioFileInput = document.getElementById('audioFile');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadMessage = document.getElementById('uploadMessage');
    const previewCard = document.getElementById('previewCard');
    const previewList = document.getElementById('previewList');

    function getSelectedLesson() {
      return filteredLessons.find((lesson) => lesson.lessonId === lessonSelect.value)
        ?? allLessons.find((lesson) => lesson.lessonId === lessonSelect.value);
    }

    function normalizeSearch(value) {
      return value.trim().toLocaleLowerCase('en-US');
    }

    function lessonMatchesSearch(lesson, query) {
      if (!query) return true;

      const haystack = [
        lesson.title,
        lesson.lessonId,
        lesson.subtitle ?? '',
        lesson.category,
        lesson.categoryLabel ?? '',
        lesson.level ?? '',
        ...lesson.segments.map((segment) => segment.text),
        ...lesson.segments.map((segment) => segment.translationTr ?? ''),
        ...lesson.segments.map((segment) => segment.segmentId),
      ]
        .join(' ')
        .toLocaleLowerCase('en-US');

      return haystack.includes(query);
    }

    function applyLessonSearch() {
      const query = normalizeSearch(lessonSearch.value);
      filteredLessons = allLessons.filter((lesson) => lessonMatchesSearch(lesson, query));
      resultCountEl.textContent = query
        ? filteredLessons.length + ' of ' + allLessons.length + ' lessons'
        : allLessons.length + ' lessons';
      populateLessons(true);
    }

    function renderLessonMeta(lesson) {
      if (!lesson) {
        lessonMetaEl.hidden = true;
        lessonMetaEl.innerHTML = '';
        lessonSubtitleEl.hidden = true;
        lessonSubtitleEl.textContent = '';
        return;
      }

      const pills = [
        '<span class="meta-pill">' + (lesson.categoryLabel || lesson.category) + '</span>',
        '<span class="meta-pill ' + (lesson.isPremium ? 'premium' : 'free') + '">' +
          (lesson.isPremium ? 'Premium' : 'Free') +
        '</span>',
      ];

      if (lesson.level) {
        pills.push('<span class="meta-pill">' + lesson.level + '</span>');
      }

      lessonMetaEl.innerHTML = pills.join('');
      lessonMetaEl.hidden = false;

      if (lesson.subtitle) {
        lessonSubtitleEl.textContent = lesson.subtitle;
        lessonSubtitleEl.hidden = false;
      } else {
        lessonSubtitleEl.hidden = true;
        lessonSubtitleEl.textContent = '';
      }
    }

    function truncateText(text, maxLength) {
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength - 1) + '…';
    }

    function getSelectedSegment() {
      const lesson = getSelectedLesson();
      if (!lesson) return null;
      return lesson.segments.find((segment) => segment.segmentId === segmentSelect.value) ?? null;
    }

    function getRegistryEntry() {
      const lessonId = lessonSelect.value;
      const segmentId = segmentSelect.value;
      return registry?.[lessonId]?.[segmentId] ?? null;
    }

    function getSelectedAudioType() {
      const checked = document.querySelector('input[name="audioType"]:checked');
      return checked ? checked.value : 'natural';
    }

    function setMessage(el, type, text) {
      el.textContent = text;
      el.className = 'message show ' + type;
    }

    function clearMessage(el) {
      el.textContent = '';
      el.className = 'message';
    }

    function updateStatusGrid() {
      const entry = getRegistryEntry();
      statusGrid.querySelectorAll('.status-item').forEach((item) => {
        const type = item.dataset.type;
        const field = URL_FIELDS[type];
        const url = entry?.[field];
        const available = Boolean(url);
        item.classList.toggle('available', available);
        item.classList.toggle('missing', !available);
        item.querySelector('.value').textContent = available ? 'available' : 'missing';
      });
    }

    function renderPreview(extraUrl, extraType) {
      const entry = getRegistryEntry();
      const blocks = [];

      AUDIO_TYPES.forEach((type) => {
        const field = URL_FIELDS[type];
        let url = entry?.[field];
        if (extraType === type && extraUrl) {
          url = extraUrl;
        }
        if (!url) return;

        blocks.push(
          '<div class="preview-block">' +
            '<h3>' + type + '</h3>' +
            '<audio controls preload="none" src="' + url + '"></audio>' +
            '<div class="preview-url">' + url + '</div>' +
          '</div>'
        );
      });

      if (blocks.length === 0) {
        previewCard.hidden = true;
        previewList.innerHTML = '';
        return;
      }

      previewCard.hidden = false;
      previewList.innerHTML = blocks.join('');
    }

    function populateSegments() {
      const lesson = getSelectedLesson();
      segmentSelect.innerHTML = '';
      renderLessonMeta(lesson);

      if (!lesson) {
        segmentTextEl.textContent = '—';
        segmentTranslationEl.hidden = true;
        segmentTranslationEl.textContent = '';
        updateStatusGrid();
        renderPreview();
        return;
      }

      lesson.segments.forEach((segment) => {
        const option = document.createElement('option');
        option.value = segment.segmentId;
        option.textContent = segment.segmentId + ' — ' + truncateText(segment.text, 48);
        segmentSelect.appendChild(option);
      });

      updateSegmentDisplay();
    }

    function updateSegmentDisplay() {
      const segment = getSelectedSegment();
      segmentTextEl.textContent = segment?.text ?? '—';

      if (segment?.translationTr) {
        segmentTranslationEl.textContent = segment.translationTr;
        segmentTranslationEl.hidden = false;
      } else {
        segmentTranslationEl.hidden = true;
        segmentTranslationEl.textContent = '';
      }

      updateStatusGrid();
      renderPreview();
    }

    function populateLessons(preserveSelection) {
      const previousLessonId = preserveSelection ? lessonSelect.value : '';
      lessonSelect.innerHTML = '';

      if (filteredLessons.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No lessons match your search';
        lessonSelect.appendChild(option);
        renderLessonMeta(null);
        segmentSelect.innerHTML = '';
        segmentTextEl.textContent = '—';
        segmentTranslationEl.hidden = true;
        updateStatusGrid();
        renderPreview();
        return;
      }

      const grouped = new Map();
      filteredLessons.forEach((lesson) => {
        const key = lesson.category;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(lesson);
      });

      CATEGORY_ORDER.forEach((category) => {
        const lessons = grouped.get(category);
        if (!lessons || lessons.length === 0) return;

        const optgroup = document.createElement('optgroup');
        optgroup.label = (lessons[0].categoryLabel || category) + ' (' + lessons.length + ')';

        lessons.forEach((lesson) => {
          const option = document.createElement('option');
          option.value = lesson.lessonId;
          option.textContent = lesson.title + ' (' + lesson.lessonId + ')';
          optgroup.appendChild(option);
        });

        lessonSelect.appendChild(optgroup);
        grouped.delete(category);
      });

      grouped.forEach((lessons, category) => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = category + ' (' + lessons.length + ')';
        lessons.forEach((lesson) => {
          const option = document.createElement('option');
          option.value = lesson.lessonId;
          option.textContent = lesson.title + ' (' + lesson.lessonId + ')';
          optgroup.appendChild(option);
        });
        lessonSelect.appendChild(optgroup);
      });

      const hasPrevious = previousLessonId && filteredLessons.some((lesson) => lesson.lessonId === previousLessonId);
      lessonSelect.value = hasPrevious ? previousLessonId : filteredLessons[0].lessonId;
      populateSegments();
    }

    async function fetchStorageStatus() {
      const response = await fetch('/api/admin/audio/status', {
        headers: adminFetchHeaders(),
      });
      if (!response.ok) return;
      const payload = await response.json();
      if (!payload.ok) return;
      storageProviderLabelEl.textContent = payload.storageLabel || payload.storageProvider || '—';
      storageStatusEl.hidden = false;
    }

    async function fetchRegistry() {
      const response = await fetch('/api/audio/registry');
      if (!response.ok) throw new Error('registry fetch failed');
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.messageTr || 'invalid registry');
      registry = payload.audioRegistry ?? {};
    }

    async function fetchCatalog() {
      const response = await fetch('/api/admin/audio/catalog', {
        headers: adminFetchHeaders(),
      });
      if (!response.ok) throw new Error('catalog fetch failed');
      const payload = await response.json();
      if (!payload.ok) throw new Error('invalid catalog');
      allLessons = payload.lessons ?? payload.catalog ?? [];
      filteredLessons = allLessons.slice();
    }

    async function refreshRegistry() {
      await fetchRegistry();
      updateStatusGrid();
      renderPreview();
    }

    async function handleUpload() {
      clearMessage(uploadMessage);

      const lessonId = lessonSelect.value;
      const segmentId = segmentSelect.value;
      const audioType = getSelectedAudioType();
      const file = audioFileInput.files?.[0];

      if (!lessonId || !segmentId) {
        setMessage(uploadMessage, 'error', 'Select a lesson and segment first.');
        return;
      }

      if (!file) {
        setMessage(uploadMessage, 'error', 'Choose an audio file to upload.');
        return;
      }

      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Uploading…';

      try {
        const formData = new FormData();
        formData.append('audio', file);
        formData.append('lessonId', lessonId);
        formData.append('segmentId', segmentId);
        formData.append('audioType', audioType);

        const response = await fetch('/api/admin/audio/upload', {
          method: 'POST',
          headers: adminFetchHeaders(),
          body: formData,
        });

        const payload = await response.json();

        if (!response.ok || !payload.ok) {
          throw new Error(payload.messageTr || payload.errorCode || 'Upload failed');
        }

        setMessage(
          uploadMessage,
          'success',
          'Uploaded ' + payload.audioType + ' for ' + payload.lessonId + ' / ' + payload.segmentId +
            ' via ' + (payload.provider || 'unknown') + '. URL: ' + payload.audioUrl
        );

        await refreshRegistry();
        renderPreview(payload.audioUrl, payload.audioType);
        audioFileInput.value = '';
      } catch (error) {
        setMessage(
          uploadMessage,
          'error',
          error instanceof Error ? error.message : 'Upload failed'
        );
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload';
      }
    }

    lessonSelect.addEventListener('change', populateSegments);
    segmentSelect.addEventListener('change', updateSegmentDisplay);
    lessonSearch.addEventListener('input', applyLessonSearch);
    uploadBtn.addEventListener('click', handleUpload);

    (async function init() {
      try {
        await Promise.all([fetchCatalog(), fetchRegistry(), fetchStorageStatus()]);
        loadingEl.hidden = true;
        appEl.hidden = false;
        resultCountEl.textContent = allLessons.length + ' lessons';
        populateLessons(false);
      } catch (error) {
        loadingEl.textContent = 'Failed to load admin data: ' + (error instanceof Error ? error.message : 'unknown');
        loadingEl.style.color = '#e06c75';
      }
    })();
  </script>
</body>
</html>`;
}
