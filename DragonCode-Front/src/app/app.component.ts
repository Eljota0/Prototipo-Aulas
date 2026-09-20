import { Component } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastComponent } from './components/toast/toast.component';
import { LoaderService } from './services/loader.service';
import { NotificationService } from './services/notification.service';

const MENSAJE_RECARGA_KEY = 'dragoncode:recarga-modulos';

export function esErrorCargaDiferida(error: unknown): boolean {
  const mensaje = error instanceof Error ? error.message : String(error ?? '');
  return /chunk|dynamically imported module|module script/i.test(mensaje);
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  mostrarFooter = true;
  private readonly rutasAuth = ['/login', '/crear-cuenta', '/recuperar-cuenta'];

  constructor(
    private router: Router,
    private loaderService: LoaderService,
    private notificationService: NotificationService
  ) {
    const mensajeRecarga = sessionStorage.getItem(MENSAJE_RECARGA_KEY);
    if (mensajeRecarga) {
      sessionStorage.removeItem(MENSAJE_RECARGA_KEY);
      setTimeout(() => this.notificationService.show(mensajeRecarga, 'success'));
    }

    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        const esNavegacionEntreAuth = this.esRutaAuth(this.router.url)
          && this.esRutaAuth(event.url);

        if (!esNavegacionEntreAuth) {
          this.loaderService.mostrar('CARGANDO...');
        }
      }

      if (event instanceof NavigationError && esErrorCargaDiferida(event.error)) {
        sessionStorage.setItem(
          MENSAJE_RECARGA_KEY,
          'DragonCode se actualizÃ³. Los niveles ya estÃ¡n listos para continuar.'
        );
        window.location.reload();
        return;
      }

      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        if (event instanceof NavigationEnd) {
          const esNivel = event.urlAfterRedirects.includes('/nivel/')
            || event.urlAfterRedirects.includes('/prototipo/nivel-')
            || event.urlAfterRedirects.includes('/aventura');
          this.mostrarFooter = !esNivel;
        }
        this.loaderService.ocultar();
      }
    });
  }

  private esRutaAuth(url: string): boolean {
    return this.rutasAuth.includes(url.split('?')[0]);
  }
}
