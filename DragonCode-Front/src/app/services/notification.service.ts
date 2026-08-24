import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toastSubject = new Subject<ToastMessage>();
  public toastState$ = this.toastSubject.asObservable();

  show(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastSubject.next({ message, type });
  }
}
