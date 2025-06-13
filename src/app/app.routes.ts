import { Routes } from '@angular/router';
import { AuthGuard } from './auth/guards/auth-guard';

export const routes: Routes = [
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
                    },
                    {
                        path: 'user',
                        loadComponent: () => import('./configuracion/pages/user-page/user-page'),
                    },
                    {
                        path: 'users',
                        loadComponent: () => import('./configuracion/pages/users-page/users-page'),
                    },
                    
                    {
                        path: 'roles',
                        loadComponent: () => import('./configuracion/pages/rol-page/rol-page'),
                    }
                ]
            }
        ]
    },

    {
        path: 'login',
        loadComponent: () => import('./auth/pages/login-page/login-page'),
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
