import { IMenu, IRol } from "./auth";

export interface AccesoResponse {
    success:    boolean;
    message:    string;
    statusCode: number;
    data:       Data;
}

export interface Data {
    accesos: IAcceso[];
}

export interface IAcceso {
    accesoId?:  string;
    orderMenu: number;
    showApp:   boolean;
    showWeb:   boolean;
    mainMenuId?: string;
    active:    boolean;
    menu:     IMenu;
    rol?:      IRol;
    rolId:    string;
    menuId:    string;
    subMenus?: IAcceso[];
}


