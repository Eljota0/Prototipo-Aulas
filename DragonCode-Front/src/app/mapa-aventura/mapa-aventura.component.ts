import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface LevelDescriptor {
  id: number;
  titulo: string;
  completado: boolean;
  bloqueado: boolean;
}

@Component({
  selector: 'app-mapa-aventura',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mapa-aventura.component.html',
  styleUrl: './mapa-aventura.component.scss'
})
export class MapaAventuraComponent implements OnInit {
  niveles: LevelDescriptor[] = [];

  ngOnInit(): void {
    // Generar 10 niveles mockeados
    this.niveles = Array.from({ length: 10 }, (_, i) => {
      const id = i + 1;
      return {
        id: id,
        titulo: `Nivel ${id}`,
        completado: false, // Por ahora, nada está completado
        bloqueado: id !== 1 // El Nivel 1 está desbloqueado, los demás bloqueados
      };
    });
  }
}
