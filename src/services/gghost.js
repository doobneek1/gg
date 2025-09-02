// Minimal gghost integration for the Streetlives web app
// Exposes a small API on window.gghost used by the doobneek extension.

const DEFAULT_NOTE_API = 'https://locationnote-iygwucy2fa-uc.a.run.app';
const DEFAULT_BASE_URL = 'https://doobneek-fe7b7-default-rtdb.firebaseio.com/';

export function initGghost() {
  if (typeof window === 'undefined') return;
  const noteApi = process.env.REACT_APP_NOTE_API_URL || DEFAULT_NOTE_API;
  const baseUrl = process.env.REACT_APP_GGHOST_BASE_URL || DEFAULT_BASE_URL;

  const gghost = window.gghost || {};
  gghost.NOTE_API = noteApi;
  gghost.baseURL = baseUrl;

  // Optional hook used by the extension; dispatch a custom event that
  // in-page scripts can listen for to refresh any embedded UIs.
  if (typeof gghost.refreshYourPeerEmbed !== 'function') {
    gghost.refreshYourPeerEmbed = () => {
      try {
        const ev = new CustomEvent('gghost:refresh-embed');
        window.dispatchEvent(ev);
      } catch (_) {
        // ignore
      }
    };
  }

  window.gghost = gghost;
}

export default { initGghost };

