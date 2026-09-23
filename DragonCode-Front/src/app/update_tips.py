import sys
import re

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/mapa-aventura/mapa-aventura.component.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Modify iniciarCicloConsejos
old_iniciar = '''  iniciarCicloConsejos() {
    // Primer consejo aleatorio entre 20 y 30 seg
    this.programarSiguienteConsejo();
  }'''
new_iniciar = '''  iniciarCicloConsejos() {
    // Mostrar el primer consejo casi de inmediato al entrar (solo 1 segundo de cortesía)
    setTimeout(() => {
      this.mostrarConsejoAleatorio();
    }, 1000);
  }'''
content = content.replace(old_iniciar, new_iniciar)


# 2. Add 25 new tips
new_tips = '''
    { texto: "Sabias que la primera programadora de la historia fue una mujer humana llamada Ada Lovelace? Ojala heredaras una fraccion de su intelecto.", imagen: "assets/images/exprecionsedraco/pensativo.png" },
    { texto: "Alan Turing es considerado el padre de la computacion. Nosotros los dragones lo respetamos, resolvio enigmas casi tan complejos como mis acertijos.", imagen: "assets/images/exprecionsedraco/base.png" },
    { texto: "Hay 10 tipos de personas en el mundo: los que entienden binario y los que no. Es un chiste clasico, ríete humano.", imagen: "assets/images/exprecionsedraco/feliz.png" },
    { texto: "Por que los programadores prefieren el modo oscuro? Porque la luz atrae a los bugs. Aunque en este calabozo, la oscuridad atrae peores cosas.", imagen: "assets/images/exprecionsedraco/pensativo.png" },
    { texto: "Un programador es una maquina que convierte cafe en codigo. Espero que tengas tu pócima lista.", imagen: "assets/images/exprecionsedraco/base.png" },
    { texto: "Un buen desarrollador es aquel que mira a ambos lados de la calle antes de cruzar una via de un solo sentido. Nunca confies en los usuarios.", imagen: "assets/images/exprecionsedraco/pensativo.png" },
    { texto: "Sabias que el nombre 'Python' no viene de la serpiente, sino de los Monty Python? Un humor muy peculiar para unos humanos tan simples.", imagen: "assets/images/exprecionsedraco/sorpendido.png" },
    { texto: "Fracasaste otra vez? Excelente. En la programacion, fallar es solo descubrir una forma mas de no hacer las cosas. Sigue intentando.", imagen: "assets/images/exprecionsedraco/feliz.png" },
    { texto: "El mejor mensaje de error es el que nunca ocurre. El segundo mejor es el que realmente te dice que demonios hiciste mal.", imagen: "assets/images/exprecionsedraco/base.png" },
    { texto: "Dicen que el optimismo es un riesgo laboral en la programacion. Siempre asume que tu codigo fallara, y preparate para cuando lo haga.", imagen: "assets/images/exprecionsedraco/confundido.png" },
    { texto: "Sabias que el primer lenguaje de programacion de alto nivel fue Fortran en 1957? Antes de eso, codificar era un verdadero hechizo arcaico.", imagen: "assets/images/exprecionsedraco/pensativo.png" },
    { texto: "Te atoraste? Levantate, camina un poco, hablale a un pato de goma. O a mi, aunque dudo que entiendas mis majestuosas respuestas.", imagen: "assets/images/exprecionsedraco/feliz.png" },
    { texto: "El codigo que no pruebas es como un dragon dormido: nunca sabes cuando va a despertar y quemar toda la aldea.", imagen: "assets/images/exprecionsedraco/enojado.png" },
    { texto: "Ctrl+Z es tu mejor amigo, pero no te confies. A veces ni la magia del tiempo puede salvar una mala arquitectura.", imagen: "assets/images/exprecionsedraco/asustado.png" },
    { texto: "Un desarrollador entra a un bar y pide 1 cerveza, 0 cervezas, 999999 cervezas y -1 cerveza. El barman explota. Limpia tus inputs.", imagen: "assets/images/exprecionsedraco/feliz.png" },
    { texto: "Si tu codigo funciona y no sabes por que, no lo toques. Pero te estare vigilando, eso es brujeria inaceptable.", imagen: "assets/images/exprecionsedraco/confundido.png" },
    { texto: "Sabias que la NASA uso procesadores de la consola de juegos original de Sony para su nave espacial Orion? Hasta la tecnologia antigua tiene sus trucos.", imagen: "assets/images/exprecionsedraco/sorpendido.png" },
    { texto: "El hardware es lo que puedes golpear cuando el software no funciona. Te sugiero que no golpees tu monitor, todavia lo necesitamos.", imagen: "assets/images/exprecionsedraco/base.png" },
    { texto: "Programar es un 10 por ciento escribir codigo y un 90 por ciento entender por que no funciona lo que acabas de escribir. Paciencia, aprendiz.", imagen: "assets/images/exprecionsedraco/pensativo.png" },
    { texto: "No te sientas mal si tienes que buscar en internet como centrar un div. He visto archimagos hacer trampa con cosas mucho mas simples.", imagen: "assets/images/exprecionsedraco/feliz.png" },
    { texto: "Tu talento no determina tu limite en la programacion, tu persistencia si. Y quizas un poco de la sabiduria que te estoy prestando.", imagen: "assets/images/exprecionsedraco/base.png" },
    { texto: "Cual es el animal favorito de un programador? El raton. Patetico, los dragones somos infinitamente superiores.", imagen: "assets/images/exprecionsedraco/confundido.png" },
    { texto: "Sabias que el dominio '.tv' pertenece en realidad a Tuvalu, una pequeña isla? Venden su extension para que ustedes vean sus series. Astutos.", imagen: "assets/images/exprecionsedraco/sorpendido.png" },
    { texto: "Recuerda: la maquina hara exactamente lo que le digas, no lo que tu querias decirle. Se especifico.", imagen: "assets/images/exprecionsedraco/enojado.png" },
    { texto: "Todos los programadores experimentados tienen un cementerio de proyectos inacabados. Espero que este calabozo no sea uno de los tuyos.", imagen: "assets/images/exprecionsedraco/pensativo.png" }
  ];'''

content = re.sub(r'(\{\s*texto:\s*"Comentar tu cdigo.*?\];)', lambda m: m.group(1).replace('];', ',') + new_tips, content, flags=re.DOTALL)
# Wait, replacing with a regex might have encoding issues since `cdigo` has a weird char in Python string.
# I will use a generic substitution.
