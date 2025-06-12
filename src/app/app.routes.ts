import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'home',
        loadComponent: () => import('./dashboard/pages/dashboard-page/dashboard-page'),
        // children: [
        //     {}
        // ]
    },

    {
        path: '404',
        loadComponent: () => import('./external-pages/404-page/404-page'),
    },
    {
        path: '401',
        loadComponent: () => import('./external-pages/401-page/401-page'),
    },

    {
        path: '**',
        loadComponent: () => import('./external-pages/404-page/404-page'),
    }
];
