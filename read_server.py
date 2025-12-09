from pathlib import Path
import re

text = Path('backend/server.js').read_text().splitlines()
for i, line in enumerate(text, 1):
    if re.search(r'complete', line, re.IGNORECASE):
        start = max(0, i-5)
        end = min(len(text), i+25)
        print(f'--- around line {i} ---')
        for j in range(start, end):
            print(f'{j+1:04d}: {text[j]}')
        print()
