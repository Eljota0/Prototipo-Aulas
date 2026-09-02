import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProgresoService } from '../services/progreso.service';

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

  constructor(private progresoService: ProgresoService) {}

  ngOnInit(): void {
    this.construirMapa(new Set<number>());
    this.progresoService.miProgreso().subscribe({
      next: progresos => {
        const completados = new Set(
          progresos
            .filter(progreso => progreso.completado)
            .map(progreso => progreso.reto_nivel_id)
        );
        this.construirMapa(completados);
      },
      error: () => this.construirMapa(new Set<number>())
    });
  }

  private construirMapa(completados: Set<number>): void {
    const titulos: Record<number, string> = {
      1: 'El Ogro',
      2: 'Taladro a Vapor'
    };
    const ultimoNivelImplementado = 2;

    this.niveles = Array.from({ length: 10 }, (_, i) => {
      const id = i + 1;
      return {
        id,
        titulo: titulos[id] ?? `Nivel ${id}`,
        completado: completados.has(id),
        // TODO: [DEV MODE] Eliminar antes de producción. 
        // Original: bloqueado: id > ultimoNivelImplementado || (id > 1 && !completados.has(id - 1))
        bloqueado: id > ultimoNivelImplementado // Desbloquea todos los niveles que ya estén implementados
      };
    });
  }
}
