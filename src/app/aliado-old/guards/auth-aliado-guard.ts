import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthAliadoService } from '../../../services/aliado/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthAliadoGuard implements CanActivate {
  constructor(private authService: AuthAliadoService, private router: Router) {}

  canActivate(): boolean | UrlTree {
  if (this.authService.isAuthenticated()) {
    return true;
  }
  return this.router.createUrlTree(['/aliado/login']);
}
};
