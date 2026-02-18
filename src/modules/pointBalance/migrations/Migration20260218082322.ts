import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260218082322 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "point_balance" ("id" text not null, "customer_id" text not null, "balance" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "point_balance_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_point_balance_deleted_at" ON "point_balance" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "point_transaction" ("id" text not null, "customer_id" text not null, "type" text check ("type" in ('earn', 'spend', 'adjust')) not null, "points" integer not null, "reason" text null, "reference_id" text null, "reference_type" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "point_transaction_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_point_transaction_deleted_at" ON "point_transaction" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "variant_point_config" ("id" text not null, "variant_id" text not null, "payment_type" text check ("payment_type" in ('currency', 'points', 'both')) not null default 'currency', "point_price" integer null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "variant_point_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_variant_point_config_deleted_at" ON "variant_point_config" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "point_balance" cascade;`);

    this.addSql(`drop table if exists "point_transaction" cascade;`);

    this.addSql(`drop table if exists "variant_point_config" cascade;`);
  }

}
