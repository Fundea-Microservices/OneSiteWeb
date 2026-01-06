import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
  input,
  effect,
  signal,
  OnInit
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ICuentaBancariaRepresentante, IBancoRepresentante, ITipoCuentaRepresentante } from '../../../../../interfaces/aliado/banco';
import { CreateCuentaBancariaDto } from '../../../../../interfaces/aliado/cuenta-bancaria';
import { BancoService } from '../../../../../services/aliado/banco.service';
import { CuentaBancariaService } from '../../../../../services/aliado/cuenta-bancaria.service';
import { CatalogosBantotalService } from '../../../../../services/api-bantotal/catalogos.service';
import { CatalogoSimple } from '../../../../../interfaces/api-bantotal/catalogos';

@Component({
  selector: 'app-upsert-cuenta-representante',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-cuenta-representante.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertCuentaRepresentanteComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bancoService = inject(BancoService);
  private cuentaBancariaService = inject(CuentaBancariaService);
  private catalogosService = inject(CatalogosBantotalService);

  cuenta = input<ICuentaBancariaRepresentante>({
    cuentaBancariaId: '',
    empresaId: '',
    bancoId: '',
    tipoCuentaId: '',
    monedaId: 1,
    numeroCuenta: '',
    nombreCuenta: '',
    activo: true,
    usrIngreso: '',
  });

  empresaId = input.required<string>();
  nuevo = input<boolean>(true);
  key = input<number>(0);

  @Output() save = new EventEmitter<ICuentaBancariaRepresentante>();
  @Output() cancel = new EventEmitter<void>();

  // Catálogos
  bancos = signal<IBancoRepresentante[]>([]);
  tiposCuenta = signal<ITipoCuentaRepresentante[]>([]);
  
  // Monedas fijas
  monedas = [
    { id: 1, simbolo: 'Q', nombre: 'Quetzales' },
    { id: 2, simbolo: '$', nombre: 'Dólares' }
  ];

  form = signal<FormGroup>(this.fb.group({}));
  guardando = signal<boolean>(false);

  constructor() {
    effect(() => {
      const _ = this.key();
      const cuentaData = this.cuenta();
      const isNuevo = this.nuevo();

      const newForm = this.fb.group({
        bancoId: [cuentaData.bancoId, Validators.required],
        tipoCuentaId: [cuentaData.tipoCuentaId, Validators.required],
        monedaId: [cuentaData.monedaId, Validators.required],
        numeroCuenta: [cuentaData.numeroCuenta, [Validators.required, Validators.maxLength(30)]],
        nombreCuenta: [cuentaData.nombreCuenta, [Validators.required, Validators.maxLength(150)]],
        activo: [cuentaData.activo ?? true],
      });

      if (isNuevo) {
        newForm.reset({
          bancoId: '',
          tipoCuentaId: '',
          monedaId: 1,
          numeroCuenta: '',
          nombreCuenta: '',
          activo: true,
        });
      }

      this.form.set(newForm);
    });
  }

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  async cargarCatalogos() {
    try {
      const [bancos, tiposCuenta] = await Promise.all([
        this.bancoService.obtenerBancos(),
        this.bancoService.obtenerTiposCuenta(),
      ]);

      console.log('🏦 Bancos cargados:', bancos);
      console.log('💳 Tipos de cuenta cargados:', tiposCuenta);

      this.bancos.set(bancos || []);
      this.tiposCuenta.set(tiposCuenta || []);
    } catch (error) {
      console.error('❌ Error al cargar catálogos:', error);
      this.bancos.set([]);
      this.tiposCuenta.set([]);
    }
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear Cuenta' : 'Actualizar Cuenta';
  }

  async onSubmit() {
    if (this.form().valid && !this.guardando()) {
      this.guardando.set(true);
      
      try {
        const formValue = this.form().value;
        
        const dto: CreateCuentaBancariaDto = {
          empresaId: this.empresaId(),
          bancoId: formValue.bancoId,
          tipoCuentaId: formValue.tipoCuentaId,
          monedaId: parseInt(formValue.monedaId, 10),
          numeroCuenta: formValue.numeroCuenta,
          nombreCuenta: formValue.nombreCuenta,
          activo: formValue.activo ?? true
        };

        console.log('💾 Guardando cuenta bancaria:', dto);

        const resp = await this.cuentaBancariaService.crear(dto);
        console.log('📊 Respuesta del servidor:', resp);
        
        if (resp?.success) {
          console.log('✅ Cuenta creada exitosamente');
          
          // Verificar la estructura de la respuesta
          let cuentaCreada: ICuentaBancariaRepresentante;
          
          if (resp.data?.cuentaBancaria) {
            // Si viene en resp.data.cuentaBancaria
            cuentaCreada = {
              cuentaBancariaId: resp.data.cuentaBancaria.cuentaBancariaId || '',
              empresaId: resp.data.cuentaBancaria.empresaId,
              bancoId: resp.data.cuentaBancaria.bancoId,
              tipoCuentaId: resp.data.cuentaBancaria.tipoCuentaId,
              monedaId: resp.data.cuentaBancaria.monedaId,
              numeroCuenta: resp.data.cuentaBancaria.numeroCuenta,
              nombreCuenta: resp.data.cuentaBancaria.nombreCuenta,
              activo: resp.data.cuentaBancaria.activo,
              usrIngreso: resp.data.cuentaBancaria.usrIngreso
            };
          } else if (resp.data && typeof resp.data === 'object') {
            // Si viene directamente en resp.data
            cuentaCreada = {
              cuentaBancariaId: (resp.data as any).cuentaBancariaId || '',
              empresaId: (resp.data as any).empresaId,
              bancoId: (resp.data as any).bancoId,
              tipoCuentaId: (resp.data as any).tipoCuentaId,
              monedaId: (resp.data as any).monedaId,
              numeroCuenta: (resp.data as any).numeroCuenta,
              nombreCuenta: (resp.data as any).nombreCuenta,
              activo: (resp.data as any).activo,
              usrIngreso: (resp.data as any).usrIngreso
            };
          } else {
            // Si no hay datos, retornar el DTO original
            cuentaCreada = {
              cuentaBancariaId: '',
              ...dto
            };
          }
          
          console.log('🎉 Emitiendo cuenta creada:', cuentaCreada);
          this.save.emit(cuentaCreada);
        } else {
          console.error('❌ Error al crear cuenta bancaria:', resp);
        }
      } finally {
        this.guardando.set(false);
      }
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
