import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, model } from '@angular/core';

let siguienteId = 0;

/**
 * Card de Bootstrap que se minimiza y maximiza al dar clic en el encabezado.
 * El cuerpo solo se oculta (no se destruye), así que los formularios y componentes
 * de adentro conservan lo capturado.
 *
 *   <app-seccion>
 *     <ng-container titulo>Horizonte</ng-container>
 *     <div acciones><button ...>Agregar</button></div>
 *     ...contenido...
 *   </app-seccion>
 *
 * Los botones, enlaces y campos dentro de `acciones` no alternan la sección.
 */
@Component({
  selector: 'app-seccion',
  templateUrl: './seccion.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card mb-3' },
  styles: `
    .seccion-header { cursor: pointer; user-select: none; }
    .seccion-header.colapsada { border-bottom: 0; border-radius: var(--bs-card-inner-border-radius); }
    .seccion-toggle { font: inherit; color: inherit; }
    .seccion-chevron { flex-shrink: 0; transition: transform .2s ease; }
    .colapsada .seccion-chevron { transform: rotate(-90deg); }
  `,
})
export class SeccionComponent {
  /** Admite [(abierta)] para controlarla desde afuera. */
  abierta = model(true);

  readonly cuerpoId = `seccion-cuerpo-${++siguienteId}`;

  alternar() {
    this.abierta.update(v => !v);
  }

  abrir() {
    this.abierta.set(true);
  }

  /** Clic en el espacio libre del encabezado; los controles del encabezado hacen lo suyo. */
  onClicEncabezado(ev: MouseEvent) {
    if ((ev.target as HTMLElement).closest('button, a, input, select, textarea, label')) return;
    this.alternar();
  }
}
