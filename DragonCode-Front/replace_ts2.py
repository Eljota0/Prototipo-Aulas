import re

with open('src/app/consola-codigo/consola-codigo.component.ts', 'r', encoding='utf-8') as f:
    content = f.read()

if 'ViewEncapsulation' not in content:
    content = content.replace("import { Component, Input, Output, EventEmitter, ViewChildren, QueryList, ElementRef, inject } from '@angular/core';", "import { Component, Input, Output, EventEmitter, ViewChildren, QueryList, ElementRef, inject, ViewEncapsulation } from '@angular/core';")

content = re.sub(r'(styleUrl:\s*\'\./consola-codigo\.component\.scss\')', r'\1,\n  encapsulation: ViewEncapsulation.None', content)

with open('src/app/consola-codigo/consola-codigo.component.ts', 'w', encoding='utf-8') as f:
    f.write(content)
