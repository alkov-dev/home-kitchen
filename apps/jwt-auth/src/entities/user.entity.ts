import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RefreshToken } from './refresh-token.entity';

export enum UserRole {
    CUSTOMER = 'customer',
    MANAGER = 'manager',
    ADMIN = 'admin',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    email!: string;

    @Column()
    password!: string;

    @Column({ nullable: true })
    phone?: string;

    @Column({ nullable: true })
    firstName?: string;

    @Column({ nullable: true })
    lastName?: string;

    @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
    role!: UserRole;

    @Column({ default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @OneToMany(() => RefreshToken, (token) => token.user)
    refreshTokens!: RefreshToken[];
}