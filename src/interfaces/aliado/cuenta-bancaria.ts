export interface TipoCuenta {
  idTipoCuenta: string;
  descripcion?: string;
}

export interface Banco {
  idBanco: string;
  nombreBanco?: string;
  nombreAbreviado?: string;
  descripcion?: string;
}

export interface ICuentaBancaria {
  cuentaBancariaId?: string;
  empresaId: string;
  bancoId: string;
  tipoCuentaId: string;
  monedaId: number;
  numeroCuenta: string;
  nombreCuenta: string;
  activo?: boolean;
  usrIngreso?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface CreateCuentaBancariaDto {
  empresaId: string;
  bancoId: string;
  tipoCuentaId: string;
  monedaId: number;
  numeroCuenta: string;
  nombreCuenta: string;
  activo?: boolean;
  usrIngreso?: string;
}

export interface UpdateCuentaBancariaDto {
  empresaId?: string;
  bancoId?: string;
  tipoCuentaId?: string;
  monedaId?: number;
  numeroCuenta?: string;
  nombreCuenta?: string;
  activo?: boolean;
  usrIngreso?: string;
}

export interface ListarCuentasBancariasDto {
  page?: number;
  limit?: number;
  busqueda?: string;
  numeroCuenta?: string;
  empresaId?: string;
  representanteId?: string;
  activo?: boolean;
}

// Mantener para compatibilidad con código existente
export interface CuentaBancaria {
  idCuentaBancaria: string;
  idEmpresa?: string;
  idBanco?: string;
  idTipoCuenta?: string;
  idMoneda?: number;
  numeroCuenta?: string;
  nombreCuenta?: string;
  indActivo?: boolean;
  usrIngreso?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}
