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
