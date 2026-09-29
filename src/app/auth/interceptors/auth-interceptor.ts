import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

/** Endpoints públicos: un 401 aquí es un error de credenciales, no una sesión vencida. */
const RUTAS_PUBLICAS = ['/auth/login', '/auth/login-externo'];

/** 401 que NO deben cerrar la sesión: el token sigue siendo válido, el API no respondió. */
const CODIGOS_401_SIN_CERRAR_SESION = new Set<string>(['SERVICIO_NO_DISPONIBLE']);

/**
 * 403 de permiso. La sesión es válida, lo que falta es acceso al recurso.
 * Nunca se limpia el token: un externo que abra un enlace interno entraría
 * en un bucle infinito de inicio de sesión.
 */
const CODIGOS_403_SIN_ACCESO = new Set<string>(['ROL_INACTIVO', 'REALM_NO_PERMITIDO', 'ROL_NO_PROPIO']);

/**
 * Intercepta las respuestas del API y, ante un 401 (token vencido o inválido),
 * cierra la sesión y redirige al login. Los 403 de permiso solo redirigen a /401.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const esRutaPublica = RUTAS_PUBLICAS.some(ruta => req.url.includes(ruta));

      // El body puede ser un Blob (descargas), por eso el acceso defensivo
      const body = typeof error.error === 'object' && error.error !== null ? error.error : undefined;
      const codigo: string | undefined = body?.error;

      // Falta de permiso, no de sesión: se informa sin cerrar sesión
      if (error.status === 403 && codigo && CODIGOS_403_SIN_ACCESO.has(codigo)) {
        router.navigate(['/401'], { queryParams: { codigo } });
        return throwError(() => error);
      }

      // Sin token en storage no hay sesión que cerrar (p. ej. 401 estando ya en el login)
      if (
        error.status === 401 &&
        !esRutaPublica &&
        authService.token &&
        !(codigo && CODIGOS_401_SIN_CERRAR_SESION.has(codigo))
      ) {
        authService.sesionExpirada(body?.message);
      }

      return throwError(() => error);
    })
  );
};
