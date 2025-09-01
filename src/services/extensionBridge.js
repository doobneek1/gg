// Utility to notify an external script/extension about auth status
// It listens to Amplify Auth Hub events and posts a signal to the page.
import { Auth, Hub } from 'aws-amplify';
import config from '../config';

let initialized = false;

const EVENT_TYPE = 'streetlives.auth';
const EVENT_SOURCE = 'streetlives-web';

function broadcastAuthStatus(isAuthenticated) {
  try {
    const payload = {
      source: EVENT_SOURCE,
      type: EVENT_TYPE,
      isAuthenticated: !!isAuthenticated,
      // timestamp helps debouncing on the listener side
      ts: Date.now(),
    };

    // window.postMessage is the most robust channel for extensions/content scripts
    window.postMessage(payload, '*');

    // Also emit a CustomEvent for scripts injected directly into the page
    try {
      const evt = new CustomEvent(EVENT_TYPE, { detail: payload });
      window.dispatchEvent(evt);
      document.dispatchEvent(evt);
    } catch (_) {
      // Ignore if CustomEvent is not available (older browsers)
    }
  } catch (_) {
    // Swallow any unexpected errors to avoid breaking the app
  }
}

async function emitInitialStatus() {
  if (config.disableAuth) {
    // When auth is disabled, treat as authenticated for extension purposes
    broadcastAuthStatus(true);
    return;
    }
  try {
    await Auth.currentAuthenticatedUser();
    broadcastAuthStatus(true);
  } catch (_) {
    broadcastAuthStatus(false);
  }
}

export function initExtensionBridge() {
  if (initialized) return;
  initialized = true;

  // Emit status right away on startup
  emitInitialStatus();

  // Listen for Amplify Auth events and broadcast status changes
  Hub.listen('auth', ({ payload }) => {
    const { event } = payload || {};
    switch (event) {
      case 'signIn':
      case 'cognitoHostedUI':
      case 'autoSignIn':
      case 'tokenRefresh':
        broadcastAuthStatus(true);
        break;
      case 'signOut':
      case 'autoSignIn_failure':
      case 'signIn_failure':
      case 'cognitoHostedUI_failure':
        broadcastAuthStatus(false);
        break;
      default:
        // no-op for events we don't care about
        break;
    }
  });
}

export function notifyExtensionAuthenticated() {
  broadcastAuthStatus(true);
}

export function notifyExtensionSignedOut() {
  broadcastAuthStatus(false);
}

