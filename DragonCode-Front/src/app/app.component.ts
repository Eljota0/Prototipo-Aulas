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

  constructor(private router: Router, private loaderService: LoaderService) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        const esNavegacionEntreAuth = this.esRutaAuth(this.router.url)
          && this.esRutaAuth(event.url);

        if (!esNavegacionEntreAuth) {
          this.loaderService.mostrar('CARGANDO...');
        }
      }

      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        if (event instanceof NavigationEnd) {
          const esNivel = event.urlAfterRedirects.includes('/nivel/')
            || event.urlAfterRedirects.includes('/prototipo/nivel-');
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
