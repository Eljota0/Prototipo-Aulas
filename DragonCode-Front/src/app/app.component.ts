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
      // Ocultar el pie de página si estamos en un nivel
      this.mostrarFooter = !event.urlAfterRedirects.includes('/nivel/');
    });
  }
}