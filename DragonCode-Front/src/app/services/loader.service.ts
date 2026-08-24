import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  constructor() {}

  mostrar(mensaje: string = 'CARGANDO') {
    const loader = document.getElementById('global-loader');
    const textoNodo = document.getElementById('texto-carga-dinamico');
    
    if (textoNodo) {
      textoNodo.innerText = mensaje.toUpperCase();
    }
    if (loader) {
      loader.classList.remove('oculto');
    }
  }

  ocultar() {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.classList.add('oculto');
    }
  }
}
