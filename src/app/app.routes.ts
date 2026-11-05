import { Routes } from '@angular/router';
import { AuthGuard } from './auth/guards/auth-guard';
import { AccessGuard } from './auth/guards/access-guard';

export const routes: Routes = [
    {
        path: '',
        // loadComponent: () => import('./shared/pages/home-page/home-page.component'),
        redirectTo: '/fundea',
        pathMatch: 'full',
    },
    {
        path: 'test',
        loadComponent: () => import('./test/test-page/test-page').then(m => m.TestPage),

    },
    {
        path: 'fundea/login',
        loadComponent: () => import('./auth/pages/login-page/login-page'),
    },
    // {
    //     path: 'aliado/login',
    //     loadComponent: () => import('./aliado/pages/login-aliado/login-aliado.component'),
    // },
    {
        path: 'imprimir',
        canActivate: [AuthGuard],
        children: [
            {
                path: 'orden-gyt',
                loadComponent: () => import('./ordenes-pago/gyt/components/orden-gyt/orden-gyt.component').then(m => m.OrdenGytComponent),
            }
        ]
    },
    {
        path: '',
        loadComponent: () => import('./dashboard/pages/dashboard-page/dashboard-page'),
        canActivate: [AuthGuard],
        children: [
            {
                // Sin componente: el dashboard ya lo pinta la ruta padre.
                path: 'fundea',
                children: [],
            },
            {
                path: 'config',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./configuracion/pages/config-page/config-page'),
                        canActivate: [AccessGuard]
                    },
                    {
                        path: 'config',
                        loadComponent: () => import('./configuracion/pages/configuraciones-page/configuraciones-page.component'),
                        canActivate: [AccessGuard]
                    },
                    {
                        path: 'user',
                        loadComponent: () => import('./configuracion/pages/user-page/user-page'),
                        canActivate: [AccessGuard]
                    },
                    {
                        path: 'users',
                        loadComponent: () => import('./configuracion/pages/users-page/users-page'),
                        canActivate: [AccessGuard]
                    },
                    {
                        path: 'roles',
                        loadComponent: () => import('./configuracion/pages/rol-page/rol-page'),
                        canActivate: [AccessGuard]
                    },
                    {
                        path: 'metodos',
                        loadComponent: () => import('./configuracion/pages/metodos-auth-page/metodos-auth-page.component'),
                        canActivate: [AccessGuard]
                    },
                    {
                        path: 'menus',
                        loadComponent: () => import('./configuracion/pages/menu-page/menu-page.component'),
                        canActivate: [AccessGuard]
                    },
                    {
                        path: 'accesos',
                        loadComponent: () => import('./configuracion/pages/acceso-page/acceso-page.component'),
                        canActivate: [AccessGuard]
                    },
                    {
                        path: 'carrousel',
                        canActivate: [AccessGuard],
                        children: [
                            {
                                path: '',
                                loadComponent: () => import('./configuracion/pages/carrousel-page/carrousel-page'),
                            },
                            {
                                path: 'nuevo',
                                loadComponent: () => import('./configuracion/pages/upsert-carrousel-page/upsert-carrousel-page'),
                            },
                            {
                                path: 'editar/:id',
                                loadComponent: () => import('./configuracion/pages/upsert-carrousel-page/upsert-carrousel-page'),
                            },
                        ]
                    },
                    {
                        path: 'formularios',
                        canActivate: [AccessGuard],
                        children: [
                            {
                                path: '',
                                loadComponent: () => import('./configuracion/pages/formulario-gesion-page/formulario-gesion-page'),
                            },
                            {
                                path: 'gestion',
                                loadComponent: () => import('./configuracion/pages/formulario-gesion-page/formulario-gesion-page'),
                            },
                            {
                                path: 'detalle/:formId',
                                loadComponent: () => import('./configuracion/pages/formulario-detalle-page/formulario-detalle-page'),
                            },
                        ]
                    },
                    {
                        path: 'documentos',
                        canActivate: [AccessGuard],
                        children: [
                            {
                                path: '',
                                loadComponent: () => import('./configuracion/pages/documentos-page/documentos-page'),
                            },
                            {
                                path: 'detalle/:documentoId',
                                children: [
                                    {
                                        path: '',
                                        loadComponent: () => import('./configuracion/pages/documento-detalle-page/documento-detalle-page'),
                                    },
                                    {
                                        path: 'version',
                                        loadComponent: () => import('./configuracion/pages/documento-version-page/documento-version-page'),
                                    },
                                    {
                                        path: 'version/:versionId',
                                        loadComponent: () => import('./configuracion/pages/documento-version-page/documento-version-page'),
                                    },
                                ]
                            },
                        ]
                    },
                    {
                        path: 'plantillas',
                        loadComponent: () => import('./configuracion/pages/plantillas-page/plantillas-page'),
                        canActivate: [AccessGuard]
                    },


                ]
            },
            {
                path: 'castigados',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./castigados/pages/home-castigados/home-castigados.component'),
                    },
                    {
                        path: 'traslado',
                        loadComponent: () => import('./castigados/pages/traslado-credito/traslado-credito.component'),
                    },
                    {
                        path: '**',
                        redirectTo: '',
                    }
                ]
            },
            {
                path: 'reportes',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./reportes/pages/home-reporte/home-reporte.component'),
                    },
                    {
                        path: 'diseño',
                        loadComponent: () => import('./reportes/pages/reporte/reporte.component'),
                    },
                    {
                        path: 'detalle/:id',
                        loadComponent: () => import('./reportes/pages/reporte-detalle/reporte-detalle.component'),
                    },
                    {
                        path: 'ejecutar',
                        loadComponent: () => import('./reportes/pages/ejecucion/ejecucion.component'),
                    },
                    {
                        path: 'ejecutar/:idReporte',
                        loadComponent: () => import('./reportes/pages/ejecucion-individual/ejecucion-individual.component'),
                    },
                    {
                        path: '**',
                        redirectTo: '',
                    }
                ]
            },

            {
                path: 'procedimientos',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./procedimientos/pages/home-procedimiento/home-procedimiento.component'),
                    },
                    {
                        path: 'diseño',
                        loadComponent: () => import('./procedimientos/pages/procedimiento/procedimiento.component'),
                    },
                    {
                        path: 'detalle/:id',
                        loadComponent: () => import('./procedimientos/pages/procedimiento-detalle/procedimiento-detalle.component'),
                    },
                    {
                        path: 'ejecutar',
                        loadComponent: () => import('./procedimientos/pages/ejecutar-procedimiento/ejecutar-procedimiento.component'),
                    },
                    {
                        path: '**',
                        redirectTo: '',
                    }
                ]
            },
            {
                path: 'ordenes-pago',
                children: [
                    {
                        path: 'generar-orden',
                        loadComponent: () => import('./ordenes-pago/pages/generar-orden-page/generar-orden-page'),
                    },
                    {
                        path: 'generar-gyt',
                        loadComponent: () => import('./ordenes-pago/gyt/pages/generar-gyt-page/generar-gyt-page'),
                    },
                    {
                        path: 'aprobar-gyt',
                        loadComponent: () => import('./ordenes-pago/gyt/pages/aprobar-gyt-page/aprobar-gyt-page'),
                    },
                    {
                        path: 'historial-gyt',
                        loadComponent: () => import('./ordenes-pago/gyt/pages/historial-gyt-page/historial-gyt-page'),
                    },
                ]
            },
            {
                path: 'emanager',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./emanager/pages/gestion/gestion-listado-page/gestion-listado-page'),
                    },
                    {
                        path: 'gestion-listado',
                        loadComponent: () => import('./emanager/pages/gestion/gestion-listado-page/gestion-listado-page'),
                    },
                    {
                        path: 'gestion-detalle/:id',
                        loadComponent: () => import('./emanager/pages/gestion/gestion-detalle-page/gestion-detalle-page'),
                    },
                    {
                        path: 'encabezado-listado',
                        loadComponent: () => import('./emanager/pages/encabezado/encabezado-listado-page/encabezado-listado-page'),
                    },
                    {
                        path: 'encabezado-detalle/:id',
                        loadComponent: () => import('./emanager/pages/encabezado/encabezado-detalle-page/encabezado-detalle-page'),
                    },
                    {
                        path: 'gestion-ejecutar/:id',
                        loadComponent: () => import('./emanager/pages/gestion/gestion-ejecutar-page/gestion-ejecutar-page'),
                    },
                ]
            },

            {
                path: 'erp-bc',
                children: [
                    {
                        path: 'configurar-carga-asientos-contables',
                        loadComponent: () => import('./erp-bc/pages/configurar-carga-asientos-contables-page/configurar-carga-asientos-contables-page'),
                    },
                    {
                        path: 'ejecutar-carga-asientos-contables',
                        loadComponent: () => import('./erp-bc/pages/ejecutar-carga-asientos-contables-page/ejecutar-carga-asientos-contables-page'),
                    },
                ]
            },

            {
                path: 'flujo-fondos',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./flujo-fondos/pages/home-flujo-fondos/home-flujo-fondos.component'),
                    },
                    {
                        path: 'catalogos',
                        loadComponent: () => import('./flujo-fondos/pages/catalogos/catalogos.component'),
                    },
                    {
                        path: 'catalogos/:id/opciones',
                        loadComponent: () => import('./flujo-fondos/pages/catalogo-opciones/catalogo-opciones.component'),
                    },
                    {
                        path: 'actividades-economicas',
                        loadComponent: () => import('./flujo-fondos/pages/actividades-economicas/actividades-economicas.component'),
                    },
                    {
                        path: 'flujos',
                        loadComponent: () => import('./flujo-fondos/pages/flujos/flujos.component'),
                    },
                    {
                        path: 'flujos/nuevo',
                        loadComponent: () => import('./flujo-fondos/pages/flujo/flujo.component'),
                    },
                    {
                        path: 'flujos/:id',
                        loadComponent: () => import('./flujo-fondos/pages/flujo/flujo.component'),
                    },
                    {
                        path: '**',
                        redirectTo: '',
                    }
                ]
            },

            {
                path: 'venta-cartera',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./flujo-fondos/pages/home-flujo-fondos/home-flujo-fondos.component'),
                    },
                    {
                        path: 'titularizacion',
                        loadComponent: () => import('./venta-cartera/pages/titularizacion-page/titularizacion-page'),
                    },
                    {
                        path: 'titularizacion/ingresar-serie',
                        loadComponent: () => import('./venta-cartera/pages/ingresar-serie-page/ingresar-serie-page'),
                    },
                    {
                        path: 'titularizacion/ingresar-serie/:serieId',
                        loadComponent: () => import('./venta-cartera/pages/ingresar-serie-page/ingresar-serie-page'),
                    },
                    {
                        path: 'titularizacion/editar-serie/:serieId',
                        loadComponent: () => import('./venta-cartera/pages/editar-serie-page/editar-serie-page'),
                    },
                    {
                        path: '**',
                        redirectTo: '',
                    }
                ]
            },

            {
                path: 'onesiteex',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./flujo-fondos/pages/home-flujo-fondos/home-flujo-fondos.component'),
                    },
                    {
                        path: 'catalogos',
                        loadComponent: () => import('./onesite-ex/pages/catalogo-maestro-page/catalogo-maestro-page'),
                    },
                    {
                        path: 'catalogos/:id/opciones',
                        loadComponent: () => import('./onesite-ex/pages/catalogo-opcion-page/catalogo-opcion-page'),
                    },
                    {
                        path: 'encuestas',
                        loadComponent: () => import('./onesite-ex/pages/encuesta-page/encuesta-page'),
                    },
                    {
                        path: 'encuestas/detalle/:id',
                        loadComponent: () => import('./onesite-ex/pages/encuesta-detalle-page/encuesta-detalle-page'),
                    },
                    {
                        path: 'encuestas/seccion/:id',
                        loadComponent: () => import('./onesite-ex/pages/seccion-detalle-page/seccion-detalle-page'),
                    },
                    {
                        path: 'encuestas/matriz/:id',
                        loadComponent: () => import('./onesite-ex/pages/matriz-detalle-page/matriz-detalle-page'),
                    },
                    {
                        path: 'usuarios',
                        loadComponent: () => import('./onesite-ex/pages/usuarios-onesiteex-page/usuarios-onesiteex-page'),
                    },
                    {
                        path: 'config-precarga',
                        children: [
                            {
                                path: '',
                                loadComponent: () => import('./onesite-ex/pages/precarga-config-page/precarga-config-page'),
                            },
                            {
                                path: 'nueva',
                                loadComponent: () => import('./onesite-ex/pages/crear-config-page/crear-config-page'),
                            },
                            {
                                path: 'editar/:id',
                                loadComponent: () => import('./onesite-ex/pages/crear-config-page/crear-config-page'),
                            },
                        ]
                    },
                    {
                        path: 'cargar-precarga',
                        loadComponent: () => import('./onesite-ex/pages/cargar-precarga-page/cargar-precarga-page'),
                    },
                    {
                        path: 'cargar-precarga/:id',
                        loadComponent: () => import('./onesite-ex/pages/cargar-precarga-page/cargar-precarga-page'),
                    },
                    {
                        path: 'gestion-precarga',
                        loadComponent: () => import('./onesite-ex/pages/gestion-precarga-page/gestion-precarga-page'),
                    },
                    {
                        path: 'validar-encuesta',
                        loadComponent: () => import('./onesite-ex/pages/validar-encuesta-page/validar-encuesta-page'),
                    },
                    {
                        path: 'empresas',
                        loadComponent: () => import('./onesite-ex/pages/empresas-onesiteex-page/empresas-onesiteex-page'),
                    },
                ]
            },

            {
                path: 'scoring',
                children: [
                    {
                        path: '',
                        redirectTo: 'creacion',
                        pathMatch: 'full',
                    },
                    {
                        path: 'creacion',
                        loadComponent: () => import('./scoring/pages/creacion-scoring-page/creacion-scoring-page'),
                    },
                    {
                        path: 'catalogo-variables',
                        loadComponent: () => import('./scoring/pages/catalogo-variables-page/catalogo-variables-page'),
                    },
                    {
                        path: 'preguntas',
                        loadComponent: () => import('./scoring/pages/gestion-preguntas-page/gestion-preguntas-page'),
                    },
                    {
                        path: 'evaluacion',
                        loadComponent: () => import('./scoring/pages/evaluacion-page/evaluacion-page'),
                    },
                    // Alta: los datos del cliente se traen del core.
                    {
                        path: 'evaluacion/captura/solicitud/:numeroSolicitud',
                        loadComponent: () => import('./scoring/pages/captura-evaluacion-page/captura-evaluacion-page'),
                    },
                    // Edición: el snapshot sale de la evaluación guardada.
                    {
                        path: 'evaluacion/captura/evaluacion/:evaluacionId',
                        loadComponent: () => import('./scoring/pages/captura-evaluacion-page/captura-evaluacion-page'),
                    },
                    {
                        path: 'procedimientos',
                        loadComponent: () => import('./scoring/pages/procedimientos-scoring-page/procedimientos-scoring-page'),
                    },
                    {
                        path: 'auditoria',
                        loadComponent: () => import('./scoring/pages/auditoria-page/auditoria-page'),
                    },
                ]
            },

            {
                path: 'siucom',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./siucom/pages/dashboard-siucom-page/dashboard-siucom-page'),
                    },
                    {
                        path: 'dashboard',
                        loadComponent: () => import('./siucom/pages/dashboard-siucom-page/dashboard-siucom-page'),
                    },
                    {
                        path: 'historial',
                        loadComponent: () => import('./siucom/pages/historial-siucom-page/historial-siucom-page'),
                    },
                ]
            },

            {
                path: 'jobs',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./jobs/pages/jobs-page/jobs-page'),
                    },
                    {
                        path: 'ejecuciones',
                        loadComponent: () => import('./jobs/pages/job-ejecuciones-page/job-ejecuciones-page'),
                    },
                ]
            },

            
        ]
    },
    {
        path: 'aliado',
        loadComponent: () => import('./dashboard/pages/dashboard-page/dashboard-page'),
        canActivate: [AuthGuard],
        children: [
            {
                path: 'listado-representante',
                loadComponent: () => import('./aliado/pages/listado-representante-page/listado-representante-page'),
            },
            {
                path: 'crear-representante',
                loadComponent: () => import('./aliado/pages/crear-representante-page/crear-representante-page'),
            },
            {
                path: 'editar-representante/:representanteId',
                loadComponent: () => import('./aliado/pages/editar-representante-page/editar-representante-page'),
            },
            {
                path: 'empresas-representante/:representanteId',
                loadComponent: () => import('./aliado/pages/empresas-representante-page/empresas-representante-page'),
            },
            {
                path: 'usuarios',
                loadComponent: () => import('./aliado/pages/usuarios-page/usuarios-page.component'),
            },
            {
                path: 'empresas',
                loadComponent: () => import('./aliado/pages/empresa-page/empresa-page.component'),
            },
            {
                path: 'generalidades',
                loadComponent: () => import('./aliado/pages/generalidades-page/generalidades-page'),
            },
            {
                path: 'gestionar-solicitudes',
                loadComponent: () => import('./aliado/pages/gestionar-solicitudes/gestionar-solicitudes'),
            },
            {
                path: 'seguimiento-solicitudes/:solicitudId',
                loadComponent: () => import('./aliado/pages/seguimiento-solicitudes/seguimiento-solicitudes'),
            },
            {
                path: 'validacion-prospectos',
                loadComponent: () => import('./aliado/pages/lotes-desembolso-page/lotes-desembolso-page'),
            },
            {
                path: 'desembolso/:loteId',
                loadComponent: () => import('./aliado/pages/detalle-lote-desembolso-page/detalle-lote-desembolso-page'),
            },
            {
                path: 'aprobacion-lotes-pago',
                loadComponent: () => import('./aliado/pages/aprobacion-lotes-page/aprobacion-lotes-page'),
            },
            {
                path: 'pago-comision',
                loadComponent: () => import('./aliado/pages/pago-comision-page/pago-comision-page'),
            },
            {
                path: 'seguimiento-pagos',
                loadComponent: () => import('./aliado/pages/seguimiento-pagos-page/seguimiento-pagos-page'),
            },
        ]
    },
    // {
    //     path: 'aliado',
    //     loadComponent: () => import('./aliado/pages/dashboard-aliado/dashboard-aliado.component'),
    //     canActivate: [AuthGuard],
    //     children: [
    //         {
    //             path: 'home',
    //             loadComponent: () => import('./aliado/pages/home-aliado/home-aliado.component'),
    //         },
    //         {
    //             path: 'referido/create',
    //             loadComponent: () => import('./aliado/pages/ingresar-referido/ingresar-referido.component'),
    //         },
    //         {
    //             path: 'referido/list',
    //             loadComponent: () => import('./aliado/pages/referidos-usuario/referidos-usuario.component'),
    //         },

    //         {
    //             path: '**',
    //             redirectTo: 'home',
    //         }
    //     ]
    // },
    {
        path: '404',
        loadComponent: () => import('./shared/pages/404-page/404-page'),
    },
    {
        path: '401',
        loadComponent: () => import('./shared/pages/401-page/401-page'),
    },

    {
        path: '**',
        loadComponent: () => import('./shared/pages/404-page/404-page'),
    }
];
