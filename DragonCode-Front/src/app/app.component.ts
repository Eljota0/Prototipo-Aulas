import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastComponent } from './components/toast/toast.component';
import { LoaderService } from './services/loader.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, CommonModule],
  templateUrl: './app.component.html', // Shell con router-outlet + footer global + toast
  styleUrl: './app.component.scss'
})
export class AppComponent {
  mostrarFooter: boolean = true;
  private rutasAuth = ['/login', '/crear-cuenta', '/recuperar-cuenta'];

  constructor(private router: Router, private loaderService: LoaderService) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        // Regla 1: Exclusión de Rutas (Navegación entre auth)
        const esNavegacionEntreAuth = this.esRutaAuth(this.router.url) && this.esRutaAuth(event.url);
        
        if (!esNavegacionEntreAuth) {
          this.loaderService.mostrar('CARGANDO...');
        }
      }

      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        if (event instanceof NavigationEnd) {
          // Ocultar el pie de página si estamos en un nivel
          this.mostrarFooter = !event.urlAfterRedirects.includes('/nivel/');
        }
        this.loaderService.ocultar();
      }
    });
  }

  private esRutaAuth(url: string): boolean {
    const urlBase = url.split('?')[0]; // Ignorar query params si los hay
    return this.rutasAuth.includes(urlBase);
  }
}