import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AssetPreloaderService {
  precargarImagenes(rutas: string[]): Promise<void[]> {
    const promesas = rutas.map((ruta) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.src = ruta;
        img.onload = () => resolve();
        img.onerror = () => {
          console.warn(`Error al precargar la imagen: ${ruta}`);
          resolve(); // Resolvemos igual para no romper el Promise.all
        };
      });
    });

    return Promise.all(promesas);
  }
}
