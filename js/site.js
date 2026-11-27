// Progressive enhancement: all content and links work without JavaScript.
const toggle = document.querySelector('[aria-controls="mobile-menu"]');
const menu = document.querySelector('#mobile-menu');
toggle?.addEventListener('click', () => {
  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!expanded));
  menu.hidden = expanded;
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
    toggle.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    toggle.focus();
  }
});

document.querySelector('#message-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  const subject = 'Demande de contact — ' + fields.get('name');
  const body = `${fields.get('message')}\n\n${fields.get('name')}\nTéléphone : ${fields.get('phone')}\nCourriel : ${fields.get('email')}`;
  window.location.href = `mailto:sebocchipnose@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  document.querySelector('#form-status').textContent = 'Votre messagerie doit s’ouvrir avec un brouillon. Le message sera envoyé seulement après votre confirmation dans cette application.';
});
