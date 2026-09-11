import { test, expect, Page } from '@playwright/test';
import type { IEmpresaEx } from '../src/interfaces/onesiteex-auth/onesiteex-auth';

/**
 * E2E del módulo M1 · Empresas (OneSiteEx).
 *
 * No hay backend disponible: se siembra un JWT válido en localStorage para pasar el
 * AuthGuard y se interceptan las llamadas HTTP con datos simulados. Así la prueba
 * ejerce la pantalla real (ruteo, tabla, filtros y modal de alta) de forma aislada.
 */

// JWT falso con exp futuro. La firma no se valida en el cliente (solo se decodifica el payload).
function fakeJwt(): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const payload = b64({ sub: 'admin', name: 'Admin QA', exp: Math.floor(Date.now() / 1000) + 86_400 });
  return `${header}.${payload}.firma-no-verificada`;
}

const empresas: IEmpresaEx[] = [
  { idEmpresa: 1, nombreEmpresa: 'FUNDEA Guatemala', codigoEnrolamiento: 'ENR-GTDEMO', estado: true, fechaCreacion: '2026-01-01T00:00:00', codigo: 'GTDEMO' },
  { idEmpresa: 2, nombreEmpresa: 'Empresa Demo', codigoEnrolamiento: 'ENR-TEST', estado: false, fechaCreacion: '2026-01-02T00:00:00', codigo: 'TEST' },
];

const ok = (data: unknown, metadata: Record<string, unknown> = {}) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, statusCode: 200, message: 'ok', data, metadata }),
});

async function setupSession(page: Page) {
  // Siembra la sesión antes de que cargue la app (se aplica en cada navegación).
  await page.addInitScript((token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ username: 'admin', nombre: 'Admin QA' }));
    localStorage.setItem('accesos', JSON.stringify([]));
  }, fakeJwt());

  // Catch-all: cualquier llamada al API responde éxito vacío (menú, accesos, etc.).
  await page.route('**/api/**', route =>
    route.fulfill(ok([], { total: 0, page: 1, limit: 10 })),
  );

  // Específico de empresas: se registra después para tener prioridad sobre el catch-all.
  await page.route('**/api/**/onesiteex/auth/empresa**', route =>
    route.fulfill(ok(empresas, { total: empresas.length, page: 1, limit: 10 })),
  );
}

test.beforeEach(async ({ page }) => {
  await setupSession(page);
  await page.goto('/onesiteex/empresas');
});

test('muestra el listado de empresas', async ({ page }) => {
  await expect(page.getByText('Administrar empresas')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'FUNDEA Guatemala' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Empresa Demo' })).toBeVisible();
  // ENR-GTDEMO aparece en la tabla (desktop) y en las cards (mobile); acotamos a la celda.
  await expect(page.getByRole('cell', { name: 'ENR-GTDEMO' })).toBeVisible();
});

test('el breadcrumb marca la sección Empresas', async ({ page }) => {
  await expect(page.getByRole('listitem').filter({ hasText: 'Empresas' })).toBeVisible();
});

test('abre el modal de alta con el formulario vacío', async ({ page }) => {
  await page.getByRole('button', { name: 'Nueva empresa' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Nueva empresa')).toBeVisible();
  await expect(dialog.getByPlaceholder('Ej. FUNDEA Guatemala')).toHaveValue('');
  await expect(dialog.getByPlaceholder('Ej. ENR-GTDEMO')).toHaveValue('');
  await expect(dialog.getByRole('button', { name: 'Crear empresa' })).toBeVisible();
});

test('crear empresa envía un POST al backend', async ({ page }) => {
  await page.getByRole('button', { name: 'Nueva empresa' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Ej. FUNDEA Guatemala').fill('Nueva Empresa QA');
  await dialog.getByPlaceholder('Ej. ENR-GTDEMO').fill('ENR-QA');

  const postReq = page.waitForRequest(
    req => req.method() === 'POST' && /\/onesiteex\/auth\/empresa/.test(req.url()),
  );
  await dialog.getByRole('button', { name: 'Crear empresa' }).click();

  const req = await postReq;
  expect(req.postDataJSON()).toMatchObject({
    nombreEmpresa: 'Nueva Empresa QA',
    codigoEnrolamiento: 'ENR-QA',
  });
});

test('filtra por estado (Solo baja)', async ({ page }) => {
  // Al cambiar el filtro, la app recarga; interceptamos y devolvemos solo la empresa en baja.
  await page.route('**/api/**/onesiteex/auth/empresa**', route => {
    const url = route.request().url();
    const data = /estado=false/.test(url) ? [empresas[1]] : empresas;
    return route.fulfill(ok(data, { total: data.length, page: 1, limit: 10 }));
  });

  await page.getByRole('combobox').first().selectOption('false');

  await expect(page.getByRole('cell', { name: 'Empresa Demo' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'FUNDEA Guatemala' })).toHaveCount(0);
});
