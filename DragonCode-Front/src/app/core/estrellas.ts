/** Vista previa de RF-07. En partidas oficiales prevalece la respuesta del servidor. */
export function calcularEstrellas(vidasRestantes: number, ayudasUsadas: boolean): number {
  return Math.max(1, vidasRestantes - (ayudasUsadas ? 1 : 0));
}

/** Logros de aventura; aulas conserva calcularEstrellas y su rúbrica propia. */
export function calcularEstrellasAventura(nivel: number, objetosUsados: boolean,
  tarjetasUsadas: boolean, vidasPerdidas: number, intentos: number): number {
  const logroExtra = nivel === 1 ? !tarjetasUsadas
    : nivel === 2 ? intentos === 1 : vidasPerdidas === 0;
  return 1 + Number(!objetosUsados) + Number(logroExtra);
}
