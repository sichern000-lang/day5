-- 제주 특산물 쇼핑몰 스키마
-- Supabase Dashboard > SQL Editor 에 전체를 붙여넣고 Run 하세요. (여러 번 실행해도 안전)

-- ───────────── 1. 회원 프로필 ─────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '제주손님',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── 2. 상품 ─────────────
create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null unique,
  description text not null default '',
  category text not null default '과일',
  emoji text not null default '🍊',
  unit text not null default '1박스',
  price integer not null check (price >= 0),   -- 단가(원)
  stock integer not null default 100 check (stock >= 0),
  created_at timestamptz not null default now()
);

-- ───────────── 3. 장바구니 (total_price = quantity × unit_price 를 트리거가 자동 계산) ─────────────
create table if not exists public.cart_items (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unit_price integer not null default 0,
  total_price integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create or replace function public.set_cart_price()
returns trigger language plpgsql as $$
begin
  select price into new.unit_price from public.products where id = new.product_id;
  new.total_price := new.quantity * new.unit_price;
  return new;
end $$;

drop trigger if exists cart_items_set_price on public.cart_items;
create trigger cart_items_set_price
  before insert or update of quantity, product_id on public.cart_items
  for each row execute function public.set_cart_price();

-- ───────────── 4. 주문 / 주문상세 ─────────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  total_price integer not null default 0,
  status text not null default 'paid' check (status in ('paid', 'returned')),
  created_at timestamptz not null default now(),
  returned_at timestamptz
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id bigint not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price integer not null,
  total_price integer not null              -- quantity × unit_price
);

