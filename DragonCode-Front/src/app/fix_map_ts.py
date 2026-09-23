import sys

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/mapa-aventura/mapa-aventura.component.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace showing logic
old_logic = '''    this.timerOcultar = setTimeout(() => {
      this.mostrandoConsejo = false;
      // Reprogramar despues del fadeout
      setTimeout(() => this.programarSiguienteConsejo(), 1000);
    }, 8000);'''

new_logic = '''    this.timerOcultar = setTimeout(() => {
      this.mostrandoConsejo = false;
      
      // Limpiar el consejoActual despues de que termine el fadeout (0.8s) para que la imagen vuelva a base.png
      setTimeout(() => {
        this.consejoActual = null;
      }, 800);
      
      // Reprogramar despues del fadeout
      setTimeout(() => this.programarSiguienteConsejo(), 1000);
    }, 8000);'''

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("TS updated for avatar base fix")
else:
    print("Could not find the TS logic to replace")
