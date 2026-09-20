import re

with open('src/app/consola-codigo/consola-codigo.component.ts', 'r', encoding='utf-8') as f:
    content = f.read()

new_method = '''
  parsearSintaxis(texto: string, lineaIndex: number): SafeHtml {
    if (!this.modoPlantilla) {
      return this.sanitizer.bypassSecurityTrustHtml(texto.replace(/ /g, '&nbsp;'));
    }

    // 1. Escapar HTML base para evitar inyecciones de < y >
    let procesado = texto.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 2. Tokenizer (Regex reemplazos)
    // Funciones
    procesado = procesado.replace(/\\b(sobrecalentamiento|liberarVapor|apagarMotor|extraerCarbon|empacarCristales|recargarCarbon)\\b/g, '<span class="sh-function"></span>');
    // Keywords
    procesado = procesado.replace(/\\b(evento|si)\\b/g, '<span class="sh-keyword"></span>');
    // Object
    procesado = procesado.replace(/\\b(taladro)\\b/g, '<span class="sh-object"></span>');
    // Properties
    procesado = procesado.replace(/\\.(temperatura|pesoCarga|carbon)\\b/g, '.<span class="sh-property"></span>');
    // Numbers (solo si no estǭn dentro de tags)
    procesado = procesado.replace(/\\b(\\d+)\\b/g, '<span class="sh-number"></span>');
    // Operators
    procesado = procesado.replace(/(&lt;|&gt;|==)/g, '<span class="sh-operator"></span>');
    // Brackets
    procesado = procesado.replace(/([(){}\[\]])/g, '<span class="sh-bracket"></span>');

    // 3. Procesamiento de Placeholders (▯)
    const hayPlaceholderAnterior = this.lineas.slice(0, lineaIndex).some(l => l.texto.includes('▯'));
    let primerEncontradoEnLinea = false;
    
    // Necesitamos reemplazar caracter por caracter para ▯
    let finalHtml = '';
    for (let i = 0; i < procesado.length; i++) {
        if (procesado[i] === '▯') {
            if (!hayPlaceholderAnterior && !primerEncontradoEnLinea) {
                finalHtml += '<span class="placeholder-activo">▯</span>';
                primerEncontradoEnLinea = true;
            } else {
                finalHtml += '<span class="placeholder-inactivo">▯</span>';
            }
        } else {
            finalHtml += procesado[i];
        }
    }

    // 4. Espacios
    finalHtml = finalHtml.replace(/ /g, '&nbsp;');

    return this.sanitizer.bypassSecurityTrustHtml(finalHtml);
  }
'''

content = re.sub(r'  formatearGhost\(texto: string\): SafeHtml \{.*?return this\.sanitizer\.bypassSecurityTrustHtml\(antes \+ \'<span class="parpadeo">▯</span>\' \+ despues\);\s*\}', new_method, content, flags=re.DOTALL)

with open('src/app/consola-codigo/consola-codigo.component.ts', 'w', encoding='utf-8') as f:
    f.write(content)
