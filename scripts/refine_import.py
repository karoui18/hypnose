"""One-time preservation of source centering and readable mobile link labels."""
from pathlib import Path
from urllib.request import urlopen
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
import json
ROOT=Path(__file__).resolve().parents[1]
files=[]
for f in (ROOT/'content').glob('*.json'):
 d=json.loads(f.read_text())
 if isinstance(d,dict) and 'layers' in d:files.append((f,d))
def fetch(pair):
 f,d=pair
 try:return f,d,BeautifulSoup(urlopen(d['source'],timeout=30).read(),'html.parser')
 except:return f,d,None
labels={'index':'Accueil','cabinet':"Le cabinet d’hypnose — Addiction & trauma",'sebastien-occhipinti':'Le suggestionneur','pnl':'Hypnose & P.N.L.','formulaire':'Contact & tarif','seance':'Votre séance','tests':'Tests et questionnaires','tca':'Conduites alimentaires','dependance':'Dépendance (addiction)','confiance':'Confiance & estime','hypnose-enfant':'Enfants & adolescents','thymie':'Thymie (humeur)','transe-generation':'Transe génération','personnalite':'Personnalité','bonheur':'Ataraxie (bonheur)','couple':'Couple (dés-amour)','transe-muer':'Transe muer (crise)','convoitise':'Convoitise (jalousie)','accro-affectif':'Accro affectif','secret':'Secret (famille)','peur':'Peur (désir)','solitude':'Solitude & conformisme','confort':'Confort & transgression','cupide-on':'Cupide-on (la créance)','ressentiment':'Injustice & ressentiment','seance-1':'Restez aller bien','emotion-voir':'Émotion (ne pas voir)','lacher':'Lâcher prise','deuil':'Défaire son deuil','choix':'(Non) choix','corps':'Corps (image)','toxicomanie':'Toxic ô manie','comportement':'Comportement (trouble)','besoins':'Besoins relationnels','contrainte':'Double contrainte','temps':'Le temps (par l’ennui)','ideal':'Idéal-isthme'}
for f,d,soup in ThreadPoolExecutor(4).map(fetch,files):
 if soup:
  centers={el.get('id') for el in soup.select('.OECenterAH')}
  centered_names={str(el.select_one('img').get('src','')).split('/')[-1].split('-WE')[0] for el in soup.select('.OECenterAH') if el.select_one('img')}
  from urllib.parse import unquote
  centered_names={unquote(x).rsplit('.',1)[0] for x in centered_names}
  for layer in d['layers']:
   for item in layer['items']:
    if item['name'] in centers or item['name'] in centered_names:
     item['layout']['left']='50%';item['layout']['transform']='translateX(-50%)'
    if f.stem=='index':
     if item['type']=='image' and item.get('href','').endswith('.html'):
      slug=item['href'][:-5]
      item['label']=labels.get(slug,slug.replace('-',' ').capitalize())
     if item['type']=='text' and len(item['text'])<110:
      item['mobileHidden']= layer['name']!='content' and not item['text'].startswith('CLIQUEZ AFIN')
    elif item['type']=='image' and item.get('href'):
     # Prefer linked text which names the same destination (particularly PDFs).
     matches=[x for x in layer['items'] if x['type']=='text' and ('href="'+item['href']+'"') in x.get('html','') and len(x['text'])<160]
     if matches:
      item['label']=matches[0]['text']
      for x in matches:x['mobileHidden']=True
 f.write_text(json.dumps(d,ensure_ascii=False,indent=2))
print('Refined',len(files),'pages')
