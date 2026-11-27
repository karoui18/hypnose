"""Generate static HTML from editable content JSON. Python standard library only."""
from pathlib import Path
import html, json, re

ROOT = Path(__file__).resolve().parents[1]
esc = lambda value: html.escape(str(value), quote=True)

def render(item, order=0):
    style = ';'.join(f'{key}:{value}' for key,value in item['layout'].items())
    style += f';--mobile-order:{order}'
    classes = 'piece '+item['type']+(' mobile-hidden' if item.get('mobileHidden') else '')
    if item['type']=='group':
        return f'<aside class="{classes}" style="{esc(style)}" aria-label="Réseaux sociaux">'+''.join(render(x) for x in item['items'])+'</aside>'
    if item['type']=='image':
        label = 'Retour à l’accueil' if item.get('href')=='index.html' else item.get('label','')
        if item.get('href')=='index.html':classes+=' home-link'
        image = f'<img src="{esc(item["src"])}" alt="{esc(label) if item.get("href") else ""}" decoding="async">'
        if item.get('href'): image = f'<a href="{esc(item["href"])}" aria-label="{esc(label)}">{image}<span class="mobile-caption">{esc(label)}</span></a>'
        return f'<div class="{classes}" style="{esc(style)}">{image}</div>'
    return f'<div class="{classes}" style="{esc(style)}">{item["html"]}</div>'

for file in sorted((ROOT/'content').glob('*.json')):
    data=json.loads(file.read_text())
    if not isinstance(data,dict) or 'layers' not in data: continue
    if file.stem!='index':
        for layer in data['layers']:
            linked_labels={x.get('label') for x in layer['items'] if x['type']=='image' and x.get('href')}
            for item in layer['items']:
                if item['type']=='text' and item.get('mobileHidden') and item['text'] not in linked_labels:
                    item['mobileHidden']=False
    if file.stem=='formulaire':
        old_form_labels={'WEae4ebb84f0','WE49c72eadec','WE44c47e48e7','WEad20fefbe5','WEb4ff55481c'}
        for layer in data['layers']:
            layer['items']=[x for x in layer['items'] if x['name'] not in old_form_labels]
            if layer['name']=='footer':
                layer['height']='1794px'
                for item in layer['items']:
                    top=item['layout'].get('top','0').replace('px','')
                    if top.isdigit() and int(top)>=1190:item['layout']['top']=str(int(top)+300)+'px'
    sections=[]
    for layer in data['layers']:
        def pos(x):
            def n(s):
                try:return float(str(s).replace('px',''))
                except:return 0
            return n(x['layout'].get('top',0))*10000+n(x['layout'].get('left',0))
        order={id(x):i for i,x in enumerate(sorted(layer['items'],key=pos))}
        sections.append(f'<section class="canvas-layer {esc(layer["name"])}" style="height:{esc(layer["height"])}" aria-label="{esc(data["title"])}">'+''.join(render(x,order[id(x)]) for x in layer['items'])+'</section>')
    contact = '''<section class="contact-actions" aria-label="Contacter le cabinet"><h2>Prendre rendez-vous</h2><p>Pour une demande de rendez-vous ou une question :</p><a href="tel:+33660251368">Appeler le 06 60 25 13 68</a><a href="mailto:sebocchipnose@gmail.com">Envoyer un courriel</a></section>''' if file.stem=='formulaire' else ''
    if file.stem=='tests':
        downloads=json.loads((ROOT/'content/downloads.json').read_text())
        from urllib.parse import unquote
        links=[]
        for pdf in downloads:
            if pdf['local'].startswith('assets/') and 'DEONTOLOGIE' not in pdf['source']:
                title=unquote(pdf['source'].split('/')[-1]).removesuffix('.pdf')
                links.append(f'<li><a href="{esc(pdf["local"])}">{esc(title)} — PDF</a></li>')
        contact='<section class="download-library"><h2>Questionnaires à télécharger</h2><p>Ces outils ne constituent pas un diagnostic.</p><ul>'+''.join(links)+'</ul></section>'
    if file.stem=='formulaire':
        # The source POST endpoint cannot be cloned into a static website.
        # Preserve the form's location, with an explicit email-draft interaction.
        contact_form='''<form class="message-form" id="message-form"><label for="contact-name">Vos nom et prénom</label><input id="contact-name" name="name" autocomplete="name" required><label for="contact-phone">Votre téléphone</label><input id="contact-phone" name="phone" type="tel" autocomplete="tel"><label for="contact-email">Votre courriel</label><input id="contact-email" name="email" type="email" autocomplete="email" required><label for="contact-message">Votre missive</label><textarea id="contact-message" name="message" rows="4" required></textarea><button type="submit">Préparer mon courriel</button><p id="form-status" role="status">Ce formulaire ouvre votre messagerie. Vous y confirmez l’envoi.</p><noscript><a href="mailto:sebocchipnose@gmail.com">Écrire par courriel</a></noscript></form>'''
        sections[-1]=sections[-1].replace('</section>',contact_form+'</section>')
    document=f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{esc(data['title'])}</title><meta name="description" content="Le Cabinet d’Hypnose de Sébastien Occhipinti, à Épernon près de Rambouillet."><link rel="stylesheet" href="styles/fonts.css"><link rel="stylesheet" href="styles/site.css"><script src="js/site.js" defer></script></head>
<body class="{'home' if file.stem=='index' else 'inner-page'}"><a class="skip-link" href="#main">Aller au contenu</a>
<nav class="mobile-nav" aria-label="Navigation principale"><a href="index.html">Le Cabinet d’Hypnose</a><button type="button" aria-expanded="false" aria-controls="mobile-menu">Menu</button><div id="mobile-menu" hidden><a href="cabinet.html">Le cabinet</a><a href="sebastien-occhipinti.html">Le praticien</a><a href="seance.html">Votre séance</a><a href="tests.html">Questionnaires</a><a href="formulaire.html">Contact & tarif</a></div></nav>
<main id="main" class="site" style="--canvas-width:{esc(data['width'])}">{''.join(sections)}{contact}</main>
<footer class="site-footer"><a href="index.html">Accueil</a><a href="tests.html">Questionnaires</a><a href="formulaire.html">Contact & tarif</a></footer></body></html>'''
    (ROOT/(file.stem+'.html')).write_text(document)
print('Built',len(list(ROOT.glob('*.html'))),'static pages')
