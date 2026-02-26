import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260225140744 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "customer_supabase" drop constraint if exists "customer_supabase_supabase_id_unique";`);
    this.addSql(`create table if not exists "customer_supabase" ("id" text not null, "customer_id" text not null, "supabase_id" text not null, "email" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "customer_supabase_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_supabase_supabase_id_unique" ON "customer_supabase" ("supabase_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_customer_supabase_deleted_at" ON "customer_supabase" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_supabase" cascade;`);
  }

}
