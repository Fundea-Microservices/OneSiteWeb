import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

// Inicializa el TestBed con el entorno de zone.js (el proyecto usa zone.js, no zoneless).
setupZoneTestEnv();
