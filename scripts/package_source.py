"""Create a source-only, GitHub-ready archive without hosting identity or secrets."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
target = ROOT / 'dist/assets/company-network-source.zip'
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for folder in ['dist', 'scripts', '.github', 'docs']:
        for path in sorted((ROOT / folder).rglob('*')):
            if path.is_file() and path != target and '__pycache__' not in path.parts:
                archive.write(path, 'company-network-research/' + str(path.relative_to(ROOT)))
    for name in ['README.md', '.gitignore']:
        archive.write(ROOT / name, 'company-network-research/' + name)
print('Created', target)
