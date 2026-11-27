"""One-time, reviewed transcription of local PDF instruments into editable JSON.
Requires pypdf for transcription only. Normal builds use the JSON, not this script.
"""
from pathlib import Path
from pypdf import PdfReader
import json, re
ROOT=Path(__file__).resolve().parents[1]
def clean(s):
    s=re.sub(r'\s+',' ',s).strip()
    for a,b in {'bel les':'belles','suis u n':'suis un','q ue':'que','nerv eux':'nerveux','chos es':'choses','maît riser':'maîtriser','dom iniez':'dominiez','J e':'Je','Je sens caché':'le sens caché','perturbe Je plaisir':'perturbe le plaisir','II m':'Il m','II est':'Il est','qu ’':'qu’','m ’':'m’','socia les':'sociales','sit uations':'situations','a mi(e)s':'ami(e)s','soci aux':'sociaux','qu and':'quand','p as':'pas','p ersonne':'personne','situ ations':'situations','m a femme':'ma femme','dé çu':'déçu','disgracie ux':'disgracieux','eux- mêmes':'eux-mêmes','avez- vous':'avez-vous','connaissez pa très':'connaissez pas très'}.items():s=s.replace(a,b)
    s=s.replace(' ’','’').replace("ce qu' il", "ce qu'il")
    return s
def numbered(file,page,count,end):
    text=PdfReader(ROOT/'assets'/file).pages[page].extract_text().split(end)[0]
    matches=list(re.finditer(r'(?:^|\n)\s*(\d+)\.?\s+(?=[A-Za-zÀ-ÿ])',text))[-count:]
    assert [int(m[1]) for m in matches]==list(range(1,count+1)),file
    out=[]
    for i,m in enumerate(matches):
        if 1<=int(m[1])<=count:
            value=clean(text[m.end():matches[i+1].start() if i+1<len(matches) else len(text)])
            value=re.sub(r'\s+x$','',value)
            out.append(value)
    assert len(out)==count,(file,len(out))
    return out
def opts(labels,start=0):return [{'value':i+start,'label':v} for i,v in enumerate(labels)]
data=[]
def add(id,title,pdf,questions,options,scoring,instructions,**extra):
    obj=dict(id=id,title=title,pdf='assets/'+pdf,questions=[{'text':q} if isinstance(q,str) else q for q in questions],options=options,scoring=scoring,instructions=instructions,**extra)
    data.append(obj);return obj
def bands(*pairs):return [{'max':m,'label':l} for m,l in pairs]

hamilton=[
'Humeur anxieuse : inquiétude, attente du pire, appréhension (anticipation avec peur), irritabilité, consommation de tranquillisants.',
'Tension : impossibilité de se détendre, réaction de sursaut, pleurs faciles, tremblements, sensation d’être incapable de rester en place, fatigabilité.',
'Peurs : de mourir brutalement, d’être abandonné, du noir, des gens, des animaux, de la foule, des grands espaces, des ascenseurs, des avions, des transports…',
'Insomnie : difficultés d’endormissement, sommeil interrompu, sommeil non satisfaisant avec fatigue au réveil, rêves pénibles, cauchemars, angoisses ou malaises nocturnes.',
'Fonctions intellectuelles (cognitives) : difficultés de concentration, mauvaise mémoire, cherche ses mots, fait des erreurs.',
'Humeur dépressive : perte des intérêts, ne prend plus plaisir à ses passe-temps, tristesse, insomnie du matin.',
'Symptômes somatiques généraux (musculaires) : douleurs et courbatures, raideurs musculaires, sursauts musculaires, grincements des dents, contraction de la mâchoire, voix mal assurée.',
'Symptômes somatiques généraux (sensoriels) : sifflements d’oreilles, vision brouillée, bouffées de chaleur ou de froid, sensations de faiblesse, sensations de fourmis, de picotements.',
'Symptômes cardiovasculaires : tachycardie, palpitations, douleurs dans la poitrine, battements des vaisseaux, sensations syncopales.',
'Symptômes respiratoires : oppression, douleur dans la poitrine, sensations de blocage, d’étouffement, soupirs, respiration rapide au repos.',
'Symptômes gastro-intestinaux : difficultés pour avaler, douleurs avant ou après les repas, sensations de brûlure, ballonnement, reflux, nausées, vomissements, creux à l’estomac, coliques abdominales, borborygmes, diarrhée, constipation.',
'Symptômes génito-urinaires : règles douloureuses ou anormales, troubles sexuels (impuissance, frigidité), mictions fréquentes, urgentes ou douloureuses.',
'Symptômes du système nerveux autonome : bouche sèche, accès de rougeur, pâleur, sueur, vertiges, maux de tête.',
'Comportement lors de l’entretien : mal à l’aise, agitation nerveuse, tremblement des mains, front plissé, faciès tendu, augmentation du tonus musculaire ; avale sa salive, éructations, palpitations au repos, accélération respiratoire, réflexes tendineux vifs, dilatation pupillaire, battements des paupières.'
]
add('hamilton','Échelle d’anxiété d’Hamilton','echelle-hamilton-161a05b2.pdf',hamilton,opts(['Absent','Léger','Moyen','Fort','Maximal']),{'type':'sum','min':0,'max':56,'bands':bands((7,'Anxiété minimale ou absente selon le barème'),(14,'Anxiété légère selon le barème'),(23,'Anxiété modérée selon le barème'),(56,'Anxiété sévère selon le barème'))},'Pour chaque groupe de symptômes, choisissez la note qui correspond le mieux à votre état. L’item 14 porte sur le comportement lors de l’entretien et se complète avec le praticien.',method='Somme des 14 réponses (0 à 4). Le PDF mentionne séparément un seuil d’anxiété significative de 20/56.',sourcePages='1–3')

