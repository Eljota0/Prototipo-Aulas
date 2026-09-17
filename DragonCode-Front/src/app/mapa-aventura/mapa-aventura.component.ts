import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { obtenerOrdenProgreso, ProgresoService } from '../services/progreso.service';
import { LoaderService } from '../services/loader.service';
import { NIVELES_DRAGONCODE, TOTAL_NIVELES, obtenerNivel } from '../core/catalogo-niveles';

export interface LevelDescriptor {
  id: number;
  titulo: string;
  tema: string;
  descripcion: string;
  fases: number;
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
  readonly totalNiveles = TOTAL_NIVELES;
  readonly catalogoNiveles = NIVELES_DRAGONCODE;
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
            .map(obtenerOrdenProgreso)
        );
        this.construirMapa(completados);
      },
      error: () => this.construirMapa(new Set<number>())
    });
  }

  private construirMapa(completados: Set<number>): void {
    this.niveles = Array.from({ length: this.totalNiveles }, (_, i) => {
      const id = i + 1;
      const nivel = obtenerNivel(id);
      return {
        id,
        titulo: nivel?.titulo ?? `Nivel ${id}`,
        tema: nivel?.tema ?? 'Fundamentos de programación',
        descripcion: nivel?.descripcion ?? 'Completa el desafío para continuar tu aventura.',
        fases: nivel?.fases ?? 4,
        completado: completados.has(id),
        bloqueado: id > 1 && !completados.has(id) && !completados.has(id - 1)
      };
    });
  }
}
