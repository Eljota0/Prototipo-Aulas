import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ConfiguracionNivelAula,
  ConfiguracionNivelDos,
  ConfiguracionNivelFabrica,
  ConfiguracionNivelTres,
  MaterialFabrica,
  copiarConfiguracionNivel,
  crearConfiguracionNivelPredeterminada
} from '../core/configuracion-niveles-aula';

@Component({
  selector: 'app-configurador-nivel-aula',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configurador-nivel-aula.component.html',
  styleUrl: './configurador-nivel-aula.component.scss'
})
export class ConfiguradorNivelAulaComponent {
  private nivelActual = 1;
  private configuracionActual?: ConfiguracionNivelAula;

  @Input() fasesSeleccionadas: number[] = [];

  @Input()
  set nivelId(valor: number) {
    this.nivelActual = valor;
    if (this.configuracionActual?.nivel_id !== valor) {
      this.configuracionActual = crearConfiguracionNivelPredeterminada(valor);
    }
  }

  get nivelId(): number {
    return this.nivelActual;
  }

  @Input()
  set configuracion(valor: ConfiguracionNivelAula | undefined) {
    this.configuracionActual = copiarConfiguracionNivel(valor)
      ?? crearConfiguracionNivelPredeterminada(this.nivelActual);
  }

  get configuracion(): ConfiguracionNivelAula | undefined {
    return this.configuracionActual;
  }

  @Output() configuracionChange = new EventEmitter<ConfiguracionNivelAula | undefined>();

  readonly materiales: Array<{ valor: MaterialFabrica; etiqueta: string }> = [
    { valor: 'Diamante', etiqueta: 'Diamante' },
    { valor: 'Explosivo', etiqueta: 'Explosivo' },
    { valor: 'Carbon', etiqueta: 'Carbón' }
  ];

  get configuracionTaladro(): ConfiguracionNivelDos | undefined {
    return this.configuracionActual?.tipo === 'sensores_taladro'
      ? this.configuracionActual
      : undefined;
  }

  get configuracionVariables(): ConfiguracionNivelTres | undefined {
    return this.configuracionActual?.tipo === 'variables_cueva'
      ? this.configuracionActual
      : undefined;
  }

  get configuracionFabrica(): ConfiguracionNivelFabrica | undefined {
    return this.configuracionActual?.tipo === 'materiales_fabrica'
      ? this.configuracionActual
      : undefined;
  }

  get fasesVisibles(): number[] {
    return [...this.fasesSeleccionadas].sort((a, b) => a - b);
  }

  get distractoresVista(): number[] {
    return Array.from(
      { length: this.configuracionVariables?.distractores_por_fase ?? 0 },
      (_, indice) => indice
    );
  }

  get faseEjemplo(): number {
    return this.fasesVisibles[0] ?? 1;
  }

  get materialesEjemplo(): MaterialFabrica[] {
    return this.configuracionFabrica?.materiales_por_fase[String(this.faseEjemplo)] ?? [];
  }

  imagenMaterial(material: MaterialFabrica): string {
    const archivo: Record<MaterialFabrica, string> = {
      Carbon: 'carbon-v2.png',
      Diamante: 'diamante-v2.png',
      Explosivo: 'explosivo-v2.png'
    };
    return `/assets/images/aventura/fabrica/${archivo[material]}`;
  }

  actualizarNumero(campo: keyof ConfiguracionNivelDos, valor: number): void {
    const configuracion = this.configuracionTaladro;
    if (!configuracion || !Number.isFinite(Number(valor))) return;
    const limites: Partial<Record<keyof ConfiguracionNivelDos, [number, number]>> = {
      umbral_temperatura: [50, 200],
      presion_objetivo: [20, 100],
      profundidad_objetivo: [200, 600]
    };
    const limite = limites[campo];
    if (!limite) return;
    configuracion[campo] = Math.min(limite[1], Math.max(limite[0], Math.round(Number(valor)))) as never;
    this.notificarCambio();
  }

  actualizarDistractores(valor: number): void {
    const configuracion = this.configuracionVariables;
    if (!configuracion) return;
    configuracion.distractores_por_fase = Math.min(4, Math.max(0, Math.round(Number(valor))));
    this.notificarCambio();
  }

  agregarMaterial(fase: number, material: MaterialFabrica): void {
    const configuracion = this.configuracionFabrica;
    if (!configuracion || !this.materialPermitido(fase, material)) return;
    const materiales = configuracion.materiales_por_fase[String(fase)] ?? [];
    if (materiales.length >= 10) return;
    configuracion.materiales_por_fase[String(fase)] = [...materiales, material];
    this.notificarCambio();
  }

  quitarMaterial(fase: number, indice: number): void {
    const configuracion = this.configuracionFabrica;
    if (!configuracion) return;
    const materiales = configuracion.materiales_por_fase[String(fase)] ?? [];
    if (materiales.length <= 1) return;
    configuracion.materiales_por_fase[String(fase)] = materiales.filter((_, posicion) => posicion !== indice);
    this.notificarCambio();
  }

  identificarMaterial(indice: number): number {
    return indice;
  }

  materialPermitido(fase: number, material: MaterialFabrica): boolean {
    const permitidos: Record<number, MaterialFabrica[]> = {
      1: ['Diamante'],
      2: ['Carbon', 'Explosivo'],
      3: ['Diamante', 'Explosivo'],
      4: ['Carbon', 'Diamante', 'Explosivo']
    };
    return permitidos[fase]?.includes(material) ?? false;
  }

  private notificarCambio(): void {
    this.configuracionChange.emit(copiarConfiguracionNivel(this.configuracionActual));
  }
}
