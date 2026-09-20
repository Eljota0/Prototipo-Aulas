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
  ParametrosEvaluacion,
  ReporteAula,
  SeguimientoActividad
} from '../services/aulas.service';
import { obtenerOrdenProgreso, ProgresoService } from '../services/progreso.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  NotificacionInterna,
  NotificacionesService
} from '../services/notificaciones.service';
import { NIVELES_DRAGONCODE } from '../core/catalogo-niveles';
import { ConfiguradorNivelAulaComponent } from '../configurador-nivel-aula/configurador-nivel-aula.component';
import {
  ConfiguracionNivelAula,
  crearConfiguracionNivelPredeterminada
} from '../core/configuracion-niveles-aula';
import { BorradorAulaService } from '../services/borrador-aula.service';

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

type PlazoActividad = 'sin_limite' | '30_minutos' | '1_hora' | '24_horas' | '7_dias' | 'personalizado';


import { LoaderService } from '../services/loader.service';

@Component({
  selector: 'app-pantalla-principal',
  standalone: true,
  imports: [
    RouterLink,
    CommonModule,
    FormsModule,
    PerfilComponent,
    TiendaComponent,
    ConfiguradorNivelAulaComponent
  ],
  templateUrl: './pantalla-principal.component.html',
  styleUrl:    './pantalla-principal.component.scss'
})
export class PantallaPrincipalComponent implements OnInit {

  private notificationService = inject(NotificationService);
  private userService         = inject(UserService);
  private authService         = inject(AuthService);
  private aulasService        = inject(AulasService);
  private progresoService     = inject(ProgresoService);
  private notificacionesService = inject(NotificacionesService);
  private loaderService       = inject(LoaderService);
  private router              = inject(Router);
  private borradorAulaService = inject(BorradorAulaService);

  // ── ESTADO: Perfil Usuario ───────────────────────────────────────
  userProfile$!: Observable<UserProfile>;

  // ── ESTADO: Notificaciones ──────────────────────────────────────
  isNotifOpen   = false;
  notifications: NotificacionInterna[] = [];

  get notificacionesNoLeidas(): number {
    return this.notifications.filter(notificacion => !notificacion.leida).length;
  }

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
  worldsProgress: WorldProgress[] = Array.from({ length: 5 }, (_, i) => ({
    level: i + 1,
    name:  `Mundo ${i + 1}`,
    stars: 0
  }));

  // ── ESTADO: Formulario de Creación (Parte 1) ─────────────────
  tituloReto         = '';
  nivelSeleccionado  = 1;             // ID del nivel oficial (El Ogro = 1)
  fechaLimiteActividad = '';
  plazoSeleccionado: PlazoActividad = 'sin_limite';
  cargandoCrearAula  = false;
  aulaCreada: AulaResponse | null = null;

  parametrosReto: ParametrosEvaluacion = {
    tiempo_3_estrellas:        60,
    tiempo_2_estrellas:        120,
    intentos_max_sin_penalidad: 2,
    anti_copia: true,
    ayudas_habilitadas: false,
    fases_seleccionadas: [1, 2, 3, 4],
    configuracion_nivel: undefined
  };

  // Catálogo de niveles disponibles para reutilizar
  readonly nivelesDisponibles = NIVELES_DRAGONCODE;

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

    this.restaurarAsistenteDesdeEditor();

