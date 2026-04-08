import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Modal } from 'bootstrap';
import { FormulariosService } from '../../../../services/config/formularios.service';
import { FormEncabezado } from '../../../../interfaces/configuracion';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';

@Component({
  selector: 'app-formulario-gesion-page',
  imports: [RouterLink, DatePipe, PaginationAllComponent, FormsModule],
  templateUrl: './formulario-gesion-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FormularioGesionPage {
  private formulariosService = inject(FormulariosService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal(false);
  nuevo = signal(true);
  formList = signal<FormEncabezado[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  formEdit = signal<FormEncabezado>(this.emptyForm());

  @ViewChild('upsertModal') upsertModalRef!: ElementRef;
  private upsertModalInstance!: Modal;

  @ViewChild('deleteModal') deleteModalRef!: ElementRef;
  private deleteModalInstance!: Modal;

  ngOnInit() {
    this.fetchData();
  }

  ngAfterViewInit() {
    if (this.upsertModalRef) {
      this.upsertModalInstance = new Modal(this.upsertModalRef.nativeElement);
    }
    if (this.deleteModalRef) {
      this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
    }
  }

  private emptyForm(): FormEncabezado {
    return {
      nombre: '',
      descripcion: '',
      activo: true,
    };
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const resp = await this.formulariosService.getFormEncabezados({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
      });
      if (resp?.data) {
        this.formList.set(resp.data);
        const m = resp.metadata;
        this.pagination.set({
          page: m.page ?? 1,
          pageSize: m.limit ?? 10,
          totalItems: m.total ?? 0,
          totalPages: Math.ceil((m.total ?? 0) / (m.limit ?? 10)),
        });
      } else {
        this.formList.set([]);
      }
    } catch (e) {
      console.error('Error fetching form encabezados', e);
      this.formList.set([]);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  onChangePage(p: IPagination) {
    this.pagination.set(p);
    this.fetchData();
  }

  async toggleActivo(item: FormEncabezado) {
    const resp = await this.formulariosService.updateFormEncabezado({
      ...item,
      activo: !item.activo,
    });
    if (resp?.success) this.fetchData();
  }

  openUpsertModal(nuevo: boolean = true, item?: FormEncabezado) {
    this.nuevo.set(nuevo);
    if (nuevo) {
      this.formEdit.set(this.emptyForm());
    } else if (item) {
      this.formEdit.set({ ...item });
    }
    
    if (!this.upsertModalInstance) {
      this.upsertModalInstance = new Modal(this.upsertModalRef.nativeElement);
    }
    this.upsertModalInstance.show();
  }

  async saveForm() {
    const data = this.formEdit();
    if (!data.nombre) return;

    this.isLoading.set(true);
    try {
      const resp = this.nuevo()
        ? await this.formulariosService.createFormEncabezado(data)
        : await this.formulariosService.updateFormEncabezado(data);

      if (resp?.success) {
        this.upsertModalInstance?.hide();
        this.isLoading.set(false); // Resetear loading para permitir que fetchData se ejecute
        this.fetchData();
      }
    } catch (error) {
      console.error('Error saving form:', error);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  openDeleteModal(item: FormEncabezado) {
    this.formEdit.set(item);
    if (!this.deleteModalInstance) {
      this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
    }
    this.deleteModalInstance.show();
  }

  async deleteForm() {
    const item = this.formEdit();
    if (!item.formId) return;
    const resp = await this.formulariosService.deleteFormEncabezado(item.formId);
    if (resp?.success) {
      this.fetchData();
      this.deleteModalInstance?.hide();
    }
  }
}
