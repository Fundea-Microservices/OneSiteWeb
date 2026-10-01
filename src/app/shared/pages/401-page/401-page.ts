import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

/** Mensaje por cada código de permiso que envía el API en el campo `error` */
const MENSAJES: Record<string, string> = {
  REALM_NO_PERMITIDO: 'Esta sección es de uso interno y no está disponible para usuarios externos.',
  ROL_NO_PROPIO: 'Solo puede consultar la información de su propio rol.',
  ROL_INACTIVO: 'Su rol está desactivado. Contacte al administrador.',
};

@Component({
  selector: 'app-page-401',
  imports: [RouterLink],
  templateUrl: './401-page.html',
  styleUrl: './401-page.css',
})
export default class Page401Component {
  private route = inject(ActivatedRoute);

  mensaje = signal('No tienes permiso para acceder a esta página');

  constructor() {
    const codigo = this.route.snapshot.queryParamMap.get('codigo');
    if (codigo && MENSAJES[codigo]) {
      this.mensaje.set(MENSAJES[codigo]);
    }
  }
}
