import { IsDefined, IsString, IsUUID, Length } from "class-validator";

export class Board {
  @IsString()
  @IsDefined()
  @Length(5, 30)
  name: string;

  @IsUUID()
  adminUserId: string;
}
