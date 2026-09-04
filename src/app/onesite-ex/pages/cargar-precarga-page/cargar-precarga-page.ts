import {
  AfterViewInit, ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, OnInit, signal, ViewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { AuthService } from '../../../../services/auth.service';
import { PrecargaConfigService } from '../../../../services/onesiteex-precarga/precarga-config.service';
import {
  IConfigEncabezado,
  IResultadoCarga,
  IValidacionArchivo,
} from '../../../../interfaces/onesiteex-precarga/onesiteex-precarga';

@Component({
  selector: 'app-cargar-precarga-page',
  imports: [RouterLink],
  templateUrl: './cargar-precarga-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CargarPrecargaPage implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private precargaService = inject(PrecargaConfigService);

  readonly maxBytes = 10 * 1024 * 1024;

  configList = signal<IConfigEncabezado[]>([]);
  configId = signal<string | null>(null);
  configSeleccionada = computed(() => this.configList().find(c => c.id === this.configId()) ?? null);

  archivo = signal<File | null>(null);
  archivoError = signal('');

  validando = signal(false);
  validacion = signal<IValidacionArchivo | null>(null);

  incluirDuplicados = signal(false);
  procesarConErrores = signal(false);

  confirmando = signal(false);
  resultado = signal<IResultadoCarga | null>(null);

  descargandoPlantilla = signal(false);

  hayDuplicadosOErrores = computed(() => {
    const v = this.validacion();
    return !!v && (v.resumen.duplicadas > 0 || v.resumen.conError > 0);
  });

  @ViewChild('confirmModal') confirmModalRef!: ElementRef;
  private confirmModalInstance!: Modal;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.configId.set(id);
    this.fetchConfigs();
  }

  ngAfterViewInit() {
    this.confirmModalInstance = new Modal(this.confirmModalRef.nativeElement);
  }

  async fetchConfigs() {
    const resp = await this.precargaService.getConfigs({ all: true, activo: true });
    this.configList.set(resp?.data ?? []);
  }

  onChangeConfig(value: string) {
    this.configId.set(value || null);
    this.resetCarga();
  }

  resetCarga() {
    this.archivo.set(null);
    this.archivoError.set('');
    this.validacion.set(null);
    this.resultado.set(null);
    this.incluirDuplicados.set(false);
    this.procesarConErrores.set(false);
  }

  async descargarPlantilla() {
    const config = this.configSeleccionada();
    if (!config || this.descargandoPlantilla()) return;
    this.descargandoPlantilla.set(true);
    try {
      await this.precargaService.descargarPlantilla(config);
    } finally {
      this.descargandoPlantilla.set(false);
    }
  }

  onArchivoSeleccionado(input: HTMLInputElement) {
    this.validacion.set(null);
    this.resultado.set(null);
    this.archivoError.set('');

    const file = input.files?.[0] ?? null;
    if (!file) { this.archivo.set(null); return; }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xlsx') {
      this.archivoError.set('El archivo debe ser .xlsx');
      this.archivo.set(null);
      input.value = '';
      return;
    }
    if (file.size > this.maxBytes) {
      this.archivoError.set('El archivo supera el máximo de 10 MB');
      this.archivo.set(null);
      input.value = '';
      return;
    }
    this.archivo.set(file);
  }

  quitarArchivo(input: HTMLInputElement) {
    input.value = '';
    this.archivo.set(null);
    this.archivoError.set('');
    this.validacion.set(null);
    this.resultado.set(null);
  }

  tamanoArchivo(file: File) { return (file.size / 1024).toFixed(1) + ' KB'; }

  async validar() {
    const id = this.configId();
    const archivo = this.archivo();
    if (!id || !archivo || this.validando()) return;

    this.validando.set(true);
    this.validacion.set(null);
    this.resultado.set(null);
    try {
      const resp = await this.precargaService.validarArchivo(id, archivo);
      if (resp?.data) {
        this.validacion.set(resp.data);
        this.incluirDuplicados.set(false);
        this.procesarConErrores.set(false);
      }
    } finally {
      this.validando.set(false);
    }
  }

  cancelarValidacion() {
    this.validacion.set(null);
  }

  iniciarConfirmacion() {
    if (!this.validacion() || this.confirmando()) return;
    if (this.hayDuplicadosOErrores()) {
      this.confirmModalInstance.show();
    } else {
      this.confirmarCarga();
    }
  }

  cerrarConfirmModal() {
    this.confirmModalInstance.hide();
  }

  async confirmarDesdeModal() {
    this.confirmModalInstance.hide();
    await this.confirmarCarga();
  }

  async confirmarCarga() {
    const id = this.configId();
    const archivo = this.archivo();
    if (!id || !archivo || this.confirmando()) return;

    const user = this.authService.getUserStorage();
    this.confirmando.set(true);
    try {
      const resp = await this.precargaService.confirmarCarga(id, archivo, {
        usuarioCrea: user.fullName,
        duplicados: this.incluirDuplicados() ? 'INCLUIR' : 'OMITIR',
        procesarConErrores: this.procesarConErrores(),
      });
      if (resp?.data) {
        this.resultado.set(resp.data);
        this.validacion.set(null);
        this.archivo.set(null);
      }
    } finally {
      this.confirmando.set(false);
    }
  }

  cargarOtroArchivo() {
    this.resetCarga();
  }
}
