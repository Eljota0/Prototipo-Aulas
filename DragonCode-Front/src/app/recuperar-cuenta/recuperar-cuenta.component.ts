import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
// Ajusta esta ruta de importación según dónde guardó la IA tu servicio
import { NotificationService } from '../services/notification.service'; 
import { CyberLayoutComponent } from '../cyber-layout/cyber-layout.component';

@Component({
  selector: 'app-recuperar-cuenta',
  standalone: true,
  imports: [CyberLayoutComponent, RouterLink, FormsModule],
  templateUrl: './recuperar-cuenta.component.html',
  styleUrls: ['./recuperar-cuenta.component.scss']
})
export class RecuperarCuentaComponent {
  
  email: string = '';

  // Inyectamos el servicio global de notificaciones y el enrutador
  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  submitForm(event: Event) {
    // 1. CRÍTICO: Evitamos que el navegador recargue la página por defecto al enviar el formulario
    event.preventDefault(); 

    if (!this.email) {
      return;
    }

    // Simulador rápido de respuesta de backend:
    // Si introduces error@dragoncode.com, muestra correo no encontrado.
    // De lo contrario, éxito.
    if (this.email.toLowerCase() === 'error@dragoncode.com') {
      this.notificationService.show('Correo no encontrado', 'error');
      return;
    }

    // 2. (Aquí irá tu futura petición HTTP al backend de Python)

    // 3. Disparamos la notificación global
    this.notificationService.show('Correo de recuperación enviado exitosamente', 'success');

    // 4. Ejecutamos el flujo de UX: Redirigir al usuario inmediatamente
    this.router.navigate(['/login']);
  }
}