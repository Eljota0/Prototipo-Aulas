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
  
  // Estado para visibilidad de contraseñas
  mostrarClave: boolean = false;
  mostrarConfirmacion: boolean = false;

  toggleClave(): void {
    this.mostrarClave = !this.mostrarClave;
  }

  toggleConfirmacion(): void {
    this.mostrarConfirmacion = !this.mostrarConfirmacion;
  }
  // Errores de validación visual
  passwordError: string = '';
  errorRequisitos: boolean = false;
  errorCoincidencia: boolean = false;
  errorTerminos: boolean = false;

  // Requisitos de la contraseña activa
  requisitosClave = {
    longitud: false,
    mayuscula: false,
    numero: false,
    especial: false
  };

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  validarPassword(clave: string): void {
    if (!clave) {
      this.requisitosClave = { longitud: false, mayuscula: false, numero: false, especial: false };
      return;
    }
    this.requisitosClave.longitud = clave.length >= 6;
    this.requisitosClave.mayuscula = /[A-Z]/.test(clave);
    this.requisitosClave.numero = /[0-9]/.test(clave);
    this.requisitosClave.especial = /[^a-zA-Z0-9]/.test(clave);
  }

  forjarCuenta(): void {
    // Limpiamos estados de error antes de validar
    this.errorRequisitos = false;
    this.errorCoincidencia = false;
    this.errorTerminos = false;

    // Validaciones básicas previas
    if (!this.nombre || !this.apellido || !this.email || !this.password || !this.confirmPassword) {
      this.notificationService.show('Por favor, completa todos los campos.', 'error');
      return;
    }

    // Fallo A: Requisitos de Seguridad
    const { longitud, mayuscula, numero, especial } = this.requisitosClave;
    if (!longitud || !mayuscula || !numero || !especial) {
      this.errorRequisitos = true;
      this.notificationService.show('La contraseña no cumple con los requisitos de seguridad.', 'error');
      return;
    }

    // Fallo B: Coincidencia de Contraseñas
    if (this.password !== this.confirmPassword) {
      this.errorCoincidencia = true;
      this.notificationService.show('Las contraseñas no coinciden.', 'error');
      return;
    }

    // Fallo C: Términos y Condiciones
    if (!this.aceptaTerminos) {
      this.errorTerminos = true;
      this.notificationService.show('Debes aceptar los términos y condiciones para continuar.', 'error');
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
