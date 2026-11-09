"""Rebuild the static graph from the original research workspace (no price panels)."""
import argparse
import ast
import csv
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--workspace', type=Path, required=True)
args = parser.parse_args()
tree = ast.parse((args.workspace / 'stock_graph/profiles_ext.py').read_text())
profiles = next(ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign)
                and any(isinstance(k, ast.Name) and k.id == 'PROFILES' for k in n.targets))
output = ROOT / 'dist/assets/graph-data.json'
previous = json.loads(output.read_text())
pilot_nodes = {n['id']: n for n in previous['nodes'] if n['id'] in {'SKYW', 'RJET'}}
pilot_edges = {(e['source'], e['target'], e['type']): e for e in previous['edges'] if e['status'] != 'profile'}
source = 'stock_graph/results/options_graph_5y/analysis_edges.csv'
with (args.workspace / source).open() as f:
    rows = list(csv.DictReader(f))
research_ids = sorted({r[k] for r in rows for k in ['src', 'dst']})
nodes = [dict(id=t, name=profiles[t]['name'], sector=profiles[t]['sector'],
              note=profiles[t].get('note', ''), historical=True, universe='research') for t in research_ids]
for t in ['SKYW', 'RJET']:
    nodes.append(dict(pilot_nodes[t], universe='filing-pilot'))
records = {}
for row in rows:
    kind, a, b = row['type'], row['src'], row['dst']
    if kind == 'SUPPLY_DOWN' or a == b:
        continue  # Same commercial link already encoded supplier → customer.
    if kind in {'COMPETITOR', 'SHARED_DRIVER', 'DUAL_CLASS'}:
        a, b = sorted([a, b])
    key = (a, b, kind)
    named = 'named' in row['why'].lower() or kind == 'DUAL_CLASS'
    edge = dict(source=a, target=b, type=kind, why=row['why'], status='profile',
                basis='named' if named else 'inferred', tier=int(row['tier']),
                regime_changed=row['regime_changed'].lower() == 'true', source_file=source, evidence=[])
    if key in records:
        edge['regime_changed'] |= records[key]['regime_changed']
    if key not in records or edge['tier'] > records[key]['tier']:
        records[key] = edge
    else:
        records[key]['regime_changed'] |= edge['regime_changed']
for key, edge in pilot_edges.items():
    records[key] = dict(edge, basis='filing', tier=3)
edges = [dict(e, id=f'e{i}') for i, e in enumerate(records.values())]
result = dict(provenance=dict(as_of='2026-10-20', research_companies=len(research_ids), filing_counterparties=2,
    original_typed_rows=len(rows), scope='475 research companies plus two historical filing-pilot counterparties.',
    profile_era='Retrospective research profiles intended to describe 2010-era structure; not point-in-time verified.',
    source=source, transformation='Reverse supply rows removed; symmetric types deduplicated; three filing records overlaid.',
    scenario='Unweighted reachability only; no current contracts, prices, causal effects or exposure estimates.'), nodes=nodes, edges=edges)
output.write_text(json.dumps(result, separators=(',', ':')) + '\n')
print(len(nodes), 'companies;', len(edges), 'relationships;', dict(Counter(e['type'] for e in edges)))
