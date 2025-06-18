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
    accesoId:  string;
    orderMenu: number;
    showApp:   boolean;
    showWeb:   boolean;
    active:    boolean;
    menu:      IMenu;
    subMenus?: IAcceso[];
}

export interface IMenu {
    menuId:      string;
    name:        string;
    description: string;
    pathApp:     string;
    pathWeb:     string;
    label:       string;
    icon:        string;
    color:       string;
    main:        boolean;
    active:      boolean;
    createdAt:   Date;
}

