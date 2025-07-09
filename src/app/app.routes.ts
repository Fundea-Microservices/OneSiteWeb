import { Routes } from '@angular/router';
import { AuthGuard } from './auth/guards/auth-guard';
import { AccessGuard } from './auth/guards/access-guard';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./shared/pages/home-page/home-page.component'),
    },
    {
        path: 'fundea/login',
        loadComponent: () => import('./auth/pages/login-page/login-page'),
    },
    {
        path: 'aliado/login',
        loadComponent: () => import('./aliado/pages/login-aliado/login-aliado.component'),
    },
    {
        path: '',
        loadComponent: () => import('./dashboard/pages/dashboard-page/dashboard-page'),
        canActivate: [AuthGuard],
        children: [
            {
                path: 'home',
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
            }
        ]
    },
    {
        path: 'aliados-fundea',
        loadComponent: () => import('./dashboard/pages/dashboard-page/dashboard-page'),
        canActivate: [AuthGuard],
        children: [
            {
                path: 'empresas',
                loadComponent: () => import('./aliado/pages/empresa-page/empresa-page.component'),
            },
            {
                path: 'usuarios',
                loadComponent: () => import('./aliado/pages/usuarios-page/usuarios-page.component'),
            },
        ]
    },
    {
        path: 'aliado',
        loadComponent: () => import('./aliado/pages/dashboard-aliado/dashboard-aliado.component'),
        children: [
            {
                path: 'home',
                loadComponent: () => import('./aliado/pages/home-aliado/home-aliado.component'),
            },
            
            {
                path: '**',
                redirectTo: 'home',
            }
        ]
    },
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
