// src/auth/dto/signup.dto.ts
import { IsEmail, IsNotEmpty, IsOptional,IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({ example: "name@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'P@ssw0rd!', minLength: 8 })
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John Doe', required: true })
  @IsOptional()
  @IsNotEmpty()
  full_name?: string;

  @IsOptional()
  @IsString()
  company_name?: string;
}
