import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Modal } from 'bootstrap';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { AuditoriaScoringService } from '../../../../services/scoring/auditoria.service';
import {
  IEvaluacionCredito,
  IExpediente,
  IOpcionExterna,
} from '../../../../interfaces/scoring/scoring';
import { CatalogoVariableService } from '../../../../services/scoring/catalogo-variable.service';
import {
  claseBorde,
  claseMarco,
  clasePie,
  clasePunto,
  claseTabla,
  estiloBorde,
  estiloMarco,
  estiloPie,
  estiloPunto,
  estiloTabla,
} from '../../utils/semaforo-colores';

/** Los filtros de la bandeja. Región y Agencia guardan el CÓDIGO. */
interface FiltrosBandeja {
  evaluacionId: string;
  cliente: string;
  region: string;
  agencia: string;
  usuario: string;
  desde: string;
  hasta: string;
}

const aFecha = (valor: Date): string => {
  const mes = String(valor.getMonth() + 1).padStart(2, '0');
  const dia = String(valor.getDate()).padStart(2, '0');
  return `${valor.getFullYear()}-${mes}-${dia}`;
};

/**
 * Del día 1 del mes en curso a hoy.
 *
 * La bandeja arranca acotada: sin rango traía el histórico completo. Para
 * ver meses anteriores hay que ampliar el rango a mano.
 */
