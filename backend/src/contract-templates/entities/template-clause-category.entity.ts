import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('template_clause_categories')
@Index(['templateVersionId'])
@Index(['templateVersionId', 'categoryCode'], { unique: true })
export class TemplateClauseCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_version_id' })
  templateVersionId: string;

  @Column({ name: 'category_code' })
  categoryCode: string;

  @Column({ name: 'category_name' })
  categoryName: string;

  @Column({ name: 'display_order', type: 'int', nullable: true })
  displayOrder: number | null;
}
