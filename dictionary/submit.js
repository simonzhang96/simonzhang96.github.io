(() => {
  'use strict';
  const config = window.WORD_SUBMISSION_CONFIG || {};
  const form = document.querySelector('#submission-form');
  const button = document.querySelector('#submit-button');
  const status = document.querySelector('#service-state');
  const result = document.querySelector('#result');
  const storageKey = 'zeksa-word-submission-draft-v1';
  form.addEventListener('submit', event => event.preventDefault());
  const fields = ['word', 'meaning', 'gloss', 'pos', 'root', 'affix', 'author', 'notes'];
  let sending = false, attempt = null;
  const values = () => Object.fromEntries(fields.map(key => [key, form.elements[key].value]));
  const showResult = (message, kind) => { result.textContent = message; result.dataset.kind = kind; };
  const updateButton = () => { button.disabled = sending; };
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify({ values: values(), attempt })); }
    catch { document.querySelector('#draft-note').textContent = '当前浏览器无法暂存草稿，请在离开页面前自行保存内容。'; }
  }
  try {
    const draft = JSON.parse(localStorage.getItem(storageKey));
    if (draft && typeof draft === 'object') {
      for (const key of fields) if (typeof draft.values?.[key] === 'string') form.elements[key].value = draft.values[key].slice(0, form.elements[key].maxLength);
      if (typeof draft.attempt?.id === 'string' && typeof draft.attempt?.snapshot === 'string') attempt = draft.attempt;
    }
  } catch { /* A blocked or obsolete local draft must not prevent submission. */ }
  form.addEventListener('input', () => {
    for (const key of ['word', 'meaning', 'pos']) form.elements[key].setCustomValidity('');
    persist();
  });
  let endpoint;
  try {
    endpoint = new URL(config.endpoint);
    if (endpoint.protocol !== 'https:' || endpoint.pathname !== '/submit') throw new Error();
  } catch {
    status.textContent = '投稿通道正在准备中，暂未开放提交。你可以先填写并保留草稿。';
    return;
  }
  status.textContent = '填写完成后即可提交。';
  updateButton();
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    for (const key of ['word', 'meaning', 'pos']) form.elements[key].setCustomValidity(form.elements[key].value.trim() ? '' : '请填写此项。');
    if (!form.reportValidity()) return;
    const data = values();
    const snapshot = JSON.stringify(data);
    if (!attempt || attempt.snapshot !== snapshot) attempt = { id: crypto.randomUUID(), snapshot };
    persist();
    const payload = { ...data, id: attempt.id, consent: form.elements.consent.checked };
    sending = true; updateButton();
    for (const element of form.elements) element.disabled = true;
    button.textContent = '正在保存，请稍候……';
    showResult('正在提交你的词汇，请保持页面打开。', 'pending');
    try {
      const response = await fetch(endpoint.href, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(90000), credentials: 'omit',
      });
      const saved = await response.json();
      if (!response.ok || saved.ok !== true || saved.id !== attempt.id) throw new Error(saved.error || '暂时无法确认保存结果，请重试。');
      showResult(`投稿成功，已进入投稿箱！Simon Zhang 会查看并挑选收录。投稿编号：${saved.id}`, 'success');
      form.reset(); attempt = null;
      try { localStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
    } catch (error) {
      const message = error.name === 'TypeError' || error.name === 'TimeoutError' || error.name === 'AbortError'
        ? '连接中断，暂时无法确认保存结果。内容已保留，请重试；相同投稿不会重复保存。'
        : error.message;
      showResult(message, 'error');
    } finally {
      sending = false;
      for (const element of form.elements) element.disabled = false;
      button.textContent = '提交词汇 ↗'; updateButton();
      status.textContent = '填写完成后即可提交。';
      result.focus();
    }
  });
})();
