import { IsBoolean, IsUUID } from "class-validator";

export class UserTarjetaDto {
    @IsBoolean()
    IsOwner: boolean;

    @IsUUID()
    tarjetaid: string;

    @IsUUID()
    userid: string;
}