attitudes=["Je perçois les problèmes comme étant menaçants pour mon bien-être.","Je doute souvent de mes capacités à résoudre les problèmes.","Souvent, avant même d’avoir essayé de trouver une solution, je me dis qu’il est difficile de résoudre un problème.","Les problèmes qui m’arrivent me semblent souvent insurmontables.","Lorsque je tente de résoudre un problème, je remets souvent en question mes habiletés.","Souvent, j’ai l’impression que les problèmes qui m’arrivent ne peuvent pas être résolus.","Même si j’arrive à voir certaines solutions à mes problèmes, je doute qu’ils pourront se régler facilement.","J’ai tendance à voir les problèmes comme un danger.","Ma première réaction devant un problème est de remettre en question mes habiletés.","Je perçois souvent mes problèmes comme étant plus gros qu’ils le sont en réalité.","Même si j’ai regardé un problème sous tous les angles possibles, je me demande encore si la solution que j’ai retenue va être efficace.","Je considère les problèmes comme des obstacles qui perturbent mon fonctionnement."]
add('attitudes','Attitude face aux problèmes','attitudes-face-aux-problemes-654911af.pdf',attitudes,opts(['Pas du tout correspondant','Un peu correspondant','Assez correspondant','Très correspondant','Extrêmement correspondant'],1),{'type':'sum','min':12,'max':60},'Indiquez dans quelle mesure chaque affirmation vous correspond.',method='Somme des 12 réponses (1 à 5). Plus le score est élevé, plus l’orientation face aux problèmes est négative. La norme indicative de 25 n’est pas un seuil diagnostique. Aucun intervalle de catégories n’est fourni.',sourcePages='1–2')

lsas=numbered('anxiete-sociale-lsas-081cc671.pdf',1,24,'TOTAL')
lsas=[{'text':re.sub(r'\s*\([PS]\)$','',q),'group':'performance' if q.endswith('(P)') else 'social'} for q in lsas]
add('lsas','Anxiété sociale — Liebowitz','anxiete-sociale-lsas-081cc671.pdf',lsas,[],{'type':'lsas','min':0,'max':144,'bands':bands((55,'Aucune catégorie définie pour ce score dans le PDF'),(65,'Phobie sociale modérée selon le barème'),(80,'Phobie sociale marquée selon le barème'),(95,'Phobie sociale sévère selon le barème'),(144,'Phobie sociale très sévère selon le barème'))},'Pour chaque situation, indiquez séparément l’anxiété et l’évitement. Le document prévoit une interprétation avec une expérience clinique.',dimensions=[{'id':'anxiety','label':'Anxiété','options':opts(['Aucune','Légère','Moyenne','Sévère'])},{'id':'avoidance','label':'Évitement','options':opts(['Jamais','Occasionnel (0–33 %)','Fréquent (33–66 %)','Habituel (67–100 %)'])}],method='Somme des 24 notes d’anxiété et des 24 notes d’évitement. Quatre sous-scores de 0 à 36 : anxiété/évitement en performance et en interaction sociale. Aucun seuil n’est ajouté sous 56.',sourcePages='1–2')

tdah=numbered('questionnaire-tdah-a290f7c5.pdf',1,18,'\0')
tdah=[q.replace('Partie B','').replace('in at tention','inattention').replace('inat tention','inattention').strip() for q in tdah]
add('asrs','TDAH adulte — ASRS v1.1','questionnaire-tdah-a290f7c5.pdf',tdah,opts(['Jamais','Rarement','Parfois','Souvent','Très souvent']),{'type':'asrs','thresholds':[2,2,2,3,3,3,3,3,2,3,3,2,3,3,3,2,3,2],'min':0,'max':6},'Répondez selon ce que vous avez ressenti ou fait au cours des six derniers mois. Les six premières questions constituent la partie A ; les douze suivantes, la partie B.',method='Nombre de réponses dans les cases ombragées de la partie A : questions 1–3 à partir de « Parfois », 4–6 à partir de « Souvent ». À partir de 4/6, une investigation complémentaire est indiquée. La partie B apporte des éléments descriptifs, sans score diagnostique.',sourcePages='1–2')

