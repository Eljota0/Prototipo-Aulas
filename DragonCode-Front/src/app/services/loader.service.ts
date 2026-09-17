import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private failsafeTimer?: ReturnType<typeof setTimeout>;

  mostrar(mensaje: string = 'CARGANDO'): void {
    const loader = document.getElementById('global-loader');
    const textoNodo = document.getElementById('texto-carga-dinamico');

    if (textoNodo) {
      textoNodo.innerText = mensaje.toUpperCase();
    }
    if (loader) {
      loader.classList.remove('oculto');
      loader.style.display = '';
    }

    // Evita que una carga interrumpida deje la pantalla bloqueada.
    if (this.failsafeTimer) {
      clearTimeout(this.failsafeTimer);
    }
    this.failsafeTimer = setTimeout(() => {
      this.ocultar();
    }, 6000);
  }

  ocultar(): void {
    const loader = document.getElementById('global-loader');

    if (loader) {
      loader.classList.add('oculto');

      // Se espera la transición antes de retirar el cargador del flujo visual.
      setTimeout(() => {
        loader.style.display = 'none';
      }, 300);
    }

    if (this.failsafeTimer) {
      clearTimeout(this.failsafeTimer);
      this.failsafeTimer = undefined;
    }
  }
}
