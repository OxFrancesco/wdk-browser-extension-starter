const params = new URLSearchParams(window.location.search);
const id = params.get('id') ?? '';

const title = document.getElementById('title');
const origin = document.getElementById('origin');
const description = document.getElementById('description');
const network = document.getElementById('network');
const address = document.getElementById('address');
const payload = document.getElementById('payload');
const approve = document.getElementById('approve');
const reject = document.getElementById('reject');

async function send(message) {
  return chrome.runtime.sendMessage(message);
}

async function requestOrigins(origins) {
  if (!origins?.length) return true;

  const granted = await new Promise((resolve) => {
    chrome.permissions.request({ origins }, resolve);
  });
  if (granted) return true;

  return new Promise((resolve) => {
    chrome.permissions.contains({ origins }, resolve);
  });
}

async function resolve(approved, request) {
  if (approved && !(await requestOrigins(request?.permissionOrigins))) {
    description.textContent = 'The requested RPC host permission was not granted.';
    approve.disabled = true;
    return;
  }

  await send({ type: 'dapp:approval:resolve', id, approved });
  window.close();
}

async function load() {
  const response = await send({ type: 'dapp:approval:get', id });
  if (!response?.ok || !response.data) {
    title.textContent = 'Request unavailable';
    origin.textContent = 'This request expired or was already handled.';
    description.textContent = 'Close this window and retry from the website.';
    approve.disabled = true;
    reject.textContent = 'Close';
    reject.addEventListener('click', () => window.close());
    return;
  }

  const request = response.data;
  title.textContent = request.title;
  origin.textContent = request.origin;
  description.textContent = request.description;
  network.textContent = request.chainLabel ?? '-';
  address.textContent = request.address ?? '-';

  if (request.payload) {
    payload.hidden = false;
    payload.textContent = request.payload;
  }

  approve.addEventListener('click', () => resolve(true, request));
  reject.addEventListener('click', () => resolve(false, request));
}

load().catch(() => {
  title.textContent = 'Request unavailable';
  origin.textContent = 'Unable to load wallet request.';
  approve.disabled = true;
  reject.textContent = 'Close';
  reject.addEventListener('click', () => window.close());
});
