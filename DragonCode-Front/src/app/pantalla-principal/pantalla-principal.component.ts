import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerfilComponent } from '../perfil/perfil.component';
import { TiendaComponent } from '../tienda/tienda.component';
import { NotificationService } from '../services/notification.service';
import { UserService, UserProfile } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import {
  AulasService,
  AulaResponse,
  RetoPersonalizadoCreate,
  RetoPersonalizadoResponse,
  ParametrosEvaluacion
} from '../services/aulas.service';
import { ProgresoService } from '../services/progreso.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// ─── MODELOS DE DATOS ───────────────────────────────────────────
interface Rune {
  symbol:   string;
  top:      string;
  left:     string;
  color:    string;
  delay:    string;
  duration: string;
  fontSize: string;
}

interface WorldProgress {
  level:  number;
  name:   string;
  stars:  number;   // 0-3 desde la BD
}


import { LoaderService } from '../services/loader.service';

@Component({
  selector: 'app-pantalla-principal',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, PerfilComponent, TiendaComponent],
  templateUrl: './pantalla-principal.component.html',
  styleUrl:    './pantalla-principal.component.scss'
})
export class PantallaPrincipalComponent implements OnInit {

  private notificationService = inject(NotificationService);
  private userService         = inject(UserService);
  private authService         = inject(AuthService);
  private aulasService        = inject(AulasService);
  private progresoService     = inject(ProgresoService);
  private loaderService       = inject(LoaderService);
  private router              = inject(Router);

  // ── ESTADO: Perfil Usuario ───────────────────────────────────────
  userProfile$!: Observable<UserProfile>;

  // ── ESTADO: Notificaciones ──────────────────────────────────────
  isNotifOpen   = false;
  notifications: string[] = [];

  // ── ESTADO: Modal Salir ─────────────────────────────────────────
  isLogoutModalOpen = false;

  // ── ESTADO: Runas de fondo ──────────────────────────────────────
  runes: Rune[] = [];

  // ── ESTADO: Saludo dinámico ─────────────────────────────────────
  greetingTemplate  = '';
  greetingMessage$!: Observable<string>;
  greetingBg        = '';

  // ── ESTADO: Avatar ───────────────────────────────────────────────
  selectedAvatar = 'assets/images/tienda/avatares/drakobase.png';

  // ── ESTADO: Modales ──────────────────────────────────────────────
  isShopOpen       = false;
  isProfileOpen    = false;
  isStarsModalOpen = false;

  // ── DATOS: Mundos y progreso de estrellas ────────────────────────
  worldsProgress: WorldProgress[] = Array.from({ length: 10 }, (_, i) => ({
    level: i + 1,
    name:  `Mundo ${i + 1}`,
    stars: 0
  }));

  // ── ESTADO: Formulario de Creación (Parte 1) ─────────────────
  tituloReto         = '';
  nivelSeleccionado  = 1;             // ID del nivel oficial (El Ogro = 1)
  cargandoCrearAula  = false;
  aulaCreada: AulaResponse | null = null;

  parametrosReto: ParametrosEvaluacion = {
    tiempo_3_estrellas:        60,
    tiempo_2_estrellas:        120,
    intentos_max_sin_penalidad: 2
  };

  // Catálogo de niveles disponibles para reutilizar
  nivelesDisponibles = [
    { id: 1, nombre: 'Nivel 1: El Ogro', descripcion: 'Programación secuencial con movimiento' },
    { id: 2, nombre: 'Nivel 2: Taladro a Vapor', descripcion: 'Eventos y condicionales básicos' }
  ];

  // ── ESTADO: Modal Unirse a Aula ──────────────────────────────────
  isUnirseAulaOpen = false;
  codigoAulaInput  = '';
  cargandoUnirse   = false;
  aulasInscritas: AulaResponse[] = []; // Aulas en las que está el jugador
  
