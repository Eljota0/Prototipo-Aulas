import sys
import re

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/mapa-aventura/mapa-aventura.component.ts'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add properties
props = '''  // --- WIDGET CONSEJOS DRACO ---
  consejosDraco = [
    { texto: "Recuerda, un buen programador no copia y pega código de internet... sin entender primero por qué no funciona.", imagen: "assets/images/exprecionsedraco/pensativo.png" },
    { texto: "Si tu código compila a la primera sin errores, sospecha. La magia oscura tiene un precio muy alto.", imagen: "assets/images/exprecionsedraco/asustado.png" },
    { texto: "Sabías que el primer 'bug' de la historia fue una polilla real atrapada en una computadora? Espero que aquí solo encontremos monstruos virtuales.", imagen: "assets/images/exprecionsedraco/sorpendido.png" },
    { texto: "Tómate tu tiempo para explorar. El código espagueti se hace con prisa, pero una buena arquitectura toma su tiempo.", imagen: "assets/images/exprecionsedraco/feliz.png" },
    { texto: "He visto goblins de nivel 1 escribir mejor código fuente que algunos humanos. Demuéstrame que tú eres la excepción.", imagen: "assets/images/exprecionsedraco/base.png" },
    { texto: "Un verdadero maestro del teclado no le teme a la pantalla roja de errores; la lee, la comprende y la conquista.", imagen: "assets/images/exprecionsedraco/feliz.png" },
    { texto: "Estructurar bien tu lógica es como construir un buen calabozo: cada trampa debe tener su propósito.", imagen: "assets/images/exprecionsedraco/pensativo.png" },
    { texto: "No te rindas si te equivocas. Hasta los dragones más sabios quemaron sus propios pergaminos cuando aprendían a lanzar fuego.", imagen: "assets/images/exprecionsedraco/feliz.png" },
    { texto: "Dicen que el buen código se lee como la poesía. El tuyo se lee como un manual de instrucciones de una catapulta, pero vamos mejorando.", imagen: "assets/images/exprecionsedraco/base.png" },
    { texto: "Si te sientes frustrado, respira hondo. El teclado no tiene la culpa de que el compilador no entienda tus grandiosas ideas.", imagen: "assets/images/exprecionsedraco/confundido.png" },
    { texto: "Comentar tu código es como dejarle un mapa al tesoro a tu yo del futuro. No seas cruel contigo mismo.", imagen: "assets/images/exprecionsedraco/pensativo.png" }
  ];
  consejoActual: { texto: string; imagen: string } | null = null;
  mostrandoConsejo = false;
  timerConsejo: any;
  timerOcultar: any;

  iniciarCicloConsejos() {
    // Primer consejo aleatorio entre 20 y 30 seg
    this.programarSiguienteConsejo();
  }

  programarSiguienteConsejo() {
    const delay = Math.floor(Math.random() * (30000 - 20000 + 1)) + 20000;
    this.timerConsejo = setTimeout(() => {
      this.mostrarConsejoAleatorio();
    }, delay);
  }

  mostrarConsejoAleatorio() {
    const randomIndex = Math.floor(Math.random() * this.consejosDraco.length);
    this.consejoActual = this.consejosDraco[randomIndex];
    this.mostrandoConsejo = true;

    this.timerOcultar = setTimeout(() => {
      this.mostrandoConsejo = false;
      // Reprogramar despues del fadeout
      setTimeout(() => this.programarSiguienteConsejo(), 1000);
    }, 8000);
  }
'''

if 'consejosDraco =' not in content:
    content = content.replace('readonly totalNiveles = TOTAL_NIVELES;', 'readonly totalNiveles = TOTAL_NIVELES;\n' + props)

if 'this.iniciarCicloConsejos();' not in content:
    content = content.replace('ngOnInit(): void {', 'ngOnInit(): void {\n    this.iniciarCicloConsejos();')

if 'clearTimeout(this.timerConsejo);' not in content:
    content = content.replace('ngOnDestroy(): void {', 'ngOnDestroy(): void {\n    clearTimeout(this.timerConsejo);\n    clearTimeout(this.timerOcultar);')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("TS updated")
