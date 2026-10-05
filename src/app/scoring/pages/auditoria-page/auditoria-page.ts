import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
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
} from '../../../../interfaces/scoring/scoring';

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
  private route = inject(ActivatedRoute);

  evaluacionList = signal<IEvaluacionCredito[]>([]);
  numeroSolicitud = signal('');
  expediente = signal<IExpediente | null>(null);
  isLoading = signal(false);
  isCargandoExpediente = signal(false);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  @ViewChild('expedienteModal') expedienteModalRef!: ElementRef;
  private expedienteModalInstance!: Modal;

  /** Llega con ?evaluacionId cuando se entra desde la bandeja de evaluación. */
  private evaluacionInicial: number | null = null;

  async ngOnInit() {
    const param = this.route.snapshot.queryParamMap.get('evaluacionId');
    this.evaluacionInicial = param ? Number(param) : null;
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
      const numero = Number(this.numeroSolicitud());
      const resp = await this.auditoriaService.consultar({
        numeroSolicitud:
          Number.isFinite(numero) && numero > 0 ? numero : undefined,
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

  claseSemaforo(semaforo: string | null | undefined): string {
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
