import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../services/notification.service';
import { CyberLayoutComponent } from '../cyber-layout/cyber-layout.component';

@Component({
  selector: 'app-cambiar-contrasena',
  standalone: true,
  imports: [CyberLayoutComponent, FormsModule, CommonModule],
  templateUrl: './cambiar-contrasena.component.html',
  styleUrl: './cambiar-contrasena.component.scss'
})
export class CambiarContrasenaComponent {
  nuevaPass: string = '';
  confirmarPass: string = '';
  cargando: boolean = false;

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  submitForm(event: Event): void {
    event.preventDefault();
    
    if (!this.nuevaPass || !this.confirmarPass) {
      this.notificationService.show('Completa ambos campos', 'error');
      return;
    }

    if (this.nuevaPass !== this.confirmarPass) {
      this.notificationService.show('Las contraseñas no coinciden', 'error');
      return;
    }

    this.cargando = true;
    
    // Simulación de delay de red para la presentación de tesis
    setTimeout(() => {
      this.cargando = false;
      this.notificationService.show('Contraseña actualizada exitosamente', 'success');
      this.router.navigate(['/login']);
    }, 800);
  }
}
