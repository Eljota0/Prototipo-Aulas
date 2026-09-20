import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';
import { CyberLayoutComponent } from '../cyber-layout/cyber-layout.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CyberLayoutComponent, RouterLink, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {

  token: string = '';
  nuevaPassword: string = '';
  confirmarPassword: string = '';
  mostrarClave: boolean = false;
  mostrarConfirmacion: boolean = false;
  isLoading: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.notificationService.show('Enlace inválido o incompleto.', 'error');
      this.router.navigate(['/login']);
    }
  }

  toggleClave(): void {
    this.mostrarClave = !this.mostrarClave;
  }

  toggleConfirmacion(): void {
    this.mostrarConfirmacion = !this.mostrarConfirmacion;
  }

  submitForm(event: Event): void {
    event.preventDefault();

    if (!this.nuevaPassword || !this.confirmarPassword) {
      this.notificationService.show('Completa ambos campos.', 'error');
      return;
    }

    if (this.nuevaPassword !== this.confirmarPassword) {
      this.notificationService.show('Las contraseñas no coinciden.', 'error');
      return;
    }

    if (this.nuevaPassword.length < 6) {
      this.notificationService.show('La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }

    this.isLoading = true;
    this.authService.resetPassword(this.token, this.nuevaPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.notificationService.show('¡Contraseña actualizada exitosamente! Ya puedes iniciar sesión.', 'success');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading = false;
        const mensaje = err.error?.detail || 'El enlace ha expirado o no es válido. Solicita uno nuevo.';
        this.notificationService.show(mensaje, 'error');
      }
    });
  }
}