add('rosenberg','Estime de soi — Rosenberg','echelle-estime-de-soi-3083142a.pdf',numbered('echelle-estime-de-soi-3083142a.pdf',0,10,'Total :'),opts(['Pas du tout d’accord','Plutôt pas d’accord','Plutôt d’accord','Tout à fait d’accord'],1),{'type':'sum','reverse':[3,5,8,9,10],'reverseBase':5,'min':10,'max':40,'bands':bands((24,'Estime de soi très faible selon le barème'),(30,'Estime de soi faible selon le barème'),(34,'Estime de soi dans la moyenne selon le barème'),(39,'Estime de soi forte selon le barème'),(40,'Estime de soi très forte selon le barème'))},'Choisissez votre degré d’accord avec chacune des dix affirmations.',method='Somme des réponses, avec inversion des items 3, 5, 8, 9 et 10 : 1↔4, 2↔3. Le PDF répète par erreur la correspondance 1→4 et omet 4→1 ; l’inversion complète est appliquée ici.',sourcePages='1–2')

add('estime-sociale','Inventaire d’estime de soi sociale','echelle-estime-de-soi-sociale-f371f8fb.pdf',numbered('echelle-estime-de-soi-sociale-f371f8fb.pdf',1,30,'Total :'),opts(['Complètement différent de moi','2 — degré intermédiaire','3 — degré intermédiaire','4 — degré intermédiaire','5 — degré intermédiaire','Exactement comme moi'],1),{'type':'sum','reverse':[1,2,9,10,11,14,16,18,19,20,21,23,26,29,30],'reverseBase':7,'min':30,'max':180},'Indiquez le degré de ressemblance entre vous et chaque description, de 1 à 6. Répondez spontanément.',method='Somme des 30 réponses après inversion (7 − réponse) des 15 items marqués d’une croix dans le PDF. Plus le score est élevé, plus l’estime de soi sociale est bonne. Les moyennes de groupes du document ne sont pas des seuils diagnostiques.',references=[{'label':'Étudiants','mean':133.4,'sd':22.2},{'label':'Groupe phobie sociale','mean':89.68,'sd':23.51},{'label':'Groupe personnalité évitante','mean':80.75,'sd':19.35},{'label':'Groupe contrôle','mean':132.48,'sd':23.11}],sourcePages='2–3')

add('tas20','Émotions — TAS-20','tas-20-823578d2.pdf',numbered('tas-20-823578d2.pdf',1,20,'difficulté à identifier'),opts(['Désaccord complet','Désaccord relatif','Ni accord ni désaccord','Accord relatif','Accord complet'],1),{'type':'sum','reverse':[4,5,10,18,19],'reverseBase':6,'min':20,'max':100,'bands':bands((51,'Zone « absence d’alexithymie » du barème'),(60,'Zone « alexithymie possible » du barème'),(100,'Zone « alexithymie présente » du barème')),'subscales':[{'label':'Identifier les émotions','items':[1,3,6,7,9,13,14],'max':35},{'label':'Décrire les émotions','items':[2,4,11,12,17],'max':25},{'label':'Pensée orientée sur l’extérieur','items':[5,8,10,15,16,18,19,20],'max':40}]},'Indiquez votre degré d’accord ou de désaccord avec chaque affirmation.',method='Somme des 20 réponses ; items 4, 5, 10, 18 et 19 inversés (6 − réponse). Les trois facteurs ont des maxima différents et sont affichés séparément, sans classement de sévérité entre eux.',sourcePages='1–2')

add('pss10','Stress perçu — PSS-10','echelle-stress-percu-c91dca62.pdf',numbered('echelle-stress-percu-c91dca62.pdf',1,10,'Total :'),opts(['Jamais','Presque jamais','Parfois','Assez souvent','Souvent']),{'type':'sum','reverse':[4,5,7,8],'reverseBase':4,'min':0,'max':40,'bands':bands((13,'Stress perçu faible selon le barème'),(26,'Stress perçu modéré selon le barème'),(40,'Stress perçu élevé selon le barème'))},'Au cours du dernier mois, à quelle fréquence avez-vous vécu les situations suivantes ? Répondez à chaque question séparément.',method='Somme des 10 réponses après inversion des items 4, 5, 7 et 8 (4 − réponse).',sourcePages='1–2')