  // MODAL CREAR AULA (ANFITRIÓN)
  isCrearAulaOpen  = false;
  pasoCrearAula    = 1;
  creandoNuevaAula = false;
  nuevoNombreAula  = '';
  cargandoAulasInscritas = false;
  mostrarFormularioUnirse = false;          // Toggle para mostrar input de código


  // ── CICLO DE VIDA ────────────────────────────────────────────────
  ngOnInit(): void {
    // Ocultar el loader global por si el usuario entra directo a esta ruta o recarga la página
    setTimeout(() => {
      this.loaderService.ocultar();
    }, 300);

    this.userService.fetchProfile().subscribe({
      error: () => this.notificationService.show('No se pudo cargar tu información', 'error')
    });

    this.userProfile$    = this.userService.getProfile();
    this.greetingMessage$ = this.userProfile$.pipe(
      map(profile => this.greetingTemplate.replace('{nombre}', profile.nombre))
    );

    this.generateRunes();
    this.setGreeting();

    // Cargar el progreso real de estrellas desde la BD
    this.cargarMiProgreso();
  }

  /** Consulta el backend y actualiza las estrellas reales de cada mundo. */
  private cargarMiProgreso(): void {
    this.progresoService.miProgreso().subscribe({
      next: (progresos) => {
        // El backend retorna lista de { reto_nivel_id, estrellas_obtenidas, ... }
        // reto_nivel_id coincide con el número de nivel (1-10)
        progresos.forEach(p => {
          const mundo = this.worldsProgress.find(w => w.level === p.reto_nivel_id);
          if (mundo) {
            mundo.stars = p.estrellas_obtenidas ?? 0;
          }
        });
      },
      // Si falla (usuario sin progreso aún), simplemente dejamos todos en 0
      error: () => {}
    });
  }

  // ── LÓGICA: Generador de runas ───────────────────────────────────
  private generateRunes(): void {
    const symbols = ['{}', '[;]', '*', '01', '=>', '</>', '✧', '✦', 'Δ', '∇', 'Ω', '⎈', '≈', '⟁', '✧', '✦', 'Δ', 'Ω', '⎈'];
    const colors  = ['#D8BFD8', '#ADD8E6', '#FFB6C1', '#FFFFFF'];

    for (let i = 0; i < 45; i++) {
      let randomTop  = Math.random() * 100;
      let randomLeft = Math.random() * 100;

      if (randomTop > 25 && randomTop < 75 && randomLeft > 25 && randomLeft < 75) {
        randomLeft = Math.random() > 0.5 ? Math.random() * 20 : 80 + Math.random() * 20;
      }

      this.runes.push({
        symbol:   symbols[Math.floor(Math.random() * symbols.length)],
        top:      randomTop  + '%',
        left:     randomLeft + '%',
        color:    colors[Math.floor(Math.random() * colors.length)],
        delay:    (Math.random() * 5)     + 's',
        duration: (Math.random() * 5 + 4) + 's',
        fontSize: (Math.floor(Math.random() * 6) + 10) + 'px',
      });
    }
  }

  // ── LÓGICA: Saludo según hora ────────────────────────────────────
  private setGreeting(): void {
    const hour = new Date().getHours();

    const morning   = [
      '¡Buenos días, {nombre}! ¿Listo para forjar código hoy?',
      '¡Despierta, {nombre}! El reino del código te espera.',
      '¡Los dragones madrugadores conquistan más reinos, {nombre}!',
      '¡Mañana de aventuras, {nombre}! ¿Qué misión atacamos hoy?',
      '¡Buenos días, valiente {nombre}! El conocimiento aguarda tu llegada.',
    ];
    const afternoon = [
      '¡Buenas tardes, {nombre}! Sigue conquistando el código.',
      '¡Tarde productiva, {nombre}! Los dragones no descansan.',
      '¡Hola de nuevo, {nombre}! La tarde es perfecta para aprender.',
      '¡Sigue así, {nombre}! El código no se forja solo.',
      'Tarde a tarde, un paso más al dominio total, {nombre}.',
    ];
    const night     = [
      '¡Buenas noches, {nombre}! Los mejores programadores trabajan de noche.',
      '¡Sesión nocturna, {nombre}! La oscuridad hace brillar el código.',
      'Los dragones nocturnos son los más legendarios, {nombre}.',
      '¡Un último reto antes de descansar, {nombre}!',
      'Las mejores ideas nacen bajo las estrellas, {nombre}.',
    ];

    let pool: string[];
    if (hour >= 6 && hour < 12) {
      pool = morning;
      this.greetingBg = 'assets/images/pantallaprincipal/fondodia.png';
    } else if (hour >= 12 && hour < 19) {
      pool = afternoon;
      this.greetingBg = 'assets/images/pantallaprincipal/fondotarde.png';
    } else {
      pool = night;
      this.greetingBg = 'assets/images/pantallaprincipal/fondonoche.png';
    }

    this.greetingTemplate = pool[Math.floor(Math.random() * pool.length)];
  }


