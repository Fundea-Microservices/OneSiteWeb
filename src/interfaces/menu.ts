import { IMenu } from "./auth";

export interface MenuResponse {
    success:    boolean;
    message:    string;
    statusCode: number;
    data:       Data;
}

export interface Data {
    menus:    IMenu[];
    metadata: Metadata;
}

export interface Metadata {
    total: number;
    page:  number;
    limit: number;
}
