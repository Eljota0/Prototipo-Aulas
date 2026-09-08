import re

with open('src/app/consola-codigo/consola-codigo.component.scss', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    '::ng-deep .sh-keyword { color: #c678dd; }': '::ng-deep .sh-keyword { color: #c678dd !important; }',
    '::ng-deep .sh-function { color: #61afef; }': '::ng-deep .sh-function { color: #61afef !important; }',
    '::ng-deep .sh-object { color: #e06c75; }': '::ng-deep .sh-object { color: #e06c75 !important; }',
    '::ng-deep .sh-property { color: #56b6c2; }': '::ng-deep .sh-property { color: #56b6c2 !important; }',
    '::ng-deep .sh-number { color: #e5c07b; }': '::ng-deep .sh-number { color: #e5c07b !important; }',
    '::ng-deep .sh-operator { color: #56b6c2; }': '::ng-deep .sh-operator { color: #56b6c2 !important; }',
    '::ng-deep .sh-bracket { color: #d19a66; }': '::ng-deep .sh-bracket { color: #d19a66 !important; }',
    '::ng-deep .placeholder-activo { color: #ffffff; animation: blink 1s step-start infinite; }': '::ng-deep .placeholder-activo { color: #ffffff !important; animation: blink 1s step-start infinite; }',
    '::ng-deep .placeholder-inactivo { color: #5c6370; }': '::ng-deep .placeholder-inactivo { color: #5c6370 !important; }'
}

for old, new_class in replacements.items():
    content = content.replace(old, new_class)

with open('src/app/consola-codigo/consola-codigo.component.scss', 'w', encoding='utf-8') as f:
    f.write(content)
