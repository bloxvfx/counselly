/**
 * scripts/seed-colleges.mjs
 *
 * Seeds the counselly_colleges table with:
 *   1. US colleges from the College Scorecard API (free, from api.data.ed.gov)
 *   2. International colleges from scripts/data/colleges-intl.json
 *
 * Usage:
 *   node scripts/seed-colleges.mjs
 *   node scripts/seed-colleges.mjs --intl-only   # skip College Scorecard fetch
 *   node scripts/seed-colleges.mjs --us-only      # skip intl JSON
 *
 * Env vars required (reads from .env):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// ── Load .env ──────────────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envFile = join(__dir, '..', '.env')
let env = {}
try {
  const raw = readFileSync(envFile, 'utf-8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    env[key] = value
  }
} catch {
  // fall back to process.env
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ── College Scorecard field mapping ──────────────────────────────────────────
const SCORECARD_FIELDS = [
  'id',
  'school.name',
  'school.city',
  'school.state',
  'school.ownership',                              // 1=public, 2=private nonprofit, 3=private for-profit
  'school.school_url',
  'school.under_investigation',
  'latest.student.size',                           // undergrad enrollment
  'latest.admissions.admission_rate.overall',
  'latest.admissions.act_scores.25th_percentile.cumulative',
  'latest.admissions.act_scores.75th_percentile.cumulative',
  'latest.admissions.sat_scores.25th_percentile.math',
  'latest.admissions.sat_scores.75th_percentile.math',
  'latest.admissions.sat_scores.25th_percentile.critical_reading',
  'latest.admissions.sat_scores.75th_percentile.critical_reading',
  'latest.cost.tuition.in_state',
  'latest.cost.tuition.out_of_state',
  'latest.cost.avg_net_price.public',
  'latest.cost.avg_net_price.private',
  'latest.admissions.test_requirements',           // 1=required, 2=recommended, 3=neither, 4=considered, 5=not considered
  'latest.programs.cip_4_digit',                   // programs offered
  'latest.school.carnegie_undergrad',
  'latest.school.carnegie_size_setting',
]

// Carnegie classification → college_type
function carnegieToType(carnegieUndergrad) {
  if (carnegieUndergrad == null) return 'research_university'
  if (carnegieUndergrad >= 14 && carnegieUndergrad <= 15) return 'liberal_arts'
  if (carnegieUndergrad >= 1 && carnegieUndergrad <= 5) return 'research_university'
  return 'research_university'
}

// Generate a URL-safe slug from a college name
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

// Top US colleges to fetch — filtered by QS rank / reputation for Indian students
// We use the College Scorecard API's search to get these by name substring or IPEDS ID
const PRIORITY_US_COLLEGES = [
  // Ivies
  'Harvard University',
  'Yale University',
  'Princeton University',
  'Columbia University in the City of New York',
  'University of Pennsylvania',
  'Brown University',
  'Dartmouth College',
  'Cornell University',
  // Top privates
  'Massachusetts Institute of Technology',
  'Stanford University',
  'California Institute of Technology',
  'University of Chicago',
  'Duke University',
  'Northwestern University',
  'Vanderbilt University',
  'Rice University',
  'Notre Dame',
  'Georgetown University',
  'Washington University in St Louis',
  'Emory University',
  'Carnegie Mellon University',
  'Tufts University',
  'Boston College',
  'Boston University',
  'Case Western Reserve University',
  'Tulane University',
  'Rensselaer Polytechnic Institute',
  'Northeastern University',
  'New York University',
  'University of Southern California',
  'George Washington University',
  'American University',
  'Fordham University',
  'Brandeis University',
  'Rochester',
  'Lehigh University',
  'Drexel University',
  'Stevens Institute of Technology',
  'Pepperdine University',
  'Santa Clara University',
  'University of San Francisco',
  // Top publics
  'University of California-Berkeley',
  'University of California-Los Angeles',
  'University of Michigan-Ann Arbor',
  'University of Virginia-Main Campus',
  'University of North Carolina at Chapel Hill',
  'University of California-San Diego',
  'University of California-Davis',
  'University of California-Santa Barbara',
  'University of California-Irvine',
  'University of California-Santa Cruz',
  'University of Wisconsin-Madison',
  'University of Illinois Urbana-Champaign',
  'University of Texas at Austin',
  'Georgia Institute of Technology-Main Campus',
  'Ohio State University-Main Campus',
  'Purdue University-Main Campus',
  'Pennsylvania State University-Main Campus',
  'University of Maryland-College Park',
  'University of Washington-Seattle Campus',
  'University of Minnesota-Twin Cities',
  'Michigan State University',
  'Indiana University-Bloomington',
  'University of Georgia',
  'University of Florida',
  'University of Pittsburgh-Pittsburgh Campus',
  'Rutgers University-New Brunswick',
  'University of Connecticut',
  'University of Massachusetts Amherst',
  'University of Colorado Boulder',
  'University of Oregon',
  'University of Arizona',
  'Arizona State University-Tempe',
  'Virginia Tech',
  'North Carolina State University at Raleigh',
  'University of Alabama',
  'Auburn University',
  'University of Miami',
  'Stony Brook University',
  'University at Buffalo',
  'University of Iowa',
  'Iowa State University',
  'Kansas State University',
  'University of Kansas',
  'University of Missouri-Columbia',
  'University of Nebraska-Lincoln',
  'Colorado State University-Fort Collins',
  'University of Utah',
  'Texas A & M University-College Station',
  'Florida State University',
  'University of Central Florida',
  'Florida International University',
  'San Jose State University',
  'University of California-Riverside',
  'University of California-Merced',
  'San Diego State University',
  'California State University-Long Beach',
  // Liberal Arts
  'Williams College',
  'Amherst College',
  'Swarthmore College',
  'Wellesley College',
  'Bowdoin College',
  'Pomona College',
  'Carleton College',
  'Middlebury College',
  'Vassar College',
  'Colgate University',
  'Hamilton College',
  'Wesleyan University',
  'Colby College',
  'Bates College',
  'Oberlin College',
  'Grinnell College',
  'Harvey Mudd College',
  'Claremont McKenna College',
  'Davidson College',
  'Smith College',
  'Mount Holyoke College',
  'Trinity College',
  'Connecticut College',
  'Franklin & Marshall College',
  'Denison University',
  'Dickinson College',
  'Union College',
]

// Top programs per CIP code (simplified mapping for common majors)
const CIP_TO_PROGRAM = {
  '11': 'Computer Science',
  '14': 'Engineering',
  '52': 'Business',
  '45': 'Social Sciences',
  '51': 'Health Sciences',
  '26': 'Biology',
  '40': 'Physical Sciences',
  '27': 'Mathematics',
  '42': 'Psychology',
  '23': 'English',
  '50': 'Visual & Performing Arts',
  '22': 'Law',
  '44': 'Public Policy',
  '19': 'Family Sciences',
  '43': 'Criminal Justice',
  '49': 'Transportation',
}

function extractPrograms(cipData) {
  if (!cipData || !Array.isArray(cipData)) return []
  const seen = new Set()
  const programs = []
  for (const cip of cipData) {
    const code = String(cip?.code ?? '').slice(0, 2)
    const prog = CIP_TO_PROGRAM[code]
    if (prog && !seen.has(prog)) {
      seen.add(prog)
      programs.push(prog)
    }
  }
  return programs.slice(0, 8)
}

function buildTags(row) {
  const tags = []
  const name = (row['school.name'] || '').toLowerCase()

  // Ivy League
  if (['harvard', 'yale', 'princeton', 'columbia', 'penn', 'brown', 'dartmouth', 'cornell'].some(n => name.includes(n))) {
    tags.push('ivy-league')
  }

  // Test optional
  const testReq = row['latest.admissions.test_requirements']
  if (testReq === 3 || testReq === 5) tags.push('test-optional')

  // Large vs small
  const size = row['latest.student.size']
  if (size > 20000) tags.push('large-university')
  else if (size < 3000) tags.push('small-campus')

  // Public/private
  const ownership = row['school.ownership']
  if (ownership === 1) tags.push('public-university')
  else if (ownership === 2) tags.push('private-university')

  // MIT / Caltech / Harvey Mudd = STEM-heavy
  if (['technology', 'institute of technology', 'polytechnic', 'engineering'].some(n => name.includes(n))) {
    tags.push('stem-heavy')
  }

  // Liberal arts (from Carnegie)
  const carnegie = row['latest.school.carnegie_undergrad']
  if (carnegie >= 14 && carnegie <= 15) tags.push('liberal-arts')

  return tags
}

async function fetchScorecardPage(query, page, perPage = 100) {
  const params = new URLSearchParams({
    school_name: query,
    _fields: SCORECARD_FIELDS.join(','),
    per_page: perPage,
    page,
    // Filters: degree-granting, not under investigation
    'school.degrees_awarded.predominant': '3', // bachelor's-dominant
  })

  const url = `https://api.data.ed.gov/v1/schools?${params}`
  const resp = await fetch(url)
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Scorecard API error ${resp.status}: ${text.slice(0, 200)}`)
  }
  return resp.json()
}

function mapScorecardRow(row) {
  const name = row['school.name']
  if (!name) return null

  const ownership = row['school.ownership']
  const control = ownership === 1 ? 'public' : ownership === 2 ? 'private' : 'private'

  const admRate = row['latest.admissions.admission_rate.overall']
  const acceptanceRate = admRate != null ? Math.round(admRate * 1000) / 10 : null

  const testReq = row['latest.admissions.test_requirements']
  const testOptional = testReq === 3 || testReq === 5

  const tuition = control === 'public'
    ? row['latest.cost.tuition.out_of_state']
    : row['latest.cost.tuition.out_of_state'] ?? row['latest.cost.tuition.in_state']

  const programs = extractPrograms(row['latest.programs.cip_4_digit'])
  const tags = buildTags(row)

  return {
    name,
    slug: slugify(name),
    country: 'USA',
    state_province: row['school.state'] ?? null,
    city: row['school.city'] ?? null,
    college_type: carnegieToType(row['latest.school.carnegie_undergrad']),
    control,
    acceptance_rate: acceptanceRate,
    test_optional: testOptional,
    avg_sat_math_25: row['latest.admissions.sat_scores.25th_percentile.math'] ?? null,
    avg_sat_math_75: row['latest.admissions.sat_scores.75th_percentile.math'] ?? null,
    avg_sat_read_25: row['latest.admissions.sat_scores.25th_percentile.critical_reading'] ?? null,
    avg_sat_read_75: row['latest.admissions.sat_scores.75th_percentile.critical_reading'] ?? null,
    avg_act_25: row['latest.admissions.act_scores.25th_percentile.cumulative'] ?? null,
    avg_act_75: row['latest.admissions.act_scores.75th_percentile.cumulative'] ?? null,
    undergrad_enrollment: row['latest.student.size'] ?? null,
    annual_tuition_usd: tuition ?? null,
    intl_financial_aid: false, // most US privates give some; we default false and update manually
    strong_programs: programs,
    tags,
    website_url: row['school.school_url'] ? `https://${row['school.school_url']}` : null,
    application_portal: 'common_app',
    scorecard_id: String(row['id'] ?? ''),
    data_sources: ['college_scorecard'],
  }
}

function buildPriorityUSColleges() {
  /** @type {Record<string, Partial<{ qs_rank: number, acceptance_rate: number, state: string, city: string, control: string, strong_programs: string[], tags: string[], intl_financial_aid: boolean, tuition: number }>>} */
  const meta = {
    'Massachusetts Institute of Technology': { qs_rank: 1, acceptance_rate: 4.8, state: 'MA', city: 'Cambridge', control: 'private', strong_programs: ['Computer Science', 'Engineering', 'Physics'], tags: ['stem-heavy', 'elite'] },
    'Stanford University': { qs_rank: 3, acceptance_rate: 4.3, state: 'CA', city: 'Stanford', control: 'private', strong_programs: ['Computer Science', 'Engineering', 'Business'], tags: ['elite', 'silicon-valley'] },
    'Harvard University': { qs_rank: 4, acceptance_rate: 3.4, state: 'MA', city: 'Cambridge', control: 'private', tags: ['ivy-league', 'elite'] },
    'University of California-Berkeley': { qs_rank: 10, acceptance_rate: 11.4, state: 'CA', city: 'Berkeley', control: 'public', strong_programs: ['Computer Science', 'Engineering', 'Business'], tags: ['public-university', 'elite'] },
    'University of California-Los Angeles': { qs_rank: 18, acceptance_rate: 8.6, state: 'CA', city: 'Los Angeles', control: 'public', tags: ['public-university', 'elite'] },
    'Carnegie Mellon University': { qs_rank: 24, acceptance_rate: 11.0, state: 'PA', city: 'Pittsburgh', control: 'private', strong_programs: ['Computer Science', 'Engineering', 'Business'], tags: ['stem-heavy', 'elite'] },
    'Georgia Institute of Technology-Main Campus': { qs_rank: 33, acceptance_rate: 17.0, state: 'GA', city: 'Atlanta', control: 'public', strong_programs: ['Computer Science', 'Engineering'], tags: ['stem-heavy', 'public-university'] },
    'University of Illinois Urbana-Champaign': { qs_rank: 64, acceptance_rate: 44.0, state: 'IL', city: 'Champaign', control: 'public', strong_programs: ['Computer Science', 'Engineering', 'Business'], tags: ['public-university'] },
    'University of Washington-Seattle Campus': { qs_rank: 63, acceptance_rate: 42.0, state: 'WA', city: 'Seattle', control: 'public', strong_programs: ['Computer Science', 'Engineering'], tags: ['public-university'] },
    'University of Texas at Austin': { qs_rank: 58, acceptance_rate: 31.0, state: 'TX', city: 'Austin', control: 'public', strong_programs: ['Computer Science', 'Engineering', 'Business'], tags: ['public-university'] },
    'Purdue University-Main Campus': { qs_rank: 89, acceptance_rate: 53.0, state: 'IN', city: 'West Lafayette', control: 'public', strong_programs: ['Computer Science', 'Engineering'], tags: ['stem-heavy', 'public-university'] },
    'Northeastern University': { qs_rank: 388, acceptance_rate: 7.0, state: 'MA', city: 'Boston', control: 'private', strong_programs: ['Computer Science', 'Business', 'Engineering'], tags: ['co-op'] },
    'New York University': { qs_rank: 38, acceptance_rate: 13.0, state: 'NY', city: 'New York', control: 'private', strong_programs: ['Business', 'Computer Science', 'Economics'], tags: ['urban'] },
    'University of Maryland-College Park': { qs_rank: 136, acceptance_rate: 44.0, state: 'MD', city: 'College Park', control: 'public', strong_programs: ['Computer Science', 'Engineering'], tags: ['public-university'] },
    'Rochester Institute of Technology': { qs_rank: 801, acceptance_rate: 66.0, state: 'NY', city: 'Rochester', control: 'private', strong_programs: ['Computer Science', 'Engineering'], tags: ['stem-heavy'] },
    'Arizona State University-Tempe': { qs_rank: 173, acceptance_rate: 88.0, state: 'AZ', city: 'Tempe', control: 'public', strong_programs: ['Computer Science', 'Business', 'Engineering'], tags: ['public-university'] },
    'University of Central Florida': { qs_rank: 851, acceptance_rate: 36.0, state: 'FL', city: 'Orlando', control: 'public', strong_programs: ['Computer Science', 'Engineering'], tags: ['public-university'] },
    'University of Massachusetts Amherst': { qs_rank: 245, acceptance_rate: 58.0, state: 'MA', city: 'Amherst', control: 'public', strong_programs: ['Computer Science', 'Engineering'], tags: ['public-university'] },
    'Iowa State University': { qs_rank: 501, acceptance_rate: 90.0, state: 'IA', city: 'Ames', control: 'public', strong_programs: ['Computer Science', 'Engineering'], tags: ['public-university'] },
    'University of Southern California': { qs_rank: 116, acceptance_rate: 12.0, state: 'CA', city: 'Los Angeles', control: 'private', strong_programs: ['Computer Science', 'Business', 'Engineering'], tags: ['elite'] },
  }

  return PRIORITY_US_COLLEGES.map((name) => {
    const info = meta[name] ?? {}
    const isPublic = info.control === 'public' || (name.includes('University of') && info.control !== 'private')
    return {
      name,
      slug: slugify(name),
      country: 'USA',
      city: info.city ?? null,
      state_province: info.state ?? null,
      college_type: 'research_university',
      control: info.control ?? (isPublic ? 'public' : 'private'),
      qs_rank: info.qs_rank ?? null,
      qs_rank_year: info.qs_rank ? 2025 : null,
      acceptance_rate: info.acceptance_rate ?? null,
      annual_tuition_usd: info.tuition ?? (isPublic ? 42000 : 62000),
      intl_financial_aid: info.intl_financial_aid ?? false,
      test_optional: false,
      strong_programs: info.strong_programs ?? ['Computer Science', 'Engineering', 'Business'],
      tags: info.tags ?? ['priority-us'],
      website_url: null,
      application_portal: 'common_app',
      data_sources: ['manual', 'priority_seed'],
    }
  })
}

