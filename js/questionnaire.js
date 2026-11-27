(function () {
  'use strict';
  const host = document.querySelector('#questionnaire-app');
  const id = new URLSearchParams(location.search).get('id');
  const q = window.HypnoQuestionnaires.find(item => item.id === id);
  const escape = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  if (!q) {
    host.innerHTML = '<h1>Questionnaire introuvable</h1><p>Choisissez un questionnaire dans le cabinet.</p><a class="ink-button" href="tests.html">Voir les questionnaires</a>';
    return;
  }
  document.title = q.title + ' — Le Cabinet d’Hypnose';
  // In-memory only. Never put answers, values, or scores in storage or URLs.
  let answers = new Array(q.questions.length).fill(null);
  let step = 0;
  let values = Array.from({length: 6}, () => ({code: '', position: null}));
  let started = false;
  const source = `<details class="score-method"><summary>Consulter la méthode et le document source</summary><p>${escape(q.method)}</p><a href="${escape(q.pdf)}" target="_blank" rel="noopener">Ouvrir le PDF original (pages ${escape(q.sourcePages)})</a></details>`;
  const heading = () => `<p class="eyebrow">Le Cabinet d’Hypnose · Questionnaire</p><h1 tabindex="-1" id="questionnaire-title">${escape(q.title)}</h1><img class="ornament" src="assets/courbe-art-nouveau-ae508b87.jpg" alt="">`;
  function focusHeading() { host.querySelector('h1, h2')?.focus({preventScroll: true}); window.scrollTo({top: 0, behavior: 'instant'}); }
  function showIntro() {
    host.innerHTML = `${heading()}<p class="intro-copy">${escape(q.instructions)}</p><p class="small-note">${q.scoring.type === 'values' ? 'Six valeurs à choisir et à positionner.' : q.questions.length + (q.scoring.type === 'lsas' ? ' situations, deux réponses par situation.' : ' questions.')} Vous pouvez revenir sur vos réponses avant le résultat.</p><p class="privacy-note">Aucune réponse ni aucun résultat n’est enregistré ou transmis. Fermer ou actualiser cette page efface votre progression. Ce questionnaire ne remplace pas un avis professionnel.</p><button class="ink-button" id="begin">Commencer ${q.scoring.type === 'values' ? 'l’exercice' : 'le questionnaire'}</button>${source}`;
    host.querySelector('#begin').addEventListener('click', () => { started = true; q.scoring.type === 'values' ? showValuesChoice() : showQuestion(); });
  }
  function optionGroup(options, name, selected, multiple = false, shade = null) {
    return `<div class="answer-options">${options.map(option => {
      const checked = multiple ? selected?.includes(option.value) : selected === option.value;
      return `<label class="answer-option${shade !== null && option.value >= shade ? ' shaded-option' : ''}"><input type="${multiple ? 'checkbox' : 'radio'}" name="${name}" value="${option.value}" ${checked ? 'checked' : ''}><span>${escape(option.label)}</span></label>`;
    }).join('')}</div>`;
  }
  function showQuestion() {
    const item = q.questions[step];
    const current = answers[step];
    const part = q.id === 'asrs' ? (step < 6 ? ' · Partie A' : ' · Partie B') : '';
    const fields = q.scoring.type === 'lsas'
      ? q.dimensions.map(d => `<fieldset class="dimension"><legend>${escape(d.label)}</legend>${optionGroup(d.options, d.id, current?.[d.id])}</fieldset>`).join('')
      : optionGroup(item.options || q.options, 'answer', current, item.multiple, q.id === 'asrs' ? q.scoring.thresholds[step] : null);
    host.innerHTML = `${heading()}<div class="question-progress"><span>Question ${step + 1} sur ${q.questions.length}${part}</span><progress value="${step}" max="${q.questions.length}" aria-label="Progression"></progress></div><form id="answers-form" autocomplete="off"><fieldset class="question-fieldset"><legend>${escape(item.text)}</legend>${item.multiple ? '<p class="small-note">Plusieurs propositions peuvent être choisies. La valeur la plus élevée sera retenue.</p>' : ''}${fields}</fieldset><p id="answer-error" class="error-message" role="alert"></p><div id="support-note"></div><div class="question-actions"><button type="button" class="quiet-button" id="previous">${step ? 'Question précédente' : 'Retour à la présentation'}</button><button class="ink-button" type="submit">${step === q.questions.length - 1 ? 'Calculer mon résultat' : 'Question suivante'}</button></div></form><p class="privacy-note">Vos réponses restent uniquement dans cette page.</p>${source}`;
    const form = host.querySelector('#answers-form');
    const read = () => {
      if (q.scoring.type === 'lsas') {
        const out = {};
        for (const d of q.dimensions) { const checked = form.querySelector(`input[name="${d.id}"]:checked`); if (!checked) return null; out[d.id] = Number(checked.value); }
        return out;
      }
      const checked = [...form.querySelectorAll('input:checked')].map(input => Number(input.value));
      return checked.length ? (item.multiple ? checked : checked[0]) : null;
    };
    function updateSupport() {
      if (q.id === 'beck' && step === 6) {
        const selection = read();
        host.querySelector('#support-note').innerHTML = selection?.some(v => v > 0) ? supportMessage() : '';
      }
    }
    form.addEventListener('change', () => { answers[step] = read(); host.querySelector('#answer-error').textContent = ''; updateSupport(); });
    host.querySelector('#previous').addEventListener('click', () => { answers[step] = read(); if (step) { step--; showQuestion(); } else showIntro(); });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const value = read();
      if (value === null) { host.querySelector('#answer-error').textContent = q.scoring.type === 'lsas' ? 'Indiquez l’anxiété et l’évitement avant de continuer.' : 'Choisissez au moins une réponse avant de continuer.'; form.querySelector('input:not(:checked)')?.focus(); return; }
      answers[step] = value;
      if (step < q.questions.length - 1) { step++; showQuestion(); } else showResult();
    });
    updateSupport(); focusHeading();
  }
  function supportMessage() {
    return '<aside class="support-message"><h2>Un soutien est disponible</h2><p>Si ces pensées vous concernent actuellement, parlez-en dès maintenant à un professionnel de santé ou à une personne de confiance. En cas de danger immédiat, contactez les services d’urgence.</p></aside>';
  }
  function showResult() {
    let result;
    try { result = HypnoScoring.score(q, answers); }
    catch (error) { host.querySelector('#answer-error').textContent = error.message; return; }
    host.innerHTML = `${heading()}<p class="eyebrow">Votre résultat</p>${result.total !== null ? `<p class="score-total"><strong>${result.total}</strong><span>sur ${result.max}</span></p>` : ''}<h2 tabindex="-1">${escape(result.interpretation)}</h2><p class="small-note">Lecture du barème du document source, pas un diagnostic.</p>${result.subscales.length ? `<dl class="subscores">${result.subscales.map(s => `<div><dt>${escape(s.label)}</dt><dd>${s.total} / ${s.max}${s.highlighted === undefined ? '' : `<span>${s.highlighted ? 'Au-dessus de 10' : 'Seuil de 10 non dépassé'}</span>`}</dd></div>`).join('')}</dl>` : ''}${result.notes.map(n => `<p class="small-note">${escape(n)}</p>`).join('')}${result.needsSupport ? supportMessage() : ''}${q.references ? `<details class="score-method"><summary>Repères de groupes du PDF</summary><p>Ces moyennes ne permettent pas d’attribuer un diagnostic individuel.</p><ul>${q.references.map(r => `<li>${escape(r.label)} : moyenne ${r.mean}, écart-type ${r.sd}.</li>`).join('')}</ul></details>` : ''}${source}<div class="question-actions"><button class="quiet-button" id="revise">Revoir mes réponses</button><button class="ink-button" id="restart">Effacer et recommencer</button></div><p class="privacy-note">Aucune donnée enregistrée. Le résultat disparaît lorsque vous quittez ou actualisez la page.</p><a class="text-link" href="tests.html">Retour aux questionnaires</a>`;
    host.querySelector('#revise').addEventListener('click', () => { step = 0; showQuestion(); });
    host.querySelector('#restart').addEventListener('click', reset);
    focusHeading();
  }
  function reset() { answers = new Array(q.questions.length).fill(null); values = Array.from({length: 6}, () => ({code: '', position: null})); step = 0; started = false; showIntro(); focusHeading(); }
  function showValuesChoice() {
    host.innerHTML = `${heading()}<h2 tabindex="-1">Vos six valeurs prioritaires</h2><p>Classez-les de la plus importante à la moins importante. Chaque valeur ne peut être choisie qu’une fois.</p><form id="values-form">${values.map((v, i) => `<label class="value-choice" for="value-${i}"><span>Rang ${i + 1}</span><select id="value-${i}" name="value-${i}" required><option value="">Choisir une valeur</option>${q.values.map(option => `<option value="${option.code}" ${v.code === option.code ? 'selected' : ''}>${escape(option.label)}</option>`).join('')}</select></label>`).join('')}<p id="values-error" class="error-message" role="alert"></p><button class="ink-button">Placer mes valeurs sur la cible</button></form>${source}`;
    host.querySelector('#values-form').addEventListener('submit', event => {
      event.preventDefault();
      const codes = values.map((_, i) => host.querySelector(`#value-${i}`).value);
      if (new Set(codes).size !== 6 || codes.some(c => !q.values.some(v => v.code === c))) { host.querySelector('#values-error').textContent = 'Choisissez six valeurs différentes.'; return; }
      values = codes.map((code, i) => ({code, position: values[i].code === code ? values[i].position : null}));
      showValuesTarget();
    });
    focusHeading();
  }
  function targetSVG() {
    return `<svg viewBox="0 0 360 360" role="img" aria-label="Cible de vos six valeurs : centre harmonieux, périphérie difficile"><title>Cible subjective des valeurs</title>${[145,116,87,58,29].map(r => `<circle cx="180" cy="180" r="${r}" fill="none" stroke="#80694b" stroke-width="1"/>`).join('')}<circle cx="180" cy="180" r="3" fill="#372b1e"/>${values.filter(v => v.position !== null).map(v => {
      const i = values.indexOf(v); const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      // Coordinate distance is a display mechanism, not a questionnaire score.
      const radius = 26 + v.position / 100 * 119;
      const x = 180 + Math.cos(angle) * radius, y = 180 + Math.sin(angle) * radius;
      return `<g><circle cx="${x}" cy="${y}" r="12" fill="#fff" stroke="#372b1e"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" fill="#201a13">${escape(v.code)}</text></g>`;
    }).join('')}</svg>`;
  }
  function showValuesTarget() {
    host.innerHTML = `${heading()}<h2 tabindex="-1">Comment vivez-vous ces valeurs ?</h2><p>Le centre exprime une vie en accord avec la valeur. L’extérieur exprime une difficulté à la vivre. Déplacez puis confirmez chaque position.</p><div class="values-target">${targetSVG()}</div><form id="positions-form">${values.map((v, i) => `<fieldset class="value-position"><legend>${i + 1}. ${escape(q.values.find(o => o.code === v.code).label)} (${v.code})</legend><div class="range-labels"><span>Harmonie · centre</span><span>Difficulté · extérieur</span></div><input type="range" name="position-${i}" min="0" max="100" value="${v.position ?? 50}" aria-label="Position de ${escape(q.values.find(o => o.code === v.code).label)}"><button type="button" class="quiet-button" data-position="${i}">${v.position === null ? 'Confirmer cette position' : 'Position confirmée'}</button></fieldset>`).join('')}<p id="values-error" class="error-message" role="alert"></p><div class="question-actions"><button type="button" class="quiet-button" id="values-back">Modifier mon classement</button><button class="ink-button">Voir ma cible</button></div></form>${source}`;
    host.querySelectorAll('[data-position]').forEach(button => button.addEventListener('click', () => {
      const i = Number(button.dataset.position); values[i].position = Number(host.querySelector(`[name="position-${i}"]`).value); button.textContent = 'Position confirmée'; host.querySelector('.values-target').innerHTML = targetSVG();
    }));
    host.querySelectorAll('input[type="range"]').forEach((input, i) => input.addEventListener('input', () => {
      values[i].position = Number(input.value); host.querySelector(`[data-position="${i}"]`).textContent = 'Position confirmée'; host.querySelector('.values-target').innerHTML = targetSVG();
    }));
    host.querySelector('#values-back').addEventListener('click', showValuesChoice);
    host.querySelector('#positions-form').addEventListener('submit', event => {
      event.preventDefault();
      if (values.some(v => v.position === null)) { host.querySelector('#values-error').textContent = 'Confirmez une position pour chacune des six valeurs.'; return; }
      host.innerHTML = `${heading()}<h2 tabindex="-1">Votre cible personnelle</h2><div class="values-target">${targetSVG()}</div><ol class="values-legend">${values.map(v => `<li>${escape(q.values.find(o => o.code === v.code).label)} (${v.code})</li>`).join('')}</ol><p>Cette cible représente votre ressenti. Le PDF ne prévoit aucun score numérique ni aucun seuil d’interprétation.</p><div class="question-actions"><button class="quiet-button" id="values-edit">Ajuster ma cible</button><button class="ink-button" id="restart">Effacer et recommencer</button></div>${source}<p class="privacy-note">Ce classement et ces positions ne sont ni enregistrés ni transmis.</p>`;
      host.querySelector('#values-edit').addEventListener('click', showValuesTarget); host.querySelector('#restart').addEventListener('click', reset); focusHeading();
    });
    focusHeading();
  }
  // Explicitly clear in-memory state when a page returns from the browser's back/forward cache.
  window.addEventListener('pageshow', event => { if (event.persisted) reset(); });
  showIntro();
})();
