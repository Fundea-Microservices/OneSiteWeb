import { Injectable } from '@angular/core';
import { CanActivate, UrlTree, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AccesoService } from '../../../services/config/acceso.service';

@Injectable({ providedIn: 'root' })
export class AccessGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router, private accesoService: AccesoService) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const accesos = this.accesoService.getAccesosStorage(); // obtiene el objeto acceso desde localStorage o señal
    const rol = this.authService.getUserStorage()?.rol; // obtiene el rol del usuario desde el almacenamiento local o señal
    if(rol && rol.isAdmin) {
      return true; // Si el usuario es administrador, permite el acceso a todas las rutas   
    }
    const rutaActual = '/' + route.pathFromRoot
    .map(r => r.routeConfig?.path)
    .filter(Boolean)
    .join('/');
    
    let rutasPermitidas: string[] = [];
    
    rutasPermitidas = accesos.filter((a: any) => a.active && a.menu?.active).map((a: any) => a.menu?.pathWeb); // ejemplo: ['/config/users', '/home']
    
    accesos.forEach((acceso: any) => {
        acceso.subMenus?.forEach((subMenu: any) => {
            if (subMenu.menu.pathWeb && subMenu.showWeb && subMenu.menu.active) {
                rutasPermitidas.push(subMenu.menu.pathWeb);
            }
        })
    })
    rutasPermitidas.push('/'); // Agrega la ruta raíz al array de rutas permitidas
    rutasPermitidas.push('/home'); // Agrega la ruta de inicio al array de rutas permitidas
    rutasPermitidas.push('/config/user'); // Agrega la ruta de configuración de usuario al array de rutas permitidas
    console.log("🚀 ~ AccessGuard ~ canActivate ~ rutasPermitidas:", rutasPermitidas)
    if (rutasPermitidas.includes(rutaActual)) {
      return true;
    }

    return this.router.createUrlTree(['/401']); // Página 403 personalizada
  }
}
