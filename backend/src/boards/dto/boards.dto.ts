import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBoardDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdateBoardDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;
}

export class AddMemberDto {
    @IsString()
    @IsNotEmpty()
    userId: string;
}
