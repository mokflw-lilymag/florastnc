-- 1. 연관된 외래키 제약조건 삭제 (알려진 테이블 기준)
ALTER TABLE IF EXISTS public.purchases DROP CONSTRAINT IF EXISTS purchases_material_id_fkey;
ALTER TABLE IF EXISTS public.expense_items DROP CONSTRAINT IF EXISTS expense_items_material_id_fkey;
ALTER TABLE IF EXISTS public.expenses DROP CONSTRAINT IF EXISTS expenses_material_id_fkey;
ALTER TABLE IF EXISTS public.branch_material_request_lines DROP CONSTRAINT IF EXISTS branch_material_request_lines_material_id_fkey;
ALTER TABLE IF EXISTS public.order_items DROP CONSTRAINT IF EXISTS order_items_material_id_fkey;

-- 2. 외래키 테이블들의 컬럼 타입을 text로 변경
ALTER TABLE IF EXISTS public.purchases ALTER COLUMN material_id TYPE text USING material_id::text;
ALTER TABLE IF EXISTS public.expense_items ALTER COLUMN material_id TYPE text USING material_id::text;
ALTER TABLE IF EXISTS public.expenses ALTER COLUMN material_id TYPE text USING material_id::text;
ALTER TABLE IF EXISTS public.branch_material_request_lines ALTER COLUMN material_id TYPE text USING material_id::text;
ALTER TABLE IF EXISTS public.order_items ALTER COLUMN material_id TYPE text USING material_id::text;

-- 3. materials 테이블의 id(PK)를 text로 변경
ALTER TABLE public.materials ALTER COLUMN id TYPE text USING id::text;

-- 4. 외래키 다시 연결 (ON UPDATE CASCADE 적용)
-- purchases
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='purchases') THEN
    ALTER TABLE public.purchases ADD CONSTRAINT purchases_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- expense_items
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='expense_items') THEN
    ALTER TABLE public.expense_items ADD CONSTRAINT expense_items_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- expenses
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='expenses') THEN
    ALTER TABLE public.expenses ADD CONSTRAINT expenses_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- branch_material_request_lines
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='branch_material_request_lines') THEN
    ALTER TABLE public.branch_material_request_lines ADD CONSTRAINT branch_material_request_lines_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- order_items
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='order_items') THEN
    ALTER TABLE public.order_items ADD CONSTRAINT order_items_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;
