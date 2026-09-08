import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, UserProfile } from '../services/user.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss'
})
export class PerfilComponent implements OnInit {
  @Input() avatarActual: string = 'assets/images/draco/dracobase1.png';
  @Output() closeModal = new EventEmitter<void>();

  constructor(private userService: UserService) {}

  // ── ESTADO: Perfil Usuario (State Management) ───────────────────
  userProfile$!: Observable<UserProfile>;

  ngOnInit(): void {
    this.userProfile$ = this.userService.getProfile();
  }

  onClose(): void {
    this.closeModal.emit();
  }
}
