"""Verify local references, entity integrity, and evidence status before publication."""
import json
import re
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'

class CheckPage(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.ids = set()
        self.local_anchors = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, ('Duplicate ID', self.path, attrs['id'])
            self.ids.add(attrs['id'])
        for name in ['href', 'src']:
            value = attrs.get(name, '')
            if not value or urlparse(value).scheme:
                continue
            if value.startswith('#'):
                self.local_anchors.append(value[1:])
                continue
            target = self.path.parent / value.split('#')[0]
            assert target.exists(), ('Missing asset', value)

for page in DIST.glob('*.html'):
    check = CheckPage(page)
    check.feed(page.read_text())
    assert all(anchor in check.ids for anchor in check.local_anchors)
    assert not re.search(r'https?://[^"\s]+\.(?:css|js)', page.read_text()), 'Remote runtime asset'
    assert not re.search(r'mailto:|linkedin\.com/in/|(?:author|profile)-monogram|\.edu\b', page.read_text(), re.I), 'Personal contact or profile information'
for url in re.findall(r'url\(([^)]+)\)', (DIST / 'assets/article.css').read_text()):
    assert (DIST / 'assets' / url.strip('"\'')).exists(), url
data = json.loads((DIST / 'assets/graph-data.json').read_text())
ids = {n['id'] for n in data['nodes']}
assert len(ids) == len(data['nodes']) == 477
assert data['provenance']['research_companies'] == 475
assert sum(n['universe'] == 'research' for n in data['nodes']) == 475
assert len(data['edges']) == 36111
assert len({e['id'] for e in data['edges']}) == len(data['edges'])
reviewed = set()
for edge in data['edges']:
    assert edge['source'] in ids and edge['target'] in ids
    assert edge['source'] != edge['target']
    assert edge['basis'] in {'named', 'inferred', 'filing'}
    assert edge['type'] != 'SUPPLY_DOWN'
    if edge['status'] == 'reviewed':
        reviewed.add((edge['source'], edge['target']))
        assert edge['evidence']
    for record in edge['evidence']:
        assert urlparse(record['url']).hostname == 'www.sec.gov'
        assert len(record['date']) == 10
assert reviewed == {('SKYW', 'DAL'), ('RJET', 'DAL')}
assert next(e for e in data['edges'] if e['source']=='INTC' and e['target']=='AAPL' and e['type']=='SUPPLY_UP')['status']=='candidate'
for name in ['roboto-OFL.txt', 'librebaskerville-OFL.txt']:
    assert 'SIL OPEN FONT LICENSE' in (DIST / 'assets/fonts' / name).read_text()
with ZipFile(DIST / 'assets/company-network-source.zip') as z:
    assert not any('/.git/' in p or '/.openai/' in p for p in z.namelist())
    assert 'company-network-research/.github/workflows/pages.yml' in z.namelist()
print(f'Checked HTML references, fonts, 477 entities, {len(data["edges"])} relationships, review status, and source archive.')
