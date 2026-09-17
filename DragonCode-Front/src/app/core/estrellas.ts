/** Vista previa de RF-07. En partidas oficiales prevalece la respuesta del servidor. */
export function calcularEstrellas(vidasRestantes: number, ayudasUsadas: boolean): number {
  return Math.max(1, vidasRestantes - (ayudasUsadas ? 1 : 0));
}
