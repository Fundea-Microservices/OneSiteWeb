import { ChangeDetectionStrategy, Component, type OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UpsertContacto } from '../upsert-contacto/upsert-contacto';
import { UpsertDocumentosArchivos } from '../upsert-documentos-archivos/upsert-documentos-archivos';
import { UpsertActividadLaboralFinanciera } from '../upsert-actividad-laboral-financiera/upsert-actividad-laboral-financiera';
import { UpsertDatosGenerales } from '../upsert-datos-generales/upsert-datos-generales';

@Component({
  selector: 'app-gestion-representante-accordion',
  imports: [CommonModule, UpsertDatosGenerales, UpsertDocumentosArchivos, UpsertContacto, UpsertActividadLaboralFinanciera],
  templateUrl: './gestion-representante-accordion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionRepresentanteAccordion implements OnInit {

  ngOnInit(): void { }


    activeSection = signal<'documentos' | 'datos' | 'contacto' | 'actividad' | null>('documentos');

  onMouseEnter(section: 'documentos' | 'datos' | 'contacto' | 'actividad') {
    this.activeSection.set(section);
  }

  onMouseLeave() {
    // Opcional: descomentar si quieres que se cierre al salir el mouse
    // this.activeSection.set(null);
  }

}
