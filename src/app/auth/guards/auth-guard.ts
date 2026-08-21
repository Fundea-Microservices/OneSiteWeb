import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    // isAuthenticated() valida que exista token y que no esté vencido,
    // por lo que al recargar la página una sesión expirada nunca llega a renderizar la pantalla.
    if (this.authService.isAuthenticated()) {
      return true;
    }

    // Había token pero está vencido/corrupto: se limpia la sesión antes de salir
    if (this.authService.token) {
      this.authService.logout(AuthService.MSG_SESION_EXPIRADA);
    }

    // Si no está autenticado, envía al login de Fundea
    return this.router.createUrlTree(['/fundea/login']);
  }
};
