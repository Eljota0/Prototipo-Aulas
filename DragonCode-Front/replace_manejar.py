import re

with open('src/app/nivel-dos-prototipo/nivel-dos-prototipo.component.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update inicializarConsolaTexto to use ▯ instead of // Inserta tu código aquí
content = content.replace(
    "{ texto: '    // Inserta tu código aquí', color: '#6b7280', tieneError: false, esPlaceholder: true }",
    "{ texto: '    ▯', color: '#6b7280', tieneError: false }"
)

# 2. Update manejarUsoTarjeta
manejar = '''  manejarUsoTarjeta(tarjeta: TarjetaConfig): void {
    if (this.faseActual.numero !== 1) { this.ayudaUsada = true; return; }
    
    const lineas = this.layoutJuego.lineasCodigo;
    let codigoCompleto = lineas.map(l => l.texto).join('\\n');
    
    if (codigoCompleto.includes('▯')) {
      codigoCompleto = codigoCompleto.replace('▯', tarjeta.accion);
      
      const nuevasLineasText = codigoCompleto.split('\\n');
      
      this.layoutJuego.lineasCodigo.length = 0;
      nuevasLineasText.forEach((texto, idx) => {
        this.layoutJuego.lineasCodigo.push({
          texto,
          color: '#DCDCAA',
          tieneError: false,
          fija: idx === 0 || idx === nuevasLineasText.length - 1
        });
      });
      
      if (this.layoutJuego.consola) {
        this.layoutJuego.consola.lineas = this.layoutJuego.lineasCodigo;
      }
      
      this.pasoAndamiaje++;
    }
  }'''

content = re.sub(r'  manejarUsoTarjeta\(tarjeta: TarjetaConfig\): void \{.*?\s*\}\s*\}\s*this\.pasoAndamiaje\+\+;\s*\}', manejar, content, flags=re.DOTALL)

with open('src/app/nivel-dos-prototipo/nivel-dos-prototipo.component.ts', 'w', encoding='utf-8') as f:
    f.write(content)
