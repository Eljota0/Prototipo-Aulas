import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../services/notification.service'; 
import { AuthService } from '../services/auth.service';
import { CyberLayoutComponent } from '../cyber-layout/cyber-layout.component';

@Component({
  selector: 'app-recuperar-cuenta',
  standalone: true,
  imports: [CyberLayoutComponent, RouterLink, FormsModule],
  templateUrl: './recuperar-cuenta.component.html',
  styleUrls: ['./recuperar-cuenta.component.scss']
})
export class RecuperarCuentaComponent {
  
  email: string = '';

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router
  ) {}

  submitForm(event: Event) {
    event.preventDefault(); 

    if (!this.email) {
      return;
    }

    this.authService.solicitarRecuperacion(this.email).subscribe({
      next: () => {
        this.notificationService.show(
          'Si el correo existe, hemos enviado un enlace de recuperación. Revisa tu bandeja de entrada y la carpeta de Spam.',
          'success'
        );
        this.router.navigate(['/login']);
      },
      error: () => {
        // Igualmente mostramos éxito por seguridad (anti-enumeración)
        this.notificationService.show(
          'Si el correo existe, hemos enviado un enlace de recuperación. Revisa tu bandeja de entrada y la carpeta de Spam.',
          'success'
        );
        this.router.navigate(['/login']);
      }
    });
  }
}