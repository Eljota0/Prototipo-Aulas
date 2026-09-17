import { Component, DestroyRef, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';
import { UserService, UserProfile, ActualizarPerfilRequest } from '../services/user.service';
import { Observable, TimeoutError, finalize, timeout } from 'rxjs';

type CampoEditable = 'nombre' | 'apellido';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss'
})
export class PerfilComponent implements OnInit {
  @Input() avatarActual: string = 'assets/images/draco/dracobase1.png';
  @Output() closeModal = new EventEmitter<void>();

  constructor(
    private notificationService: NotificationService,
    private userService: UserService,
    private authService: AuthService
  ) {}

  userProfile$!: Observable<UserProfile>;
  private readonly destroyRef = inject(DestroyRef);
  guardandoPerfil = false;
  errorPerfil = '';
  guardandoPassword = false;
  errorPasswordDetalle = '';

  ngOnInit(): void {
    this.userProfile$ = this.userService.getProfile();
    this.destroyRef.onDestroy(() => this.limpiarPasswords());
  }

  currentView: 'perfil' | 'password' = 'perfil';
  editingField: CampoEditable | null = null;
  editingValue: string = '';

  passwordData = {
    oldPass: '',
    newPass: '',
    confirmPass: ''
  };
  passwordError: boolean = false;
  mostrarActual: boolean = false;
  mostrarNueva: boolean = false;
  mostrarConfirmacion: boolean = false;

  toggleActual(): void {
    this.mostrarActual = !this.mostrarActual;
  }

  toggleNueva(): void {
    this.mostrarNueva = !this.mostrarNueva;
  }

  toggleConfirmacion(): void {
    this.mostrarConfirmacion = !this.mostrarConfirmacion;
  }

  recoverySent = false;

  onClose(): void {
    if (this.guardandoPerfil || this.guardandoPassword) return;
    this.limpiarPasswords();
    this.closeModal.emit();
  }

  goToPasswordView(): void {
    if (this.guardandoPerfil || this.guardandoPassword) return;
    this.currentView = 'password';
    this.editingField = null;
    this.recoverySent = false;
    this.passwordError = false;
    this.limpiarPasswords();
    this.errorPasswordDetalle = '';
    this.errorVacio = this.errorRequisitos = this.errorCoincidencia = false;
  }

  goToProfileView(): void {
    if (this.guardandoPassword) return;
    this.limpiarPasswords();
    this.currentView = 'perfil';
  }

  toggleEdit(field: CampoEditable): void {
    if (this.guardandoPerfil || this.guardandoPassword) return;
    this.errorPerfil = '';
    this.editingField = field;
    const currentProfile = this.userService.getCurrentProfile();
    this.editingValue = String(currentProfile[field] || '');
  }

