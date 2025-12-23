from pathlib import Path
lines=Path('frontend/src/pages/DashboardPage.jsx').read_text(encoding='utf-8', errors='ignore').splitlines()
for idx in range(1340,1390):
    print(idx+1, lines[idx])
