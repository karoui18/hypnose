(function () {
  'use strict';
  let dialog;
  let opener;
  function getDialog() {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'victorian-dialog';
    dialog.setAttribute('aria-labelledby', 'questionnaire-modal-title');
    dialog.innerHTML = `<div class="dialog-inner"><button type="button" class="dialog-close" aria-label="Fermer la fenêtre">Fermer</button><p class="eyebrow">Le Cabinet d’Hypnose</p><h2 id="questionnaire-modal-title"></h2><img class="ornament" src="assets/courbe-art-nouveau-ae508b87.jpg" alt=""><p>Ouvrez le questionnaire ici, ou scannez ce code avec votre téléphone.</p><div class="qr-code" role="img" aria-label="Code QR vers le questionnaire"></div><p class="qr-note"></p><a class="ink-button questionnaire-open">Accéder au questionnaire</a><p class="privacy-note">Vos réponses restent dans cette page et ne sont ni enregistrées ni envoyées. Le mot de passe du cabinet est également demandé sur un autre appareil.</p></div>`;
    document.body.append(dialog);
    dialog.addEventListener('close', () => opener?.focus({preventScroll: true}));
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const box = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
    });
    return dialog;
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('a[data-questionnaire]');
    if (!trigger || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const questionnaire = window.HypnoQuestionnaires.find(q => q.id === trigger.dataset.questionnaire);
    if (!questionnaire) return;
    event.preventDefault();
    opener = trigger;
    const modal = getDialog();
    const url = new URL(trigger.getAttribute('href'), location.href).href;
    modal.querySelector('h2').textContent = questionnaire.title;
    modal.querySelector('.questionnaire-open').href = url;
    const qr = modal.querySelector('.qr-code');
    qr.replaceChildren(); qr.dataset.url = url;
    try {
      const code = qrcode(0, 'M');
      code.addData(url, 'Byte'); code.make();
      qr.innerHTML = code.createSvgTag({cellSize: 5, margin: 20, scalable: true});
    } catch {
      qr.textContent = 'Le code QR n’est pas disponible. Utilisez le bouton ci-dessous.';
    }
    modal.querySelector('.qr-note').textContent = location.protocol === 'file:' || ['localhost', '127.0.0.1', '::1'].includes(location.hostname)
      ? 'Aperçu local : ce lien ne sera accessible sur un téléphone qu’avec une adresse publiée ou une adresse réseau accessible.'
      : 'Le code QR et le bouton ouvrent exactement le même questionnaire.';
    modal.showModal();
  });
})();