  // ── MODAL: Tienda ────────────────────────────────────────────────
  openShop():  void { this.isShopOpen = true;  }
  closeShop(): void { this.isShopOpen = false; }

  // ── MODAL: Perfil ────────────────────────────────────────────────
  openProfile():  void { this.isProfileOpen = true;  }
  closeProfile(): void { this.isProfileOpen = false; }

  // ── MODAL: Estrellas ─────────────────────────────────────────────
  openStarsModal(): void {
    this.isStarsModalOpen = true;
    // Siempre refrescar desde el backend al abrir el modal
    // para mostrar el progreso más reciente sin recargar la página
    this.cargarMiProgreso();
  }
  closeStarsModal(): void { this.isStarsModalOpen = false; }

  // ── EVENTO: Avatar cambiado desde la tienda ──────────────────────
  onAvatarChanged(newAvatarPath: string): void {
    this.selectedAvatar = newAvatarPath;
  }

  // ── ACCIONES: Notificaciones ─────────────────────────────────────
  toggleNotif():    void { this.isNotifOpen = !this.isNotifOpen; }
  closeNotif():     void { this.isNotifOpen = false;             }
  markAllAsRead():  void { this.notifications = [];              }

  // ── ACCIONES: Salir ──────────────────────────────────────────────
  openLogout():  void { this.isLogoutModalOpen = true;  }
  closeLogout(): void { this.isLogoutModalOpen = false; }
  confirmLogout(): void {
    this.isLogoutModalOpen = false;
    this.authService.logout();
  }


  // ── MODAL: Crear Aula — Asistente de 3 pasos ────────────────────

  openCrearAula(): void {
    this.isCrearAulaOpen   = true;
    this.pasoCrearAula     = 1;
    this.creandoNuevaAula  = false;
    this.nuevoNombreAula   = '';
    this.aulaCreada        = null;
    this.aulaSeleccionadaAdmin = null;
    this.jugadoresAulaLista = [];
    this.mostrarAgregarActividad = false;
    this.aulaParaActividad = null;
    this.parametrosReto    = { 
      tiempo_3_estrellas: 60, 
      tiempo_2_estrellas: 120, 
      intentos_max_sin_penalidad: 3,
      anti_copia: true,
      fases_seleccionadas: [1, 2, 3, 4]
    };

    // Cargar la lista de aulas creadas para mostrarlas inmediatamente en Paso 1
    this.aulasService.misAulas().subscribe({
      next: (aulas) => {
        this.userProfile$.subscribe(profile => {
          if (profile && profile.id) {
            this.misAulasLista = aulas.filter(a => a.anfitrion_id === profile.id);
          }
        });
      }
    });
  }

  closeCrearAula(): void { this.isCrearAulaOpen = false; }

  /** Iniciar creación de aula nueva */
  iniciarCreacionAula(): void {
    this.creandoNuevaAula = true;
    this.pasoCrearAula = 1; // Mantiene el paso 1 pero en modo creación (input)
  }

