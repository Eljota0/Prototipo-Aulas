import re

with open('src/app/consola-codigo/consola-codigo.component.scss', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace classes with ::ng-deep
replacements = {
    '.sh-keyword': '::ng-deep .sh-keyword',
    '.sh-function': '::ng-deep .sh-function',
    '.sh-object': '::ng-deep .sh-object',
    '.sh-property': '::ng-deep .sh-property',
    '.sh-number': '::ng-deep .sh-number',
    '.sh-operator': '::ng-deep .sh-operator',
    '.sh-bracket': '::ng-deep .sh-bracket',
    '.placeholder-activo': '::ng-deep .placeholder-activo',
    '.placeholder-inactivo': '::ng-deep .placeholder-inactivo'
}

for old, new_class in replacements.items():
    content = content.replace(old + ' {', new_class + ' {')

with open('src/app/consola-codigo/consola-codigo.component.scss', 'w', encoding='utf-8') as f:
    f.write(content)