horn=['Je fume pour me donner un coup de fouet.','Tenir une cigarette me procure du plaisir.','Fumer est un moment de détente pour moi.','J’allume une cigarette quand je suis soucieux(se) ou contrarié(e).','Je m’empresse d’aller acheter des cigarettes quand je n’en ai plus.','Je fume de manière automatique et inconsciente.','Fumer me donne du courage.','Le simple fait de tenir une cigarette me procure du plaisir.','Il y a une quantité de plaisirs dans l’acte de fumer.','Je fume quand je suis mal à l’aise ou énervé(e).','Je ne suis pas dans le coup quand je ne fume pas.','J’allume une cigarette alors qu’une autre brûle déjà dans le cendrier.','Je fume pour retrouver mon entrain.','J’éprouve du plaisir à regarder les volutes de fumée.','Je fume quand je me sens détendu(e).','Je fume quand je n’ai pas le moral.','Quand je n’ai pas pu fumer depuis un moment, le désir devient irrésistible.','J’oublie la cigarette qui se trouve dans ma bouche.']
add('horn','Tabac — Test de Horn','test-horn-tabac-e4587361.pdf',horn,opts(['Jamais','Parfois','Moyennement','Souvent','Toujours'],1),{'type':'horn','subscales':[{'label':label,'items':[i,i+6,i+12],'max':15} for i,label in enumerate(['Stimulation','Plaisir du geste','Relaxation','Anxiété — soutien','Besoin absolu','Habitude acquise'],1)]},'Indiquez la fréquence à laquelle chaque affirmation correspond à votre expérience du tabac.',method='Six sommes distinctes de trois réponses. Un sous-score strictement supérieur à 10 met en lumière une motivation. Le PDF ne définit pas de score global interprétable.',sourcePages='1–2')

text='\n'.join(p.extract_text() for p in PdfReader(ROOT/'assets/inventaire-de-depression-de-beck-9a880af9.pdf').pages).split('- RESULTAT')[0]
parts=re.split(r'-\s*([A-M])\s*-',text)[1:]
beck=[]
for letter,part in zip(parts[::2],parts[1::2]):
    matches=list(re.finditer(r'(?<!\d)([0-3])\.\s*',part))
    choices=[{'value':int(m[1]),'label':clean(part[m.end():matches[i+1].start() if i+1<len(matches) else len(part)])} for i,m in enumerate(matches)]
    assert len(choices)==4,(letter,choices)
    beck.append({'text':'Groupe '+letter,'options':choices,'multiple':True})
assert len(beck)==13
add('beck','Inventaire abrégé de Beck','inventaire-de-depression-de-beck-9a880af9.pdf',beck,[],{'type':'beck','min':0,'max':39,'bands':bands((3,'Zone « pas de dépression » du barème'),(7,'Zone « dépression légère » du barème'),(15,'Zone « dépression moyenne à modérée » du barème'),(39,'Zone « dépression sévère » du barème'))},'Dans chaque groupe, choisissez la ou les propositions qui correspondent le mieux à votre état actuel. Plusieurs réponses sont possibles dans un même groupe.',method='Pour chaque groupe A–M, la valeur la plus élevée sélectionnée est retenue (0 à 3). Les 13 valeurs sont additionnées. Ces zones du barème ne constituent pas un diagnostic.',sourcePages='1–5')

values=[('Humanisme','HU'),('Autonomie','AU'),('Réussite','RU'),('Hédonisme','HE'),('Accomplissement','AC'),('Pouvoir','PO'),('Liberté','LI'),('Tradition','TR'),('Conformité','CO'),('Bienveillance','BI'),('Famille','FA'),('Relation','RE'),('Amour','AM'),('Justice','JU'),('Équité','EQ'),('Santé','SA'),('Sécurité','SE'),('Loyauté','LO'),('Respect','RS'),('Spiritualité','SP'),('Altérité','AL'),('Honnêteté','HO'),('Altruisme','AT'),('Humilité','HM'),('Fidélité','FI')]
add('valeurs','Cible subjective des valeurs','cible-subjective-valeur-f6e90e3b.pdf',[],[],{'type':'values'},'Choisissez six valeurs prioritaires, de la plus importante à la moins importante. Placez ensuite chacune sur la cible : près du centre si vous la vivez harmonieusement, vers l’extérieur si vous éprouvez une difficulté à la vivre.',values=[{'label':a,'code':b} for a,b in values],method='Le document propose un classement et une cible visuelle. Il ne fournit aucun score numérique, total ou seuil. Les positions servent uniquement à représenter votre ressenti.',sourcePages='1–2')
(ROOT/'content/questionnaires.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print([(x['id'],len(x['questions'])) for x in data])
