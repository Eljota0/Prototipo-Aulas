import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService, ToastMessage } from '../../services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastComponent implements OnInit, OnDestroy {
  isVisible = false;
  message = '';
  type: 'success' | 'error' = 'success';
  private subscription!: Subscription;
  private timeoutId: any;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.subscription = this.notificationService.toastState$.subscribe((toast: ToastMessage) => {
      this.showToast(toast);
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  private showToast(toast: ToastMessage): void {
    this.message = toast.message;
    this.type = toast.type;
    this.isVisible = true;

    // Reset timer si se lanza otra notificación mientras esta está visible
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.isVisible = false;
    }, 4000);
  }
}