async function fetchUSColleges() {
  console.log('Fetching US colleges from College Scorecard API...')
  const results = []
  const seen = new Set()

  // Fetch in batches by name keyword
  const batches = [
    'university',
    'college',
    'institute of technology',
    'polytechnic',
  ]

  for (const query of batches) {
    let page = 0
    let hasMore = true

    while (hasMore) {
      try {
        const data = await fetchScorecardPage(query, page, 100)
        const rows = data?.results ?? []
        console.log(`  "${query}" page ${page}: ${rows.length} results`)

        for (const row of rows) {
          const mapped = mapScorecardRow(row)
          if (!mapped) continue
          if (seen.has(mapped.slug)) continue

          // Filter: only include colleges with some enrollment data and not for-profit
          const ownership = row['school.ownership']
          if (ownership === 3) continue // skip for-profit
          if (!row['latest.student.size'] || row['latest.student.size'] < 500) continue

          seen.add(mapped.slug)
          results.push(mapped)
        }

        hasMore = rows.length === 100
        page++

        // Rate limit
        await new Promise(r => setTimeout(r, 300))
      } catch (err) {
        console.warn(`  Warning: ${err.message}`)
        hasMore = false
      }
    }
  }

  console.log(`  Fetched ${results.length} US colleges from Scorecard`)
  return results
}