    this.userService.fetchProfile().subscribe({
      next: perfil => {
        if (perfil.avatar_actual_id) {
          this.userService.getAvatares().subscribe({
            next: avatares => {
              const equipado = avatares.find(avatar => avatar.id === perfil.avatar_actual_id);
              if (equipado) this.selectedAvatar = equipado.url_imagen;
            },
            error: () => this.notificationService.show('No se pudo cargar tu avatar equipado', 'error')
          });
        }
      },
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
    this.cargarNotificaciones();
  }

  /** Consulta el backend y actualiza las estrellas reales de cada mundo. */
  private cargarMiProgreso(): void {
    this.progresoService.miProgreso().subscribe({
      next: (progresos) => {
        progresos.forEach(p => {
          const mundo = this.worldsProgress.find(w => w.level === obtenerOrdenProgreso(p));
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
  toggleNotif(): void {
    this.isNotifOpen = !this.isNotifOpen;
    if (this.isNotifOpen) this.cargarNotificaciones();
  }
  closeNotif():     void { this.isNotifOpen = false;             }
  markAllAsRead(): void {
    if (this.notificacionesNoLeidas === 0) return;
    this.notificacionesService.marcarTodasComoLeidas().subscribe({
      next: () => {
        this.notifications = this.notifications.map(notificacion => ({
          ...notificacion,
          leida: true
        }));
      }
    });
  }

  marcarNotificacionComoLeida(notificacion: NotificacionInterna): void {
    if (notificacion.leida) return;
    this.notificacionesService.marcarComoLeida(notificacion.id).subscribe({
      next: actualizada => {
        this.notifications = this.notifications.map(item =>
          item.id === actualizada.id ? actualizada : item
        );
      }
    });
  }

  private cargarNotificaciones(): void {
    this.notificacionesService.misNotificaciones().subscribe({
      next: notificaciones => { this.notifications = notificaciones; },
      error: () => { this.notifications = []; }
    });
  }

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
    this.nivelSeleccionado = 1;
    this.jugadoresAulaLista = [];
    this.reporteAulaAdmin = null;
    this.plazoSeleccionado = 'sin_limite';
    this.fechaLimiteActividad = '';
    this.mostrarAgregarActividad = false;
    this.aulaParaActividad = null;
    this.parametrosReto    = { 
      tiempo_3_estrellas: 60, 
      tiempo_2_estrellas: 120, 
      intentos_max_sin_penalidad: 3,
      anti_copia: true,
      ayudas_habilitadas: false,
      fases_seleccionadas: [1, 2, 3, 4],
      configuracion_nivel: undefined
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

    // El recorrido es el contenido editable del nivel 1. Debe definirse
    // antes de que el profesor pueda continuar con la publicación.
    if (this.nivelSeleccionado === 1 && this.parametrosReto.configuracion_nivel?.tipo !== 'mapa_ogro') {
      this.abrirEditorNivelUno();
      return;
    }

    this.pasoCrearAula = 3;
  }

  actividadDisponible(actividad: RetoPersonalizadoResponse): boolean {
    if (actividad.fecha_cierre) return false;
    if (!actividad.fecha_limite) return true;
    return new Date(actividad.fecha_limite).getTime() > Date.now();
  }

  estadoVisibleActividad(actividad: RetoPersonalizadoResponse): string {
    if (actividad.fecha_cierre) return 'CERRADA';
    if (!this.actividadDisponible(actividad)) return 'PLAZO VENCIDO';
    return actividad.completado ? 'COMPLETADA' : 'PENDIENTE';
  }

  toggleFase(fase: number): void {
    if (!this.fasesDisponiblesNivel.includes(fase)) return;
    const idx = this.parametrosReto.fases_seleccionadas!.indexOf(fase);
    if (idx > -1) {
      this.parametrosReto.fases_seleccionadas!.splice(idx, 1);
    } else {
      this.parametrosReto.fases_seleccionadas!.push(fase);
    }
  }

  seleccionarNivel(nivelId: number): void {
    if (nivelId === this.nivelSeleccionado) return;
    this.nivelSeleccionado = nivelId;
    this.parametrosReto.fases_seleccionadas = [...this.fasesDisponiblesNivel];
    this.parametrosReto.configuracion_nivel = crearConfiguracionNivelPredeterminada(nivelId);
  }

  actualizarConfiguracionNivel(configuracion: ConfiguracionNivelAula | undefined): void {
    this.parametrosReto.configuracion_nivel = configuracion;
  }

  private abrirEditorNivelUno(): void {
    this.borradorAulaService.guardar({
      modo: this.mostrarAgregarActividad ? 'agregar-actividad' : 'crear-aula',
      nuevoNombreAula: this.nuevoNombreAula,
      nivelSeleccionado: this.nivelSeleccionado,
      parametrosReto: JSON.parse(JSON.stringify(this.parametrosReto)),
      plazoSeleccionado: this.plazoSeleccionado,
      fechaLimiteActividad: this.fechaLimiteActividad,
      aulaParaActividad: this.aulaParaActividad
    });
    this.router.navigate(['/crear-aula/ogro']);
  }

  private restaurarAsistenteDesdeEditor(): void {
    const borrador = this.borradorAulaService.consumir();
    if (!borrador) return;

    this.isCrearAulaOpen = true;
    this.nuevoNombreAula = borrador.nuevoNombreAula;
    this.nivelSeleccionado = borrador.nivelSeleccionado;
    this.parametrosReto = borrador.parametrosReto;
    this.plazoSeleccionado = borrador.plazoSeleccionado as PlazoActividad;
    this.fechaLimiteActividad = borrador.fechaLimiteActividad;
    this.aulaParaActividad = borrador.aulaParaActividad;
    if (borrador.modo === 'agregar-actividad' && borrador.aulaParaActividad) {
      this.pasoCrearAula = 1;
      this.creandoNuevaAula = false;
      this.mostrarAgregarActividad = true;
    } else {
      this.pasoCrearAula = 3;
      this.creandoNuevaAula = true;
      this.mostrarAgregarActividad = false;
    }
  }

  get fasesDisponiblesNivel(): number[] {
    const cantidad = this.nivelesDisponibles.find(nivel => nivel.id === this.nivelSeleccionado)?.fases ?? 4;
    return Array.from({ length: cantidad }, (_, indice) => indice + 1);
  }

  /** Paso 3: Crear aula + reto personalizado en el backend */
  confirmarCrearAula(): void {
    // Esta protección evita que el asistente de una actividad existente termine
    // creando otra aula si la vista conserva el botón general de confirmación.
    if (this.mostrarAgregarActividad && this.aulaParaActividad) {
      this.confirmarAgregarActividad();
      return;
    }

    if (this.nivelSeleccionado === 1 && this.parametrosReto.configuracion_nivel?.tipo !== 'mapa_ogro') {
      this.abrirEditorNivelUno();
      return;
    }

    if (this.nivelSeleccionado === 2 && this.parametrosReto.tiempo_3_estrellas >= this.parametrosReto.tiempo_2_estrellas) {
      this.notificationService.show('El tiempo para 3⭐ debe ser menor al de 2⭐.', 'error');
      return;
    }
    if (this.plazoSeleccionado === 'personalizado' && !this.fechaLimiteActividad.trim()) {
      this.notificationService.show('Selecciona la fecha y hora límite.', 'error');
      return;
    }
    const fechaLimite = this.fechaLimiteComoIso();
    if (this.fechaLimiteActividad && !fechaLimite) {
      this.notificationService.show('La fecha límite no es válida.', 'error');
      return;
    }
    if (fechaLimite && new Date(fechaLimite).getTime() <= Date.now()) {
      this.notificationService.show('La fecha límite debe ser posterior a la hora actual.', 'error');
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
          parametros:           { ...this.parametrosReto, ayudas_habilitadas: false },
          fecha_limite:         fechaLimite
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
    this.isCrearAulaOpen = false;
    this.isAdminAulasOpen = false;
    this.isUnirseAulaOpen = true;
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
    if (!this.actividadDisponible(actividad)) {
      this.notificationService.show('Esta actividad ya no está disponible.', 'error');
      return;
    }
    localStorage.setItem('aulaActiva', this.aulaActividadesSeleccionada.id);
    localStorage.setItem('retoActivo', actividad.id);
    this.isUnirseAulaOpen = false;
    this.isAdminAulasOpen = false;
    this.router.navigate(
      ['/aventura/nivel', actividad.reto_nivel_id],
      {
        queryParams: {
          aula: this.aulaActividadesSeleccionada.id,
          actividad: actividad.id
        }
      }
    );
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
  reporteAulaAdmin: ReporteAula | null = null;
  cargandoSeguimiento = false;

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
    this.reporteAulaAdmin       = null;
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
      this.reporteAulaAdmin = null;
      return;
    }

    this.aulaSeleccionadaAdmin   = aulaId;
    this.mostrarAgregarActividad = false;
    this.cargandoJugadores       = true;
    this.cargandoSeguimiento     = true;
    this.jugadoresAulaLista      = [];
    this.reporteAulaAdmin        = null;

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

    this.cargarSeguimientoAula(aulaId);
  }

  private cargarSeguimientoAula(aulaId: string): void {
    this.cargandoSeguimiento = true;
    this.aulasService.seguimientoDelAula(aulaId).subscribe({
      next: reporte => {
        this.reporteAulaAdmin = reporte;
        this.cargandoSeguimiento = false;
      },
      error: () => {
        this.cargandoSeguimiento = false;
        this.notificationService.show('No se pudo cargar el seguimiento académico', 'error');
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
          this.reporteAulaAdmin = null;
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
    this.creandoNuevaAula        = false;
    // Pre-rellenar parámetros del wizard para este aula
    this.nuevoNombreAula  = aula.nombre_aula;
    this.nivelSeleccionado = 1;
    this.pasoCrearAula    = 2;  // Saltar directamente a selección de nivel
    this.parametrosReto   = {
      tiempo_3_estrellas: 60,
      tiempo_2_estrellas: 120,
      intentos_max_sin_penalidad: 3,
      anti_copia: true,
      ayudas_habilitadas: false,
      fases_seleccionadas: [1, 2, 3, 4],
      configuracion_nivel: undefined
    };
    this.plazoSeleccionado = 'sin_limite';
    this.fechaLimiteActividad = '';
  }

  volverDesdeSeleccionNivel(): void {
    if (this.mostrarAgregarActividad) {
      this.cancelarAgregarActividad();
      return;
    }
    this.pasoCrearAula = 1;
  }

  cancelarAgregarActividad(): void {
    this.mostrarAgregarActividad = false;
    this.aulaParaActividad = null;
    this.pasoCrearAula = 1;
  }

  confirmarConfiguracionActividad(): void {
    if (this.mostrarAgregarActividad && this.aulaParaActividad) {
      this.confirmarAgregarActividad();
      return;
    }
    this.confirmarCrearAula();
  }

  confirmarAgregarActividad(): void {
    if (!this.aulaParaActividad) return;
    if (this.nivelSeleccionado === 1 && this.parametrosReto.configuracion_nivel?.tipo !== 'mapa_ogro') {
      this.abrirEditorNivelUno();
      return;
    }
    if (!this.parametrosReto.fases_seleccionadas?.length) {
      this.notificationService.show('Debes seleccionar al menos una fase.', 'error');
      return;
    }
    if (this.nivelSeleccionado === 2 && this.parametrosReto.tiempo_3_estrellas >= this.parametrosReto.tiempo_2_estrellas) {
      this.notificationService.show('El tiempo para 3⭐ debe ser menor al de 2⭐.', 'error');
      return;
    }
    if (this.plazoSeleccionado === 'personalizado' && !this.fechaLimiteActividad.trim()) {
      this.notificationService.show('Selecciona la fecha y hora límite.', 'error');
      return;
    }
    const fechaLimite = this.fechaLimiteComoIso();
    if (this.fechaLimiteActividad && !fechaLimite) {
      this.notificationService.show('La fecha límite no es válida.', 'error');
      return;
    }
    if (fechaLimite && new Date(fechaLimite).getTime() <= Date.now()) {
      this.notificationService.show('La fecha límite debe ser posterior a la hora actual.', 'error');
      return;
    }
    this.cargandoCrearAula = true;
    const datosReto: RetoPersonalizadoCreate = {
      reto_nivel_id:        this.nivelSeleccionado,
      titulo:               `${this.aulaParaActividad.nombre_aula} - Actividad`,
      recompensa_estrellas: 5,
      parametros:           { ...this.parametrosReto, ayudas_habilitadas: false },
      fecha_limite:         fechaLimite
    };
    this.aulasService.crearRetoEnAula(this.aulaParaActividad.id, datosReto).subscribe({
      next: () => {
        const aulaActualizada = this.aulaParaActividad;
        this.cargandoCrearAula       = false;
        this.mostrarAgregarActividad = false;
        this.aulaParaActividad       = null;
        this.pasoCrearAula           = 1;
        this.notificationService.show('¡Actividad agregada con éxito!', 'success');
        if (aulaActualizada && this.aulaSeleccionadaAdmin === aulaActualizada.id) {
          this.cargarSeguimientoAula(aulaActualizada.id);
        }
      },
      error: () => { this.cargandoCrearAula = false; }
    });
  }

  cerrarActividad(aulaId: string, actividad: SeguimientoActividad): void {
    if (actividad.estado === 'cerrado') return;
    if (!confirm(`¿Cerrar la actividad "${actividad.titulo}"? Los alumnos pendientes ya no podrán entregarla.`)) {
      return;
    }

    this.aulasService.cerrarActividad(aulaId, actividad.reto_id).subscribe({
      next: () => {
        this.notificationService.show('Actividad cerrada correctamente', 'success');
        this.cargarSeguimientoAula(aulaId);
      }
    });
  }

  private fechaLimiteComoIso(): string | null {
    this.actualizarFechaLimiteDesdePlazo();
    if (!this.fechaLimiteActividad.trim()) return null;
    const fecha = new Date(this.fechaLimiteActividad);
    return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
  }

  seleccionarPlazo(opcion: PlazoActividad): void {
    this.plazoSeleccionado = opcion;
    if (opcion === 'personalizado' && !this.fechaLimiteActividad) {
      this.fechaLimiteActividad = this.fechaLocalParaInput(new Date(Date.now() + 60 * 60_000));
      return;
    }
    this.actualizarFechaLimiteDesdePlazo();
  }

  establecerFechaPersonalizada(valor: string): void {
    this.plazoSeleccionado = 'personalizado';
    this.fechaLimiteActividad = valor;
  }

  get fechaMinimaActividad(): string {
    return this.fechaLocalParaInput(new Date(Date.now() + 60_000));
  }

  get zonaHorariaUsuario(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'hora local del dispositivo';
  }

  get resumenFechaLimite(): string {
    if (this.plazoSeleccionado === 'sin_limite' || !this.fechaLimiteActividad) {
      return 'Sin fecha límite';
    }
    const fecha = new Date(this.fechaLimiteActividad);
    if (Number.isNaN(fecha.getTime())) return 'Fecha pendiente de seleccionar';
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }).format(fecha);
  }

  get nombreNivelSeleccionado(): string {
    return this.nivelesDisponibles.find(nivel => nivel.id === this.nivelSeleccionado)?.nombre ?? `Nivel ${this.nivelSeleccionado}`;
  }

  get resumenFasesSeleccionadas(): string {
    const fases = [...(this.parametrosReto.fases_seleccionadas ?? [])].sort((a, b) => a - b);
    return fases.length ? fases.map(fase => `F${fase}`).join(', ') : 'Ninguna';
  }

  private actualizarFechaLimiteDesdePlazo(): void {
    if (this.plazoSeleccionado === 'sin_limite') {
      this.fechaLimiteActividad = '';
      return;
    }
    if (this.plazoSeleccionado === 'personalizado') {
      return;
    }

    const duraciones: Record<Exclude<PlazoActividad, 'sin_limite' | 'personalizado'>, number> = {
      '30_minutos': 30 * 60_000,
      '1_hora': 60 * 60_000,
      '24_horas': 24 * 60 * 60_000,
      '7_dias': 7 * 24 * 60 * 60_000
    };
    this.fechaLimiteActividad = this.fechaLocalParaInput(new Date(Date.now() + duraciones[this.plazoSeleccionado]));
  }

  private fechaLocalParaInput(fecha: Date): string {
    const desplazamientoLocal = fecha.getTimezoneOffset() * 60_000;
    return new Date(fecha.getTime() - desplazamientoLocal).toISOString().slice(0, 16);
  }
}
