import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { ProgresoService } from '../services/progreso.service';
import { LoaderService } from '../services/loader.service';

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
  readonly totalNiveles = 5;
  niveles: LevelDescriptor[] = [];

  constructor(
    private progresoService: ProgresoService,
    private loaderService: LoaderService
  ) {}

  get nivelesCompletados(): number {
    return this.niveles.filter(nivel => nivel.completado).length;
  }

  get porcentajeProgreso(): number {
    return (this.nivelesCompletados / this.totalNiveles) * 100;
  }

  ngOnInit(): void {
    this.construirMapa(new Set<number>());
    this.progresoService.miProgreso().pipe(
      finalize(() => this.loaderService.ocultar())
    ).subscribe({
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
      2: 'Taladro a Vapor',
      3: 'La Cueva de las Variables',
      4: 'Control de Calidad',
      5: 'Producción en Masa'
    };
    const ultimoNivelImplementado = 5;

    this.niveles = Array.from({ length: this.totalNiveles }, (_, i) => {
      const id = i + 1;
      return {
        id,
        titulo: titulos[id] ?? `Nivel ${id}`,
        completado: completados.has(id),
        bloqueado: id > ultimoNivelImplementado || (id > 1 && !completados.has(id - 1))
      };
    });
  }
}
