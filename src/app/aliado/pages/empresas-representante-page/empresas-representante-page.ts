
import { IEmpresaAliado } from '../../../../interfaces/aliado/empresa';
  
import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RepresentanteService } from '../../../../services/aliado/representante.service';
import { Representante } from '../../../../interfaces/aliado/representante';


@Component({
  selector: 'app-empresas-representante-page',
  imports: [RouterLink],
  templateUrl: './empresas-representante-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EmpresasRepresentantePage {
  private route = inject(ActivatedRoute);
  private representanteService = inject(RepresentanteService);
  representanteId = signal('');
  representante = signal<Representante | null>(null);

  
  empresasFicticias: (IEmpresaAliado & { open?: boolean })[] = [
    {
      empresaId: '1',
      name: 'Empresa Alpha',
      description: 'Empresa de tecnología',
      pathImg: null,
      address: 'Av. Reforma 123',
      latitud: null,
      longitud: null,
      phone: '555-1234',
      phone2: null,
      email: 'contacto@alpha.com',
      active: true,
      created_at: new Date(),
      updated_at: null,
      deleted_at: null,
      open: false
    },
    {
      empresaId: '2',
      name: 'Empresa Beta',
      description: 'Servicios financieros',
      pathImg: null,
      address: 'Calle 45 Zona 10',
      latitud: null,
      longitud: null,
      phone: '555-5678',
      phone2: null,
      email: 'info@beta.com',
      active: true,
      created_at: new Date(),
      updated_at: null,
      deleted_at: null,
      open: false
    }
  ];

    cuentasBancariasFicticias: Record<string, Array<{
    idCuentaBancaria: string;
    banco: string;
    numeroCuenta: string;
    tipoCuenta: string;
    moneda: string;
    indActivo: boolean;
  }>> = {
    '1': [
      {
        idCuentaBancaria: 'cb1',
        banco: 'Banco Industrial',
        numeroCuenta: '1234567890',
        tipoCuenta: 'Ahorro',
        moneda: 'GTQ',
        indActivo: true
      },
      {
        idCuentaBancaria: 'cb2',
        banco: 'Banrural',
        numeroCuenta: '9876543210',
        tipoCuenta: 'Corriente',
        moneda: 'USD',
        indActivo: false
      }
    ],
    '2': [
      {
        idCuentaBancaria: 'cb3',
        banco: 'G&T Continental',
        numeroCuenta: '5555555555',
        tipoCuenta: 'Ahorro',
        moneda: 'GTQ',
        indActivo: true
      }
    ]
  };

  async ngOnInit() {
    // Obtener el representanteId de la URL
    const id = this.route.snapshot.paramMap.get('representanteId') || '';
    console.log("🚀 ~ EmpresasRepresentantePage ~ ngOnInit ~ id:", id)
    this.representanteId.set(id);
    if (id) {
      const resp = await this.representanteService.byId(id);
      console.log("🚀 ~ EmpresasRepresentantePage ~ ngOnInit ~ resp:", resp)
      this.representante.set(resp?.data?.representante || null);
    }
  }
}
