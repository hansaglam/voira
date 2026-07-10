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
      max-width: 960px;
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

    .filter-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 14px;
    }

    .filter-row .field-group { margin-bottom: 0; }
    .filter-row select { margin-bottom: 0; }

    .counter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }

    .counter-item {
      background: #111822;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
    }

    .counter-item .label {
      display: block;
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }

    .counter-item .value {
      font-size: 20px;
      font-weight: 700;
    }

    .counter-item.missing .value { color: var(--warning); }
    .counter-item.completed .value { color: var(--success); }

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
    .meta-pill.audio-ok { color: var(--success); border-color: rgba(76, 175, 130, 0.4); }
    .meta-pill.audio-missing { color: var(--muted); border-color: rgba(139, 156, 179, 0.3); }

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

    button.secondary {
      background: #243044;
      border: 1px solid var(--border);
    }

    button.small {
      width: auto;
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 600;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }

    .action-row button { width: auto; flex: 1; min-width: 160px; }

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

    .catalog-diagnostics {
      background: #1e2a3a;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 13px;
      color: var(--muted);
      line-height: 1.6;
    }

    .catalog-diagnostics strong {
      color: var(--text);
      font-weight: 600;
    }

    .missing-list {
      max-height: 420px;
      overflow-y: auto;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #111822;
    }

    .missing-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      align-items: start;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
    }

    .missing-row:last-child { border-bottom: none; }
    .missing-row.selected { background: rgba(91, 159, 212, 0.12); }

    .missing-row-main { min-width: 0; }

    .missing-row-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .missing-row-ids {
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 6px;
      word-break: break-all;
    }

    .missing-row-text {
      font-size: 13px;
      color: var(--text);
      margin-bottom: 8px;
    }

    .missing-row-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .empty-state {
      padding: 24px 16px;
      text-align: center;
      color: var(--muted);
      font-size: 14px;
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
    <div id="catalogDiagnostics" class="catalog-diagnostics" hidden></div>

    <div id="loading" class="loading">Loading catalog and registry…</div>

    <div id="app" hidden>
      <div class="card">
        <h2>Audio Overview</h2>
        <div class="counter-grid" id="counterGrid">
          <div class="counter-item"><span class="label">Total segments</span><span class="value" id="counterTotal">—</span></div>
          <div class="counter-item missing"><span class="label">Natural missing</span><span class="value" id="counterNaturalMissing">—</span></div>
          <div class="counter-item missing"><span class="label">Slow missing</span><span class="value" id="counterSlowMissing">—</span></div>
          <div class="counter-item missing"><span class="label">Native missing</span><span class="value" id="counterNativeMissing">—</span></div>
          <div class="counter-item completed"><span class="label">Fully completed</span><span class="value" id="counterCompleted">—</span></div>
        </div>
      </div>

      <div class="card">
        <h2>Filters</h2>

        <div class="filter-row">
          <div class="field-group">
            <label for="audioStatusFilter">Audio status</label>
            <select id="audioStatusFilter">
              <option value="all">All segments</option>
              <option value="missing_any">Missing any audio</option>
              <option value="natural_missing" selected>Natural missing</option>
              <option value="slow_missing">Slow missing</option>
              <option value="native_missing">Native missing</option>
              <option value="natural_available">Natural available</option>
              <option value="fully_completed">Fully completed</option>
            </select>
          </div>

          <div class="field-group">
            <label for="priorityFilter">Priority</label>
            <select id="priorityFilter">
              <option value="all">All</option>
              <option value="free">Free only</option>
              <option value="premium">SpeakPlus only</option>
            </select>
          </div>

          <div class="field-group">
            <label for="categoryFilter">Category</label>
            <select id="categoryFilter">
              <option value="all">All categories</option>
              <option value="daily">Daily</option>
              <option value="cafe_restaurant">Cafe / Restaurant</option>
              <option value="travel">Travel</option>
              <option value="job_interview">Job Interview</option>
              <option value="pronunciation">Pronunciation</option>
              <option value="series_english">Series</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div class="field-group">
          <label for="segmentSearch">Search segments</label>
          <input id="segmentSearch" type="search" placeholder="Search by title, lessonId, category, segmentId, or target text…" />
          <div id="filterResultCount" class="result-count"></div>
        </div>

        <div class="action-row">
          <button id="nextMissingBtn" type="button" class="secondary">Sonraki eksik segment</button>
        </div>

        <h2 style="margin-top: 20px;">Missing segments list</h2>
        <div id="missingList" class="missing-list">
          <div class="empty-state">Loading…</div>
        </div>
      </div>

      <div class="card">
        <h2>Lesson &amp; Segment</h2>

        <div class="field-group">
          <label for="lessonSelect">Lesson</label>
          <select id="lessonSelect"></select>
        </div>

        <div id="lessonMeta" class="lesson-meta" hidden></div>
        <div id="lessonSubtitle" class="lesson-subtitle" hidden></div>

        <div class="field-group">
          <label for="segmentSelect">Segment (filtered)</label>
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

      <div class="card" id="uploadCard">
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

    const CATEGORY_ORDER = [
      'daily',
      'cafe_restaurant',
      'travel',
      'job_interview',
      'series_english',
      'pronunciation',
      'custom',
    ];

    const AUDIO_TYPE_DEFAULT_FILTER = {
      natural: 'natural_missing',
      slow: 'slow_missing',
      native: 'native_missing',
    };

    function getAdminSecret() {
      return new URLSearchParams(window.location.search).get('adminSecret') || '';
    }

    function adminFetchHeaders() {
      const secret = getAdminSecret();
      if (!secret) return {};
      return { 'x-admin-secret': secret };
    }

    let allLessons = [];
    let registry = {};
    let catalogMeta = null;
    let filteredSegmentRows = [];
    let selectedLessonId = '';
    let selectedSegmentId = '';

    const loadingEl = document.getElementById('loading');
    const appEl = document.getElementById('app');
    const storageStatusEl = document.getElementById('storageStatus');
    const storageProviderLabelEl = document.getElementById('storageProviderLabel');
    const catalogDiagnosticsEl = document.getElementById('catalogDiagnostics');
    const counterTotalEl = document.getElementById('counterTotal');
    const counterNaturalMissingEl = document.getElementById('counterNaturalMissing');
    const counterSlowMissingEl = document.getElementById('counterSlowMissing');
    const counterNativeMissingEl = document.getElementById('counterNativeMissing');
    const counterCompletedEl = document.getElementById('counterCompleted');
    const audioStatusFilterEl = document.getElementById('audioStatusFilter');
    const priorityFilterEl = document.getElementById('priorityFilter');
    const categoryFilterEl = document.getElementById('categoryFilter');
    const segmentSearchEl = document.getElementById('segmentSearch');
    const filterResultCountEl = document.getElementById('filterResultCount');
    const nextMissingBtn = document.getElementById('nextMissingBtn');
    const missingListEl = document.getElementById('missingList');
    const lessonSelect = document.getElementById('lessonSelect');
    const lessonMetaEl = document.getElementById('lessonMeta');
    const lessonSubtitleEl = document.getElementById('lessonSubtitle');
    const segmentSelect = document.getElementById('segmentSelect');
    const segmentTextEl = document.getElementById('segmentText');
    const segmentTranslationEl = document.getElementById('segmentTranslation');
    const statusGrid = document.getElementById('statusGrid');
    const uploadCardEl = document.getElementById('uploadCard');
    const audioFileInput = document.getElementById('audioFile');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadMessage = document.getElementById('uploadMessage');
    const previewCard = document.getElementById('previewCard');
    const previewList = document.getElementById('previewList');

    function normalizeSearch(value) {
      return value.trim().toLocaleLowerCase('en-US');
    }

    function getSegmentStatus(lessonId, segmentId) {
      const entry = registry?.[lessonId]?.[segmentId] ?? {};
      return {
        natural: Boolean(entry.naturalAudioUrl),
        slow: Boolean(entry.slowAudioUrl),
        native: Boolean(entry.nativeAudioUrl),
      };
    }

    function flattenAllSegments() {
      const rows = [];
      allLessons.forEach((lesson) => {
        lesson.segments.forEach((segment) => {
          rows.push({
            lessonId: lesson.lessonId,
            segmentId: segment.segmentId,
            text: segment.text,
            translationTr: segment.translationTr ?? '',
            title: lesson.title,
            subtitle: lesson.subtitle ?? '',
            category: lesson.category,
            categoryLabel: lesson.categoryLabel ?? lesson.category,
            isPremium: lesson.isPremium,
            level: lesson.level ?? '',
            status: getSegmentStatus(lesson.lessonId, segment.segmentId),
          });
        });
      });
      return rows;
    }

    function computeGlobalCounters() {
      const rows = flattenAllSegments();
      let naturalMissing = 0;
      let slowMissing = 0;
      let nativeMissing = 0;
      let completed = 0;

      rows.forEach((row) => {
        if (!row.status.natural) naturalMissing += 1;
        if (!row.status.slow) slowMissing += 1;
        if (!row.status.native) nativeMissing += 1;
        if (row.status.natural && row.status.slow && row.status.native) completed += 1;
      });

      return {
        total: rows.length,
        naturalMissing,
        slowMissing,
        nativeMissing,
        completed,
      };
    }

    function renderCatalogDiagnostics() {
      if (!catalogMeta) {
        catalogDiagnosticsEl.hidden = true;
        catalogDiagnosticsEl.textContent = '';
        return;
      }

      const counters = computeGlobalCounters();
      const sourceLabel = catalogMeta.source === 'live' ? 'live mobile catalog' : 'snapshot file';
      const generatedAt = catalogMeta.generatedAt
        ? ' · snapshot: ' + new Date(catalogMeta.generatedAt).toLocaleString()
        : '';

      catalogDiagnosticsEl.innerHTML =
        'Catalog source: <strong>' + sourceLabel + '</strong>' + generatedAt + '<br />' +
        'Lessons loaded: <strong>' + catalogMeta.totalLessons + '</strong> · ' +
        'Segments loaded: <strong>' + catalogMeta.totalSegments + '</strong> · ' +
        'Production lessons: <strong>' + catalogMeta.productionLessons + '</strong> · ' +
        'Production segments: <strong>' + catalogMeta.productionSegments + '</strong> · ' +
        'Natural missing: <strong>' + counters.naturalMissing + '</strong>';
      catalogDiagnosticsEl.hidden = false;
    }

    function renderGlobalCounters() {
      const counters = computeGlobalCounters();
      counterTotalEl.textContent = String(counters.total);
      counterNaturalMissingEl.textContent = String(counters.naturalMissing);
      counterSlowMissingEl.textContent = String(counters.slowMissing);
      counterNativeMissingEl.textContent = String(counters.nativeMissing);
      counterCompletedEl.textContent = String(counters.completed);
      renderCatalogDiagnostics();
    }

    function matchesAudioStatusFilter(status, filterKey) {
      switch (filterKey) {
        case 'all':
          return true;
        case 'missing_any':
          return !status.natural || !status.slow || !status.native;
        case 'natural_missing':
          return !status.natural;
        case 'slow_missing':
          return !status.slow;
        case 'native_missing':
          return !status.native;
        case 'natural_available':
          return status.natural;
        case 'fully_completed':
          return status.natural && status.slow && status.native;
        default:
          return true;
      }
    }

    function matchesPriorityFilter(row, filterKey) {
      if (filterKey === 'all') return true;
      if (filterKey === 'free') return !row.isPremium;
      if (filterKey === 'premium') return row.isPremium;
      return true;
    }

    function matchesCategoryFilter(row, filterKey) {
      if (filterKey === 'all') return true;
      return row.category === filterKey;
    }

    function segmentRowMatchesSearch(row, query) {
      if (!query) return true;

      const haystack = [
        row.title,
        row.lessonId,
        row.subtitle,
        row.category,
        row.categoryLabel,
        row.level,
        row.segmentId,
        row.text,
        row.translationTr,
      ]
        .join(' ')
        .toLocaleLowerCase('en-US');

      return haystack.includes(query);
    }

    function getFilteredSegmentRows() {
      const audioFilter = audioStatusFilterEl.value;
      const priorityFilter = priorityFilterEl.value;
      const categoryFilter = categoryFilterEl.value;
      const query = normalizeSearch(segmentSearchEl.value);

      return flattenAllSegments().filter((row) => {
        if (!matchesAudioStatusFilter(row.status, audioFilter)) return false;
        if (!matchesPriorityFilter(row, priorityFilter)) return false;
        if (!matchesCategoryFilter(row, categoryFilter)) return false;
        if (!segmentRowMatchesSearch(row, query)) return false;
        return true;
      });
    }

    function getLessonById(lessonId) {
      return allLessons.find((lesson) => lesson.lessonId === lessonId) ?? null;
    }

    function getSelectedLesson() {
      return getLessonById(selectedLessonId);
    }

    function getSelectedSegment() {
      const lesson = getSelectedLesson();
      if (!lesson) return null;
      return lesson.segments.find((segment) => segment.segmentId === selectedSegmentId) ?? null;
    }

    function getRegistryEntry() {
      return registry?.[selectedLessonId]?.[selectedSegmentId] ?? null;
    }

    function getSelectedAudioType() {
      const checked = document.querySelector('input[name="audioType"]:checked');
      return checked ? checked.value : 'natural';
    }

    function segmentMatchesCurrentFilter(lessonId, segmentId) {
      const lesson = getLessonById(lessonId);
      if (!lesson) return false;
      const segment = lesson.segments.find((item) => item.segmentId === segmentId);
      if (!segment) return false;

      const row = {
        lessonId,
        segmentId,
        text: segment.text,
        translationTr: segment.translationTr ?? '',
        title: lesson.title,
        subtitle: lesson.subtitle ?? '',
        category: lesson.category,
        categoryLabel: lesson.categoryLabel ?? lesson.category,
        isPremium: lesson.isPremium,
        level: lesson.level ?? '',
        status: getSegmentStatus(lessonId, segmentId),
      };

      const audioFilter = audioStatusFilterEl.value;
      const priorityFilter = priorityFilterEl.value;
      const categoryFilter = categoryFilterEl.value;
      const query = normalizeSearch(segmentSearchEl.value);

      if (!matchesAudioStatusFilter(row.status, audioFilter)) return false;
      if (!matchesPriorityFilter(row, priorityFilter)) return false;
      if (!matchesCategoryFilter(row, categoryFilter)) return false;
      if (!segmentRowMatchesSearch(row, query)) return false;
      return true;
    }

    function setMessage(el, type, text) {
      el.textContent = text;
      el.className = 'message show ' + type;
    }

    function clearMessage(el) {
      el.textContent = '';
      el.className = 'message';
    }

    function truncateText(text, maxLength) {
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength - 1) + '…';
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function renderAudioBadge(type, available) {
      const cls = available ? 'audio-ok' : 'audio-missing';
      const label = type + ': ' + (available ? '✓' : '—');
      return '<span class="meta-pill ' + cls + '">' + label + '</span>';
    }

    function renderMissingList() {
      if (filteredSegmentRows.length === 0) {
        missingListEl.innerHTML = '<div class="empty-state">Bu filtrede eksik ses kalmadı.</div>';
        return;
      }

      missingListEl.innerHTML = filteredSegmentRows.map((row) => {
        const isSelected = row.lessonId === selectedLessonId && row.segmentId === selectedSegmentId;
        const priorityLabel = row.isPremium ? 'SpeakPlus' : 'Free';
        const priorityClass = row.isPremium ? 'premium' : 'free';

        return (
          '<div class="missing-row' + (isSelected ? ' selected' : '') + '" data-lesson-id="' + escapeHtml(row.lessonId) + '" data-segment-id="' + escapeHtml(row.segmentId) + '">' +
            '<div class="missing-row-main">' +
              '<div class="missing-row-title">' + escapeHtml(row.title) + '</div>' +
              '<div class="missing-row-ids">' + escapeHtml(row.lessonId) + ' · ' + escapeHtml(row.segmentId) + '</div>' +
              '<div class="missing-row-text">' + escapeHtml(row.text) + '</div>' +
              '<div class="missing-row-badges">' +
                '<span class="meta-pill ' + priorityClass + '">' + priorityLabel + '</span>' +
                '<span class="meta-pill">' + escapeHtml(row.categoryLabel) + '</span>' +
                renderAudioBadge('natural', row.status.natural) +
                renderAudioBadge('slow', row.status.slow) +
                renderAudioBadge('native', row.status.native) +
              '</div>' +
            '</div>' +
            '<button type="button" class="small select-segment-btn">Select</button>' +
          '</div>'
        );
      }).join('');

      missingListEl.querySelectorAll('.select-segment-btn').forEach((button) => {
        button.addEventListener('click', (event) => {
          const rowEl = event.currentTarget.closest('.missing-row');
          if (!rowEl) return;
          selectSegmentByIds(rowEl.dataset.lessonId, rowEl.dataset.segmentId, true);
        });
      });
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
        '<span class="meta-pill">' + escapeHtml(lesson.categoryLabel || lesson.category) + '</span>',
        '<span class="meta-pill ' + (lesson.isPremium ? 'premium' : 'free') + '">' +
          (lesson.isPremium ? 'SpeakPlus' : 'Free') +
        '</span>',
      ];

      if (lesson.level) {
        pills.push('<span class="meta-pill">' + escapeHtml(lesson.level) + '</span>');
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
            '<audio controls preload="none" src="' + escapeHtml(url) + '"></audio>' +
            '<div class="preview-url">' + escapeHtml(url) + '</div>' +
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

    function getFilteredRowsForLesson(lessonId) {
      return filteredSegmentRows.filter((row) => row.lessonId === lessonId);
    }

    function populateLessons(preserveSelection) {
      const lessonIds = [...new Set(filteredSegmentRows.map((row) => row.lessonId))];
      const lessonsForDropdown = lessonIds
        .map((lessonId) => getLessonById(lessonId))
        .filter(Boolean);

      lessonSelect.innerHTML = '';

      if (lessonsForDropdown.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No lessons match current filters';
        lessonSelect.appendChild(option);
        selectedLessonId = '';
        selectedSegmentId = '';
        renderLessonMeta(null);
        populateSegments();
        return;
      }

      const grouped = new Map();
      lessonsForDropdown.forEach((lesson) => {
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

      const hasPrevious = preserveSelection && lessonIds.includes(selectedLessonId);
      selectedLessonId = hasPrevious ? selectedLessonId : lessonsForDropdown[0].lessonId;
      lessonSelect.value = selectedLessonId;
      populateSegments(preserveSelection);
    }

    function populateSegments(preserveSelection) {
      const lesson = getSelectedLesson();
      renderLessonMeta(lesson);
      segmentSelect.innerHTML = '';

      if (!lesson) {
        selectedSegmentId = '';
        segmentTextEl.textContent = '—';
        segmentTranslationEl.hidden = true;
        segmentTranslationEl.textContent = '';
        updateStatusGrid();
        renderPreview();
        return;
      }

      const rows = getFilteredRowsForLesson(lesson.lessonId);

      if (rows.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No segments match current filters';
        segmentSelect.appendChild(option);
        selectedSegmentId = '';
        segmentTextEl.textContent = '—';
        segmentTranslationEl.hidden = true;
        segmentTranslationEl.textContent = '';
        updateStatusGrid();
        renderPreview();
        return;
      }

      rows.forEach((row) => {
        const option = document.createElement('option');
        option.value = row.segmentId;
        option.textContent = row.segmentId + ' — ' + truncateText(row.text, 48);
        segmentSelect.appendChild(option);
      });

      const segmentIds = rows.map((row) => row.segmentId);
      const hasPrevious = preserveSelection && segmentIds.includes(selectedSegmentId);
      selectedSegmentId = hasPrevious ? selectedSegmentId : rows[0].segmentId;
      segmentSelect.value = selectedSegmentId;
      updateSegmentDisplay();
    }

    function updateSegmentDisplay() {
      selectedSegmentId = segmentSelect.value || selectedSegmentId;
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
      renderMissingList();
    }

    function selectSegmentByIds(lessonId, segmentId, scrollToUpload) {
      selectedLessonId = lessonId;
      selectedSegmentId = segmentId;

      if (lessonSelect.querySelector('option[value="' + lessonId + '"]')) {
        lessonSelect.value = lessonId;
      } else {
        populateLessons(true);
      }

      populateSegments(true);

      if (segmentSelect.querySelector('option[value="' + segmentId + '"]')) {
        segmentSelect.value = segmentId;
        selectedSegmentId = segmentId;
      }

      updateSegmentDisplay();

      if (scrollToUpload && uploadCardEl) {
        uploadCardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    function findNextMatchingSegmentRow(startAfterCurrent) {
      if (filteredSegmentRows.length === 0) return null;

      const currentIndex = filteredSegmentRows.findIndex(
        (row) => row.lessonId === selectedLessonId && row.segmentId === selectedSegmentId
      );

      if (currentIndex === -1) {
        return filteredSegmentRows[0];
      }

      if (!startAfterCurrent) {
        return filteredSegmentRows[currentIndex];
      }

      const nextIndex = currentIndex + 1;
      if (nextIndex < filteredSegmentRows.length) {
        return filteredSegmentRows[nextIndex];
      }

      return null;
    }

    function selectNextMissingSegment(scrollToUpload) {
      const nextRow = findNextMatchingSegmentRow(true);
      if (!nextRow) {
        setMessage(uploadMessage, 'error', 'Bu filtrede başka eşleşen segment kalmadı.');
        return false;
      }

      selectSegmentByIds(nextRow.lessonId, nextRow.segmentId, scrollToUpload);
      clearMessage(uploadMessage);
      return true;
    }

    function applyFilters(preserveSelection) {
      filteredSegmentRows = getFilteredSegmentRows();
      renderGlobalCounters();

      const query = normalizeSearch(segmentSearchEl.value);
      filterResultCountEl.textContent = query || audioStatusFilterEl.value !== 'all' || priorityFilterEl.value !== 'all' || categoryFilterEl.value !== 'all'
        ? filteredSegmentRows.length + ' matching segments'
        : filteredSegmentRows.length + ' segments';

      nextMissingBtn.disabled = filteredSegmentRows.length === 0;

      const stillMatches = selectedLessonId && selectedSegmentId
        && segmentMatchesCurrentFilter(selectedLessonId, selectedSegmentId);

      if (!stillMatches) {
        if (filteredSegmentRows.length > 0) {
          selectedLessonId = filteredSegmentRows[0].lessonId;
          selectedSegmentId = filteredSegmentRows[0].segmentId;
        } else {
          selectedLessonId = '';
          selectedSegmentId = '';
        }
      }

      populateLessons(preserveSelection !== false);
      renderMissingList();
    }

    function syncAudioFilterToAudioType() {
      const audioType = getSelectedAudioType();
      const nextFilter = AUDIO_TYPE_DEFAULT_FILTER[audioType];
      if (nextFilter && audioStatusFilterEl.value !== nextFilter) {
        audioStatusFilterEl.value = nextFilter;
      }
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
      catalogMeta = payload.meta ?? null;
      renderCatalogDiagnostics();
    }

    async function refreshRegistry() {
      await fetchRegistry();
      renderGlobalCounters();
      filteredSegmentRows = getFilteredSegmentRows();
      updateStatusGrid();
      renderPreview();
      renderMissingList();
    }

    async function handleUpload() {
      clearMessage(uploadMessage);

      const lessonId = selectedLessonId;
      const segmentId = selectedSegmentId;
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

        await refreshRegistry();
        renderPreview(payload.audioUrl, payload.audioType);
        audioFileInput.value = '';

        const stillMatches = segmentMatchesCurrentFilter(lessonId, segmentId);
        if (stillMatches) {
          setMessage(
            uploadMessage,
            'success',
            'Ses yüklendi.'
          );
        } else {
          const advanced = selectNextMissingSegment(false);
          if (advanced) {
            setMessage(uploadMessage, 'success', 'Ses yüklendi. Sıradaki eksik segmente geçildi.');
          } else {
            applyFilters(true);
            setMessage(uploadMessage, 'success', 'Ses yüklendi.');
          }
        }
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

    lessonSelect.addEventListener('change', () => {
      selectedLessonId = lessonSelect.value;
      populateSegments(false);
    });

    segmentSelect.addEventListener('change', () => {
      selectedSegmentId = segmentSelect.value;
      updateSegmentDisplay();
    });

    audioStatusFilterEl.addEventListener('change', () => applyFilters(true));
    priorityFilterEl.addEventListener('change', () => applyFilters(true));
    categoryFilterEl.addEventListener('change', () => applyFilters(true));
    segmentSearchEl.addEventListener('input', () => applyFilters(true));

    document.querySelectorAll('input[name="audioType"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        syncAudioFilterToAudioType();
        applyFilters(true);
      });
    });

    nextMissingBtn.addEventListener('click', () => {
      selectNextMissingSegment(true);
    });

    uploadBtn.addEventListener('click', handleUpload);

    (async function init() {
      try {
        await Promise.all([fetchCatalog(), fetchRegistry(), fetchStorageStatus()]);
        loadingEl.hidden = true;
        appEl.hidden = false;
        syncAudioFilterToAudioType();
        applyFilters(false);
      } catch (error) {
        loadingEl.textContent = 'Failed to load admin data: ' + (error instanceof Error ? error.message : 'unknown');
        loadingEl.style.color = '#e06c75';
      }
    })();
  </script>
</body>
</html>`;
}
