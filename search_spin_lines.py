from pathlib import Path
lines=Path('frontend/src/pages/DashboardPage.jsx').read_text(encoding='utf-8', errors='ignore').splitlines()
for i,line in enumerate(lines,1):
    if 'setShowSpinWheel' in line:
        print(i, line.strip())
