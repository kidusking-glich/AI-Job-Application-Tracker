import { IsBoolean } from 'class-validator';

export class UpdateRoleDto {
  @IsBoolean()
  isAdmin: boolean;
}
