import re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
for name in ['README.md','README.zh-CN.md','docs/publishing.en.md','docs/publishing.zh-CN.md']:
    path=root/name
    for target in re.findall(r'\]\(([^)]+)\)',path.read_text(encoding='utf-8')):
        if '://' not in target and not target.startswith(('mailto:','#')):
            assert (path.parent/target.split('#',1)[0]).exists(),target
print('PASS: bilingual profile navigation and local references')
