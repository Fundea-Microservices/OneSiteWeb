export interface AuthResponse {
    success: boolean;
    statusCode: number;
    status?: number;
    message: string;
    data: {
        user: IUser;
        token:    string;
    }
}

export interface AccesoResponse {
    success: boolean;
    statusCode: number;
    status?: number;
    message: string;
    data: {
        accesos: IMenu[];
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
    puesto:      null;
    methodId:    null;
    created_at:  Date;
    updated_at?:  Date;
    deleted_at?:  Date;
}

export interface IRol {
    rolId?:     string;
    name:      string;
    active:    boolean;
    guest:    boolean;
    createdAt?: Date;
}

export interface IMenu {
    menuId:      string;
    name:        string;
    description: string;
    pathApp:     string;
    pathWeb:     string;
    label:       string;
    title:       string;
    icon:        string;
    color:       string;
    main:        boolean;
    active:      boolean;
    subMenus?:   IMenu[];
    created_at:   Date;
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

