import { IAcceso } from "./acceso";
import { IMetodo } from "./metodo";

/** Origen del usuario autenticado: colaborador interno o usuario externo de OneSiteEx */
export type Realm = 'INTERNAL' | 'ONESITEEX';

/** Contexto de empresa y rol que devuelve el login de usuarios externos (OneSiteEx) */
export interface IContextoExterno {
    origen:         string;
    idUsuario:      number;
    idEmpresa:      number;
    idRol:          number;
    nombreEmpresa:  string;
    codigoEmpresa:  string | null;
    nombreRol:      string | null;
}

/** Códigos del campo `error` que devuelven las rutas protegidas en 401/403 */
export type AuthErrorCode =
    | 'TOKEN_NO_ENVIADO' | 'TOKEN_EXPIRADO' | 'TOKEN_INVALIDO'
    | 'SESION_CADUCADA' | 'USUARIO_INACTIVO' | 'USUARIO_EXTERNO_INACTIVO'
    | 'ROL_INACTIVO' | 'REALM_NO_PERMITIDO' | 'ROL_NO_PROPIO'
    | 'SERVICIO_NO_DISPONIBLE';

export interface AuthResponse {
    success: boolean;
    statusCode: number;
    status?: number;
    message: string;
    data: {
        user: IUser;
        siucom?: ISIUCOM;
        token:    string;
        /** Ausente en respuestas antiguas del API: se asume INTERNAL */
        realm?:   Realm;
        /** Solo viene con contenido en el login de externos */
        externo?: IContextoExterno | null;
    }
}

export interface SiucomAccesoResponse {
    success: boolean;
    statusCode: number;
    status?: number;
    message: string;
    data: {
        user: IUser;
        siucom: ISIUCOM;
        creado: boolean;
    }
}

export interface AccesoResponse {
    success: boolean;
    statusCode: number;
    status?: number;
    message: string;
    data: {
        accesos: IAcceso[];
        metadata: Metadata
    }
}

export interface IUser {
    userId:      string;
    fullName:        string;
    userName:    string;
    name1:       string;
    name2:       string;
    name3:       string;
    lastName1:   string;
    lastName2:   string;
    lastName3:   string;
    password:    string;
    email:       string;
    photoUrl?:   string;
    lastPasswordUpdate?: Date; 
    fingerprint: null;
    validateMAC: null;
    active:      boolean;
    rolId:       string;
    rol:         IRol;
    puestoId:    null;
    puesto?:      null;
    metodoId:    null;
    metodo?:    IMetodo;
    siucom?: ISIUCOM;
    /** Origen del usuario. Sin valor se trata como INTERNAL. */
    realm?:   Realm;
    /** Contexto de OneSiteEx. Siempre null para colaboradores internos. */
    externo?: IContextoExterno | null;
    created_at?:  Date;
    updated_at?:  Date;
    deleted_at?:  Date;
}

export interface IRol {
    rolId?:     string;
    name:      string;
    active:    boolean;
    guest:    boolean;
    isAdmin?: boolean;
    created_at?: Date;
    updated_at?:  Date;
    deleted_at?:  Date;
}

export interface IMenu {
    menuId?:      string;
    name:        string;
    description: string;
    pathApp:     string;
    pathWeb:     string;
    reporteId?:   string;
    label:       string;
    icon:        string;
    color:       string;
    main:        boolean;
    active:      boolean;
    subMenus?:   IMenu[];
    created_at?:   Date;
    updated_at?:  Date;
    deleted_at?:  Date;
}


export interface RolesResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       Data;
}

export interface Data {
    roles:    IRol[];
    metadata: Metadata;
}

export interface Metadata {
    total: number;
    page:  number;
    limit: number;
}

export interface UsersResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data:       DataU;
}

export interface DataU {
    users:    IUser[];
    metadata: Metadata;
}

export interface ISIUCOM {
    id:                     string;
    usuarioId:              string;
    success?:               boolean;
    creado?:                boolean;
    mensaje?:               string;
    usuarioSiucom:          string;
    nombreCliente:          string;
    codigoAgencia:          number;
    region:                 string | null;
    agencia:                string | null;
    rol:                    string;
    estado:                 string;
    dashboard:              string;
    pluviometro:            number;
    urlAcceso:              string;
    urlEstado:              string;
    idRegionFundea:         number;
    tipoDispositivo:        string;
    esSedeRegional:         boolean;
    dispositivoSolicitado:  string;
    dispositivoResultado:   number;
    created_at?:            Date;
    updated_at?:            Date | null;
    deleted_at?:            Date | null;
}