import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { EvaluacionScoringService } from '../../../../services/scoring/evaluacion.service';
import { IEvaluacionCredito } from '../../../../interfaces/scoring/scoring';

/** Pantalla 4: bandeja de Evaluación de Solicitudes de Crédito. */
@Component({
  selector: 'app-evaluacion-page',
  imports: [RouterLink, PaginationComponent],
  templateUrl: './evaluacion-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EvaluacionPage implements OnInit {
  private evaluacionService = inject(EvaluacionScoringService);
  private router = inject(Router);

  evaluacionList = signal<IEvaluacionCredito[]>([]);
  numeroSolicitud = signal('');
  isLoading = signal(false);
  isConsultando = signal(false);
  procesando = signal<number | null>(null);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  ngOnInit() {
    this.fetchData();
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
      case 'Rojo':
        return 'text-bg-danger';
      default:
        return 'text-bg-secondary';
    }
  }
}