  /** Cancelar creación y volver a lista */
  cancelarCreacionAula(): void {
    this.creandoNuevaAula = false;
    this.nuevoNombreAula = '';
  }

  /** Paso 1 → 2: Validar nombre y avanzar */
  siguientePaso1(): void {
    if (!this.nuevoNombreAula.trim()) {
      this.notificationService.show('Escribe un nombre para el aula.', 'error');
      return;
    }
    this.pasoCrearAula = 2;
  }

  /** Paso 2 → 3: Nivel seleccionado, ir a parámetros */
  siguientePaso2(): void {
    if (this.parametrosReto.fases_seleccionadas!.length === 0) {
      this.notificationService.show('Debes seleccionar al menos una fase.', 'error');
      return;
    }
    this.pasoCrearAula = 3;
  }

  toggleFase(fase: number): void {
    const idx = this.parametrosReto.fases_seleccionadas!.indexOf(fase);
    if (idx > -1) {
      this.parametrosReto.fases_seleccionadas!.splice(idx, 1);
    } else {
      this.parametrosReto.fases_seleccionadas!.push(fase);
    }
  }

  /** Paso 3: Crear aula + reto personalizado en el backend */
  confirmarCrearAula(): void {
    if (this.parametrosReto.tiempo_3_estrellas >= this.parametrosReto.tiempo_2_estrellas) {
      this.notificationService.show('El tiempo para 3⭐ debe ser menor al de 2⭐.', 'error');
      return;
    }
    this.cargandoCrearAula = true;

    // A: Crear el aula
    this.aulasService.crearAula({ nombre_aula: this.nuevoNombreAula.trim() }).subscribe({
      next: (aula) => {
        // B: Crear el reto personalizado dentro del aula recién creada
        const datosReto: RetoPersonalizadoCreate = {
          reto_nivel_id:        this.nivelSeleccionado,
          titulo:               `${this.nuevoNombreAula} - Nivel ${this.nivelSeleccionado}`,
          recompensa_estrellas: 5,
          parametros:           { ...this.parametrosReto }
        };
        this.aulasService.crearRetoEnAula(aula.id, datosReto).subscribe({
          next: () => {
            this.aulaCreada        = aula;
            this.cargandoCrearAula = false;
            this.pasoCrearAula     = 4;  // Paso éxito
          },
          error: () => { this.cargandoCrearAula = false; }
        });
      },
      error: () => { this.cargandoCrearAula = false; }
    });
  }

  irAlAula(): void {
    if (this.aulaCreada) {
      // Volver al panel de dashboard principal
      this.pasoCrearAula = 1;
      this.creandoNuevaAula = false;
      
      this.aulasService.misAulas().subscribe({
        next: (aulas) => {
          this.userProfile$.subscribe(profile => {
            if (profile && profile.id) {
              this.misAulasLista = aulas.filter(a => a.anfitrion_id === profile.id);
              // Seleccionamos automáticamente el aula para mostrar los participantes
              if (!this.aulaSeleccionadaAdmin || this.aulaSeleccionadaAdmin !== this.aulaCreada!.id) {
                this.seleccionarAulaAdmin(this.aulaCreada!.id);
              }
            }
          });
        },
        error: () => this.notificationService.show('Error al cargar tus aulas', 'error')
      });
    } else {
      this.isCrearAulaOpen = false;
    }
  }

  copiarCodigo(codigo: string | undefined): void {
    if (codigo && this.aulaCreada) {
      const infoAula = `¡Únete a mi aventura en DragonCode!\n🏰 Aula: ${this.aulaCreada.nombre_aula}\n🔑 Código de acceso: ${codigo}`;
      navigator.clipboard.writeText(infoAula).then(() => {
        this.notificationService.show('¡Información del aula copiada!', 'success');
      }).catch(() => {
        this.notificationService.show('Error al copiar', 'error');
      });
    }
  }

