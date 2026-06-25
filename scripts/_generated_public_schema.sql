-- Auto-generated from source OpenAPI for REST migration
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public."branch_material_request_lines" (
  "id" UUID PRIMARY KEY,
  "request_id" UUID NOT NULL,
  "material_id" UUID,
  "name" TEXT NOT NULL,
  "main_category" TEXT NOT NULL,
  "mid_category" TEXT NOT NULL,
  "quantity" NUMERIC NOT NULL DEFAULT 1,
  "unit" TEXT NOT NULL,
  "spec" TEXT,
  "sort_order" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public."branch_material_requests" (
  "id" UUID PRIMARY KEY,
  "organization_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "created_by" UUID NOT NULL,
  "status" TEXT NOT NULL,
  "branch_note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "fulfilled_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public."branches" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT,
  "address" TEXT,
  "phone" TEXT,
  "manager" TEXT,
  "business_number" TEXT,
  "employee_count" INTEGER,
  "delivery_fees" JSONB,
  "surcharges" JSONB,
  "account" TEXT,
  "seeded" BOOLEAN,
  "extra_data" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."campaigns" (
  "id" UUID PRIMARY KEY,
  "shop_id" UUID,
  "type" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "status" TEXT,
  "published_at" TIMESTAMPTZ,
  "error_log" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."card_designs" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID,
  "user_id" UUID,
  "name" TEXT,
  "preview_url" TEXT,
  "data" JSONB NOT NULL,
  "is_public" BOOLEAN,
  "created_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public."chat_messages" (
  "id" UUID PRIMARY KEY,
  "room_id" UUID,
  "sender_id" UUID,
  "sender_tenant_id" UUID,
  "content" TEXT,
  "image_url" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "origin_url" TEXT,
  "is_ai" BOOLEAN,
  "ai_sender_name" TEXT
);

CREATE TABLE IF NOT EXISTS public."chat_participants" (
  "id" UUID PRIMARY KEY,
  "room_id" UUID,
  "tenant_id" UUID,
  "user_id" UUID,
  "last_read_at" TIMESTAMPTZ DEFAULT now(),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."chat_rooms" (
  "id" UUID PRIMARY KEY,
  "type" TEXT NOT NULL,
  "origin_order_id" UUID,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "status" TEXT,
  "active_counselor" TEXT,
  "needs_human" BOOLEAN,
  "last_activity_at" TIMESTAMPTZ DEFAULT now(),
  "last_summary" TEXT
);

CREATE TABLE IF NOT EXISTS public."content_drafts" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID,
  "title" TEXT,
  "content" TEXT,
  "image_url" TEXT,
  "platforms" JSONB,
  "status" TEXT,
  "scheduled_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public."custom_fonts" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID,
  "font_family" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "web_url" TEXT,
  "storage_path" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."custom_phrases" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID,
  "category" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."customer_anniversaries" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "anniversary_date" DATE NOT NULL,
  "recurring_yearly" BOOLEAN NOT NULL,
  "preferred_flowers" TEXT,
  "allergies" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."customers" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "contact" TEXT NOT NULL,
  "email" TEXT,
  "company_name" TEXT,
  "address" TEXT,
  "grade" TEXT,
  "points" INTEGER,
  "memo" TEXT,
  "total_spent" BIGINT,
  "order_count" INTEGER,
  "is_deleted" BOOLEAN,
  "extra_data" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "last_order_date" TIMESTAMPTZ,
  "type" TEXT,
  "department" TEXT,
  "marketing_consent" BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS public."daily_settlements" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "previous_vault_balance" NUMERIC NOT NULL,
  "cash_sales_today" NUMERIC NOT NULL,
  "delivery_cost_cash_today" NUMERIC NOT NULL,
  "cash_expense_today" NUMERIC NOT NULL,
  "vault_deposit" NUMERIC NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."delivery_fees_by_region" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID,
  "region_name" TEXT NOT NULL,
  "fee" NUMERIC,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."delivery_prep_reminders" (
  "branch_name" TEXT PRIMARY KEY,
  "last_checked_date" DATE NOT NULL,
  "morning_checked" BOOLEAN,
  "afternoon_checked" BOOLEAN,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public."design_gallery_assets" (
  "id" UUID PRIMARY KEY,
  "theme_id" UUID NOT NULL,
  "image_url" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "thumb_url" TEXT
);

CREATE TABLE IF NOT EXISTS public."design_gallery_themes" (
  "id" UUID PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."document_logs" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID,
  "type" TEXT NOT NULL,
  "recipient_info" JSONB NOT NULL,
  "items" JSONB NOT NULL,
  "total_amount" NUMERIC,
  "use_vat" BOOLEAN,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."expenses" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID,
  "category" TEXT NOT NULL,
  "sub_category" TEXT,
  "amount" NUMERIC,
  "description" TEXT,
  "expense_date" TIMESTAMPTZ DEFAULT now(),
  "payment_method" TEXT,
  "related_order_id" UUID,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "supplier_id" UUID,
  "material_id" UUID,
  "quantity" NUMERIC,
  "unit" TEXT,
  "receipt_url" TEXT,
  "receipt_file_id" TEXT,
  "storage_provider" TEXT,
  "purchase_id" UUID,
  "related_branch_material_request_id" UUID
);

CREATE TABLE IF NOT EXISTS public."external_orders" (
  "id" UUID PRIMARY KEY,
  "sender_tenant_id" UUID,
  "receiver_tenant_id" UUID,
  "receiver_partner_id" UUID,
  "origin_order_id" UUID,
  "status" TEXT,
  "total_amount" NUMERIC NOT NULL,
  "fulfillment_amount" NUMERIC NOT NULL,
  "sender_profit" NUMERIC NOT NULL,
  "platform_fee" NUMERIC NOT NULL,
  "order_data" JSONB,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "hide_customer_info" BOOLEAN
);

CREATE TABLE IF NOT EXISTS public."hq_checklists" (
  "id" UUID PRIMARY KEY,
  "role" TEXT NOT NULL,
  "task_name" TEXT NOT NULL,
  "description" TEXT,
  "display_order" INTEGER,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "frequency" TEXT
);

CREATE TABLE IF NOT EXISTS public."hq_roles" (
  "id" UUID PRIMARY KEY,
  "role_key" TEXT NOT NULL,
  "role_name" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."hq_task_completions" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID,
  "task_id" UUID,
  "completed_at" DATE,
  "is_completed" BOOLEAN,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."industries" (
  "id" UUID PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name_ko" TEXT NOT NULL,
  "default_persona" TEXT,
  "marketing_triggers" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."integration_notify_requests" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "platform" TEXT NOT NULL,
  "country_code" TEXT NOT NULL,
  "requested_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."marketing_attributions" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL,
  "order_id" UUID,
  "customer_id" UUID,
  "attributed_amount" NUMERIC NOT NULL,
  "currency" TEXT NOT NULL,
  "attribution_window_days" INTEGER NOT NULL DEFAULT 7,
  "utm_source" TEXT,
  "utm_medium" TEXT,
  "utm_campaign" TEXT,
  "matched_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."marketing_campaigns" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "campaign_code" TEXT NOT NULL,
  "campaign_type" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "title" TEXT,
  "metadata" JSONB NOT NULL,
  "attribution_link" TEXT,
  "expected_revenue" NUMERIC,
  "customer_id" UUID,
  "order_id" UUID,
  "scheduled_at" TIMESTAMPTZ,
  "executed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."marketing_drafts" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "campaign_id" UUID,
  "draft_type" TEXT NOT NULL,
  "title" TEXT,
  "content" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."marketing_scheduled_posts" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "campaign_id" UUID,
  "channel" TEXT NOT NULL,
  "title" TEXT,
  "content" TEXT NOT NULL,
  "media_url" TEXT,
  "scheduled_at" TIMESTAMPTZ NOT NULL,
  "status" TEXT NOT NULL,
  "postiz_post_id" TEXT,
  "metadata" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."materials" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID,
  "name" TEXT NOT NULL,
  "main_category" TEXT NOT NULL,
  "mid_category" TEXT,
  "unit" TEXT,
  "spec" TEXT,
  "price" NUMERIC,
  "stock" NUMERIC,
  "supplier" TEXT,
  "memo" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "color" TEXT,
  "supplier_id" UUID,
  "current_stock" NUMERIC,
  "safety_stock" NUMERIC,
  "description" TEXT
);

CREATE TABLE IF NOT EXISTS public."orders" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "order_number" TEXT,
  "status" TEXT,
  "receipt_type" TEXT,
  "order_date" TIMESTAMPTZ DEFAULT now(),
  "orderer" JSONB,
  "delivery_info" JSONB,
  "pickup_info" JSONB,
  "summary" JSONB,
  "payment" JSONB,
  "items" JSONB,
  "memo" TEXT,
  "extra_data" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "completed_at" TIMESTAMPTZ,
  "message" JSONB,
  "completed_by" UUID,
  "actual_delivery_cost" NUMERIC,
  "actual_delivery_cost_cash" NUMERIC,
  "outsource_info" JSONB,
  "completionphotourl" TEXT,
  "actual_delivery_payment_method" TEXT,
  "actual_delivery_payment_status" TEXT,
  "alimtalk_status" TEXT,
  "alimtalk_sent_at" TIMESTAMPTZ,
  "alimtalk_error" TEXT,
  "delivery_provider" TEXT,
  "delivery_tracking_id" TEXT,
  "delivery_provider_status" TEXT,
  "delivery_provider_fee" NUMERIC,
  "delivery_tracking_url" TEXT,
  "source" TEXT,
  "pos_transaction_id" UUID,
  "attribution_campaign_id" UUID
);

CREATE TABLE IF NOT EXISTS public."organization_announcement_comments" (
  "id" UUID PRIMARY KEY,
  "announcement_id" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."organization_announcement_reads" (
  "id" UUID PRIMARY KEY,
  "announcement_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "tenant_id" UUID,
  "user_full_name" TEXT,
  "tenant_name" TEXT,
  "read_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."organization_announcements" (
  "id" UUID PRIMARY KEY,
  "organization_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "priority" TEXT NOT NULL,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expires_at" TIMESTAMPTZ NOT NULL,
  "attachment_urls" JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public."organization_catalog_items" (
  "id" UUID PRIMARY KEY,
  "organization_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "main_category" TEXT,
  "mid_category" TEXT,
  "price" NUMERIC NOT NULL,
  "code" TEXT,
  "status" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."organization_members" (
  "organization_id" UUID PRIMARY KEY,
  "user_id" UUID PRIMARY KEY,
  "role" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."organizations" (
  "id" UUID PRIMARY KEY,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."partners" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID,
  "target_tenant_id" UUID,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "contact_person" TEXT,
  "contact" TEXT,
  "email" TEXT,
  "address" TEXT,
  "business_number" TEXT,
  "bank_account" TEXT,
  "default_margin_percent" NUMERIC DEFAULT 19,
  "is_verified" BOOLEAN,
  "memo" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."payment_requests" (
  "id" UUID PRIMARY KEY,
  "order_id" UUID,
  "order_number" TEXT,
  "tenant_id" UUID,
  "amount" BIGINT NOT NULL,
  "status" TEXT,
  "payment_key" TEXT,
  "payment_url" TEXT,
  "method" TEXT,
  "pg_type" TEXT,
  "customer_name" TEXT,
  "customer_contact" TEXT,
  "fail_reason" TEXT,
  "extra_data" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."platform_config" (
  "id" UUID PRIMARY KEY,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."point_transactions" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "amount" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "description" TEXT,
  "related_id" UUID,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."pos_integrations" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID,
  "pos_type" TEXT NOT NULL,
  "api_key" TEXT,
  "api_secret" TEXT,
  "store_code" TEXT,
  "webhook_secret" TEXT,
  "is_active" BOOLEAN,
  "auto_create_customer" BOOLEAN,
  "auto_point_rate" NUMERIC DEFAULT 1,
  "last_synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."pos_transactions" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID,
  "pos_type" TEXT NOT NULL,
  "pos_transaction_id" TEXT,
  "raw_payload" JSONB NOT NULL,
  "mapped_order_id" UUID,
  "matched_customer_id" UUID,
  "status" TEXT,
  "error_message" TEXT,
  "processed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."print_history" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "ribbon_type" TEXT,
  "width" INTEGER,
  "length" INTEGER,
  "left_text" TEXT,
  "right_text" TEXT,
  "printer_name" TEXT,
  "thumbnail_url" TEXT,
  "printed_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."print_jobs" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "printer_name" TEXT,
  "image_base64" TEXT NOT NULL,
  "width_mm" INTEGER NOT NULL,
  "length_mm" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "tenant_id" UUID,
  "type" TEXT,
  "data" JSONB
);

CREATE TABLE IF NOT EXISTS public."products" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "main_category" TEXT,
  "mid_category" TEXT,
  "price" BIGINT,
  "stock" INTEGER,
  "supplier" TEXT,
  "code" TEXT,
  "status" TEXT,
  "extra_data" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "supplier_id" UUID,
  "is_portfolio" BOOLEAN,
  "image_url" TEXT,
  "branch" TEXT
);

CREATE TABLE IF NOT EXISTS public."profiles" (
  "id" UUID PRIMARY KEY,
  "email" TEXT NOT NULL,
  "tenant_id" UUID,
  "role" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "onboarding_completed" BOOLEAN,
  "org_work_tenant_id" UUID
);

CREATE TABLE IF NOT EXISTS public."purchases" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "supplier_id" UUID,
  "material_id" UUID,
  "name" TEXT,
  "status" TEXT NOT NULL,
  "total_price" NUMERIC NOT NULL,
  "quantity" NUMERIC NOT NULL,
  "scheduled_date" DATE,
  "purchase_date" TIMESTAMPTZ,
  "payment_method" TEXT,
  "expense_id" UUID,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "batch_id" UUID,
  "batch_name" TEXT,
  "main_category" TEXT,
  "mid_category" TEXT
);

CREATE TABLE IF NOT EXISTS public."revenue_autopilot_settings" (
  "tenant_id" UUID PRIMARY KEY,
  "anniversary_autopilot" BOOLEAN NOT NULL,
  "order_followup_autopilot" BOOLEAN NOT NULL,
  "sns_autopilot" BOOLEAN NOT NULL,
  "flash_autopilot" BOOLEAN NOT NULL,
  "sns_requires_approval" BOOLEAN NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "message_templates" JSONB NOT NULL,
  "marketing_persona" TEXT,
  "promo_topics" JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public."shop_integrations" (
  "id" UUID PRIMARY KEY,
  "shop_id" UUID NOT NULL,
  "platform" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "client_secret" TEXT NOT NULL,
  "is_active" BOOLEAN,
  "last_sync_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "mall_id" TEXT,
  "access_token" TEXT,
  "refresh_token" TEXT
);

CREATE TABLE IF NOT EXISTS public."shop_settings" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "shop_id" UUID,
  "n8n_webhook_url" TEXT,
  "auto_pilot_enabled" BOOLEAN,
  "auto_pilot_frequency" INTEGER DEFAULT 1,
  "store_persona" TEXT,
  "target_platforms" JSONB,
  "settings_json" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "industry_id" UUID,
  "target_audience" TEXT,
  "marketing_theme" TEXT,
  "business_scale" TEXT
);

CREATE TABLE IF NOT EXISTS public."shops" (
  "id" UUID PRIMARY KEY,
  "owner_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "shop_code" TEXT,
  "language" TEXT,
  "marketing_settings" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."store_settings" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID,
  "kakaot_api_key" TEXT,
  "kakaot_business_id" TEXT,
  "auto_delivery_booking" BOOLEAN,
  "default_payment_method_id" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."subscriptions" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID,
  "plan" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."suppliers" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID,
  "name" TEXT NOT NULL,
  "contact" TEXT,
  "email" TEXT,
  "address" TEXT,
  "business_number" TEXT,
  "memo" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "supplier_type" TEXT
);

CREATE TABLE IF NOT EXISTS public."support_faq" (
  "id" UUID PRIMARY KEY,
  "category" TEXT NOT NULL,
  "category_icon" TEXT NOT NULL,
  "category_order" INTEGER,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "question_order" INTEGER,
  "is_featured" BOOLEAN,
  "is_active" BOOLEAN,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."system_settings" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" UUID PRIMARY KEY,
  "data" JSONB NOT NULL,
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."templates" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID,
  "user_id" UUID,
  "name" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public."tenant_master_seed_audit" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "seed_version" TEXT NOT NULL,
  "applied_by" UUID,
  "summary" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."tenant_postiz_integrations" (
  "tenant_id" UUID PRIMARY KEY,
  "postiz_integration_id" TEXT,
  "instagram_connected" BOOLEAN NOT NULL,
  "channel_ids" JSONB NOT NULL,
  "connected_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."tenants" (
  "id" UUID PRIMARY KEY,
  "name" TEXT NOT NULL,
  "plan" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "subscription_start" TIMESTAMPTZ DEFAULT now(),
  "subscription_end" TIMESTAMPTZ,
  "status" TEXT,
  "can_receive_orders" BOOLEAN,
  "partner_category" TEXT,
  "partner_description" TEXT,
  "partner_region" TEXT,
  "logo_url" TEXT,
  "portfolio_url" TEXT,
  "portfolio_gdrive_id" TEXT,
  "is_premium" BOOLEAN,
  "gdrive_bouquet_id" TEXT,
  "gdrive_basket_id" TEXT,
  "gdrive_wreath_id" TEXT,
  "gdrive_plant_id" TEXT,
  "gdrive_orchid_id" TEXT,
  "gdrive_condolence_id" TEXT,
  "contact_phone" TEXT,
  "address" TEXT,
  "organization_id" UUID
);

CREATE TABLE IF NOT EXISTS public."user_credentials" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "shop_id" UUID,
  "provider" TEXT NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "token_expires_at" TIMESTAMPTZ,
  "scopes" JSONB,
  "account_name" TEXT,
  "is_active" BOOLEAN,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."user_roles" (
  "id" UUID PRIMARY KEY,
  "email" TEXT,
  "role" TEXT,
  "tenant_id" UUID,
  "org_work_tenant_id" UUID,
  "branch_name" TEXT,
  "branch_id" UUID PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public."wallet_transactions" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "amount" NUMERIC NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "reference_id" UUID,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."wallets" (
  "tenant_id" UUID PRIMARY KEY,
  "balance" NUMERIC NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."withdrawal_requests" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "amount" NUMERIC NOT NULL,
  "bank_info" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "admin_memo" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
