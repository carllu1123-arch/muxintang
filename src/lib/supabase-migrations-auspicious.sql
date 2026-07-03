-- ============================================================
-- 牧心堂 · 吉祥馆 auspicious_orders 表迁移
--
-- 用途：阿阇梨定制请奉登记（零库存预订）
-- 表结构：id, user_id, product_type, recipient, address,
--         blessing_message, status, created_at
--
-- 运行方式：在 Supabase Studio SQL Editor 执行
-- ============================================================

-- 1. 建表
CREATE TABLE IF NOT EXISTS public.auspicious_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text REFERENCES auth.users(id) ON DELETE SET NULL,
  product_type    text NOT NULL CHECK (product_type IN ('scroll', 'bracelet', 'sachet')),
  recipient       text NOT NULL,
  address         text NOT NULL,
  blessing_message text,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'blessing', 'blessed', 'shipped', 'completed', 'cancelled')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. 索引（按用户、状态、时间查询）
CREATE INDEX IF NOT EXISTS idx_auspicious_orders_user_id
  ON public.auspicious_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_auspicious_orders_status
  ON public.auspicious_orders(status);
CREATE INDEX IF NOT EXISTS idx_auspicious_orders_created_at
  ON public.auspicious_orders(created_at DESC);

-- 3. updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auspicious_orders_updated_at ON public.auspicious_orders;
CREATE TRIGGER trg_auspicious_orders_updated_at
  BEFORE UPDATE ON public.auspicious_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. RLS 策略
ALTER TABLE public.auspicious_orders ENABLE ROW LEVEL SECURITY;

-- 用户只能看自己的请奉记录
CREATE POLICY "users_select_own_orders"
  ON public.auspicious_orders FOR SELECT
  USING (auth.uid()::text = user_id);

-- 用户可以提交请奉（user_id 可为 null，未登录也允许）
-- 注意：INSERT 时 user_id 必须等于 auth.uid() 或为 null
CREATE POLICY "users_insert_own_orders"
  ON public.auspicious_orders FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid()::text = user_id);

-- 用户只能更新自己的请奉（如取消）
CREATE POLICY "users_update_own_orders"
  ON public.auspicious_orders FOR UPDATE
  USING (auth.uid()::text = user_id);

-- 服务端（service_role）绕过 RLS，可读取所有记录用于管理

-- 5. 阿阇梨后台：补强 status 流转（已部署项目升级）
-- 老库 status 枚举是 ('pending', 'blessed', 'shipped', 'completed', 'cancelled')
-- 补一个 'blessing'（加持中）状态位，让阿阇梨可以分阶段标记订单
DO $$
BEGIN
  -- 重新声明 CHECK 约束以包含新状态位
  ALTER TABLE public.auspicious_orders
    DROP CONSTRAINT IF EXISTS auspicious_orders_status_check;
  ALTER TABLE public.auspicious_orders
    ADD CONSTRAINT auspicious_orders_status_check
    CHECK (status IN ('pending', 'blessing', 'blessed', 'shipped', 'completed', 'cancelled'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'status check constraint update skipped: %', SQLERRM;
END $$;

-- 6. 阿阇梨后台：补全管理员 SELECT 策略
-- 老库只有 "用户只能看自己的"，管理员需要查看全量
DROP POLICY IF EXISTS "acharya_select_all_orders" ON public.auspicious_orders;
CREATE POLICY "acharya_select_all_orders"
  ON public.auspicious_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()::text
        AND role IN ('acharya', 'admin')
    )
  );

-- 7. 阿阇梨后台：补全管理员 UPDATE 策略
-- 用户可以取消自己的订单；管理员可更新任何订单
DROP POLICY IF EXISTS "acharya_update_all_orders" ON public.auspicious_orders;
CREATE POLICY "acharya_update_all_orders"
  ON public.auspicious_orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()::text
        AND role IN ('acharya', 'admin')
    )
  );
