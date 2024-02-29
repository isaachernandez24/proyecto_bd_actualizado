import { IsNotEmpty, IsUUID } from "class-validator";

export class Lista {
    @IsNotEmpty()
    name: string;

    @IsUUID()
    board_id: string;
}
