import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private failsafeTimer: any;

  constructor() {}

  mostrar(mensaje: string = 'CARGANDO') {
    const loader = document.getElementById('global-loader');
    const textoNodo = document.getElementById('texto-carga-dinamico');
    
    if (textoNodo) {
      textoNodo.innerText = mensaje.toUpperCase();
    }
    if (loader) {
      loader.classList.remove('oculto');
      loader.style.display = ''; // Regla 2: Restaurar el display por defecto si fue ocultado
    }

    // Regla 3: El Failsafe / Tiempo de Gracia
    if (this.failsafeTimer) clearTimeout(this.failsafeTimer);
    this.failsafeTimer = setTimeout(() => {
      console.warn('Loader Failsafe: Forzando ocultación del loader tras 6 segundos.');
      this.ocultar();
    }, 6000);
  }

  ocultar() {
    const loader = document.getElementById('global-loader');
    
    // Trazabilidad inyectada
    console.log('[LoaderService] Ejecutando ocultar(). ¿Elemento loader encontrado en DOM?:', loader !== null);

    if (loader) {
      loader.classList.add('oculto');
      
      // Regla 2: Destrucción Total - Lo sacamos del flujo visual tras 300ms
      setTimeout(() => {
        loader.style.display = 'none';
        console.log('[LoaderService] display: none aplicado exitosamente.');
      }, 300);
    } else {
      console.warn('[LoaderService] ¡ADVERTENCIA! El elemento global-loader es null. No se pudo ocultar.');
    }

    if (this.failsafeTimer) {
      clearTimeout(this.failsafeTimer);
    }
  }
}
