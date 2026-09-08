import re

with open('src/app/baraja-tarjetas/baraja-tarjetas.component.scss', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. cards-grid
content = re.sub(r'(\.cards-grid\s*\{[^}]+)(padding: 10px;)', r'\1\2\n  align-items: center;', content)

# 2. action-card
content = re.sub(r'(\.action-card\s*\{[^{}]+?)(align-items: center;[^}]+?min-width:\s*)60px;', r'\1justify-content: center;\n  align-items: center;\n  text-align: center;\n  min-height: 56px;\n  min-width: 80px;', content)

# 3. titulo-tarjeta
content = re.sub(r'(\.titulo-tarjeta\s*\{[^{}]+?font-size:\s*)0\.65rem;([^}]+?margin-bottom:\s*)2px;([^}]+?\})', r'\1 0.75rem;\2 4px;\n  letter-spacing: 0.5px;\3', content)

# 4. card-title
content = re.sub(r'(\.card-title\s*\{[^{}]+?font-size:\s*)1\.1rem;', r'\1 0.9rem;', content)

# 5. card-code
content = re.sub(r'(\.card-code\s*\{[^{}]+?font-size:\s*)0\.75rem;', r'\1 0.9rem;', content)

with open('src/app/baraja-tarjetas/baraja-tarjetas.component.scss', 'w', encoding='utf-8') as f:
    f.write(content)
