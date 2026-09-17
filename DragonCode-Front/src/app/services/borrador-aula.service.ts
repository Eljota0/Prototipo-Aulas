import { Injectable } from '@angular/core';
import { AulaResponse, ParametrosEvaluacion } from './aulas.service';
import { ConfiguracionNivelUno, copiarConfiguracionNivel } from '../core/configuracion-niveles-aula';

export interface BorradorConfiguracionAula {
  modo: 'crear-aula' | 'agregar-actividad';
  nuevoNombreAula: string;
  nivelSeleccionado: number;
  parametrosReto: ParametrosEvaluacion;
  plazoSeleccionado: string;
  fechaLimiteActividad: string;
  aulaParaActividad: AulaResponse | null;
}

const CLAVE_BORRADOR = 'dragoncode:borrador-configuracion-aula';

/**
 * Conserva temporalmente el asistente mientras el profesor usa el constructor
 * visual del nivel 1. El borrador vive solo en la pestaña actual del navegador.
 */
@Injectable({ providedIn: 'root' })
export class BorradorAulaService {
  guardar(borrador: BorradorConfiguracionAula): void {
    sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify(borrador));
  }

  obtener(): BorradorConfiguracionAula | null {
    const valor = sessionStorage.getItem(CLAVE_BORRADOR);
    if (!valor) return null;
    try {
      return JSON.parse(valor) as BorradorConfiguracionAula;
    } catch {
      sessionStorage.removeItem(CLAVE_BORRADOR);
      return null;
    }
  }

  guardarMapa(configuracion: ConfiguracionNivelUno): boolean {
    const borrador = this.obtener();
    if (!borrador || borrador.nivelSeleccionado !== 1) return false;

    borrador.parametrosReto = {
      ...borrador.parametrosReto,
      fases_seleccionadas: Array.from(
        { length: configuracion.campana.totalNiveles },
        (_, indice) => indice + 1
      ),
      configuracion_nivel: copiarConfiguracionNivel(configuracion)
    };
    this.guardar(borrador);
    return true;
  }

  consumir(): BorradorConfiguracionAula | null {
    const borrador = this.obtener();
    sessionStorage.removeItem(CLAVE_BORRADOR);
    return borrador;
  }
}
