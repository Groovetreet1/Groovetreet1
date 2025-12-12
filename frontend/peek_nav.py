from pathlib import Path
lines = Path("src/pages/DashboardPage.jsx").read_text(encoding="utf-8").splitlines()
for i, line in enumerate(lines, 1):
    if "sidebarLinks" in line or "sidebarMenuTitle" in line:
        for j in range(max(0, i-10), min(len(lines), i+50)):
            out = f"{j+1:04d}:{lines[j]}"
            print(out.encode("utf-8","replace"))
        print()
