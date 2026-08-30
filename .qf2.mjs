import postgres from 'postgres';
import { writeFileSync } from 'node:fs';
const sql = postgres(process.env.DATABASE_URL,{max:1});
const rows = await sql`
  select slug, title, description, price_won, price_unit, promo_label,
         location_label, details, cover_image_url, gallery_image_urls
  from partner_listings
  where category='travel_package' and details->>'subType'='free'
  order by slug`;
const lc = await sql`
  select l.slug, c.locale, c.title, c.description
  from partner_listing_locale_content c
  join partner_listings l on l.id = c.listing_id
  where l.category='travel_package' and l.details->>'subType'='free'
  order by l.slug, c.locale`;
await sql.end();
writeFileSync('.qf2.txt', JSON.stringify({rows, localeRows: lc.length, lc: lc.slice(0,6)}, null, 1), 'utf8');
console.log('rows', rows.length, 'locale rows', lc.length);