  // 🌟🌟 ESTADO: Actividades (Estudiante)
  aulaActividadesSeleccionada: AulaResponse | null = null;
  actividadesAulaEstudiante: RetoPersonalizadoResponse[] = [];
  cargandoActividadesAula = false;

  /** Entrar a un aula en la que el usuario ya está inscrito (o que él mismo creó) */
  entrarAlAula(aulaId: string): void {
    // Buscar el aula en la lista
    const aula = this.aulasInscritas.find(a => a.id === aulaId) || this.misAulasLista.find(a => a.id === aulaId);
    if (!aula) return;
    this.verActividades(aula);
  }

  verActividades(aula: AulaResponse): void {
    this.aulaActividadesSeleccionada = aula;
    this.cargandoActividadesAula = true;
    this.aulasService.retosDelAula(aula.id).subscribe({
      next: (retos) => {
        this.actividadesAulaEstudiante = retos;
        this.cargandoActividadesAula = false;
      },
      error: () => {
        this.cargandoActividadesAula = false;
      }
    });
  }

  volverAulasInscritas(): void {
    this.aulaActividadesSeleccionada = null;
  }

  jugarReto(actividad: RetoPersonalizadoResponse): void {
    if (!this.aulaActividadesSeleccionada) return;
    localStorage.setItem('aulaActiva', this.aulaActividadesSeleccionada.id);
    localStorage.setItem('retoActivo', actividad.id);
    this.isUnirseAulaOpen = false;
    this.isAdminAulasOpen = false;
    this.router.navigate(['/aventura/nivel', actividad.reto_nivel_id]);
  }

  // 🚪🚪 MODAL: Unirse a Aula 🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪🚪

  openUnirseAula(): void {
    this.isUnirseAulaOpen        = true;
    this.codigoAulaInput         = '';
    this.mostrarFormularioUnirse = false;
    this.aulasInscritas          = [];
    this.cargandoAulasInscritas  = true;
    this.aulaActividadesSeleccionada = null; // Reiniciar estado

    this.aulasService.misAulas().subscribe({
      next:  (aulas) => { this.aulasInscritas = aulas; this.cargandoAulasInscritas = false; },
      error: ()     => { this.cargandoAulasInscritas = false; }
    });
  }

  closeUnirseAula(): void { this.isUnirseAulaOpen = false; }

  confirmarUnirseAula(): void {
    if (!this.codigoAulaInput.trim()) {
      this.notificationService.show('Ingresa el código del aula.', 'error');
      return;
    }
    this.cargandoUnirse = true;
    this.aulasService.unirseAula(this.codigoAulaInput).subscribe({
      next: () => {
        this.cargandoUnirse = false;
        this.notificationService.show('¡Te has unido al aula!', 'success');
        this.codigoAulaInput = '';
        this.mostrarFormularioUnirse = false;
        this.cargandoAulasInscritas = true;
        this.aulasService.misAulas().subscribe({
          next: aulas => {
            this.aulasInscritas = aulas;
            this.cargandoAulasInscritas = false;
          },
          error: () => { this.cargandoAulasInscritas = false; }
        });
      },
      error: () => { this.cargandoUnirse = false; }
    });
  }

  // ── ESTADO y MODAL: Administrar Aulas ─────────────────────────────
  isAdminAulasOpen       = false;
  misAulasLista: AulaResponse[] = [];       // Todas las aulas del usuario
  aulasPropiasLista: AulaResponse[] = [];   // Aulas que el usuario creó
  aulasUnidaLista: AulaResponse[] = [];     // Aulas a las que se unió
  aulaSeleccionadaAdmin: string | null = null;
  jugadoresAulaLista: any[] = [];
  cargandoJugadores = false;

  // Sub-panel agregar actividad
  mostrarAgregarActividad = false;
  aulaParaActividad: AulaResponse | null = null;

