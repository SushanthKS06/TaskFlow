import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateListDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    boardId: string;
}

export class UpdateListDto {
    @IsString()
    @IsOptional()
    title?: string;
}

export class ReorderListDto {
    @IsNumber()
    @Min(0)
    position: number;
}
