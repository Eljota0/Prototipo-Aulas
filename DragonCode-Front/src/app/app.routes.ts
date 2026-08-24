import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Ruta por defecto que redirige al login
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'crear-cuenta',
    loadComponent: () => import('./crear-cuenta/crear-cuenta.component').then(m => m.CrearCuentaComponent)
  },
  {
    path: 'recuperar-cuenta',
    loadComponent: () => import('./recuperar-cuenta/recuperar-cuenta.component').then(m => m.RecuperarCuentaComponent)
  },
  {
    path: 'cambiar-contrasena',
    loadComponent: () => import('./cambiar-contrasena/cambiar-contrasena.component').then(m => m.CambiarContrasenaComponent)
  },
  {
    path: 'pantalla-principal',
    canActivate: [authGuard],
    loadComponent: () => import('./pantalla-principal/pantalla-principal.component').then(m => m.PantallaPrincipalComponent)
  },
  {
    path: 'aventura',
    canActivate: [authGuard],
    loadComponent: () => import('./mapa-aventura/mapa-aventura.component').then(m => m.MapaAventuraComponent)
  },
  {
    path: 'aventura/nivel/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./nivel-ogro/nivel-ogro.component').then(m => m.NivelOgroComponent)
  },
  {
    path: 'crear-aula/ogro',
    canActivate: [authGuard],
    loadComponent: () => import('./nivel-ogro/nivel-ogro.component').then(m => m.NivelOgroComponent)
  }
];