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
  descripcion?: string;
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

  /**
   * Catálogo visual temporal.
   *
   * Los personajes permanecen en el frontend hasta que se decida activar la
   * persistencia de compras y equipamiento en Supabase.
   */
  readonly catalogoSoloVisual = true;
  avatars: Avatar[] = [
    {
      id: 1,
      nombre_skin: 'Drako Base',
      url_imagen: 'assets/images/tienda/avatares/drakobase.png',
      precio_estrellas: 5,
      activo: true,
      desbloqueado: true,
      descripcion: 'El clásico y confiable compañero de código.'
    },
    {
      id: 2,
      nombre_skin: 'Drako Aprendiz',
      url_imagen: 'assets/images/tienda/avatares/drakoaprendiz.png',
      precio_estrellas: 5,
      activo: true,
      desbloqueado: false,
      descripcion: 'Listo para absorber nuevos conocimientos.'
    },
    {
      id: 3,
      nombre_skin: 'Drako Capa',
      url_imagen: 'assets/images/tienda/avatares/drakocapa.png',
      precio_estrellas: 5,
      activo: true,
      desbloqueado: false,
      descripcion: 'Elegancia mágica para tus sesiones.'
    },
    {
      id: 4,
      nombre_skin: 'Drako Chancla',
      url_imagen: 'assets/images/tienda/avatares/drakochancla.png',
      precio_estrellas: 5,
      activo: true,
      desbloqueado: false,
      descripcion: 'Disciplina legendaria para dominar cada reto.'
    },
    {
      id: 5,
      nombre_skin: 'Drako Haaland',
      url_imagen: 'assets/images/tienda/avatares/drakohaaland.png',
      precio_estrellas: 5,
      activo: true,
      desbloqueado: false,
      descripcion: 'Potencia imparable para resolver desafíos.'
    },
    {
      id: 6,
      nombre_skin: 'Drako Mbappé',
      url_imagen: 'assets/images/tienda/avatares/drakombappe.png',
      precio_estrellas: 5,
      activo: true,
      desbloqueado: false,
      descripcion: 'Velocidad máxima para avanzar en el código.'
    }
  ];
  readonly totalEstrellasCatalogo = this.avatars.reduce(
    (total, avatar) => total + avatar.precio_estrellas,
    0
  );
  userProfile: UserProfile | null = null;
  private sub?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.sub = this.userService.getProfile().subscribe(p => this.userProfile = p);
    if (!this.catalogoSoloVisual) {
      this.cargarCatalogo();
    }
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
    if (this.catalogoSoloVisual) return;
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
