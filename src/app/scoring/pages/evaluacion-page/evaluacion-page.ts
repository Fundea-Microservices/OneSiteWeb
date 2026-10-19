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
import { Modal } from 'bootstrap';
import { Router, RouterLink } from '@angular/router';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { EvaluacionScoringService } from '../../../../services/scoring/evaluacion.service';
import {
  IEvaluacionCredito,
  IModeloScoring,
} from '../../../../interfaces/scoring/scoring';
import { ModeloScoringService } from '../../../../services/scoring/modelo-scoring.service';
import {
  CrearEvaluacionManualComponent,
  EvaluacionManual,
} from '../../components/crear-evaluacion-manual/crear-evaluacion-manual.component';

/** Pantalla 4: bandeja de Evaluación de Solicitudes de Crédito. */
@Component({
  selector: 'app-evaluacion-page',
  imports: [RouterLink, PaginationComponent, CrearEvaluacionManualComponent],
  templateUrl: './evaluacion-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EvaluacionPage implements OnInit, AfterViewInit {
  private evaluacionService = inject(EvaluacionScoringService);
  private modeloService = inject(ModeloScoringService);
  private router = inject(Router);

  evaluacionList = signal<IEvaluacionCredito[]>([]);
  numeroSolicitud = signal('');
  isLoading = signal(false);
  isConsultando = signal(false);
  procesando = signal<number | null>(null);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  modelos = signal<IModeloScoring[]>([]);
  formKeyManual = signal(Date.now());
  isCreandoManual = signal(false);

  /**
   * Cada boton aparece solo si algun modelo activo habilita ese origen. Si no,
   * el asesor veria una accion que el backend va a rechazar.
   */
  hayBantotal = computed(() =>
    this.modelos().some((m) => m.origenBantotal && m.estado === 'Activo'),
  );
  hayCaptura = computed(() =>
    this.modelos().some((m) => m.origenCaptura && m.estado === 'Activo'),
  );

  @ViewChild('manualModal') manualModalRef!: ElementRef;
  private manualModalInstance!: Modal;

  async ngOnInit() {
    const resp = await this.modeloService.getModelos({
      estado: 'Activo',
      limite: 200,
    });
    this.modelos.set(resp?.items ?? []);
    await this.fetchData();
  }

  ngAfterViewInit() {
    this.manualModalInstance = new Modal(this.manualModalRef.nativeElement);
  }

  openManualModal() {
    this.formKeyManual.set(Date.now());
    this.manualModalInstance.show();
  }

  closeManualModal() {
    this.manualModalInstance.hide();
  }

  /**
   * Guarda la evaluacion en estado Solicitud y lleva a la captura del
   * cuestionario, que es la pantalla que ya resuelve el formulario dinamico.
   */
  async guardarManual(manual: EvaluacionManual) {
    this.isCreandoManual.set(true);
    try {
      const resp = await this.evaluacionService.createEvaluacion({
        numeroSolicitud: manual.numeroSolicitud,
        scoringId: manual.scoringId,
        datosBantotal: manual.datos,
        respuestas: [],
        origenDatos: 'Captura',
      });

      if (resp?.data?.evaluacionId) {
        this.closeManualModal();
        this.router.navigate([
          '/scoring/evaluacion/captura/evaluacion',
          resp.data.evaluacionId,
        ]);
      }
    } finally {
      this.isCreandoManual.set(false);
    }
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const numero = Number(this.numeroSolicitud());
      const resp = await this.evaluacionService.getEvaluaciones({
        numeroSolicitud: Number.isFinite(numero) && numero > 0 ? numero : undefined,
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

  changePage(pagination: IPagination) {
    this.pagination.set(pagination);
    this.fetchData();
  }

  /**
   * Botón [Consultar Bantotal].
   *
   * Solo navega a la captura si el core confirma la solicitud: si no existe, el
   * servicio ya mostró ERR-SCOR-007 y no tiene sentido abrir un formulario que
   * no se podría guardar.
   */
  async consultarBantotal() {
    const numero = Number(this.numeroSolicitud());
    if (!Number.isFinite(numero) || numero <= 0) return;

    this.isConsultando.set(true);
    try {
      const solicitud = await this.evaluacionService.consultarBantotal(numero);
      if (solicitud) {
        this.router.navigate(['/scoring/evaluacion/captura/solicitud', numero]);
      }
    } finally {
      this.isConsultando.set(false);
    }
  }

  abrirCaptura(evaluacion: IEvaluacionCredito) {
    this.router.navigate([
      '/scoring/evaluacion/captura/evaluacion',
      evaluacion.evaluacionId,
    ]);
  }

  verExpediente(evaluacion: IEvaluacionCredito) {
    this.router.navigate(['/scoring/auditoria'], {
      queryParams: { evaluacionId: evaluacion.evaluacionId },
    });
  }

  /** Botón [P]: calcula el dictamen y sella la evaluación. */
  async procesar(evaluacion: IEvaluacionCredito) {
    if (!evaluacion.evaluacionId) return;

    this.procesando.set(evaluacion.evaluacionId);
    try {
      const resp = await this.evaluacionService.procesar(
        evaluacion.evaluacionId,
      );
      if (resp) await this.fetchData();
    } finally {
      this.procesando.set(null);
    }
  }

  claseSemaforo(semaforo: string): string {
    switch (semaforo) {
      case 'Verde':
        return 'text-bg-success';
      case 'Amarillo':
        return 'text-bg-warning';
      // Cuarto color: Punteo Precalificado de TransUnion entre 1 y 19.
      case 'Naranja':
        return 'text-bg-orange';
      case 'Rojo':
        return 'text-bg-danger';
      default:
        return 'text-bg-secondary';
    }
  }
}
