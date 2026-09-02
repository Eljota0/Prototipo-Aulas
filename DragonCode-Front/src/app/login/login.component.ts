import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../services/loader.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

interface Rune {
  symbol: string;
  top: string;
  left: string;
  color: string;
  delay: string;
  duration: string;
  fontSize: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  currentAvatar: string = '';
  runes: Rune[] = [];

  // Campos del formulario
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  mostrarClave: boolean = false;

  toggleClave(): void {
    this.mostrarClave = !this.mostrarClave;
  }

  // Centralizamos los avatares aquí
  private readonly DRACO_AVATARS: string[] = [
    'assets/images/draco/drakobase.png',
    'assets/images/draco/drakoforja.png',
    'assets/images/draco/drakoguia.png',
    'assets/images/draco/drakoirritado.png',
    'assets/images/draco/drakoorgulloso.png',
    'assets/images/draco/drakoserio.png',
    'assets/images/draco/drakosorprendido.png'
  ];

  constructor(
    private loaderService: LoaderService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Si ya hay sesión activa, redirigir directo al menú
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/pantalla-principal']);
      return;
    }
    this.setRandomAvatar();
    this.generateRunes();
    setTimeout(() => {
      this.loaderService.ocultar();
    }, 300);
  }

  iniciarSesion(): void {
    if (!this.email || !this.password) {
      this.notificationService.show('Por favor, completa todos los campos.', 'error');
      return;
    }

    this.isLoading = true;
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/pantalla-principal']);
      },
      error: () => {
        // El interceptor ya muestra el mensaje de error del backend
        this.isLoading = false;
      }
    });
  }

  iniciarConGoogle(): void {
    // Para propósitos de la tesis/prototipo, mostramos una notificación
    // La implementación real requiere configurar credenciales OAuth2 en Google Cloud.
    this.notificationService.show(
      'Integración con Google en desarrollo (Requiere OAuth2 en Producción).', 
      'success'
    );
  }

  private setRandomAvatar(): void {
    const randomIndex = Math.floor(Math.random() * this.DRACO_AVATARS.length);
    this.currentAvatar = this.DRACO_AVATARS[randomIndex];
  }

  private generateRunes(): void {
    const symbols = ['{}', '[;]', '*', '01', '=>', '</>', '✧', '✦', 'Δ', '∇', 'Ω', '⎈', '≈', '⟁', '✧', '✦', 'Δ', 'Ω', '⎈'];
    const colors = ['#D8BFD8', '#ADD8E6', '#FFB6C1', '#FFFFFF'];
    const numRunes = 45;

    for (let i = 0; i < numRunes; i++) {
      let randomTop = Math.random() * 100;
      let randomLeft = Math.random() * 100;

      if (randomTop > 25 && randomTop < 75 && randomLeft > 25 && randomLeft < 75) {
        randomLeft = Math.random() > 0.5 ? Math.random() * 20 : 80 + Math.random() * 20;
      }

      this.runes.push({
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        top: randomTop + '%',
        left: randomLeft + '%',
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: (Math.random() * 5) + 's',
        duration: (Math.random() * 5 + 4) + 's',
        fontSize: (Math.floor(Math.random() * 6) + 10) + 'px'
      });
    }
  }
}