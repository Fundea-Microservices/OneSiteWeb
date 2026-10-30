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
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { ProcedimientoScoringService } from '../../../../services/scoring/procedimiento-scoring.service';
import { IProcedimientoScoring } from '../../../../interfaces/scoring/scoring';
import { UpsertProcedimientoScoringComponent } from '../../components/upsert-procedimiento-scoring/upsert-procedimiento-scoring.component';

/** Catálogo de procedimientos almacenados del módulo de Scoring. */
@Component({
  selector: 'app-procedimientos-scoring-page',
  imports: [
    RouterLink,
    DatePipe,
    PaginationComponent,
    UpsertProcedimientoScoringComponent,
  ],
  templateUrl: './procedimientos-scoring-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProcedimientosScoringPage implements OnInit, AfterViewInit {
  private procedimientoService = inject(ProcedimientoScoringService);

  lista = signal<IProcedimientoScoring[]>([]);
  busqueda = signal('');
  isLoading = signal(false);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

  procedimientoEdit = signal<IProcedimientoScoring | null>(null);
  nuevo = signal(true);
  formKey = signal(Date.now());

  /** Fila sobre la que se confirma aplicar o inactivar. */
  accion = signal<IProcedimientoScoring | null>(null);
  isAplicando = signal(false);

  @ViewChild('upsertModal') upsertModalRef!: ElementRef;
  private upsertModalInstance!: Modal;

  @ViewChild('aplicarModal') aplicarModalRef!: ElementRef;
  private aplicarModalInstance!: Modal;

  @ViewChild('estadoModal') estadoModalRef!: ElementRef;
  private estadoModalInstance!: Modal;

  async ngOnInit() {
    await this.fetchData();
  }

  ngAfterViewInit() {
    this.upsertModalInstance = new Modal(this.upsertModalRef.nativeElement);
    this.aplicarModalInstance = new Modal(this.aplicarModalRef.nativeElement);
    this.estadoModalInstance = new Modal(this.estadoModalRef.nativeElement);
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const resp = await this.procedimientoService.getProcedimientos({
        busqueda: this.busqueda(),
        pagina: this.pagination().page,
        limite: this.pagination().pageSize,
      });

      if (resp) {
        this.lista.set(resp.items ?? []);
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

  buscar() {
    this.pagination.update((p) => ({ ...p, page: 1 }));
    this.fetchData();
  }

  changePage(pagination: IPagination) {
    this.pagination.set(pagination);
    this.fetchData();
  }

  // ── Alta y edición ────────────────────────────────────────────────────────

  openNuevo() {
    this.procedimientoEdit.set(null);
    this.nuevo.set(true);
    this.formKey.set(Date.now());
    this.upsertModalInstance.show();
  }

  /** El listado no trae el script completo: se pide el detalle al editar. */
  async openEditar(procedimiento: IProcedimientoScoring) {
    if (!procedimiento.procedimientoId) return;

    const detalle = await this.procedimientoService.getProcedimiento(
      procedimiento.procedimientoId,
    );
    if (!detalle) return;

    this.procedimientoEdit.set(detalle);
    this.nuevo.set(false);
    this.formKey.set(Date.now());
    this.upsertModalInstance.show();
  }

  closeModal() {
    this.upsertModalInstance.hide();
  }

  async guardar(procedimiento: IProcedimientoScoring) {
    const id = this.procedimientoEdit()?.procedimientoId;

    const resp = id
      ? await this.procedimientoService.updateProcedimiento(id, procedimiento)
      : await this.procedimientoService.createProcedimiento(procedimiento);

    if (resp) {
      this.closeModal();
      await this.fetchData();
    }
  }

  // ── Aplicar: lo único que ejecuta el script ───────────────────────────────

  openAplicar(procedimiento: IProcedimientoScoring) {
    this.accion.set(procedimiento);
    this.aplicarModalInstance.show();
  }

  async confirmarAplicar() {
    const procedimiento = this.accion();
    if (!procedimiento?.procedimientoId) return;

    this.isAplicando.set(true);
    try {
      const resp = await this.procedimientoService.aplicar(
        procedimiento.procedimientoId,
      );
      this.aplicarModalInstance.hide();
      if (resp) await this.fetchData();
    } finally {
      this.isAplicando.set(false);
    }
  }

  // ── Estado ────────────────────────────────────────────────────────────────

  openEstado(procedimiento: IProcedimientoScoring) {
    this.accion.set(procedimiento);
    this.estadoModalInstance.show();
  }

  async confirmarEstado() {
    const procedimiento = this.accion();
    if (!procedimiento?.procedimientoId) return;

    const nuevoEstado =
      procedimiento.estado === 'Activo' ? 'Inactivo' : 'Activo';

    const resp = await this.procedimientoService.cambiarEstado(
      procedimiento.procedimientoId,
      nuevoEstado,
    );

    this.estadoModalInstance.hide();
    if (resp) await this.fetchData();
  }
}
