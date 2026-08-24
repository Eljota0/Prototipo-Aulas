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



  // ── DATOS DE CONTRASEÑA ──
  passwordData = {
    oldPass: '',
    newPass: '',
    confirmPass: ''
  };
  passwordError: boolean = false;

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
  confirmPasswordChange(): void {
    const pass = this.passwordData.newPass || '';
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSymbol = /[\W_]/.test(pass);

    if (!hasUpper || !hasLower || !hasNumber || !hasSymbol) {
      this.passwordError = true;
      return;
    }

    this.passwordError = false;
    
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
