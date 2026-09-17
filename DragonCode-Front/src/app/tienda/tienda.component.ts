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
  cargandoEquipamiento = false;
  cargandoCatalogo = false;
  errorCatalogo = false;
  avatars: Avatar[] = [];

  // Solo aporta descripciones: precios, identificadores y propiedad vienen de la API.
  private readonly descripcionesVisuales: Avatar[] = [
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
    this.cargandoCatalogo = true;
    this.errorCatalogo = false;
    this.userService.getAvatares().subscribe({
      next: (data) => {
        this.avatars = data.map(avatar => ({ ...avatar, descripcion:
          this.descripcionesVisuales.find(visual => visual.url_imagen === avatar.url_imagen)?.descripcion
        }));
        this.cargandoCatalogo = false;
      },
      error: () => {
        this.cargandoCatalogo = false;
        this.errorCatalogo = true;
        this.notificationService.show('Error al cargar la tienda', 'error');
      }
    });
  }

  onClose(): void {
    if (this.cargandoCompra || this.cargandoEquipamiento) return;
    this.closeModal.emit();
  }

  selectAvatar(avatar: Avatar): void {
    if (this.cargandoCompra || this.cargandoEquipamiento || this.isConfirmModalOpen) return;
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
    if (this.cargandoEquipamiento) return;
    this.cargandoEquipamiento = true;
    this.userService.equiparAvatar(avatar.id).subscribe({
      next: () => {
        this.cargandoEquipamiento = false;
        this.userService.updateProfileState({ avatar_actual_id: avatar.id });
        this.avatarChanged.emit(avatar.url_imagen);
        this.notificationService.show('Avatar equipado exitosamente', 'success');
        this.closeModal.emit();
      },
      error: () => {
        this.cargandoEquipamiento = false;
        this.notificationService.show('No se pudo equipar. Tu avatar sigue desbloqueado; selecciónalo para reintentar.', 'error');
      }
    });
  }

  confirmPurchase(): void {
    if (!this.avatarToBuy || this.cargandoCompra || this.cargandoEquipamiento) return;
    const avatar = this.avatarToBuy;
    this.cargandoCompra = true;
    this.userService.comprarAvatar(avatar.id).subscribe({
      next: (resp) => {
        this.cargandoCompra = false;
        this.isConfirmModalOpen = false;
        this.avatarToBuy = null;
        avatar.desbloqueado = true;
        this.userService.updateProfileState({ estrellas_totales: resp.estrellas_restantes });
        // Comprar y equipar son operaciones distintas: no anunciar equipamiento sin confirmarlo.
        this.equipar(avatar);
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
    if (this.cargandoCompra) return;
    this.isConfirmModalOpen = false;
    this.avatarToBuy = null;
  }
}
