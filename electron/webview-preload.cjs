const { ipcRenderer } = require('electron');

function getFieldLabel(input) {
  const form = input.form;
  const explicitLabel = input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`) : null;
  if (explicitLabel?.textContent) return explicitLabel.textContent.trim();
  if (input.getAttribute('aria-label')) return input.getAttribute('aria-label').trim();
  if (input.placeholder) return input.placeholder.trim();
  if (input.name) return input.name.trim();
  if (form) {
    const index = Array.from(form.elements).indexOf(input);
    return index >= 0 ? `field-${index}` : '';
  }
  return '';
}

function findUsernameField(form, passwordField) {
  const candidates = Array.from(form.querySelectorAll('input'))
    .filter((input) => ['text', 'email', 'tel', 'url', 'number', ''].includes((input.type || '').toLowerCase()))
    .filter((input) => !input.disabled && !input.readOnly);
  const beforePassword = candidates.filter((input) => input.compareDocumentPosition(passwordField) & Node.DOCUMENT_POSITION_FOLLOWING);
  return beforePassword.at(-1) || candidates.at(-1) || null;
}

function captureForm(form) {
  const passwordField = form.querySelector('input[type="password"]');
  if (!passwordField?.value) return;
  const usernameField = findUsernameField(form, passwordField);
  const username = usernameField?.value || '';
  if (!username) return;

  ipcRenderer.sendToHost('credential-captured', {
    origin: location.origin,
    url: location.href,
    username,
    password: passwordField.value,
    usernameLabel: usernameField ? getFieldLabel(usernameField) : '',
    passwordLabel: getFieldLabel(passwordField)
  });
}

window.addEventListener('submit', (event) => {
  if (event.target instanceof HTMLFormElement) captureForm(event.target);
}, true);

window.addEventListener('click', (event) => {
  const button = event.target?.closest?.('button,input[type="submit"],input[type="button"]');
  if (!button) return;
  const form = button.form || button.closest('form');
  if (form) setTimeout(() => captureForm(form), 0);
}, true);

window.addEventListener('keydown', (event) => {
  const isZoomIn = event.ctrlKey && (event.key === '=' || event.key === '+');
  const isZoomOut = event.ctrlKey && event.key === '-';
  const isZoomReset = event.ctrlKey && event.key === '0';
  const isFullscreen = event.key === 'F11';

  if (isZoomIn || isZoomOut || isZoomReset || isFullscreen) {
    event.preventDefault();
    ipcRenderer.sendToHost('webview-keydown', {
      key: event.key,
      ctrlKey: event.ctrlKey
    });
  }
}, true);