-- ───────────── 5. 방명록 ─────────────
create table if not exists public.guestbook (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

-- ───────────── 6. 후기 / 후기 댓글 / 좋아요 ─────────────
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  rating integer not null default 5 check (rating between 1 and 5),
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.review_comments (
  id bigint generated always as identity primary key,
  review_id bigint not null references public.reviews(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.product_likes (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.review_likes (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  review_id bigint not null references public.reviews(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, review_id)
);

-- ───────────── 7. RPC 함수 (장바구니 담기 / 결제 / 바로구매 / 반환) ─────────────
create or replace function public.add_to_cart(p_product_id bigint, p_qty integer)
returns void language plpgsql as $$   -- security invoker: RLS 적용
declare v_stock integer; v_now integer;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  if p_qty < 1 then raise exception '수량은 1개 이상이어야 합니다'; end if;
  select stock into v_stock from public.products where id = p_product_id;
  select coalesce(sum(quantity), 0) into v_now from public.cart_items
    where user_id = auth.uid() and product_id = p_product_id;
  if v_now + p_qty > v_stock then raise exception '재고가 부족합니다 (재고 %개)', v_stock; end if;
  insert into public.cart_items (product_id, quantity) values (p_product_id, p_qty)
  on conflict (user_id, product_id)
  do update set quantity = public.cart_items.quantity + excluded.quantity;
end $$;

create or replace function public.checkout()
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_order uuid; r record;
begin
  if v_uid is null then raise exception '로그인이 필요합니다'; end if;
  if not exists (select 1 from cart_items where user_id = v_uid) then
    raise exception '장바구니가 비어 있습니다';
  end if;
  insert into orders (user_id) values (v_uid) returning id into v_order;
  for r in
    select c.product_id, c.quantity, p.price, p.stock, p.name
    from cart_items c join products p on p.id = c.product_id
    where c.user_id = v_uid for update of p
  loop
    if r.stock < r.quantity then raise exception '% 재고가 부족합니다', r.name; end if;
    update products set stock = stock - r.quantity where id = r.product_id;
    insert into order_items (order_id, product_id, quantity, unit_price, total_price)
    values (v_order, r.product_id, r.quantity, r.price, r.quantity * r.price);
  end loop;
  update orders set total_price = (select sum(total_price) from order_items where order_id = v_order)
  where id = v_order;
  delete from cart_items where user_id = v_uid;
  return v_order;
end $$;

create or replace function public.buy_now(p_product_id bigint, p_qty integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_order uuid; v_price integer; v_stock integer; v_name text;
begin
  if v_uid is null then raise exception '로그인이 필요합니다'; end if;
  if p_qty < 1 then raise exception '수량은 1개 이상이어야 합니다'; end if;
  select price, stock, name into v_price, v_stock, v_name from products where id = p_product_id for update;
  if v_stock < p_qty then raise exception '% 재고가 부족합니다', v_name; end if;
  update products set stock = stock - p_qty where id = p_product_id;
  insert into orders (user_id, total_price) values (v_uid, p_qty * v_price) returning id into v_order;
  insert into order_items (order_id, product_id, quantity, unit_price, total_price)
  values (v_order, p_product_id, p_qty, v_price, p_qty * v_price);
  return v_order;
end $$;

create or replace function public.return_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_status text;
begin
  select status into v_status from orders where id = p_order_id and user_id = v_uid for update;
  if v_status is null then raise exception '주문을 찾을 수 없습니다'; end if;
  if v_status = 'returned' then raise exception '이미 반환된 주문입니다'; end if;
  update products p set stock = p.stock + oi.quantity
  from order_items oi where oi.order_id = p_order_id and oi.product_id = p.id;
  update orders set status = 'returned', returned_at = now() where id = p_order_id;
end $$;

revoke execute on function public.add_to_cart(bigint, integer) from public, anon;
revoke execute on function public.checkout() from public, anon;
revoke execute on function public.buy_now(bigint, integer) from public, anon;
revoke execute on function public.return_order(uuid) from public, anon;
grant execute on function public.add_to_cart(bigint, integer) to authenticated;
grant execute on function public.checkout() to authenticated;
grant execute on function public.buy_now(bigint, integer) to authenticated;
grant execute on function public.return_order(uuid) to authenticated;

-- ───────────── 8. RLS (행 단위 보안) ─────────────
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.guestbook enable row level security;
alter table public.reviews enable row level security;
alter table public.review_comments enable row level security;
alter table public.product_likes enable row level security;
alter table public.review_likes enable row level security;

drop policy if exists "profiles_read" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_read" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "products_read" on public.products;
create policy "products_read" on public.products for select using (true);

drop policy if exists "cart_own" on public.cart_items;
create policy "cart_own" on public.cart_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "orders_read_own" on public.orders;
create policy "orders_read_own" on public.orders for select using (auth.uid() = user_id);

drop policy if exists "order_items_read_own" on public.order_items;
create policy "order_items_read_own" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- 방명록 / 후기 / 댓글: 누구나 읽기, 작성·수정·삭제는 본인만
do $$
declare t text;
begin
  foreach t in array array['guestbook', 'reviews', 'review_comments'] loop
    execute format('drop policy if exists "%1$s_read" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_update" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_delete" on public.%1$s', t);
    execute format('create policy "%1$s_read" on public.%1$s for select using (true)', t);
    execute format('create policy "%1$s_insert" on public.%1$s for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "%1$s_update" on public.%1$s for update using (auth.uid() = user_id)', t);
    execute format('create policy "%1$s_delete" on public.%1$s for delete using (auth.uid() = user_id)', t);
  end loop;
  foreach t in array array['product_likes', 'review_likes'] loop
    execute format('drop policy if exists "%1$s_read" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_delete" on public.%1$s', t);
    execute format('create policy "%1$s_read" on public.%1$s for select using (true)', t);
    execute format('create policy "%1$s_insert" on public.%1$s for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "%1$s_delete" on public.%1$s for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- ───────────── 9. 상품 시드 (임의 시세 반영 가격, 원) ─────────────
insert into public.products (name, description, category, emoji, unit, price, stock) values
  ('노지 감귤',        '당도 높은 제주 노지 감귤. 새콤달콤 한 입에 쏙.',            '과일', '🍊', '5kg 1박스',  15000, 200),
  ('한라봉',           '향 진하고 과즙 가득한 제주 대표 만감류.',                    '과일', '🟠', '3kg 1박스',  25000, 150),
  ('천혜향',           '껍질이 얇고 달콤한 천혜향. 선물용으로 인기.',                '과일', '🍑', '3kg 1박스',  28000, 120),
  ('레드향',           '붉은빛 껍질에 알알이 터지는 과육.',                          '과일', '🔴', '3kg 1박스',  27000, 120),
  ('흑돼지 오겹살',    '쫀득한 육질의 제주 흑돼지 오겹살.',                          '정육', '🐖', '600g',       32000,  80),
  ('은갈치',           '은빛 윤기가 흐르는 제주 은갈치. 조림·구이용.',               '수산', '🐟', '2마리(600g)',45000,  60),
  ('옥돔',             '담백한 제주 옥돔 반건조. 구이용.',                           '수산', '🐠', '2마리',      38000,  60),
  ('전복',             '청정 제주 바다에서 키운 활전복.',                            '수산', '🐚', '1kg(10~12미)',55000, 50),
  ('오메기떡',         '찰진 제주 전통 떡. 팥고물이 듬뿍.',                          '간식', '🍡', '10개입',     18000, 100),
  ('제주 녹차 티백',   '제주 햇차로 만든 향긋한 녹차 티백.',                         '차',   '🍵', '20개입',     12000, 150)
on conflict (name) do nothing;
