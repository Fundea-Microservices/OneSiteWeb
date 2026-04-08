import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Modal } from 'bootstrap';
import { FormulariosService } from '../../../../services/config/formularios.service';
import {
  FormEncabezado,
  FormSeccion,
  FormPregunta,
  TipoPregunta,
} from '../../../../interfaces/configuracion';
import { UpsertPreguntaComponent } from '../../components/formulario/upsert-pregunta/upsert-pregunta.component';

@Component({
  selector: 'app-formulario-detalle-page',
  imports: [RouterLink, FormsModule, UpsertPreguntaComponent],
  templateUrl: './formulario-detalle-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FormularioDetallePage {
  private service = inject(FormulariosService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  readonly tiposPregunta: TipoPregunta[] = [
    'TEXT', 'NUMBER', 'SELECT', 'DATE', 'TIME',
    'FILE', 'TEXTAREA', 'CHECKBOX', 'RADIO',
  ];

  tipoConOpciones: TipoPregunta[] = ['SELECT', 'CHECKBOX', 'RADIO'];

  isLoading = signal(false);

  encabezado = signal<FormEncabezado | null>(null);
  secciones = signal<FormSeccion[]>([]);

  // Sección activa (accordión)
  seccionActivaId = signal<string | null>(null);
  preguntasPorSeccion = signal<Record<string, FormPregunta[]>>({});
  loadingPreguntas = signal<Record<string, boolean>>({});

  // ── Sección modal ──────────────────────────────────────────────
  nuevoSeccion = signal(true);
  seccionEdit = signal<FormSeccion>(this.emptySeccion(''));  seccionIsValid = computed(() =>
    !!this.seccionEdit().nombre?.trim() && !!this.seccionEdit().titulo?.trim()
  );
  @ViewChild('seccionModal') seccionModalRef!: ElementRef;
  private seccionModalInstance!: Modal;

  @ViewChild('deleteSeccionModal') deleteSeccionModalRef!: ElementRef;
  private deleteSeccionModalInstance!: Modal;

  // ── Pregunta modal ─────────────────────────────────────────────
  nuevaPregunta = signal(true);
  preguntaEdit = signal<FormPregunta>(this.emptyPregunta(''));
  formKeyPregunta = signal(0);

  @ViewChild('preguntaModal') preguntaModalRef!: ElementRef;
  preguntaModalInstance!: Modal;

  @ViewChild('deletePreguntaModal') deletePreguntaModalRef!: ElementRef;
  private deletePreguntaModalInstance!: Modal;

  // ──────────────────────────────────────────────────────────────

  private emptySeccion(encabezadoId: string): FormSeccion {
    return {
      encabezadoId,
      nombre: '',
      titulo: '',
      subtitulo: '',
      orden: 0,
      activo: true,
    };
  }

  private emptyPregunta(seccionId: string): FormPregunta {
    return {
      seccionId,
      titulo: '',
      subtitulo: '',
      tipo: 'TEXT',
      valorDefecto: '',
      opciones: '',
      placeholder: '',
      orden: 0,
      visible: true,
      obligatorio: false,
      activo: true,
    };
  }

  ngOnInit() {
    const formId = this.route.snapshot.paramMap.get('formId');
    if (formId) {
      this.loadEncabezado(formId);
    }
  }

  ngAfterViewInit() {
    this.seccionModalInstance = new Modal(this.seccionModalRef.nativeElement);
    this.deleteSeccionModalInstance = new Modal(this.deleteSeccionModalRef.nativeElement);
    this.preguntaModalInstance = new Modal(this.preguntaModalRef.nativeElement);
    this.deletePreguntaModalInstance = new Modal(this.deletePreguntaModalRef.nativeElement);
  }

  async loadEncabezado(formId: string) {
    this.isLoading.set(true);
    try {
      const resp = await this.service.getFormEncabezadoById(formId);
      if (resp?.data) {
        this.encabezado.set(resp.data);
        await this.loadSecciones(formId);
      }
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async loadSecciones(formId: string) {
    const resp = await this.service.getSecciones({ encabezadoId: formId, all: true });
    if (resp?.data) {
      this.secciones.set(resp.data);
      // Auto-abrir la primera sección si existe
      if (resp.data.length > 0 && resp.data[0].seccionId) {
        this.toggleSeccion(resp.data[0].seccionId);
      }
    }
    this.cdr.markForCheck();
  }

  async toggleSeccion(seccionId: string) {
    if (this.seccionActivaId() === seccionId) {
      this.seccionActivaId.set(null);
      this.cdr.markForCheck();
      return;
    }
    this.seccionActivaId.set(seccionId);
    if (!this.preguntasPorSeccion()[seccionId]) {
      await this.loadPreguntas(seccionId);
    }
    this.cdr.markForCheck();
  }

  async loadPreguntas(seccionId: string) {
    this.loadingPreguntas.update(s => ({ ...s, [seccionId]: true }));
    this.cdr.markForCheck();
    const resp = await this.service.getPreguntas({ seccionId, all: true });
    this.preguntasPorSeccion.update(m => ({ ...m, [seccionId]: resp?.data ?? [] }));
    this.loadingPreguntas.update(s => ({ ...s, [seccionId]: false }));
    this.cdr.markForCheck();
  }

  // ── Sección CRUD ───────────────────────────────────────────────

  openSeccionModal(nuevo: boolean, seccion?: FormSeccion) {
    this.nuevoSeccion.set(nuevo);
    const encId = this.encabezado()?.formId ?? '';
    this.seccionEdit.set(nuevo ? this.emptySeccion(encId) : { ...seccion! });
    this.cdr.markForCheck();
    this.seccionModalInstance.show();
  }

  async saveSeccion() {
    const data = this.seccionEdit();
    if (!data.nombre || !data.titulo) return;

    const resp = this.nuevoSeccion()
      ? await this.service.createSeccion(data)
      : await this.service.updateSeccion(data);

    if (resp?.success) {
      this.seccionModalInstance.hide();
      await this.loadSecciones(this.encabezado()!.formId!);

      // Si editamos, refrescar preguntas si la sección estaba abierta
      if (!this.nuevoSeccion() && data.seccionId && this.seccionActivaId() === data.seccionId) {
        await this.loadPreguntas(data.seccionId);
      }
      this.cdr.markForCheck();
    }
  }

  openDeleteSeccionModal(seccion: FormSeccion) {
    this.seccionEdit.set(seccion);
    this.deleteSeccionModalInstance.show();
  }

  async deleteSeccion() {
    const id = this.seccionEdit().seccionId;
    if (!id) return;
    const resp = await this.service.deleteSeccion(id);
    if (resp?.success) {
      this.deleteSeccionModalInstance.hide();
      if (this.seccionActivaId() === id) this.seccionActivaId.set(null);
      await this.loadSecciones(this.encabezado()!.formId!);
      this.cdr.markForCheck();
    }
  }

  // ── Pregunta CRUD ──────────────────────────────────────────────

  openPreguntaModal(nuevo: boolean, seccionId: string, pregunta?: FormPregunta) {
    this.nuevaPregunta.set(nuevo);
    this.preguntaEdit.set(nuevo ? this.emptyPregunta(seccionId) : { ...pregunta! });
    this.formKeyPregunta.set(Date.now());
    this.cdr.markForCheck();
    this.preguntaModalInstance.show();
  }

  async onSavePregunta(data: FormPregunta) {
    const resp = this.nuevaPregunta()
      ? await this.service.createPregunta(data)
      : await this.service.updatePregunta(data);
    if (resp?.success) {
      this.preguntaModalInstance.hide();
      await this.loadPreguntas(data.seccionId);
      this.cdr.markForCheck();
    }
  }

  openDeletePreguntaModal(pregunta: FormPregunta) {
    this.preguntaEdit.set(pregunta);
    this.deletePreguntaModalInstance.show();
  }

  async deletePregunta() {
    const data = this.preguntaEdit();
    if (!data.preguntaId) return;
    const resp = await this.service.deletePregunta(data.preguntaId);
    if (resp?.success) {
      this.deletePreguntaModalInstance.hide();
      await this.loadPreguntas(data.seccionId);
      this.cdr.markForCheck();
    }
  }

  async togglePreguntaField(pregunta: FormPregunta, field: 'obligatorio' | 'visible' | 'activo') {
    const updated: FormPregunta = { ...pregunta, [field]: !pregunta[field] };
    const resp = await this.service.updatePregunta(updated);
    if (resp?.success) {
      await this.loadPreguntas(pregunta.seccionId);
      this.cdr.markForCheck();
    }
  }

  setSeccion(field: keyof FormSeccion, value: any) {
    this.seccionEdit.update(s => ({ ...s, [field]: value }));
    this.cdr.markForCheck();
  }

  setPregunta(field: keyof FormPregunta, value: any) {
    this.preguntaEdit.update(p => ({ ...p, [field]: value }));
  }

  requiresOpciones(tipo: TipoPregunta): boolean {
    return this.tipoConOpciones.includes(tipo);
  }

  getPreguntasDeSeccion(seccionId: string): FormPregunta[] {
    return this.preguntasPorSeccion()[seccionId] ?? [];
  }

  isSeccionLoading(seccionId: string): boolean {
    return this.loadingPreguntas()[seccionId] ?? false;
  }
}
