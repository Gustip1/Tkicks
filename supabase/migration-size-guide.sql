-- ================================================================
-- Guía de talles (octubre 2026)
-- Ejecutar en Supabase → SQL Editor. Se puede correr más de una vez.
--
-- 1. Agrega products.size_guide (jsonb): { "rows": [ { "size": "L",
--    "largo": 69, "ancho": 52 } ] } — medidas de la prenda en cm.
-- 2. Pasa a la guía las medidas que estaban escritas en la descripción
--    de 34 productos y las saca de la descripción (las notas de calce,
--    como "Oversized Fit", quedan).
--    Cada UPDATE solo corre si el producto todavía no tiene guía y si la
--    descripción sigue exactamente igual que cuando se generó este archivo:
--    si la editaste después, ese producto queda como está.
-- ================================================================

alter table public.products add column if not exists size_guide jsonb;

comment on column public.products.size_guide is
  'Guía de talles: { rows: [{ size, largo, ancho }] }, medidas de la prenda en cm. Se edita en /admin/productos.';

-- vale-forever-classico-zip-hoodie-black: XL 62x68
update public.products
   set size_guide = $g${"rows": [{"size": "XL", "largo": 62, "ancho": 68}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '4f421365-dd4d-4317-8483-84f5ff7c78b6'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho
62 cm x 68 cm $d$;

-- nude-project-seoul-hoodie: XL 71x66
update public.products
   set size_guide = $g${"rows": [{"size": "XL", "largo": 71, "ancho": 66}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.
TTS corte estilo Oversized ir al talle$d$
 where id = 'aad37d89-1cf1-4bc3-8b90-939b6be5f4bb'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
TTS corte estilo Oversized ir al talle
Medidas Largo x Ancho
71 cm x 66 cm $d$;

-- scuffers-icon-navy-t-shirt-envio-next-week: XL 64x61
update public.products
   set size_guide = $g${"rows": [{"size": "XL", "largo": 64, "ancho": 61}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '930c5005-a7fd-4dde-8566-d4ace8fde2bb'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho
64 cm x 61 cm $d$;

-- kith-lax-black-tee: L 69x52
update public.products
   set size_guide = $g${"rows": [{"size": "L", "largo": 69, "ancho": 52}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = 'dd6e5c52-f073-43ad-a35f-9a6f106bd0f7'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho 
69 cm x 52 cm $d$;

-- off-white-skate-crewneck-hoodie: XL 75x67
update public.products
   set size_guide = $g${"rows": [{"size": "XL", "largo": 75, "ancho": 67}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.
Oversized Fit$d$
 where id = '1b41b085-9b31-4099-b239-7ffd168aa140'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Oversized Fit
Medidas Largo x Ancho 
75 cm x 67 cm $d$;

-- supreme-rigid-loose-fit-selvedge-jean-rigid-indigo: 34 110x46
update public.products
   set size_guide = $g${"rows": [{"size": "34", "largo": 110, "ancho": 46}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = 'fd640daa-0867-45ab-b6b6-2309ce14b700'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Ancho 46 cm largo: 110 cm$d$;

-- essentials-fear-of-god-sea-foam-hoodie: XL 74x68
update public.products
   set size_guide = $g${"rows": [{"size": "XL", "largo": 74, "ancho": 68}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '0ba8a258-fb96-476c-a65f-d32c97abc331'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho
74 cm x 68 cm $d$;

-- supreme-a-presse-tee-black: L 70x52
update public.products
   set size_guide = $g${"rows": [{"size": "L", "largo": 70, "ancho": 52}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '25bd3108-e025-4019-b0c4-804320660094'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho 
70 cm x 52 cm $d$;

-- essentials-dark-oatmeal-tee: L 78x58
update public.products
   set size_guide = $g${"rows": [{"size": "L", "largo": 78, "ancho": 58}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '59d9b852-67c1-46ec-8e14-5b6c90ae21e5'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho
78 cm x 58 cm$d$;

-- emestudios-brick-night-sky-knit-sweater: L 65x73
update public.products
   set size_guide = $g${"rows": [{"size": "L", "largo": 65, "ancho": 73}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '1dfadbdc-4f75-41ce-921d-7d5971c93896'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x ancho 
65 cm x 73 cm $d$;

-- scuffers-icon-white-t-shirt: XL 64x62
update public.products
   set size_guide = $g${"rows": [{"size": "XL", "largo": 64, "ancho": 62}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '838fb6fc-9bfc-4e2e-bf02-d702871ab28a'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho
64 cm x 62 cm $d$;

-- scuffers-bw-canale-scff-tank-top-pack: S 56x36
update public.products
   set size_guide = $g${"rows": [{"size": "S", "largo": 56, "ancho": 36}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.
PRECIO INDIVIDUAL
DISPONIBILIDAD: 2 BLANCAS 2 NEGRAS$d$
 where id = '953cf053-c9a1-44fa-b3f2-f691d110119e'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
PRECIO INDIVIDUAL 
DISPONIBILIDAD: 2 BLANCAS 2 NEGRAS
Medidas Largo x Ancho
56 cm x 36 cm $d$;

-- essentials-strech-limo-tee: L 71x56
update public.products
   set size_guide = $g${"rows": [{"size": "L", "largo": 71, "ancho": 56}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '7bfbdc84-fad6-4479-bb50-3e93fa2da871'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho
71 cm x 56 cm $d$;

-- mixed-emotion-pink-end-hoodie: XL FIT L 64x62
update public.products
   set size_guide = $g${"rows": [{"size": "XL FIT L", "largo": 64, "ancho": 62}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '47547e18-f6ec-4aad-88b1-c62bdc3e7b10'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho
64 cm x 62 cm $d$;

-- emestudios-dupla-off-sand-long-sleeve: S 60x53
update public.products
   set size_guide = $g${"rows": [{"size": "S", "largo": 60, "ancho": 53}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = 'dcc83707-013e-4a5b-9683-716d53a79c94'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho
60 cm x 53 cm $d$;

-- emestudios-uniform-mist-oversized-crewneck: M 62x68
update public.products
   set size_guide = $g${"rows": [{"size": "M", "largo": 62, "ancho": 68}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '0b0691b5-9a6e-4d80-bcd7-002ba60363b0'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x ancho
62 cm x 68 cm$d$;

-- emestudios-master-grey-knit-sweater: S 58x60, XL 72x75
update public.products
   set size_guide = $g${"rows": [{"size": "S", "largo": 58, "ancho": 60}, {"size": "XL", "largo": 72, "ancho": 75}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '79b96054-86fa-49e4-9c5e-c2cc49545132'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x ancho 
Talle S: 58 cm x 60 cm
Talle XL: 72 cm x 75 cm $d$;

-- essentials-bright-tee-white: M FIT L 71x60
update public.products
   set size_guide = $g${"rows": [{"size": "M FIT L", "largo": 71, "ancho": 60}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = 'dd2e8b45-21ec-4cac-9c45-88dec70bdc86'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho
71 cm x 60 cm $d$;

-- supreme-2026fw-sith-l-white-star-wars: XL 81x54
update public.products
   set size_guide = $g${"rows": [{"size": "XL", "largo": 81, "ancho": 54}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '1689bba0-510f-41f9-8ef7-e8ac3a0adcba'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho 
81 cm x 54 cm $d$;

-- kith-lax-tee: L 69x52
update public.products
   set size_guide = $g${"rows": [{"size": "L", "largo": 69, "ancho": 52}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = 'f5d29260-deb2-4fc9-ad6a-57d6e567515d'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho 
69 cm x 52 cm $d$;

-- supreme-larry-clark-gun-tee-white: XL 81x56
update public.products
   set size_guide = $g${"rows": [{"size": "XL", "largo": 81, "ancho": 56}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = 'ab2dd45a-2c21-46c6-abb5-00d98929338d'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho
81 cm x 56 cm $d$;

-- scuffers-new-age-black-t-shirt-envio-next-week: L 64x60
update public.products
   set size_guide = $g${"rows": [{"size": "L", "largo": 64, "ancho": 60}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = 'a10147e0-7f04-496e-9084-2d8cb8163373'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho 
64 cm x 60 cm$d$;

-- supreme-2026fw-sith-l-grey-star-wars: L 76x51
update public.products
   set size_guide = $g${"rows": [{"size": "L", "largo": 76, "ancho": 51}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '9f6abc42-e5fe-40d5-bda9-a1654466a36c'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho 
76 cm x 51 cm $d$;

-- vale-forever-valley-chain-rhinstone-hoodie-black: XL 64x72
update public.products
   set size_guide = $g${"rows": [{"size": "XL", "largo": 64, "ancho": 72}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = 'ed7ecde1-4cbd-4750-9468-f1ba8a31f7c3'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho
64 cm x 72 cm $d$;

-- off-white-diags-skate-tee: XL 74.5x56
update public.products
   set size_guide = $g${"rows": [{"size": "XL", "largo": 74.5, "ancho": 56}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.
FIT OVERSIZED mangas mas caidas$d$
 where id = 'ceaf2cfd-47a5-4c58-b5f9-e1508af9fdc6'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
FIT OVERSIZED mangas mas caidas
Medidas Largo x Ancho 
74.5 cm x 56 cm $d$;

-- off-white-outline-skate-graphic-tee: L 72x56
update public.products
   set size_guide = $g${"rows": [{"size": "L", "largo": 72, "ancho": 56}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.
FIT OVERSIZED$d$
 where id = 'bc2198c5-fdd3-4f91-bb2a-36106b6e8c34'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
FIT OVERSIZED
Medidas Largo x ancho
72 cm x 56 cm $d$;

-- nude-project-cherry-tee: L 67x60
update public.products
   set size_guide = $g${"rows": [{"size": "L", "largo": 67, "ancho": 60}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '673ed3c9-2847-464b-b016-1454f4f4b1ba'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho
67 cm x 60 cm $d$;

-- emestudios-nela-grey-knit-sweater: L 68x63
update public.products
   set size_guide = $g${"rows": [{"size": "L", "largo": 68, "ancho": 63}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = 'a72ad647-eeab-4121-9488-407831be7dbb'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x ancho 
68 cm x 63 cm $d$;

-- essentials-strech-limo-shorts: L 48x44
update public.products
   set size_guide = $g${"rows": [{"size": "L", "largo": 48, "ancho": 44}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '6216f61c-6db8-4750-9a30-75685dee2ba6'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho
48 cm x 44 cm $d$;

-- off-white-outline-skate-graphic-tee-2: M 70x53
update public.products
   set size_guide = $g${"rows": [{"size": "M", "largo": 70, "ancho": 53}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.
FIT OVERSIZED$d$
 where id = 'b11f01e8-8158-4f78-8af9-2aaa36a9ebff'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
FIT OVERSIZED
Medidas Largo x ancho 
70 cm x 53 cm $d$;

-- scuffers-effortless-green-t-shirt-envio-next-week: XXL 65x63
update public.products
   set size_guide = $g${"rows": [{"size": "XXL", "largo": 65, "ancho": 63}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '3c76a67a-b76c-4d8d-b32f-944398d38d91'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho
65 cm x 63 cm $d$;

-- alo-accolade-1-4-zip-black: XL 72x68
update public.products
   set size_guide = $g${"rows": [{"size": "XL", "largo": 72, "ancho": 68}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '8d13b527-e837-4031-8b38-266e2132357b'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho
72 cm x 68 cm$d$;

-- scuffers-martine-black-knit-envio-next-week: M 57x69
update public.products
   set size_guide = $g${"rows": [{"size": "M", "largo": 57, "ancho": 69}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.
Fit hombros caidos$d$
 where id = 'fda0ae6b-b434-45bb-92df-2ba1883604d0'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Anco
57 cm x 69 cm 
Fit hombros caidos $d$;

-- nude-project-knit-navy-polo: XL 72x57
update public.products
   set size_guide = $g${"rows": [{"size": "XL", "largo": 72, "ancho": 57}]}$g$::jsonb,
       description = $d$Todos nuestros productos son 100% originales.$d$
 where id = '035ad497-07a0-4f79-9d7c-4a11033cf32a'
   and size_guide is null
   and description = $d$Todos nuestros productos son 100% originales.
Medidas Largo x Ancho
72 cm x 57 cm$d$;
