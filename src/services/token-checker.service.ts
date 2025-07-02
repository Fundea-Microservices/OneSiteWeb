// src/app/services/token-checker.service.ts
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TokenCheckerService {
  private readonly CHECK_INTERVAL = environment.tokenCheckInterval * 60 * 1000; // 5 minutos

  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {    
    this.startChecking();
  }

  private startChecking() {
    setInterval(() => {
      const token = localStorage.getItem('token');
      if (!token) return;

      if (this.isTokenExpired(token)) {
        this.authService.logout('Cierre de sesión por expiración del token');
        this.router.navigate(['/']);
      }
    }, this.CHECK_INTERVAL);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const [, payload] = token.split('.');
      const decoded = JSON.parse(atob(payload));
      const exp = decoded.exp;
      const now = Math.floor(Date.now() / 1000);
      return exp < now;
    } catch {
      return true;
    }
  }
}
