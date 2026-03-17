import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild, inject, ChangeDetectorRef, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { RepresentanteService } from '../../../../services/aliado/representante.service';
import { Representante } from '../../../../interfaces/aliado/representante';
import { Solicitud } from '../../../../interfaces/aliado/solicitudes';
import { CommonModule } from '@angular/common';
import { SolicitudesService } from '../../../../services/aliado/solicitudes.service';
import { SucursalesBantotalService } from '../../../../services/api-bantotal/sucursales.service';
import { Region, Agencia } from '../../../../interfaces/api-bantotal/sucursales';
import { FormsModule } from '@angular/forms';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';

export interface IEmpresa {
	empresaId?: string;
	nombre: string;
	direccion: string;
	nit: string;
	telefono: string;
	activo: boolean;
}

const emptyEmpresa: IEmpresa = {
	empresaId: '',
	nombre: '',
	direccion: '',
	nit: '',
	telefono: '',
	activo: true,
}

@Component({
	selector: 'app-gestionar-solicitudes',
	imports: [RouterLink, CommonModule, FormsModule, PaginationAllComponent],
	templateUrl: './gestionar-solicitudes.html',
	schemas: [CUSTOM_ELEMENTS_SCHEMA],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class GestionarSolicitudes {
	private representanteService = inject(RepresentanteService);
	private cdr = inject(ChangeDetectorRef);
	private solicitudesService = inject(SolicitudesService);
	private sucursalesService = inject(SucursalesBantotalService);

	searchMode: 'nombre' | 'documento' = 'nombre';
	isLoading = signal(false);
	formKey = signal(Date.now());
	buscador = signal('');
	nuevoRepresentante = signal(true);
	representanteEdit = signal<Representante | null>(null);

	// Signals para solicitudes
	solicitudesList = signal<Solicitud[]>([]);
	tipoDocumento = signal<number>(1); // 1 = DPI, 2 = NIT
	nroDocumento = signal<string>('');

	// Signals para filtros
	regionSeleccionada = signal<string | null>(null);
	agenciaSeleccionada = signal<string | null>(null);
	regiones = signal<Region[]>([]);
	agencias = signal<Agencia[]>([]);
	agenciasFilterradas = signal<Agencia[]>([]);
	pendingAgenciaSelection = signal(false);
	pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0 });

	@ViewChild('upsertRepresentanteModal') modalElementRef!: ElementRef;
	private modalUpsertInstance!: Modal;

	modal = signal({
		titulo: 'Crear Representante',
		visible: false,
	});

	empresasList = signal<IEmpresa[]>([
		{
			empresaId: '3',
			nombre: 'Paola Citán',
			direccion: '6543789210101',
			nit: 'Individual',
			telefono: '2456-7890',
			activo: false
		}
	]);

	ngOnInit() {
		this.cargarFiltros();
		// this.fetchData();
	}

	ngAfterViewInit() {
		this.modalUpsertInstance = new Modal(this.modalElementRef.nativeElement);
	}

	private async cargarFiltros() {
		try {
			const resultado = await this.sucursalesService.getMisSucursales();
			if (!resultado?.data) return;

			const regiones = resultado.data.regiones;
			const agencias = resultado.data.agencias;

			this.regiones.set(regiones);
			this.agencias.set(agencias);

			// Pre-seleccionar primera región y primera agencia de esa región
			if (regiones.length > 0) {
				const primeraRegion = regiones[0];
				const regionIdStr = primeraRegion.id.toString();
				this.regionSeleccionada.set(regionIdStr);

				const agenciasDePrimeraRegion = agencias.filter(a => a.regionId === primeraRegion.id);
				this.agenciasFilterradas.set(agenciasDePrimeraRegion);

				if (agenciasDePrimeraRegion.length > 0) {
					this.agenciaSeleccionada.set(agenciasDePrimeraRegion[0].id.toString());
				}
			}

			this.fetchData();
		} catch (error) {
			console.error('Error al cargar filtros:', error);
		}
	}

onRegionChange(regionId: string | null): void {
		const id = regionId === '' ? null : regionId;
		this.regionSeleccionada.set(id);
		this.agenciaSeleccionada.set(null);

		// Limpiar la tabla
		this.solicitudesList.set([]);
		this.pendingAgenciaSelection.set(true);

		if (id) {
			this.agenciasFilterradas.set(
				this.agencias().filter(a => a.regionId.toString() === id)
			);
		} else {
			this.agenciasFilterradas.set([]);
		}

		this.fetchData();
	}

	onAgenciaChange(): void {
		this.pendingAgenciaSelection.set(false);
		this.fetchData();
	}

	async fetchData() {
		if (this.isLoading()) return;

		this.isLoading.set(true);
		console.log('🔍 Buscando solicitudes...', {
			modo: this.searchMode,
			busqueda: this.buscador(),
			documento: this.nroDocumento(),
			tipoDoc: this.tipoDocumento(),
			region: this.regionSeleccionada(),
			agencia: this.agenciaSeleccionada()
		});

		try {
			let resultado;

			// Normalizar número (quita espacios en blanco)
			const numeroDoc = (this.nroDocumento() || '').replace(/\s+/g, '');

			// Construir parámetros de búsqueda
			const searchParams: any = {};

			// Solo agregar región si no es null
			if (this.regionSeleccionada()) {
				searchParams.regionId = parseInt(this.regionSeleccionada()!);
			}

			// Solo agregar agencia si no es null
			if (this.agenciaSeleccionada()) {
				searchParams.agenciaId = parseInt(this.agenciaSeleccionada()!);
			}

			if (this.searchMode === 'nombre') {
				// Búsqueda por nombre/apellido
				if (this.buscador()) {
					searchParams.nombreRepresentante = this.buscador();
				}
			} else {
				// Búsqueda por documento
				if (numeroDoc) {
					searchParams.documento = numeroDoc;
					searchParams.tipoDocumento = this.tipoDocumento();
				}
			}

			// Agregar paginación a los parámetros
			searchParams.page = this.pagination().page;
			searchParams.limit = this.pagination().pageSize;

			// Realizar búsqueda
			resultado = await this.solicitudesService.searchSolicitudes(searchParams);

			if (resultado?.data && Array.isArray(resultado.data)) {
				this.solicitudesList.set(resultado.data as Solicitud[]);
				console.log(`✅ ${resultado.data.length} solicitud(es) encontrada(s)`);
				
				// Actualizar metadata de paginación si existe
				if (resultado.metadata) {
					const metadata = resultado.metadata;
					this.pagination.set({
						page: metadata.page || 1,
						pageSize: metadata.limit || 10,
						totalItems: metadata.total || 0
					});
				}
			} else {
				this.solicitudesList.set([]);
				this.pagination.set({ page: 1, pageSize: 10, totalItems: 0 });
				console.warn('⚠️ No se encontraron solicitudes');
			}

			this.cdr.markForCheck();
		} catch (error) {
			console.error('❌ Error en fetchData:', error);
			this.solicitudesList.set([]);
		} finally {
			this.isLoading.set(false);
			this.cdr.markForCheck();
		}
	}

	openModal(nuevo: boolean = true, representante?: Representante) {
		this.nuevoRepresentante.set(nuevo);

		if (nuevo) {
			// Si es nuevo, reiniciamos con null
			this.representanteEdit.set(null);
		} else {
			// Si es edición, usamos el objeto recibido
			this.representanteEdit.set(representante || null);
		}

		this.formKey.set(Date.now()); // esto obliga al componente hijo a resetear
		this.modal.set({ titulo: nuevo ? 'Crear Representante' : 'Actualizar Representante', visible: true });
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

	onChangePage(newPagination: IPagination) {
		this.pagination.set(newPagination);
		this.fetchData();
	}

	/**
	 * Obtiene el nombre de la agencia por su ID
	 * @param agenciaId ID de la agencia
	 * @returns Nombre de la agencia o 'N/A' si no se encuentra
	 */
	obtenerNombreAgencia(agenciaId: number | null | undefined): string {
		if (!agenciaId) return 'N/A';
		const agencia = this.agencias().find(a => a.id === agenciaId);
		return agencia?.descripcion || 'N/A';
	}
}