  openAdminAulas(): void {
    if (this.isAdminAulasOpen) {
      this.isAdminAulasOpen = false;
      return;
    }

    this.isAdminAulasOpen       = true;
    this.aulaSeleccionadaAdmin  = null;
    this.jugadoresAulaLista     = [];
    this.mostrarAgregarActividad = false;
    this.aulaParaActividad      = null;

    this.aulasService.misAulas().subscribe({
      next: (aulas) => {
        this.userProfile$.subscribe(profile => {
          if (profile && profile.id) {
            this.misAulasLista = aulas.filter(a => a.anfitrion_id === profile.id);
          }
        });
      },
      error: () => this.notificationService.show('Error al cargar tus aulas', 'error')
    });
  }

  closeAdminAulas(): void {
    this.isAdminAulasOpen = false;
  }

  seleccionarAulaAdmin(aulaId: string): void {
    if (this.aulaSeleccionadaAdmin === aulaId) {
      // Toggle off if already selected
      this.aulaSeleccionadaAdmin = null;
      this.jugadoresAulaLista = [];
      return;
    }

    this.aulaSeleccionadaAdmin   = aulaId;
    this.mostrarAgregarActividad = false;
    this.cargandoJugadores       = true;
    this.jugadoresAulaLista      = [];

    this.aulasService.jugadoresDelAula(aulaId).subscribe({
      next: (jugadores) => {
        this.jugadoresAulaLista = jugadores;
        this.cargandoJugadores  = false;
      },
      error: () => {
        this.notificationService.show('Error al cargar alumnos', 'error');
        this.cargandoJugadores = false;
      }
    });
  }

  eliminarAulaAdmin(aulaId: string): void {
    if (!confirm('¿Estás seguro de eliminar esta aula? Se borrarán todos los datos y estudiantes inscritos.')) {
      return;
    }
    
    this.aulasService.eliminarAula(aulaId).subscribe({
      next: () => {
        this.notificationService.show('Aula eliminada con éxito', 'success');
        this.misAulasLista = this.misAulasLista.filter(a => a.id !== aulaId);
        if (this.aulaSeleccionadaAdmin === aulaId) {
          this.aulaSeleccionadaAdmin = null;
          this.jugadoresAulaLista = [];
        }
      },
      error: () => {
        this.notificationService.show('Error al eliminar el aula', 'error');
      }
    });
  }

  abrirAgregarActividad(aula: AulaResponse): void {
    this.aulaParaActividad       = aula;
    this.mostrarAgregarActividad = true;
    // Pre-rellenar parámetros del wizard para este aula
    this.nuevoNombreAula  = aula.nombre_aula;
    this.pasoCrearAula    = 2;  // Saltar directamente a selección de nivel
    this.parametrosReto   = {
      tiempo_3_estrellas: 60,
      tiempo_2_estrellas: 120,
      intentos_max_sin_penalidad: 3,
      anti_copia: true,
      fases_seleccionadas: [1, 2, 3, 4]
    };
  }

  confirmarAgregarActividad(): void {
    if (!this.aulaParaActividad) return;
    if (!this.parametrosReto.fases_seleccionadas?.length) {
      this.notificationService.show('Debes seleccionar al menos una fase.', 'error');
      return;
    }
    if (this.parametrosReto.tiempo_3_estrellas >= this.parametrosReto.tiempo_2_estrellas) {
      this.notificationService.show('El tiempo para 3⭐ debe ser menor al de 2⭐.', 'error');
      return;
    }
    this.cargandoCrearAula = true;
    const datosReto: RetoPersonalizadoCreate = {
      reto_nivel_id:        this.nivelSeleccionado,
      titulo:               `${this.aulaParaActividad.nombre_aula} - Actividad`,
      recompensa_estrellas: 5,
      parametros:           { ...this.parametrosReto }
    };
    this.aulasService.crearRetoEnAula(this.aulaParaActividad.id, datosReto).subscribe({
      next: () => {
        this.cargandoCrearAula       = false;
        this.mostrarAgregarActividad = false;
        this.notificationService.show('¡Actividad agregada con éxito!', 'success');
      },
      error: () => { this.cargandoCrearAula = false; }
    });
  }
}
