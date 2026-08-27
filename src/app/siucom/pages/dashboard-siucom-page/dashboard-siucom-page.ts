import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../../../services/auth.service';
import { SiucomService } from '../../../../services/config/siucom.service';
import { SucursalesBantotalService } from '../../../../services/api-bantotal/sucursales.service';
import { ISIUCOM } from '../../../../interfaces/auth';

@Component({
  selector: 'app-dashboard-siucom-page',
  imports: [],
  templateUrl: './dashboard-siucom-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DashboardSiucomPage implements OnInit {

  /** Dominios desde los que se acepta cargar el dashboard en el iframe. */
  private static readonly HOSTS_PERMITIDOS: readonly string[] = ['siucomgt.com'];

  private readonly sanitizer = inject(DomSanitizer);
  private readonly authService = inject(AuthService);
  private readonly siucomService = inject(SiucomService);
  private readonly sucursalesService = inject(SucursalesBantotalService);

  loading = signal(false);
  loadingMessage = signal('Cargando dashboard...');
  errorMessage = signal('');
  dashboardUrl = signal<SafeResourceUrl | null>(null);

  ngOnInit() {
    this.cargarDashboard();
  }

  async cargarDashboard() {
    this.errorMessage.set('');
    const user = this.authService.getUserStorage();

    // Si el usuario ya tiene acceso SIUCOM, usar su URL directamente
    if (user.siucom?.urlAcceso) {
      this.setUrl(user.siucom.urlAcceso);
      return;
    }

    // No tiene acceso SIUCOM: hay que crearlo
    try {
      this.loading.set(true);

      // 1. Obtener las agencias del usuario desde Bantotal
      this.loadingMessage.set('Obteniendo agencias del usuario...');
      const sucursales = await this.sucursalesService.getMisSucursales(user.userName);

      const agencias = sucursales?.data?.agencias ?? [];
      const regiones = sucursales?.data?.regiones ?? [];

      // 2. Tomar la agencia del usuario: se prefiere una con región asignada,
      //    pero el dato que SIUCOM exige es el código numérico de la agencia.
      const agencia = agencias.find(a => a.regionId !== null) ?? agencias[0];
      if (!agencia) {
        this.errorMessage.set('No se encontraron agencias asignadas a su usuario. Contacte al administrador.');
        return;
      }

      const region = regiones.find(r => r.id === agencia.regionId);

      // 3. Crear/obtener el acceso SIUCOM
      // `codigo` es lo único de ubicación que llega a SIUCOM y debe viajar como número
      // (el gateway rechaza un string con 400). `region`/`agencia` solo se guardan en el
      // registro local y esperan el formato "REGIÓN III" (no "REGIONAL III") y
      // "QUETZALTENANGO" (sin el prefijo "AGENCIA").
      this.loadingMessage.set('Creando acceso SIUCOM...');
      const resp = await this.siucomService.getOrCreateAcceso({
        usuarioId: user.userId,
        nombre: user.fullName,
        codigo: Number(agencia.id),
        rol: user.rol.name || 'OneSiteUser',
        ...(region && { region: region.descripcion.replace(/^REGIONAL/i, 'REGIÓN').trim() }),
        agencia: agencia.descripcion.replace(/^AGENCIA\s+/i, '').trim(),
      });

      const siucom: ISIUCOM | undefined = resp?.data?.siucom;
      if (!resp?.success || !siucom?.urlAcceso) {
        this.errorMessage.set(resp?.message || 'No fue posible crear el acceso a SIUCOM. Intente de nuevo más tarde.');
        return;
      }

      // 4. Guardar el acceso SIUCOM junto al usuario en localStorage
      this.authService.updateUser({ ...user, siucom });

      this.setUrl(siucom.urlAcceso);
    } catch (error) {
      console.error('❌ Error al cargar el dashboard SIUCOM:', error);
      this.errorMessage.set('Ocurrió un error al cargar el dashboard de SIUCOM.');
    } finally {
      this.loading.set(false);
    }
  }

  private setUrl(url: string) {
    const urlEmbed = this.construirUrlEmbed(url);
    if (!urlEmbed) {
      console.error('❌ URL de dashboard SIUCOM rechazada:', url);
      this.errorMessage.set('La URL del dashboard de SIUCOM no es válida. Contacte al administrador.');
      return;
    }

    // Seguro: construirUrlEmbed() ya validó esquema https y host permitido.
    // nosemgrep: typescript.angular.security.audit.angular-domsanitizer.angular-bypasssecuritytrust
    this.dashboardUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(urlEmbed));
  }

  /**
   * Valida la URL recibida del API/localStorage y le agrega el parámetro
   * `embed=1`, que SIUCOM exige para permitir el iframe desde otro dominio.
   *
   * La validación es obligatoria porque la URL termina en
   * `bypassSecurityTrustResourceUrl`: sin ella, un valor manipulado en
   * localStorage podría cargar contenido arbitrario (p. ej. `javascript:`)
   * dentro del iframe. Devuelve null si la URL no es confiable.
   */
  private construirUrlEmbed(url: string): string | null {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }

    if (parsed.protocol !== 'https:') return null;

    const host = parsed.hostname.toLowerCase();
    const permitido = DashboardSiucomPage.HOSTS_PERMITIDOS.some(
      permitidoHost => host === permitidoHost || host.endsWith(`.${permitidoHost}`)
    );
    if (!permitido) return null;

    parsed.searchParams.set('embed', '1');
    return parsed.toString();
  }
}