const filtrosPorDefecto = (): FiltrosBandeja => {
  const hoy = new Date();

  return {
    evaluacionId: '',
    cliente: '',
    region: '',
    agencia: '',
    usuario: '',
    desde: aFecha(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
    hasta: aFecha(hoy),
  };
};

/** Pantalla 5: Auditoría y Trazabilidad de Dictámenes. Solo lectura. */
@Component({
  selector: 'app-auditoria-page',
  imports: [RouterLink, DecimalPipe, PaginationComponent],
  templateUrl: './auditoria-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AuditoriaPage implements OnInit, AfterViewInit {
  private auditoriaService = inject(AuditoriaScoringService);
  private catalogoService = inject(CatalogoVariableService);
  private route = inject(ActivatedRoute);

  evaluacionList = signal<IEvaluacionCredito[]>([]);
  numeroSolicitud = signal('');
  expediente = signal<IExpediente | null>(null);
  isLoading = signal(false);
  isCargandoExpediente = signal(false);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  /**
   * El formulario trabaja sobre un BORRADOR y la bandeja sobre lo APLICADO.
   * Nada se consulta hasta [Aplicar], y paginar usa el criterio aplicado.
   */
  borrador = signal<FiltrosBandeja>(filtrosPorDefecto());
  private aplicados = signal<FiltrosBandeja>(filtrosPorDefecto());

  /** Regiones y agencias del core, en una sola consulta al abrir. */
  private catalogoUbicaciones = signal<IOpcionExterna[]>([]);

  regiones = computed(() =>
    this.catalogoUbicaciones()
      .filter((o) => o.grupo.toLowerCase() === 'region' && o.activo)
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre)),
  );

  /** Sin región elegida se listan todas: el asesor conoce su agencia. */
  agencias = computed(() => {
    const region = this.borrador().region;

    return this.catalogoUbicaciones()
      .filter((o) => o.grupo.toLowerCase() === 'agencia' && o.activo)
      .filter((o) => !region || o.codigoPadre === region)
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
  });

  @ViewChild('expedienteModal') expedienteModalRef!: ElementRef;
  private expedienteModalInstance!: Modal;

  /** Llega con ?evaluacionId cuando se entra desde la bandeja de evaluación. */
  private evaluacionInicial: number | null = null;

  async ngOnInit() {
    const param = this.route.snapshot.queryParamMap.get('evaluacionId');
    this.evaluacionInicial = param ? Number(param) : null;

    // Una sola llamada: las agencias vienen anidadas en la de región.
    this.catalogoUbicaciones.set(
      await this.catalogoService.getCatalogoExterno('region'),
    );

    await this.fetchData();
  }

  async ngAfterViewInit() {
    this.expedienteModalInstance = new Modal(
      this.expedienteModalRef.nativeElement,
    );

    if (this.evaluacionInicial) {
      await this.verExpediente(this.evaluacionInicial);
    }
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const filtros = this.aplicados();
      const numero = Number(this.numeroSolicitud());
      const evaluacionId = Number(filtros.evaluacionId);

      const resp = await this.auditoriaService.consultar({
        numeroSolicitud:
          Number.isFinite(numero) && numero > 0 ? numero : undefined,
        evaluacionId:
          Number.isFinite(evaluacionId) && evaluacionId > 0
            ? evaluacionId
            : undefined,
        cliente: filtros.cliente || undefined,
        // La evaluación guardó el nombre, no el código del catálogo.
        region: this.nombreUbicacion(filtros.region),
        agencia: this.nombreUbicacion(filtros.agencia),
        usuario: filtros.usuario || undefined,
        fechaDesde: filtros.desde || undefined,
        fechaHasta: filtros.hasta || undefined,
        pagina: this.pagination().page,
        limite: this.pagination().pageSize,
      });

      if (resp) {
        this.evaluacionList.set(resp.items ?? []);
        this.pagination.set({
          page: resp.pagina,
          pageSize: resp.limite,
          totalItems: resp.total,
        });
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  /** El nombre con el que el core identifica una región o agencia. */
  private nombreUbicacion(codigo: string): string | undefined {
    if (!codigo) return undefined;

    return this.catalogoUbicaciones().find((o) => o.codigo === codigo)?.nombre;
  }

  /** Escribe un campo del borrador. No consulta nada. */
  editar(campo: keyof FiltrosBandeja, valor: string) {
    this.borrador.update((f) => ({ ...f, [campo]: valor }));
  }

  /** Cambiar de región descarta la agencia: puede no pertenecerle. */
  cambiarRegion(codigo: string) {
    this.borrador.update((f) => ({ ...f, region: codigo, agencia: '' }));
  }

  /**
   * Filtrar vuelve a la página 1: con otro criterio la página 3 de antes no
   * corresponde a nada y la bandeja saldría vacía.
   */
  aplicarFiltros() {
    this.aplicados.set({ ...this.borrador() });
    this.pagination.update((p) => ({ ...p, page: 1 }));
    this.fetchData();
  }

  /** Vuelve al rango del mes en curso y consulta de inmediato. */
  limpiarFiltros() {
    this.borrador.set(filtrosPorDefecto());
    this.aplicados.set(filtrosPorDefecto());
    this.numeroSolicitud.set('');
    this.pagination.update((p) => ({ ...p, page: 1 }));
    this.fetchData();
  }

  changePage(pagination: IPagination) {
    this.pagination.set(pagination);
    this.fetchData();
  }

  /**
   * Abre el expediente.
   *
   * Si la evaluación no está procesada el backend devuelve ERR-SCOR-006 y el
   * servicio ya muestra el mensaje; aquí simplemente no se abre el modal, que
   * es lo que pide la especificación ("la consulta bloquea los datos").
   */
  async verExpediente(evaluacionId: number) {
    this.isCargandoExpediente.set(true);
    try {
      const expediente = await this.auditoriaService.getExpediente(evaluacionId);
      if (!expediente) return;

      this.expediente.set(expediente);
      this.expedienteModalInstance.show();
    } finally {
      this.isCargandoExpediente.set(false);
    }
  }

  cerrarExpediente() {
    this.expedienteModalInstance.hide();
  }

  /**
   * Colores del dictamen, para la plantilla.
   *
   * Viven en un módulo aparte porque la bandeja y Auditoría tienen que
   * pintar el mismo dictamen igual, y dos copias de la regla terminarían
   * divergiendo. Cada par es clase + estilo: la clase es el camino de
   * siempre, el estilo el del hexadecimal parametrizado.
   */
  readonly clasePunto = clasePunto;
  readonly estiloPunto = estiloPunto;
  readonly claseMarco = claseMarco;
  readonly estiloMarco = estiloMarco;
  readonly claseBorde = claseBorde;
  readonly estiloBorde = estiloBorde;
  readonly claseTabla = claseTabla;
  readonly estiloTabla = estiloTabla;
  readonly clasePie = clasePie;
  readonly estiloPie = estiloPie;

}
