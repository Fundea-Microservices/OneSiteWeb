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
                path: 'fundea',
                loadComponent: () => import('./dashboard/pages/dashboard-page/dashboard-page'),
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
                    }
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
                        path: '**',
                        redirectTo: '',
                    }
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
