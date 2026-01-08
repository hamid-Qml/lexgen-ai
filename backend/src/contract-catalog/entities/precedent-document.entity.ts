// src/contract-catalog/entities/precedent-document.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
} from 'typeorm';
import { ContractType } from './contract-type.entity';

@Entity('precedent_documents')
export class PrecedentDocument {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @ManyToOne(() => ContractType, (ct) => ct.precedents, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    contractType: ContractType | null;

    @Column()
    category: string;

    @Column()
    jurisdiction: string;

    @Column({ name: 'source_path' })
    sourcePath: string;

    @Column({ name: 'front_matter', type: 'jsonb', nullable: true })
    frontMatter: string[] | null;

    @Column({ type: 'jsonb', nullable: true })
    sections: Array<{ heading: string; body: string }> | null;

    @Column({ type: 'jsonb', nullable: true })
    placeholders: string[] | null;

    // For now, store embeddings as JSON (number[])
    // You can switch to Postgres 'vector' type later if extension is installed.
    @Column({ name: 'embedding_vector', type: 'jsonb', nullable: true })
    embeddingVector: number[] | null;

    @Column('text', { array: true, default: '{}' })
    keywords: string[];

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;
}