  saveField(field: CampoEditable): void {
    if (this.guardandoPerfil || this.guardandoPassword || this.editingField !== field) return;
    this.errorPerfil = '';
    const valor = this.editingValue.trim();
    const etiqueta = field === 'nombre' ? 'nombre' : 'apellido';
    if (!valor || Array.from(valor).length > 100 || /[\u0000-\u001f\u007f-\u009f]/.test(valor)) {
      this.errorPerfil = `Escribe un ${etiqueta} de entre 1 y 100 caracteres, sin saltos de línea.`;
      return;
    }

    if (valor === this.userService.getCurrentProfile()[field]) {
      this.editingField = null;
      return;
    }

    const cambios: ActualizarPerfilRequest = { [field]: valor };
    this.guardandoPerfil = true;
    this.userService.actualizarPerfil(cambios).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.guardandoPerfil = false)
    ).subscribe({
      next: () => {
        this.editingField = null;
        this.notificationService.show('Información actualizada exitosamente', 'success');
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.errorPerfil = 'Tu sesión expiró. Inicia sesión nuevamente para guardar los cambios.';
        } else if (error.status === 0) {
          this.errorPerfil = 'No se pudo conectar con el servidor. Comprueba tu conexión y vuelve a guardar.';
        } else if (error.status === 422) {
          this.errorPerfil = 'Revisa el dato: debe contener entre 1 y 100 caracteres de texto.';
        } else {
          this.errorPerfil = 'No se pudo confirmar el cambio. Vuelve a intentarlo.';
        }
      }
    });
  }

  cancelEdit(): void {
    if (this.guardandoPerfil) return;
    this.errorPerfil = '';
    this.editingField = null;
  }

  requisitosClave = {
    longitud: false,
    mayuscula: false,
    numero: false,
    especial: false
  };

  errorVacio: boolean = false;
  errorRequisitos: boolean = false;
  errorCoincidencia: boolean = false;

  validarPassword(clave: string): void {
    if (!clave) {
      this.requisitosClave = { longitud: false, mayuscula: false, numero: false, especial: false };
      return;
    }
    this.requisitosClave.longitud = Array.from(clave).length >= 6;
    this.requisitosClave.mayuscula = /[A-Z]/.test(clave);
    this.requisitosClave.numero = /[0-9]/.test(clave);
    this.requisitosClave.especial = /[^a-zA-Z0-9]/.test(clave);
  }

  confirmPasswordChange(): void {
    if (this.guardandoPassword || this.currentView !== 'password') return;
    this.errorPasswordDetalle = '';
    this.errorVacio = false;
    this.errorRequisitos = false;
    this.errorCoincidencia = false;

    if (!this.passwordData.oldPass || !this.passwordData.newPass || !this.passwordData.confirmPass) {
      this.errorVacio = true;
      this.notificationService.show('Por favor, completa todos los campos de contraseña.', 'error');
      return;
    }

    this.validarPassword(this.passwordData.newPass);
    const { longitud, mayuscula, numero, especial } = this.requisitosClave;
    if (!longitud || !mayuscula || !numero || !especial) {
      this.errorRequisitos = true;
      this.notificationService.show('La nueva contraseña no cumple con los requisitos de seguridad.', 'error');
      return;
    }

    if (this.passwordData.newPass !== this.passwordData.confirmPass) {
      this.errorCoincidencia = true;
      this.notificationService.show('Las contraseñas no coinciden.', 'error');
      return;
    }

    if (new TextEncoder().encode(this.passwordData.newPass).length > 72 ||
        /[\u0000-\u001f\u007f-\u009f]/.test(this.passwordData.newPass)) {
      this.errorRequisitos = true;
      this.errorPasswordDetalle = 'La nueva contraseña es demasiado larga o contiene saltos de línea. Usa una más corta (máximo 72 bytes).';
      return;
    }
    if (this.passwordData.newPass === this.passwordData.oldPass) {
      this.errorPasswordDetalle = 'La nueva contraseña debe ser diferente de la actual.';
      return;
    }

    this.guardandoPassword = true;
    this.userService.cambiarPassword({
      password_actual: this.passwordData.oldPass,
      password_nueva: this.passwordData.newPass
    }).pipe(
      timeout(20000),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.guardandoPassword = false)
    ).subscribe({
      next: () => {
        this.limpiarPasswords();
        this.userService.limpiarPerfil();
        this.notificationService.show('Contraseña actualizada. Inicia sesión con tu nueva contraseña.', 'success');
        this.authService.logout();
      },
      error: (error: HttpErrorResponse | TimeoutError) => {
        this.passwordData.oldPass = '';
        this.mostrarActual = this.mostrarNueva = this.mostrarConfirmacion = false;
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        if (status === 400) {
          this.errorPasswordDetalle = 'La contraseña actual es incorrecta. Escríbela nuevamente.';
        } else if (status === 401) {
          this.errorPasswordDetalle = 'Tu sesión expiró o ya no es válida. Cierra sesión y vuelve a entrar.';
        } else if (status === 409) {
          this.errorPasswordDetalle = 'La nueva contraseña debe ser distinta. Si cambiaste la clave en otra ventana, inicia sesión nuevamente.';
        } else if (status === 422) {
          this.errorPasswordDetalle = 'Revisa los requisitos y la longitud de las contraseñas.';
        } else {
          this.errorPasswordDetalle = 'No se pudo confirmar el cambio. Si se perdió la conexión, prueba iniciar sesión con la nueva contraseña antes de repetirlo.';
        }
      }
    });
  }

  private limpiarPasswords(): void {
    this.passwordData = { oldPass: '', newPass: '', confirmPass: '' };
    this.mostrarActual = this.mostrarNueva = this.mostrarConfirmacion = false;
    this.validarPassword('');
  }

  sendRecoveryEmail(): void {
    if (this.guardandoPassword) return;
    // El servicio de correo se integrará al final; no anunciar un envío simulado.
    this.errorPasswordDetalle = 'La recuperación por correo todavía no está disponible. Tu contraseña no ha cambiado.';
  }
}
