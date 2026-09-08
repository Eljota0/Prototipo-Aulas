import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastComponent } from './components/toast/toast.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, CommonModule],
  templateUrl: './app.component.html', // Shell con router-outlet + footer global + toast
  styleUrl: './app.component.scss'
})
export class AppComponent {
  mostrarFooter: boolean = true;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Los niveles usan todo el alto disponible, también en sus rutas locales
      // de prototipo. El pie global provocaría un desplazamiento innecesario.
      const esNivel = event.urlAfterRedirects.includes('/nivel/')
        || event.urlAfterRedirects.includes('/prototipo/nivel-');
      this.mostrarFooter = !esNivel;
    });
  }
}
