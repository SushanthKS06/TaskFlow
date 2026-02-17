import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTaskDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsNotEmpty()
    listId: string;

    @IsString()
    @IsOptional()
    @IsIn(['low', 'medium', 'high', 'urgent'])
    priority?: string;

    @IsString()
    @IsOptional()
    assigneeId?: string;
}

export class UpdateTaskDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    @IsIn(['low', 'medium', 'high', 'urgent'])
    priority?: string;

    @IsString()
    @IsOptional()
    assigneeId?: string;
}

export class MoveTaskDto {
    @IsString()
    @IsNotEmpty()
    targetListId: string;

    @IsNumber()
    @Min(0)
    position: number;
}

export class AssignTaskDto {
    @IsString()
    @IsOptional()
    assigneeId?: string | null;
}
