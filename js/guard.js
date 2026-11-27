/* Casual, client-side access gate only. Static files are not server-protected.
   Only the access flag is stored for this tab; questionnaire answers never are. */
(function () {
  'use strict';
  const key = 'hypnosite.access.v1';
  const isGate = document.documentElement.hasAttribute('data-access-page');
  const unlocked = () => { try { return sessionStorage.getItem(key) === 'granted'; } catch { return false; } };
  function destination() {
    const next = new URLSearchParams(location.search).get('next') || 'index.html';
    // Only a local HTML filename and its query/hash may be returned to.
    return /^[a-z0-9-]+\.html(?:[?#][^\r\n]*)?$/.test(next) && !next.startsWith('acces.html') ? next : 'index.html';
  }
  if (!isGate) {
    if (unlocked()) document.documentElement.setAttribute('data-unlocked', '');
    else {
      const page = location.pathname.split('/').pop() || 'index.html';
      location.replace('acces.html?next=' + encodeURIComponent(page + location.search + location.hash));
    }
  }
  window.addEventListener('pageshow', event => {
    if (event.persisted && !isGate && !unlocked()) {
      document.documentElement.removeAttribute('data-unlocked');
      location.replace('acces.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search));
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    if (isGate) {
      const form = document.querySelector('#access-form');
      form.addEventListener('submit', event => {
        event.preventDefault();
        const input = form.elements.password;
        const message = document.querySelector('#access-error');
        if (input.value !== 'SebRocks!2026') {
          message.textContent = 'Ce mot de passe n’est pas correct. Réessayez.';
          input.setAttribute('aria-invalid', 'true'); input.focus(); return;
        }
        try { sessionStorage.setItem(key, 'granted'); }
        catch { message.textContent = 'Autorisez le stockage de session de votre navigateur pour ouvrir le cabinet. Aucune réponse de questionnaire ne sera enregistrée.'; return; }
        input.value = '';
        location.replace(destination());
      });
      document.querySelector('#show-password').addEventListener('change', event => {
        form.elements.password.type = event.target.checked ? 'text' : 'password';
      });
    }
    document.addEventListener('click', event => {
      if (!event.target.closest('[data-lock]')) return;
      try { sessionStorage.removeItem(key); } catch {}
      location.replace('acces.html');
    });
  });
})();
