import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../services/notification.service';
import { UserService, UserProfile } from '../services/user.service';
import { Subscription } from 'rxjs';

export interface Avatar {
  id: number;
  nombre_skin: string;
  url_imagen: string;
  precio_estrellas: number;
  activo: boolean;
  desbloqueado: boolean;
}

@Component({
  selector: 'app-tienda',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tienda.component.html',
  styleUrl: './tienda.component.scss'
})
export class TiendaComponent implements OnInit, OnDestroy {
  @Input() avatarActual: string = '';
  @Output() closeModal = new EventEmitter<void>();
  @Output() avatarChanged = new EventEmitter<string>();

  isConfirmModalOpen = false;
  avatarToBuy: Avatar | null = null;
  cargandoCompra = false;

  avatars: Avatar[] = [];
  userProfile: UserProfile | null = null;
  private sub?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.sub = this.userService.getProfile().subscribe(p => this.userProfile = p);
    this.cargarCatalogo();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  cargarCatalogo(): void {
    this.userService.getAvatares().subscribe({
      next: (data) => this.avatars = data,
      error: () => this.notificationService.show('Error al cargar la tienda', 'error')
    });
  }

  onClose(): void {
    this.closeModal.emit();
  }

  selectAvatar(avatar: Avatar): void {
    if (this.avatarActual === avatar.url_imagen) return;
    
    if (avatar.desbloqueado || avatar.precio_estrellas === 0) {
      // Si ya lo tiene o es gratis (Drako Base), equiparlo directamente
      this.equipar(avatar);
    } else {
      // Si no lo tiene, confirmar compra
      this.avatarToBuy = avatar;
      this.isConfirmModalOpen = true;
    }
  }

  equipar(avatar: Avatar): void {
    this.userService.equiparAvatar(avatar.id).subscribe({
      next: () => {
        this.avatarChanged.emit(avatar.url_imagen);
        this.notificationService.show('Avatar equipado exitosamente', 'success');
        this.closeModal.emit();
      },
      error: () => this.notificationService.show('Error al equipar el avatar', 'error')
    });
  }

  confirmPurchase(): void {
    if (!this.avatarToBuy) return;
    this.cargandoCompra = true;
    this.userService.comprarAvatar(this.avatarToBuy.id).subscribe({
      next: (resp) => {
        this.cargandoCompra = false;
        this.isConfirmModalOpen = false;
        this.notificationService.show(resp.mensaje || '¡Compra exitosa!', 'success');
        
        // Actualizamos estado de estrellas optimista
        if (this.userProfile) {
           this.userService.updateProfileState({
             estrellas_totales: resp.estrellas_restantes,
             avatar_actual_id: this.avatarToBuy!.id
           });
        }
        this.avatarChanged.emit(this.avatarToBuy!.url_imagen);
        this.closeModal.emit();
      },
      error: (err) => {
        this.cargandoCompra = false;
        this.isConfirmModalOpen = false;
        this.avatarToBuy = null;
        this.notificationService.show(err.error?.detail || 'Error al comprar', 'error');
      }
    });
  }

  cancelPurchase(): void {
    this.isConfirmModalOpen = false;
    this.avatarToBuy = null;
  }
}
