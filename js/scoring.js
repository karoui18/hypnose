/* Pure scoring functions. No DOM, storage or network access. Item numbers are 1-based. */
(function (root) {
  'use strict';
  function score(questionnaire, answers) {
    const q = questionnaire;
    if (!Array.isArray(answers) || answers.length !== q.questions.length || q.scoring.type === 'values') {
      throw new Error('Répondez à toutes les questions avant de calculer le résultat.');
    }
    const valid = (value, options) => Number.isInteger(value) && options.some(o => o.value === value);
    const raw = q.questions.map((_, i) => {
      const answer = answers[i];
      if (q.scoring.type === 'lsas') {
        if (!answer || !q.dimensions.every(d => valid(answer[d.id], d.options))) throw new Error(`Question ${i + 1} incomplète.`);
        return answer.anxiety + answer.avoidance;
      }
      if (q.scoring.type === 'beck') {
        if (!Array.isArray(answer) || !answer.length || !answer.every(v => valid(v, q.questions[i].options))) throw new Error(`Groupe ${i + 1} incomplet.`);
        return Math.max(...answer);
      }
      if (!valid(answer, q.questions[i].options || q.options)) throw new Error(`Question ${i + 1} incomplète.`);
      return answer;
    });
    const corrected = raw.map((v, i) => q.scoring.reverse?.includes(i + 1) ? q.scoring.reverseBase - v : v);
    const sum = list => list.reduce((a, b) => a + b, 0);
    const result = {total: sum(corrected), min: q.scoring.min, max: q.scoring.max, subscales: [], interpretation: '', notes: [], items: corrected};
    if (q.scoring.subscales) {
      result.subscales = q.scoring.subscales.map(s => ({label: s.label, total: sum(s.items.map(i => corrected[i - 1])), max: s.max}));
    }
    if (q.scoring.type === 'horn') {
      result.total = null;
      result.subscales.forEach(s => { s.highlighted = s.total > 10; });
      result.interpretation = 'Un sous-score strictement supérieur à 10 met en lumière une motivation à fumer. Il n’existe pas de total global interprétable dans ce document.';
    }
    if (q.scoring.type === 'asrs') {
      const shaded = raw.map((v, i) => v >= q.scoring.thresholds[i]);
      result.total = sum(shaded.slice(0, 6).map(Number));
      result.interpretation = result.total >= 4 ? 'Le seuil de repérage de la partie A est atteint. Une investigation complémentaire avec un professionnel est indiquée.' : 'Le seuil de repérage de la partie A n’est pas atteint. Cela ne permet pas d’exclure un TDAH.';
      result.subscales = [{label: 'Partie B — réponses en zone ombragée, à titre descriptif', total: sum(shaded.slice(6).map(Number)), max: 12}];
      result.notes.push('La partie B n’a pas de seuil diagnostique. Le résultat principal est un nombre de réponses repérées sur 6, pas une somme sur 72.');
    }
    if (q.scoring.type === 'lsas') {
      for (const [group, label] of [['performance', 'Performance'], ['social', 'Interaction sociale']]) {
        for (const dimension of q.dimensions) result.subscales.push({label: `${label} — ${dimension.label.toLowerCase()}`, total: sum(answers.filter((_, i) => q.questions[i].group === group).map(a => a[dimension.id])), max: 36});
      }
    }
    if (q.scoring.bands) result.interpretation = q.scoring.bands.find(b => result.total <= b.max)?.label || '';
    if (q.id === 'attitudes') result.interpretation = 'Plus ce score est élevé, plus l’orientation face aux problèmes est négative. Le repère indicatif de 25 n’est pas un seuil diagnostique.';
    if (q.id === 'estime-sociale') result.interpretation = 'Plus ce score est élevé, plus l’estime de soi sociale est bonne. Le PDF ne définit pas de catégories individuelles.';
    if (q.id === 'hamilton') result.notes.push(result.total >= 20 ? 'Le seuil de 20/56 également mentionné dans le PDF est atteint.' : 'Le seuil de 20/56 également mentionné dans le PDF n’est pas atteint.');
    if (q.id === 'beck') {
      result.needsSupport = raw[6] > 0;
      if (result.needsSupport) result.notes.push('Un score total faible ne doit pas conduire à ignorer des pensées de mort ou de mise en danger.');
    }
    return result;
  }
  root.HypnoScoring = {score};
  if (typeof module !== 'undefined' && module.exports) module.exports = {score};
})(typeof globalThis !== 'undefined' ? globalThis : this);
