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
  private readonly descripcionesVisuales: Record<string, string> = {
    'drakobase.png': 'El clásico y confiable compañero de código.',
    'drakoaprendiz.png': 'Listo para absorber nuevos conocimientos.',
    'drakocapa.png': 'Elegancia mágica para tus sesiones.',
    'drakochancla.png': 'Infalible para enderezar bugs malcriados',
    'drakohaaland.png': 'Potencia imparable para resolver desafíos.',
    'drakombappe.png': 'Velocidad máxima para avanzar en el código.',
    'drakograduado.png': 'Cada intento lo hizo más fuerte. Hoy celebra lo que nunca dejó de intentar.',
    'drakokarate.png': 'Cinturón negro en partir bugs, no teclados.',
    'drakopayaso.png': 'Si el código falla, que al menos no falten las risas.',
    'drakosacerdote.png': 'Que tu código compile y tus bugs encuentren la luz.',
    'drakosamurai.png': 'Un corte preciso y ese bug pasa a la historia.',
    'drakosuperheroe.png': 'Salva el día antes de que el último bug conquiste el servidor.',
    'drakovaquero.png': 'En este código no hay espacio para dos bugs, forastero.',
  };
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
        this.avatars = data.map(avatar => ({
          ...avatar,
          nombre_skin: avatar.nombre_skin.replace(/^Drako\b/, 'Draco'),
          descripcion: this.descripcionesVisuales[avatar.url_imagen.split('/').pop() ?? '']
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
      // Si ya lo tiene o es gratis (Draco Base), equiparlo directamente
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
