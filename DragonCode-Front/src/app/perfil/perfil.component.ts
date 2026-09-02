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

  // ── ESTADO: Perfil Usuario (State Management) ───────────────────
  userProfile$!: Observable<UserProfile>;

  ngOnInit(): void {
    this.userProfile$ = this.userService.getProfile();
  }

  // ── ESTADO DE LA VISTA ──
  currentView: 'perfil' | 'password' | 'confirmEmail' = 'perfil';

  // ── ESTADO DE EDICIÓN EN LÍNEA ──
  // Guarda el nombre del campo que se está editando ('nombre', 'apellido', 'email')
  editingField: string | null = null;
  // Guarda el valor temporal mientras se edita para poder cancelar
  editingValue: string = '';
  
  // ── ESTADO PARA CONFIRMAR CORREO ──
  pendingEmail: string = '';
  confirmEmailPass: string = '';
  mostrarClaveCorreo: boolean = false;

  toggleClaveCorreo(): void {
    this.mostrarClaveCorreo = !this.mostrarClaveCorreo;
  }



  // ── DATOS DE CONTRASEÑA ──
  passwordData = {
    oldPass: '',
    newPass: '',
    confirmPass: ''
  };
  passwordError: boolean = false;
  
  // ── ESTADOS DE VISIBILIDAD DE CONTRASEÑA ──
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

  // ── ESTADO DE RECUPERACIÓN ──
  recoverySent = false;

  // ── MÉTODOS DE VISTA ──
  onClose(): void {
    this.closeModal.emit();
  }

  goToPasswordView(): void {
    this.currentView = 'password';
    this.editingField = null; // Cierra cualquier edición activa
    this.recoverySent = false;
    this.passwordError = false;
    this.passwordData = { oldPass: '', newPass: '', confirmPass: '' };
  }

  goToProfileView(): void {
    this.currentView = 'perfil';
  }

  // ── MÉTODOS DE EDICIÓN ──
  toggleEdit(field: keyof UserProfile): void {
    this.editingField = field;
    // Clonamos el valor actual al valor temporal usando el estado síncrono
    const currentProfile = this.userService.getCurrentProfile();
    this.editingValue = String(currentProfile[field] || '');
  }

  saveField(field: keyof UserProfile): void {
    if (field === 'email') {
      // En vez de guardar inmediatamente, pedimos contraseña
      this.pendingEmail = this.editingValue;
      this.currentView = 'confirmEmail';
      this.confirmEmailPass = '';
      this.editingField = null;
      return;
    }

    // Actualización reactiva usando el UserService simulando backend
    this.userService.updateProfileState({ [field]: this.editingValue });
    this.editingField = null;
    this.notificationService.show('Información actualizada exitosamente', 'success');
  }

  cancelEdit(): void {
    this.editingField = null;
  }

  // ── MÉTODOS DE CORREO ──
  confirmEmailChange(): void {
    if (!this.confirmEmailPass) return;

    // Simulación: asumiremos que la contraseña correcta es "123456" 
    // TODO: Conectar con backend
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

  // ── MÉTODOS DE CONTRASEÑA ──
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
    // Reset errores
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

    // Dispara el toast global
    this.notificationService.show('Contraseña actualizada exitosamente', 'success');
    
    // Vuelve al perfil simulando éxito
    this.goToProfileView();
  }

  sendRecoveryEmail(): void {
    if (this.recoverySent) return; // No enviar dos veces
    
    this.recoverySent = true;
    
    // Dispara el toast global
    this.notificationService.show('Correo de recuperación enviado exitosamente', 'success');
    
    // Vuelve al perfil simulando que se cerró esa sección
    this.goToProfileView();
  }
}
