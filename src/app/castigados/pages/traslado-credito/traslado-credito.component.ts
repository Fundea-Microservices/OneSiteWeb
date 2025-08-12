import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CreditoCastigadoView } from '../../../../interfaces/castigados/credito-view';
import { Modal } from 'bootstrap';
import { CreditosCastigadosService } from '../../../../services/castigados/creditos.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { DatePipe } from '@angular/common';
import { EmpresaCastigadosService } from '../../../../services/castigados/empresa.service';
import { IEmpresaAliado } from '../../../../interfaces/aliado/empresa';
import { ToastrService } from 'ngx-toastr';

const emptyCredito: CreditoCastigadoView = {
  IncoSuc: 0,
  IncoCta: 0,
  Nombre: '',
  IncoOpe: 0,
  IncoMod: 0,
  IncoSbp: 0,
  IncoTOp: 0,
  IncoGarantia: '',
  IncoMontoOriginal: 0,
  IncoFechaOtorgado: new Date(),
  IncoFechaVencimiento: new Date(),
  Capital: 0,
  Intereses_Corrientes: 0,
  Intereses_Moratorios: 0,
  Seguro: 0,
  Comisiones: 0,
  Total: 0,
  IncoFechaCastigo: new Date(),
  IncoFechaCorte: new Date(),
  IncoSys: '',
  IncoTransaccion: 0,
  IncoExCta: 0,
  IncoExOpe: 0,
}

const hoy = new Date();
const hace30Dias = new Date();
hace30Dias.setDate(hace30Dias.getDate() - 30);

@Component({
  selector: 'app-traslado-credito',
  imports: [RouterLink, PaginationComponent, DatePipe],
  templateUrl: './traslado-credito.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TrasladoCreditoComponent { 
  creditosService = inject(CreditosCastigadosService);
  empresaService = inject(EmpresaCastigadosService);
  creditosList = signal<CreditoCastigadoView[]>([]);
  empresasList = signal<IEmpresaAliado[]>([]);
  creditosListTrasladar = signal<CreditoCastigadoView[]>([]);
  metadata = signal({})// Cambia el tipo según tu modelo de datos
  nuevoMetodo = signal(true)
  empresaSelected = signal('')

  pagination = signal<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  })
  isLoading = signal(false);
  formKey = signal(Date.now());

  @ViewChild('upsertModal') modalElementRef!: ElementRef;
  private modalUpsertInstance!: bootstrap.Modal;

  modal = signal({
    titulo: 'Trasladar créditos',
    visible: false,
  });

  
  fechaInicial = signal(hace30Dias.toISOString().split('T')[0]); // yyyy-MM-dd
  fechaFinal = signal(hoy.toISOString().split('T')[0]); // yyyy-MM-dd
  constructor( private toastr: ToastrService) { }

  ngOnInit() {

    this.creditosList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.cargarEmpresas()
    // this.fetchData();
  }

  ngAfterViewInit() {
    this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
  }

  async cargarEmpresas(){
    let resp = await this.empresaService.getEmpresas({all: true});
    if (resp) {
      let { empresas, metadata } = resp.data;
      this.empresasList.set(empresas);
    }
  }

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    let resp = await this.creditosService.getCreditos({ page: this.pagination().page, limit: this.pagination().pageSize, fechaInicial: this.fechaInicial(), fechaFinal: this.fechaFinal() });
    if (resp) {
      let { creditos, metadata } = resp.data;
      this.creditosList.set(creditos);
      // Para cada crédito seteamos trasladar=false y observaciones=''
      this.creditosList().forEach(item => {
        item.trasladar = false;
        item.observaciones = '';
      });
      this.metadata.set(metadata);
      this.pagination.set({
        page: metadata.page,
        pageSize: metadata.limit,
        totalItems: metadata.total
      });
    }
    if(this.creditosList().length == 0){
      this.toastr.warning('No se encontraron créditos para trasladar', 'Advertencia');
    }
    this.isLoading.set(false);
  } 

  onChangePage(newPagination: IPagination) {
    this.creditosList.set([]); // Limpiamos la lista antes de cargar nuevos datos
    this.pagination.set(newPagination);
    this.fetchData();
  }


  openModal() {
    this.formKey.set(Date.now()); // esto obliga al componente hijo a resetear
    // this.modal.set({ titulo: nuevo ? 'Crear Método' : 'Actualizar Método', visible: true });
    if (!this.modalUpsertInstance) {
      this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
    }
    this.modalUpsertInstance.show();
  }

  closeModal() {
    if (this.modalUpsertInstance) {
      this.modalUpsertInstance.hide();
    }
  }

  actualizarListadoTrasladar() {
    this.creditosListTrasladar.set(this.creditosList().filter(item => item.trasladar == true));
    console.log("🚀 ~ TrasladoCreditoComponent ~ actualizarListadoTrasladar ~ creditosListTrasladar:", this.creditosListTrasladar())
  }

  changeSelectEmpresa(empresaId: string) {
    this.empresaSelected.set(empresaId)
    this.fetchData();
  }

  async trasladarCreditos(){
    if(!this.empresaSelected()) {
      this.toastr.warning('No ha seleccionado empresa', 'Advertencia');
      return;
    }

    if(this.creditosListTrasladar().length === 0) {
      this.toastr.warning('No ha seleccionado créditos para trasladar', 'Advertencia');
      return;
    }

    const data = {
      empresa: {
        id: this.empresaSelected(),
        name: this.empresasList().find(item => item.empresaId === this.empresaSelected())?.name
      },
      creditos: this.creditosListTrasladar()
    };

    await this.creditosService.trasladarCreditos(data)


  }


}