async function upsertColleges(colleges) {
  const BATCH = 50
  let inserted = 0
  let errors = 0

  for (let i = 0; i < colleges.length; i += BATCH) {
    const batch = colleges.slice(i, i + BATCH)

    const { error } = await supabase
      .from('counselly_colleges')
      .upsert(batch, {
        onConflict: 'slug',
        ignoreDuplicates: false,
      })

    if (error) {
      console.error(`  Batch ${i / BATCH + 1} error:`, error.message)
      errors += batch.length
    } else {
      inserted += batch.length
      process.stdout.write(`\r  Upserted ${inserted}/${colleges.length} colleges...`)
    }
  }

  console.log(`\n  Done: ${inserted} upserted, ${errors} errors`)
}

async function main() {
  const args = process.argv.slice(2)
  const intlOnly = args.includes('--intl-only')
  const usOnly = args.includes('--us-only')

  console.log('=== Counselly College Database Seeder ===\n')

  const allColleges = []

  // ── 1. International colleges from JSON ──────────────────────────────────
  if (!usOnly) {
    const intlPath = join(__dir, 'data', 'colleges-intl.json')
    const intlData = JSON.parse(readFileSync(intlPath, 'utf-8'))
    console.log(`Loaded ${intlData.length} international colleges from colleges-intl.json`)
    allColleges.push(...intlData)

    const indiaPath = join(__dir, 'data', 'colleges-india.json')
    const indiaData = JSON.parse(readFileSync(indiaPath, 'utf-8'))
    console.log(`Loaded ${indiaData.length} Indian colleges from colleges-india.json`)
    allColleges.push(...indiaData)
  }

  // ── 2. US colleges — curated priority list + College Scorecard API ───────
  if (!intlOnly) {
    const priority = buildPriorityUSColleges()
    console.log(`Loaded ${priority.length} priority US colleges (curated seed)`)
    allColleges.push(...priority)

    const usColleges = await fetchUSColleges()
    const existingSlugs = new Set(allColleges.map((c) => c.slug))
    for (const college of usColleges) {
      if (!existingSlugs.has(college.slug)) {
        allColleges.push(college)
        existingSlugs.add(college.slug)
      }
    }
  }

  console.log(`\nTotal colleges to upsert: ${allColleges.length}`)

  // ── 3. Upsert into Supabase ───────────────────────────────────────────────
  await upsertColleges(allColleges)

  // ── 4. Verify ─────────────────────────────────────────────────────────────
  const { count } = await supabase
    .from('counselly_colleges')
    .select('*', { count: 'exact', head: true })

  console.log(`\n✓ counselly_colleges now has ${count} rows`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
