import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { nivelAventuraGuard } from './core/guards/nivel-aventura.guard';

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
  { path: 'recuperar-cuenta', redirectTo: '/login', pathMatch: 'full' },
  { path: 'cambiar-contrasena', redirectTo: '/login', pathMatch: 'full' },
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
    path: 'aventura/nivel/1',
    canActivate: [authGuard, nivelAventuraGuard],
    data: { nivelId: 1 },
    loadComponent: () => import('./nivel-ogro/nivel-ogro.component').then(m => m.NivelOgroComponent)
  },
  {
    path: 'aventura/nivel/2',
    canActivate: [authGuard, nivelAventuraGuard],
    data: { nivelId: 2 },
    loadComponent: () => import('./nivel-dos-prototipo/nivel-dos-prototipo.component').then(m => m.NivelDosPrototipoComponent)
  },
  {
    path: 'prototipo/nivel-2',
    canActivate: [authGuard, nivelAventuraGuard],
    data: { nivelId: 2 },
    loadComponent: () => import('./nivel-dos-prototipo/nivel-dos-prototipo.component').then(m => m.NivelDosPrototipoComponent)
  },
  {
    path: 'aventura/nivel/3',
    canActivate: [authGuard, nivelAventuraGuard],
    data: { nivelId: 3 },
    loadComponent: () => import('./nivel-tres-prototipo/nivel-tres-prototipo.component').then(m => m.NivelTresPrototipoComponent)
  },
  {
    path: 'prototipo/nivel-3',
    canActivate: [authGuard, nivelAventuraGuard],
    data: { nivelId: 3 },
    loadComponent: () => import('./nivel-tres-prototipo/nivel-tres-prototipo.component').then(m => m.NivelTresPrototipoComponent)
  },
  {
    path: 'aventura/nivel/4',
    canActivate: [authGuard, nivelAventuraGuard],
    data: { nivelId: 4 },
    loadComponent: () => import('./nivel-cuatro-prototipo/nivel-cuatro-prototipo.component').then(m => m.NivelCuatroPrototipoComponent)
  },
  {
    path: 'prototipo/nivel-4',
    canActivate: [authGuard, nivelAventuraGuard],
    data: { nivelId: 4 },
    loadComponent: () => import('./nivel-cuatro-prototipo/nivel-cuatro-prototipo.component').then(m => m.NivelCuatroPrototipoComponent)
  },
  {
    path: 'aventura/nivel/5',
    canActivate: [authGuard, nivelAventuraGuard],
    data: { nivelId: 5 },
    loadComponent: () => import('./nivel-cuatro-prototipo/nivel-cuatro-prototipo.component').then(m => m.NivelCuatroPrototipoComponent)
  },
  {
    path: 'prototipo/nivel-5',
    canActivate: [authGuard, nivelAventuraGuard],
    data: { nivelId: 5 },
    loadComponent: () => import('./nivel-cuatro-prototipo/nivel-cuatro-prototipo.component').then(m => m.NivelCuatroPrototipoComponent)
  },
  {
    path: 'crear-aula/ogro',
    canActivate: [authGuard],
    loadComponent: () => import('./nivel-ogro/nivel-ogro.component').then(m => m.NivelOgroComponent)
  }
];
