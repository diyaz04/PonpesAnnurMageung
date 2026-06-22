insert into public.lp_konten (entitas, section, key, value)
values
  (
    'pesantren',
    'hero',
    'logo_url',
    'https://lh3.googleusercontent.com/d/1GdV6eAN5azpBBox0c6WZVij_zWQPb6aG'
  ),
  (
    'smp',
    'hero',
    'logo_url',
    'https://lh3.googleusercontent.com/d/1sXfNq3zEpIp5sKGSNbgPz6rYB0b0RZZi'
  )
on conflict (entitas, section, key)
do update set value = excluded.value;
