import re

with open('src/app/consola-codigo/consola-codigo.component.scss', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update global ghost-overlay to 1.1rem to match line-input
content = re.sub(r'(\.ghost-overlay\s*\{[^}]*?font-size:\s*)0\.85rem;', r'\1 1.1rem;', content)

# 2. Update media query to also shrink ghost-overlay
mq_replace = '''  .line-input, .ghost-overlay {
    font-size: 0.85rem;
  }'''
content = re.sub(r'  \.line-input\s*\{\s*font-size:\s*0\.85rem;\s*\}', mq_replace, content)

with open('src/app/consola-codigo/consola-codigo.component.scss', 'w', encoding='utf-8') as f:
    f.write(content)
