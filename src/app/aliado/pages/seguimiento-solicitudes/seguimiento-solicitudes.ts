import { ChangeDetectionStrategy, Component, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SolicitudesService } from '../../../../services/aliado/solicitudes.service';
import { SeguimientoSolicitudService } from '../../../../services/aliado/seguimiento-solicitud.service';
import { GeneralidadesService } from '../../../../services/aliado/generalidades.service';
import { CatalogosBantotalService } from '../../../../services/api-bantotal/catalogos.service';
import { BancoService } from '../../../../services/aliado/banco.service';
import { CorreoNotificacionesService } from '../../../../services/config/correo-notificaciones.service';
import { StorageService } from '../../../../services/storage.service';
import { CatalogoSimple } from '../../../../interfaces/api-bantotal/catalogos';
import { Solicitud, SeguimientoSolicitud, Empresa } from '../../../../interfaces/aliado/solicitudes';
import { EstadoSolicitud } from '../../../../interfaces/aliado/generalidades';
import { ICorreoNotificacion } from '../../../../interfaces/configuracion';

@Component({
	selector: 'app-seguimiento-solicitudes',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink],
	templateUrl: './seguimiento-solicitudes.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SeguimientoSolicitudesComponent {
	private route = inject(ActivatedRoute);
	private solicitudesService = inject(SolicitudesService);
	private seguimientoService = inject(SeguimientoSolicitudService);
	private generalidadesService = inject(GeneralidadesService);
	private catalogosService = inject(CatalogosBantotalService);
	private bancoService = inject(BancoService);
	private correoNotificacionesService = inject(CorreoNotificacionesService);
	private storageService = inject(StorageService);
	private cdr = inject(ChangeDetectorRef);

	solicitud = signal<Solicitud | null>(null);
	estadosSolicitud = signal<EstadoSolicitud[]>([]);
	isLoading = signal(false);
	isSavingSeguimiento = signal(false);

	// Signals para mostrar/ocultar secciones (inicialmente ocultos)
	mostrarRepresentante = signal(false);
	mostrarEmpresa = signal(false);
	mostrarCuentaBancaria = signal(false);
	mostrarDatosAdicionales = signal(false);

	// Fotos DPI del representante
	fotoDpiFrontalUrl = signal<string | null>(null);
	fotoDpiReversoUrl = signal<string | null>(null);
	cargandoFotosDpi = signal(false);

	// Lightbox
	fotoModalUrl = signal<string | null>(null);
	fotoModalTitulo = signal<string>('');

	// Catálogos para mostrar valores
	catalogoProfesion = signal<CatalogoSimple[]>([]);
	catalogoOcupacion = signal<CatalogoSimple[]>([]);
	catalogoActividad = signal<CatalogoSimple[]>([]);
	catalogoEtnia = signal<CatalogoSimple[]>([]);
	catalogoEstadoCivil = signal<CatalogoSimple[]>([]);
	catalogoNacionalidad = signal<CatalogoSimple[]>([]);
	catalogoPais = signal<CatalogoSimple[]>([]);
	catalogoDepartamento = signal<CatalogoSimple[]>([]);
	catalogoLocalidad = signal<CatalogoSimple[]>([]);
	catalogoSector = signal<CatalogoSimple[]>([]);
	catalogoBancos = signal<any[]>([]);
	catalogoTiposCuenta = signal<any[]>([]);

	correosNotificacion = signal<ICorreoNotificacion[]>([]);
	correoSeleccionado = '';

	// Formulario de nuevo seguimiento
	nuevoSeguimiento = {
		estadoAprobacionId: '',
		observaciones: ''
	};

	// Formulario de aprobación
	formularioAprobacion = {
		revisionFormularioCompleto: null as boolean | null,
		nombreAfiliado: null as boolean | null,
		numeroDpiAfiliado: null as boolean | null,
		cuentaBancariaAfiliado: null as boolean | null,
		firmaAfiliado: null as boolean | null,
		aficiadoEmpleadoFundea: null as boolean | null,
		afililadoProveedorFundea: null as boolean | null,
		buenaReputacionComunidad: null as boolean | null,
		validacionRegistro: '' as string
	};

	ngOnInit() {
		const solicitudId = this.route.snapshot.paramMap.get('solicitudId');
		if (solicitudId) {
			this.cargarSolicitud(solicitudId);
		}
		this.cargarEstadosSolicitud();
		this.cargarCatalogos();
		this.cargarCatalogosBancos();
		this.cargarCorreosNotificacion();
	}

	private async cargarSolicitud(solicitudId: string) {
		this.isLoading.set(true);
		try {
			const response = await this.solicitudesService.findOneSolicitud(solicitudId);
			if (response?.data && !Array.isArray(response.data)) {
				this.solicitud.set(response.data);
				console.log('✅ Solicitud cargada:', response.data);

				// Cargar fotos DPI del representante
				const rep = response.data.representante as any;
				if (rep?.fotoFrontalDpi || rep?.fotoReversoDpi) {
					this.cargandoFotosDpi.set(true);
					const [urlFrontal, urlReverso] = await Promise.all([
						this.storageService.downloadFileAsUrl(rep.fotoFrontalDpi),
						this.storageService.downloadFileAsUrl(rep.fotoReversoDpi),
					]);
					this.fotoDpiFrontalUrl.set(urlFrontal);
					this.fotoDpiReversoUrl.set(urlReverso);
					this.cargandoFotosDpi.set(false);
				}
			}
		} catch (error) {
			console.error('❌ Error al cargar solicitud:', error);
		} finally {
			this.isLoading.set(false);
			this.cdr.markForCheck();
		}
	}

	private async cargarEstadosSolicitud() {
		try {
			const response = await this.generalidadesService.getAllEstadoSolicitud();
			if (response?.data && Array.isArray(response.data)) {
				const estadosFiltrados = (response.data as EstadoSolicitud[]).filter(
					estado => estado.nombre !== 'Espera'
				);
				this.estadosSolicitud.set(estadosFiltrados);
			}
		} catch (error) {
			console.error('❌ Error al cargar estados:', error);
		}
	}

	private cargarCatalogos() {
		// Cargar catálogos desde localStorage
		const profesion = this.catalogosService.obtenerLocal('profesion');
		if (profesion) this.catalogoProfesion.set(profesion);

		const ocupacion = this.catalogosService.obtenerLocal('ocupacion');
		if (ocupacion) this.catalogoOcupacion.set(ocupacion);

		const actividad = this.catalogosService.obtenerLocal('actividad');
		if (actividad) this.catalogoActividad.set(actividad);

		const etnia = this.catalogosService.obtenerLocal('etnia');
		if (etnia) this.catalogoEtnia.set(etnia);

		const estadoCivil = this.catalogosService.obtenerLocal('estado_civil');
		if (estadoCivil) this.catalogoEstadoCivil.set(estadoCivil);

		const nacionalidad = this.catalogosService.obtenerLocal('pais');
		if (nacionalidad) this.catalogoNacionalidad.set(nacionalidad);
		
		const pais = this.catalogosService.obtenerLocal('pais');
		if (pais) this.catalogoPais.set(pais);

		const departamento = this.catalogosService.obtenerLocal('departamento');
		if (departamento) this.catalogoDepartamento.set(departamento);

		const localidad = this.catalogosService.obtenerLocal('municipio');
		if (localidad) this.catalogoLocalidad.set(localidad);

		const sector = this.catalogosService.obtenerLocal('sector');
		if (sector) this.catalogoSector.set(sector);
	}

	private async cargarCatalogosBancos() {
		try {
			const [bancos, tiposCuenta] = await Promise.all([
				this.bancoService.obtenerBancos(),
				this.bancoService.obtenerTiposCuenta()
			]);
			this.catalogoBancos.set(bancos || []);
			this.catalogoTiposCuenta.set(tiposCuenta || []);
		} catch (error) {
			console.error('Error al cargar catálogos de bancos:', error);
		}
	}

	obtenerNombreBanco(bancoId?: string): string {
		if (!bancoId) return 'N/A';
		const banco = this.catalogoBancos().find((b: any) => b.bancoId === bancoId);
		return banco?.nombreBanco || 'N/A';
	}

	obtenerNombreTipoCuenta(tipoCuentaId?: string): string {
		if (!tipoCuentaId) return 'N/A';
		const tipo = this.catalogoTiposCuenta().find((t: any) => t.tipoCuentaId === tipoCuentaId);
		return tipo?.nombre || 'N/A';
	}

	esEstadoAprobado(): boolean {
		const estado = this.estadosSolicitud().find(
			e => e.estadoSolicitudId === this.nuevoSeguimiento.estadoAprobacionId
		);
		return !!estado?.nombre?.toUpperCase().includes('APROBADO');
	}

	async guardarSeguimiento() {
		const solicitud = this.solicitud();
		if (!solicitud || !this.nuevoSeguimiento.estadoAprobacionId || !this.nuevoSeguimiento.observaciones.trim()) {
			alert('Por favor completa todos los campos');
			return;
		}

		// Validar que el formulario de aprobación esté completo si hay respuestas
		const form = this.formularioAprobacion;
		const tieneRespuestasFormulario = Object.values(form).some(v => v !== null && v !== '');

		if (this.esEstadoAprobado()) {
			// if (!solicitud.documentoCargado) {
			// 	alert('Debe adjuntar el documento PDF de la solicitud antes de aprobar.');
			// 	return;
			// }
			if (tieneRespuestasFormulario && !this.esFormularioAprobado()) {
				alert('El formulario de aprobación no está completamente aprobado. Por favor revise todas las preguntas.');
				return;
			}
		}

		await this.ejecutarGuardarSeguimiento();
	}

	private async cargarCorreosNotificacion() {
		try {
			const response = await this.correoNotificacionesService.getCorreosNotificacion();
			if (response?.data) {
				this.correosNotificacion.set(response.data);
			}
		} catch (error) {
			console.error('Error al cargar correos de notificación:', error);
		}
	}

	private async ejecutarGuardarSeguimiento() {
		const solicitud = this.solicitud();
		if (!solicitud) return;

		this.isSavingSeguimiento.set(true);
		try {
			const nuevoOrden = (solicitud.seguimientos?.length ?? 0) + 1;

			const seguimientoData: Partial<SeguimientoSolicitud> = {
				solicitudId: solicitud.solicitudId,
				ordenSeguimiento: nuevoOrden,
				estadoAprobacionId: this.nuevoSeguimiento.estadoAprobacionId,
				observaciones: this.nuevoSeguimiento.observaciones,
				...(this.esEstadoAprobado() && this.correoSeleccionado ? { correoNotificacion: this.correoSeleccionado } : {})
			};

			const response = await this.seguimientoService.createSeguimientoSolicitud(seguimientoData);

			if (response?.data) {
				console.log('✅ Seguimiento creado exitosamente');
				// Recargar la solicitud para ver el nuevo seguimiento
				await this.cargarSolicitud(solicitud.solicitudId);
				// Limpiar formulario
				this.correoSeleccionado = '';
				this.nuevoSeguimiento = {
					estadoAprobacionId: '',
					observaciones: ''
				};
				// Limpiar formulario de aprobación
				this.formularioAprobacion = {
					revisionFormularioCompleto: null,
					nombreAfiliado: null,
					numeroDpiAfiliado: null,
					cuentaBancariaAfiliado: null,
					firmaAfiliado: null,
					aficiadoEmpleadoFundea: null,
					afililadoProveedorFundea: null,
					buenaReputacionComunidad: null,
					validacionRegistro: ''
				};
			}
		} catch (error) {
			console.error('❌ Error al crear seguimiento:', error);
			alert('Error al crear el seguimiento');
		} finally {
			this.isSavingSeguimiento.set(false);
			this.cdr.markForCheck();
		}
	}

	// Visualizar PDF cargado
	verDocumentoSolicitud() {
		const solicitud = this.solicitud();
		if (!solicitud?.documentoCargado) return;
		let pdfData: string;
		if (typeof solicitud.documentoCargado === 'string') {
			pdfData = solicitud.documentoCargado.startsWith('data:application/pdf')
				? solicitud.documentoCargado
				: `data:application/pdf;base64,${solicitud.documentoCargado}`;
		} else {
			// Soportar formato {type: 'Buffer', data: [...]}
			let arr: Uint8Array | null = null;
			if (
				solicitud.documentoCargado &&
				typeof solicitud.documentoCargado === 'object' &&
				'type' in solicitud.documentoCargado &&
				(solicitud.documentoCargado as any).type === 'Buffer' &&
				Array.isArray((solicitud.documentoCargado as any).data)
			) {
				arr = new Uint8Array((solicitud.documentoCargado as any).data);
			} else {
				// Detectar Uint8Array o array plano
				const isUint8Array = Object.prototype.toString.call(solicitud.documentoCargado) === '[object Uint8Array]';
				const isArray = Array.isArray(solicitud.documentoCargado);
				if (isUint8Array) {
					arr = solicitud.documentoCargado as Uint8Array;
				} else if (isArray) {
					arr = new Uint8Array(solicitud.documentoCargado);
				}
			}
			if (arr) {
				// Convertir a base64
				let binary = '';
				for (let i = 0; i < arr.length; i++) {
					binary += String.fromCharCode(arr[i]);
				}
				const base64 = btoa(binary);
				pdfData = `data:application/pdf;base64,${base64}`;
			} else {
				alert('Formato de documento no soportado para visualizar.');
				return;
			}
		}
		const win = window.open();
		if (win) {
			win.document.write(
				`<iframe src='${pdfData}' width='100%' height='100%' style='border:none;'></iframe>`
			);
		}
	}

	getNombreCompleto(rep: any): string {
		if (!rep) return 'N/A';
		const partes = [
			rep.primerNombre,
			rep.segundoNombre,
			rep.primerApellido,
			rep.segundoApellido
		].filter(Boolean);
		return partes.join(' ');
	}

	formatDate(dateString: string | null | undefined): string {
		if (!dateString) return 'N/A';
		const date = new Date(dateString);
		return date.toLocaleDateString('es-GT', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	}

	estaVencido(dateString: string | null | undefined): boolean {
		if (!dateString) return false;
		const fecha = new Date(dateString);
		const hoy = new Date();
		hoy.setHours(0, 0, 0, 0);
		fecha.setHours(0, 0, 0, 0);
		return fecha < hoy;
	}

	abrirFotoModal(url: string | null, titulo: string): void {
		if (!url) return;
		this.fotoModalUrl.set(url);
		this.fotoModalTitulo.set(titulo);
	}

	cerrarFotoModal(): void {
		this.fotoModalUrl.set(null);
		this.fotoModalTitulo.set('');
	}

	/**
	 * Obtiene el nombre de un valor de catálogo por su ID
	 */
	obtenerNombreCatalogo(idValor: number | null | undefined, catalogo: CatalogoSimple[]): string {
		if (!idValor || catalogo.length === 0) return 'Valor no disponible';
		const item = catalogo.find(c => c.valorCore === idValor.toString());
		return item?.nombre || ` (${idValor})`;
	}

	/**
	 * Calcula si el formulario de aprobación está completamente aprobado
	 * Todas las preguntas con opciones sí/no deben ser true (Sí)
	 * La validación del registro debe tener un valor
	 */
	esFormularioAprobado(): boolean {
		const form = this.formularioAprobacion;

		// Convertir strings a booleanos si es necesario
		const convertToBoolean = (val: any): boolean | null => {
			if (val === null || val === undefined) return null;
			if (typeof val === 'boolean') return val;
			if (typeof val === 'string') {
				return val === 'true' || val === '1' || val === 'true ';
			}
			return !!val;
		};

		const revision = convertToBoolean(form.revisionFormularioCompleto);
		const nombre = convertToBoolean(form.nombreAfiliado);
		const dpi = convertToBoolean(form.numeroDpiAfiliado);
		const cuenta = convertToBoolean(form.cuentaBancariaAfiliado);
		const firma = convertToBoolean(form.firmaAfiliado);
		const empleado = convertToBoolean(form.aficiadoEmpleadoFundea);
		const proveedor = convertToBoolean(form.afililadoProveedorFundea);
		const reputacion = convertToBoolean(form.buenaReputacionComunidad);

		console.log('🔍 Verificando formulario:', {
			revision: revision === true ? '✅ Sí' : '❌ No/Vacío',
			nombre: nombre === true ? '✅ Sí' : '❌ No/Vacío',
			dpi: dpi === true ? '✅ Sí' : '❌ No/Vacío',
			cuenta: cuenta === true ? '✅ Sí' : '❌ No/Vacío',
			firma: firma === true ? '✅ Sí' : '❌ No/Vacío',
			empleado: empleado === false ? '✅ No' : '❌ Sí/Vacío',
			proveedor: proveedor === false ? '✅ No' : '❌ Sí/Vacío',
			reputacion: reputacion === true ? '✅ Sí' : '❌ No/Vacío',
		});

		return (
			revision === true &&
			nombre === true &&
			dpi === true &&
			cuenta === true &&
			firma === true &&
			empleado === false && // No debe ser empleado
			proveedor === false && // No debe ser proveedor
			reputacion === true
		);
	}
}
