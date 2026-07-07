import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    userId!: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column()
    token!: string;

    @Column()
    expiresAt!: Date;

    @Column({ default: false })
    revoked!: boolean;

    @Column({ nullable: true })
    replacedByToken?: string;

    @Column({ nullable: true })
    reasonRevoked?: string;

    @Column()
    createdAt!: Date;
}