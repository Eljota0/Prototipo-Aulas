import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-nivel-aventura',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nivel-aventura.component.html',
  styleUrl: './nivel-aventura.component.scss'
})
export class NivelAventuraComponent implements OnInit {
  nivelId: string | null = null;
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    // Obtenemos el ID de los parámetros de la URL
    this.route.paramMap.subscribe(params => {
      this.nivelId = params.get('id');
    });
  }
}
