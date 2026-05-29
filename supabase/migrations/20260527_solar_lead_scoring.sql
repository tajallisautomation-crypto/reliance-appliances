-- Add notes + lead_score columns to solar_leads for the lead-scoring feature.
-- notes    → free-text from the calculator: "Lead:HOT | Mode:hybrid | Bill:PKR35000 | ..."
-- lead_score → computed enum: HOT / WARM / COOL (extracted from notes or set by admin)

alter table public.solar_leads
  add column if not exists notes      text,
  add column if not exists lead_score text check (lead_score in ('HOT', 'WARM', 'COOL'));

-- Back-fill lead_score from existing notes where notes contains "Lead:XXX"
update public.solar_leads
set lead_score =
  case
    when notes ilike '%Lead:HOT%'  then 'HOT'
    when notes ilike '%Lead:WARM%' then 'WARM'
    when notes ilike '%Lead:COOL%' then 'COOL'
    else null
  end
where notes is not null and lead_score is null;

create index if not exists solar_leads_score_idx on public.solar_leads(lead_score);
