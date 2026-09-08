import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../services/notification.service';
import { UserService, UserProfile } from '../services/user.service';
import { Observable } from 'rxjs';

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
    private userService: UserService
  ) {}

  userProfile$!: Observable<UserProfile>;

  ngOnInit(): void {
    this.userProfile$ = this.userService.getProfile();
  }

  currentView: 'perfil' | 'password' | 'confirmEmail' = 'perfil';
  editingField: string | null = null;
  editingValue: string = '';
  pendingEmail: string = '';
  confirmEmailPass: string = '';
  mostrarClaveCorreo: boolean = false;

  toggleClaveCorreo(): void {
    this.mostrarClaveCorreo = !this.mostrarClaveCorreo;
  }

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
    this.closeModal.emit();
  }

  goToPasswordView(): void {
    this.currentView = 'password';
    this.editingField = null;
    this.recoverySent = false;
    this.passwordError = false;
    this.passwordData = { oldPass: '', newPass: '', confirmPass: '' };
  }

  goToProfileView(): void {
    this.currentView = 'perfil';
  }

  toggleEdit(field: keyof UserProfile): void {
    this.editingField = field;
    const currentProfile = this.userService.getCurrentProfile();
    this.editingValue = String(currentProfile[field] || '');
  }

  saveField(field: keyof UserProfile): void {
    if (field === 'email') {
      this.pendingEmail = this.editingValue;
      this.currentView = 'confirmEmail';
      this.confirmEmailPass = '';
      this.editingField = null;
      return;
    }

    // Mantiene la interacción visual; debe persistirse mediante la API real.
    this.userService.updateProfileState({ [field]: this.editingValue });
    this.editingField = null;
    this.notificationService.show('Información actualizada exitosamente', 'success');
  }

  cancelEdit(): void {
    this.editingField = null;
  }

  confirmEmailChange(): void {
    if (!this.confirmEmailPass) return;

    // TODO: Reemplazar esta simulación por verificación en el backend.
    if (this.confirmEmailPass === '123456') {
      this.userService.updateProfileState({ email: this.pendingEmail });
      this.notificationService.show('Cambio de correo exitoso', 'success');
      this.goToProfileView();
    } else {
      this.notificationService.show('Contraseña incorrecta', 'error');
    }
  }

  cancelEmailChange(): void {
    this.goToProfileView();
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
    this.requisitosClave.longitud = clave.length >= 6;
    this.requisitosClave.mayuscula = /[A-Z]/.test(clave);
    this.requisitosClave.numero = /[0-9]/.test(clave);
    this.requisitosClave.especial = /[^a-zA-Z0-9]/.test(clave);
  }

  confirmPasswordChange(): void {
    this.errorVacio = false;
    this.errorRequisitos = false;
    this.errorCoincidencia = false;

    if (!this.passwordData.oldPass || !this.passwordData.newPass || !this.passwordData.confirmPass) {
      this.errorVacio = true;
      this.notificationService.show('Por favor, completa todos los campos de contraseña.', 'error');
      return;
    }

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

    // TODO: Persistir el cambio mediante el backend antes de notificar éxito.
    this.notificationService.show('Contraseña actualizada exitosamente', 'success');
    this.goToProfileView();
  }

  sendRecoveryEmail(): void {
    if (this.recoverySent) return;

    // TODO: Conectar con el servicio real de recuperación de cuenta.
    this.recoverySent = true;
    this.notificationService.show('Correo de recuperación enviado exitosamente', 'success');
    this.goToProfileView();
  }
}
