import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-crear-cuenta',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './crear-cuenta.component.html',
  styleUrl: './crear-cuenta.component.scss'
})
export class CrearCuentaComponent {
  // Campos del formulario
  nombre: string = '';
  apellido: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  aceptaTerminos: boolean = false;
  isLoading: boolean = false;

  // Errores de validación visual
  passwordError: string = '';

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  forjarCuenta(): void {
    // Validaciones del lado del cliente
    if (!this.nombre || !this.apellido || !this.email || !this.password || !this.confirmPassword) {
      this.notificationService.show('Por favor, completa todos los campos.', 'error');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.passwordError = '* Las contraseñas no coinciden.';
      return;
    }

    if (!this.aceptaTerminos) {
      this.notificationService.show('Debes aceptar los términos y condiciones.', 'error');
      return;
    }

    this.passwordError = '';
    this.isLoading = true;

    this.authService.register({
      nombre: this.nombre,
      apellido: this.apellido,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.notificationService.show('¡Cuenta forjada con éxito! Ya puedes iniciar sesión.', 'success');
        this.router.navigate(['/login']);
      },
      error: () => {
        // El interceptor ya muestra el mensaje de error del backend
        this.isLoading = false;
      }
    });
  }
}
