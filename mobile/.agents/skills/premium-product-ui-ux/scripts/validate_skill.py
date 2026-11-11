#!/usr/bin/env python3
"""Static consistency check for premium-product-ui-ux skill; no external deps."""
from pathlib import Path
import re,sys
root=Path(__file__).resolve().parent.parent
skill=root/'SKILL.md'
assert skill.exists(), 'missing SKILL.md'
fm=skill.read_text(encoding='utf-8')
assert re.search(r'^---\nname: premium-product-ui-ux\ndescription: .+\n---\n',fm), 'invalid frontmatter'
refs=root/'references'
chapters=sorted(refs.glob('[0-9][0-9]-*.md'))
chapters=[p for p in chapters if p.name!='00-catalog-index.md']
assert len(chapters)==16, f'expected 16 chapters, got {len(chapters)}'
ids=[]
for chapter in chapters:
    ids.extend(re.findall(r'^### (UX-\d{3}) · ',chapter.read_text(encoding='utf-8'),flags=re.M))
assert len(ids)==160, f'expected 160 rules, got {len(ids)}'
assert len(set(ids))==160, 'duplicate rule IDs'
assert ids==[f'UX-{n:03d}' for n in range(1,161)], 'rules not sequential'
assert (refs/'motion-recipes.md').read_text(encoding='utf-8').count('## M0')==6, 'missing motion recipes'
for p in [root/'agents/openai.yaml',root/'README.md',refs/'sources.md',refs/'test-matrix.md']:
    assert p.exists() and p.stat().st_size>100, f'missing/empty {p.name}'
for path in [skill,*refs.glob('*.md')]:
    body=path.read_text(encoding='utf-8')
    for rel in re.findall(r'(?<!https:)(?<!http:)[`(]((?:references/)?[\w-]+\.md)[`)]',body):
        if rel in ('AGENTS.md','SKILL.md','README.md'): continue
        target=(root/rel) if rel.startswith('references/') else (path.parent/rel)
        assert target.exists(),f'{path.name}: broken local ref {rel}'
print('VALIDATED: 1 Codex skill, 16 catalog chapters, 160 unique rules, 6 motion recipes, UI metadata and resources')
