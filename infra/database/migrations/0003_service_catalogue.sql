create table if not exists service_packs (
  id uuid primary key,
  code text not null unique,
  name text not null,
  discipline text not null,
  status text not null default 'ACTIVE',
  version text not null default '1.0',
  description text,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_skus (
  id uuid primary key,
  service_pack_id uuid not null references service_packs(id),
  code text not null unique,
  name text not null,
  status text not null default 'ACTIVE',
  pricing_model jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into service_packs (id, code, name, discipline, status, version, description, configuration)
values (
  '11111111-1111-4111-8111-111111111111',
  'VF-SP-001',
  'Formwork Engineering Preliminary Package',
  'temporary_works_engineering',
  'ACTIVE',
  '1.0',
  'MVP service pack for formwork intake, commercial proposal, project opening, evidence bundle, and invoice flow.',
  jsonb_build_object(
    'mvp_service', 'Formwork Design Support - Preliminary Wall/Slab Package',
    'required_inputs', jsonb_build_array('project_name','site_location','structure_type','formwork_element_type','height','length_or_area','concrete_grade','available_drawings'),
    'required_evidence', jsonb_build_array('intake_summary','basis_of_design','preliminary_calculation_note','qa_review_note')
  )
)
on conflict (code) do update set
  name = excluded.name,
  discipline = excluded.discipline,
  status = excluded.status,
  version = excluded.version,
  description = excluded.description,
  configuration = excluded.configuration,
  updated_at = now();

insert into service_skus (id, service_pack_id, code, name, status, pricing_model)
values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'formwork_preliminary_wall_slab',
  'Preliminary Wall/Slab Formwork Design Support',
  'ACTIVE',
  jsonb_build_object('currency','MYR','default_price',2500,'pricing_basis','fixed_mvp_demo')
)
on conflict (code) do update set
  service_pack_id = excluded.service_pack_id,
  name = excluded.name,
  status = excluded.status,
  pricing_model = excluded.pricing_model,
  updated_at = now();
