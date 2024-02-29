import { IsNotEmpty, IsUUID, IsOptional, IsDateString } from "class-validator";

export class TarjetaDto {
    @IsNotEmpty()
    name: string;

    @IsUUID()
    id_lista: string;

    @IsOptional()
    description?: string;

    @IsDateString()
    @IsOptional()
    fecha_tope?: Date;
}
