import {
  ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { PrecargaConfigService } from '../../../../services/onesiteex-precarga/precarga-config.service';
import { EncuestaService } from '../../../../services/encuesta/encuesta.service';
import { SeccionService } from '../../../../services/encuesta/seccion.service';
import { PreguntaService } from '../../../../services/encuesta/pregunta.service';
import { IEncuesta, IPregunta, ISeccion } from '../../../../interfaces/encuesta/encuesta';
import {
  ICreateConfigEncabezado,
  IConfigDetalleItem,
  IConfigEncabezado,
  TIPO_CONFIG_DETALLE_LABEL,
  TIPOS_CONFIG_DETALLE,
  TipoConfigDetalle,
} from '../../../../interfaces/onesiteex-precarga/onesiteex-precarga';

interface GrupoPreguntas {
  seccion: ISeccion;
  preguntas: IPregunta[];
}

@Component({
  selector: 'app-crear-config-page',
  imports: [RouterLink],
  templateUrl: './crear-config-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CrearConfigPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private precargaService = inject(PrecargaConfigService);
  private encuestaService = inject(EncuestaService);
  private seccionService = inject(SeccionService);
  private preguntaService = inject(PreguntaService);

  readonly tiposDisponibles = TIPOS_CONFIG_DETALLE;
  readonly tipoLabel = TIPO_CONFIG_DETALLE_LABEL;

  nuevo = signal(true);
  configId = signal<string | null>(null);
  configOriginal = signal<IConfigEncabezado | null>(null);

  // Encabezado
  nombre = signal('');
  idEncuesta = signal<number | null>(null);
  activo = signal(true);

  encuestaList = signal<IEncuesta[]>([]);
  seccionesConPreguntas = signal<GrupoPreguntas[]>([]);
  selectedDetails = signal<IConfigDetalleItem[]>([]);

  buscadorPreguntas = signal('');

  isLoading = signal(false);
  cargandoPreguntas = signal(false);
  isSaving = signal(false);
  touched = signal(false);
  descargando = signal(false);

  private preguntaMap = computed(() => {
    const map = new Map<number, IPregunta>();
    for (const g of this.seccionesConPreguntas()) {
      for (const p of g.preguntas) map.set(p.idPregunta!, p);
    }
    return map;
  });

  gruposFiltrados = computed(() => {
    const q = this.buscadorPreguntas().trim().toLowerCase();
    const grupos = this.seccionesConPreguntas();
    if (!q) return grupos;
    return grupos
      .map(g => ({
        seccion: g.seccion,
        preguntas: g.preguntas.filter(p =>
          p.etiqueta.toLowerCase().includes(q) || String(p.codigo).includes(q)
        ),
      }))
      .filter(g => g.preguntas.length > 0);
  });

  duplicateEtiquetaSet = computed(() => {
    const counts = new Map<string, number>();
    for (const d of this.selectedDetails()) {
      const key = d.etiqueta.trim().toLowerCase();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([k]) => k));
  });

  nombreEncuestaActual = computed(() => {
    const id = this.idEncuesta();
    if (id == null) return '';
    return this.encuestaList().find(e => e.idEncuesta === id)?.nombre ?? `#${id}`;
  });

  formValido = computed(() =>
    this.nombre().trim().length > 0
    && this.nombre().trim().length <= 200
    && this.idEncuesta() != null
    && this.selectedDetails().length > 0
    && this.selectedDetails().every(d => d.etiqueta.trim().length > 0)
    && this.duplicateEtiquetaSet().size === 0
  );

  get tituloPagina() { return this.nuevo() ? 'Nueva configuración de precarga' : 'Editar configuración de precarga'; }
  get textoBoton() { return this.nuevo() ? 'Crear configuración' : 'Actualizar configuración'; }

  ngOnInit() {
    this.fetchEncuestas();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.nuevo.set(false);
      this.configId.set(id);
      this.loadConfig(id);
    }
  }

  async fetchEncuestas() {
    const resp = await this.encuestaService.getEncuestas({ all: true });
    this.encuestaList.set(resp?.data ?? []);
  }

  async loadConfig(id: string) {
    this.isLoading.set(true);
    try {
      const resp = await this.precargaService.getConfigById(id);
      if (resp?.data) {
        const { detalles, ...encabezado } = resp.data;
        this.configOriginal.set(encabezado);
        this.nombre.set(encabezado.nombre);
        this.idEncuesta.set(encabezado.idEncuesta);
        this.activo.set(encabezado.activo);
        this.selectedDetails.set(
          [...detalles]
            .sort((a, b) => a.orden - b.orden)
            .map(d => ({ idPregunta: d.idPregunta, etiqueta: d.etiqueta, tipo: d.tipo }))
        );
        await this.loadPreguntas(encabezado.idEncuesta);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadPreguntas(idEncuesta: number) {
    this.cargandoPreguntas.set(true);
    try {
      const seccionesResp = await this.seccionService.getSecciones({ idEncuesta, all: true });
      const secciones = (seccionesResp?.data ?? []).slice().sort((a, b) => a.orden - b.orden);

      const grupos = await Promise.all(secciones.map(async (seccion): Promise<GrupoPreguntas> => {
        const preguntasResp = await this.preguntaService.getPreguntas({
          idSeccion: seccion.idSeccion, all: true, sinPreguntasMatriz: true,
        });
        const preguntas = (preguntasResp?.data ?? []).filter(p => p.tipoDato !== 'MATRIZ');
        return { seccion, preguntas };
      }));

      this.seccionesConPreguntas.set(grupos.filter(g => g.preguntas.length > 0));
    } finally {
      this.cargandoPreguntas.set(false);
    }
  }

  async onEncuestaChange(value: string) {
    const idEncuesta = value ? Number(value) : null;
    this.idEncuesta.set(idEncuesta);
    this.seccionesConPreguntas.set([]);
    this.selectedDetails.set([]);
    if (idEncuesta != null) await this.loadPreguntas(idEncuesta);
  }

  isSelected(pregunta: IPregunta) {
    return this.selectedDetails().some(d => d.idPregunta === pregunta.idPregunta);
  }

  toggleSeleccion(pregunta: IPregunta, checked: boolean) {
    if (checked) {
      this.selectedDetails.update(list => [
        ...list,
        { idPregunta: pregunta.idPregunta!, etiqueta: pregunta.etiqueta, tipo: null },
      ]);
    } else {
      this.selectedDetails.update(list => list.filter(d => d.idPregunta !== pregunta.idPregunta));
    }
  }

  removeDetalle(index: number) {
    this.selectedDetails.update(list => list.filter((_, i) => i !== index));
  }

  updateEtiqueta(index: number, value: string) {
    this.selectedDetails.update(list => list.map((d, i) => i === index ? { ...d, etiqueta: value } : d));
  }

  updateTipo(index: number, value: string) {
    const tipo = (value || null) as TipoConfigDetalle | null;
    this.selectedDetails.update(list => list.map((d, i) => i === index ? { ...d, tipo } : d));
  }

  tipoUsadoPorOtro(tipo: TipoConfigDetalle, index: number) {
    return this.selectedDetails().some((d, i) => i !== index && d.tipo === tipo);
  }

  etiquetaPregunta(idPregunta: number) {
    return this.preguntaMap().get(idPregunta)?.etiqueta ?? null;
  }

  // ── Drag & drop de columnas ─────────────────────────────────────────────
  private dragIndex = -1;

  onDragStart(index: number) { this.dragIndex = index; }
  onDragOver(event: DragEvent) { event.preventDefault(); }

  onDrop(dropIndex: number) {
    if (this.dragIndex === -1 || this.dragIndex === dropIndex) return;
    const list = [...this.selectedDetails()];
    const [item] = list.splice(this.dragIndex, 1);
    list.splice(dropIndex, 0, item);
    this.selectedDetails.set(list);
    this.dragIndex = -1;
  }

  onDragEnd() { this.dragIndex = -1; }

  // ── Guardar ──────────────────────────────────────────────────────────────

  async onSubmit() {
    this.touched.set(true);
    if (!this.formValido() || this.isSaving()) return;

    const user = this.authService.getUserStorage();
    const dto: ICreateConfigEncabezado = {
      idEncuesta: this.idEncuesta()!,
      nombre: this.nombre().trim(),
      idUsuarioCrea: user.userId,
      usuarioCrea: user.fullName,
      origen: 'OneSite',
      activo: this.activo(),
      detalles: this.selectedDetails().map(d => ({
        idPregunta: d.idPregunta,
        etiqueta: d.etiqueta.trim(),
        tipo: d.tipo || null,
      })),
    };

    this.isSaving.set(true);
    try {
      const resp = this.nuevo()
        ? await this.precargaService.createConfig(dto)
        : await this.precargaService.updateConfig(this.configId()!, dto);
      if (resp?.success) this.router.navigate(['/onesiteex/config-precarga']);
    } finally {
      this.isSaving.set(false);
    }
  }

  onCancel() {
    this.router.navigate(['/onesiteex/config-precarga']);
  }

  async descargarPlantilla() {
    const config = this.configOriginal();
    if (!config || this.descargando()) return;
    this.descargando.set(true);
    try {
      await this.precargaService.descargarPlantilla(config);
    } finally {
      this.descargando.set(false);
    }
  }
}
