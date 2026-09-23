export interface NivelDragonCode {
  id: number;
  titulo: string;
  nombre: string;
  tema: string;
  descripcion: string;
  fases: number;
  resumenTecnico?: string;
}

/**
 * Fuente única para el mapa y la creación de actividades.
 * La lógica propia de cada fase sigue viviendo en su JSON editable.
 */
export const NIVELES_DRAGONCODE: readonly NivelDragonCode[] = [
  {
    id: 1,
    titulo: 'El Ogro',
    nombre: 'Nivel 1: El Ogro',
    tema: 'Algoritmos y secuencias',
    descripcion: 'Ordena instrucciones para guiar al ogro avaricioso hasta su tesoro.',
    resumenTecnico: `Este nivel enseña que las computadoras obedecen instrucciones de un modo muy específico: <strong>de arriba hacia abajo y en estricto orden secuencial</strong>. Fomenta el <strong>pensamiento algorítmico</strong> al hacerte trazar una ruta mental paso a paso antes de programar, demostrando cómo el orden exacto de tu código altera el resultado final.`,
    fases: 4
  },
  {
    id: 2,
    titulo: 'Taladro a Vapor',
    nombre: 'Nivel 2: Taladro a Vapor',
    tema: 'Eventos y condicionales',
    descripcion: 'Programa reacciones seguras para controlar una máquina minera.',
    fases: 3
  },
  {
    id: 3,
    titulo: 'La Cueva de las Variables',
    nombre: 'Nivel 3: La Cueva de las Variables',
    tema: 'Variables y tipos de datos',
    descripcion: 'Guarda valores booleanos, textos y números para crear hechizos.',
    fases: 4
  },
  {
    id: 4,
    titulo: 'Control de Calidad',
    nombre: 'Nivel 4: Control de Calidad',
    tema: 'Condicionales múltiples',
    descripcion: 'Clasifica materiales usando SI, SINO SI y SINO.',
    fases: 4
  },
  {
    id: 5,
    titulo: 'Producción en Masa',
    nombre: 'Nivel 5: Producción en Masa',
    tema: 'Bucles y decisiones',
    descripcion: 'Automatiza la fábrica repitiendo decisiones con MIENTRAS.',
    fases: 4
  }
] as const;

export const TOTAL_NIVELES = NIVELES_DRAGONCODE.length;

export function obtenerNivel(nivelId: number): NivelDragonCode | undefined {
  return NIVELES_DRAGONCODE.find(nivel => nivel.id === nivelId);
}
