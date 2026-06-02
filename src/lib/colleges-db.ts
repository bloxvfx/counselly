/**
 * College database query helpers.
 * counselly_colleges has public SELECT RLS — service role preferred, anon key fallback.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSupabaseEnv } from '@/lib/supabase/env'

function getCollegesDbClient(): SupabaseClient | null {
  const admin = createAdminClient()
  if (admin) return admin

  const env = getSupabaseEnv()
  if (!env) return null

  return createClient(env.url, env.key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type CollegeRow = {
  id: string
  name: string
  slug: string
  country: string
  state_province: string | null
  city: string | null
  college_type: string | null
  control: string | null
  qs_rank: number | null
  qs_rank_year: number | null
  us_news_rank: number | null
  acceptance_rate: number | null
  test_optional: boolean
  avg_sat_math_25: number | null
  avg_sat_math_75: number | null
  avg_sat_read_25: number | null
  avg_sat_read_75: number | null
  avg_act_25: number | null
  avg_act_75: number | null
  avg_gpa: number | null
  undergrad_enrollment: number | null
  total_enrollment: number | null
  annual_tuition_usd: number | null
  annual_cost_usd: number | null
  intl_financial_aid: boolean
  avg_intl_aid_usd: number | null
  strong_programs: string[]
  tags: string[]
  website_url: string | null
  application_portal: string | null
  early_deadline: string | null
  regular_deadline: string | null
  description: string | null
  notable_facts: string[]
  scorecard_id: string | null
  data_sources: string[]
  last_updated: string | null
}

export type SearchCollegesParams = {
  q?: string                        // name search (partial, case-insensitive)
  country?: string | string[]       // filter by country or countries
  college_type?: string | string[]  // 'research_university' | 'liberal_arts' | 'technical'
  programs?: string[]               // must contain at least one of these programs
  tags?: string[]                   // must contain at least one of these tags
  max_acceptance_rate?: number      // e.g. 20 means ≤ 20%
  min_acceptance_rate?: number
  intl_financial_aid?: boolean
  test_optional?: boolean
  max_qs_rank?: number
  page?: number
  limit?: number
}

export type SearchCollegesResult = {
  data: CollegeRow[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

const DEFAULT_LIMIT = 24

export async function searchColleges(params: SearchCollegesParams): Promise<SearchCollegesResult> {
  const db = getCollegesDbClient()
  if (!db) throw new Error('College database not available')

  const limit = Math.min(params.limit ?? DEFAULT_LIMIT, 100)
  const page = params.page ?? 0
  const offset = page * limit

  let query = db
    .from('counselly_colleges')
    .select('*', { count: 'exact' })

  // Name search — full-text search using PostgreSQL's to_tsvector
  if (params.q && params.q.trim()) {
    const q = params.q.trim()
    // Use ilike for partial name matching (simpler and works for typeahead)
    query = query.ilike('name', `%${q}%`)
  }

  // Country filter
  if (params.country) {
    const countries = (Array.isArray(params.country) ? params.country : [params.country]).map(
      mapCountryToDb,
    )
    if (countries.length === 1) {
      query = query.eq('country', countries[0])
    } else {
      query = query.in('country', countries)
    }
  }

  // College type filter
  if (params.college_type) {
    const types = Array.isArray(params.college_type) ? params.college_type : [params.college_type]
    query = query.in('college_type', types)
  }

  // Programs filter — college must have at least one of the requested programs
  if (params.programs && params.programs.length > 0) {
    query = query.overlaps('strong_programs', params.programs)
  }

  // Tags filter
  if (params.tags && params.tags.length > 0) {
    query = query.overlaps('tags', params.tags)
  }

  // Acceptance rate range
  if (params.max_acceptance_rate != null) {
    query = query.lte('acceptance_rate', params.max_acceptance_rate)
  }
  if (params.min_acceptance_rate != null) {
    query = query.gte('acceptance_rate', params.min_acceptance_rate)
  }

  // Financial aid
  if (params.intl_financial_aid != null) {
    query = query.eq('intl_financial_aid', params.intl_financial_aid)
  }

  // Test optional
  if (params.test_optional != null) {
    query = query.eq('test_optional', params.test_optional)
  }

  // QS rank cap
  if (params.max_qs_rank != null) {
    query = query.or(`qs_rank.lte.${params.max_qs_rank},qs_rank.is.null`)
  }

  // Ordering: ranked colleges first, then alphabetical
  query = query
    .order('qs_rank', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error) throw new Error(`College search failed: ${error.message}`)

  const total = count ?? 0

  return {
    data: (data ?? []) as CollegeRow[],
    total,
    page,
    limit,
    hasMore: offset + limit < total,
  }
}

export async function getCollegeBySlug(slug: string): Promise<CollegeRow | null> {
  const db = getCollegesDbClient()
  if (!db) return null

  const { data, error } = await db
    .from('counselly_colleges')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw new Error(`College fetch failed: ${error.message}`)
  }

  return data as CollegeRow
}

/**
 * Used by the AI `search_college_database` tool.
 * Returns a concise array of colleges the AI can reference in its response.
 */
export type CollegeAISummary = {
  name: string
  country: string
  city: string | null
  qs_rank: number | null
  acceptance_rate: number | null
  annual_tuition_usd: number | null
  intl_financial_aid: boolean
  test_optional: boolean
  avg_sat_math_25: number | null
  avg_sat_math_75: number | null
  avg_act_25: number | null
  avg_act_75: number | null
  strong_programs: string[]
  tags: string[]
  description: string | null
  notable_facts: string[]
  website_url: string | null
  application_portal: string | null
}

function rowToSummary(row: CollegeRow): CollegeAISummary {
  return {
    name: row.name,
    country: row.country,
    city: row.city,
    qs_rank: row.qs_rank,
    acceptance_rate: row.acceptance_rate,
    annual_tuition_usd: row.annual_tuition_usd,
    intl_financial_aid: row.intl_financial_aid,
    test_optional: row.test_optional,
    avg_sat_math_25: row.avg_sat_math_25,
    avg_sat_math_75: row.avg_sat_math_75,
    avg_act_25: row.avg_act_25,
    avg_act_75: row.avg_act_75,
    strong_programs: row.strong_programs,
    tags: row.tags,
    description: row.description,
    notable_facts: row.notable_facts,
    website_url: row.website_url,
    application_portal: row.application_portal,
  }
}

function normalizeCollegeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/-+/g, ' ')
    .replace(/,/g, ' ')
    .replace(/\bmain campus\b/gi, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function significantNameTokens(name: string): string[] {
  const stop = new Set(['the', 'and', 'of', 'at', 'in', 'for', 'main', 'campus'])
  return normalizeCollegeName(name)
    .split(' ')
    .filter((w) => w.length > 2 && !stop.has(w))
}

function namesLooselyMatch(query: string, candidate: string): boolean {
  const nq = normalizeCollegeName(query)
  const nc = normalizeCollegeName(candidate)
  if (!nq || !nc) return false
  if (nc.includes(nq) || nq.includes(nc)) return true

  const tq = significantNameTokens(query)
  const tc = significantNameTokens(candidate)
  if (tq.length === 0 || tc.length === 0) return false

  const matched = tq.filter((t) => tc.some((c) => c.includes(t) || t.includes(c)))
  return matched.length >= Math.max(1, Math.min(tq.length, tc.length) - 1)
}

function nameQueryVariants(name: string): string[] {
  const trimmed = name.trim()
  if (!trimmed) return []
  const base = [
    trimmed,
    trimmed.replace(/-+/g, ' ').replace(/\s+/g, ' ').trim(),
    trimmed.replace(/\s+-\s+/g, ', '),
    trimmed.replace(/\s+-\s+/g, ' '),
    trimmed.replace(/,/g, ' ').replace(/\s+/g, ' ').trim(),
    trimmed.replace(/\bMain Campus\b/gi, '').trim(),
    trimmed.replace(/\bTempe\b/gi, '').trim(),
  ]
  return [...new Set(base.filter(Boolean))]
}

export async function searchCollegesForAI(params: {
  name_query?: string
  countries?: string[]
  programs?: string[]
  tags?: string[]
  max_acceptance_rate?: number
  min_acceptance_rate?: number
  intl_financial_aid?: boolean
  limit?: number
}): Promise<CollegeAISummary[]> {
  if (params.name_query?.trim()) {
    const row = await findCollegeByName(params.name_query)
    if (row) return [rowToSummary(row)]
  }

  const countries = params.countries?.map(mapCountryToDb).filter(Boolean)
  const result = await searchColleges({
    q: params.name_query,
    country: countries?.length ? countries : params.countries?.map(mapCountryToDb),
    programs: params.name_query?.trim() ? undefined : params.programs,
    tags: params.tags,
    max_acceptance_rate: params.max_acceptance_rate,
    min_acceptance_rate: params.min_acceptance_rate,
    intl_financial_aid: params.intl_financial_aid,
    limit: Math.min(params.limit ?? 10, 25),
  })

  if (result.data.length === 0 && params.name_query?.trim()) {
    const db = getCollegesDbClient()
    if (db) {
      const loose = await db
        .from('counselly_colleges')
        .select('*')
        .ilike('name', `%${params.name_query.trim().split(/\s+/)[0]}%`)
        .order('qs_rank', { ascending: true, nullsFirst: false })
        .limit(10)
      const matched = (loose.data ?? []).filter((row) =>
        namesLooselyMatch(params.name_query!, (row as CollegeRow).name),
      )
      if (matched.length > 0) {
        return matched.map((c) => rowToSummary(c as CollegeRow))
      }
    }
  }

  return result.data.map((c) => rowToSummary(c))
}

/** Map user-facing country labels to counselly_colleges.country values. */
export function mapCountryToDb(country: string): string {
  const c = country.toLowerCase().trim()
  if (/^(usa|us|u\.s\.|united states)/.test(c)) return 'USA'
  if (/^(uk|u\.k\.|united kingdom|britain|england|scotland|wales)/.test(c)) return 'UK'
  if (/canada/.test(c)) return 'Canada'
  if (/australia/.test(c)) return 'Australia'
  if (/germany|deutschland/.test(c)) return 'Germany'
  if (/singapore/.test(c)) return 'Singapore'
  if (/netherlands|holland/.test(c)) return 'Netherlands'
  if (/india/.test(c)) return 'India'
  if (/france/.test(c)) return 'France'
  if (/switzerland/.test(c)) return 'Switzerland'
  return country.trim()
}

/** Infer strong_programs filters from discovery / onboarding study field. */
export function programsFromStudyField(field?: string | null): string[] {
  if (!field?.trim()) return ['Computer Science', 'Engineering']
  const f = field.toLowerCase()
  if (f.includes('computer') || f.includes('software') || f.includes(' ai') || f.includes('machine learning') || f.includes('data science') || f.includes('cyber')) {
    return ['Computer Science', 'Engineering', 'Mathematics']
  }
  if (f.includes('business') || f.includes('economics')) {
    return ['Business', 'Economics', 'Finance']
  }
  if (f.includes('medicine') || f.includes('neet') || f.includes('pre-med')) {
    return ['Medicine', 'Biology', 'Chemistry']
  }
  if (f.includes('engineering')) {
    return ['Engineering', 'Computer Science', 'Physics']
  }
  return ['Computer Science', 'Engineering']
}

export async function findCollegeByName(name: string): Promise<CollegeRow | null> {
  const db = getCollegesDbClient()
  if (!db) return null

  for (const variant of nameQueryVariants(name)) {
    const { data: exact } = await db
      .from('counselly_colleges')
      .select('*')
      .ilike('name', variant)
      .limit(1)
      .maybeSingle()

    if (exact) return exact as CollegeRow

    const { data: fuzzy } = await db
      .from('counselly_colleges')
      .select('*')
      .ilike('name', `%${variant}%`)
      .order('qs_rank', { ascending: true, nullsFirst: false })
      .limit(5)

    const fuzzyMatch = (fuzzy ?? []).find((row) =>
      namesLooselyMatch(name, (row as CollegeRow).name),
    )
    if (fuzzyMatch) return fuzzyMatch as CollegeRow
  }

  const tokens = significantNameTokens(name)
  const anchor = tokens[0]
  if (anchor) {
    const { data: candidates } = await db
      .from('counselly_colleges')
      .select('*')
      .ilike('name', `%${anchor}%`)
      .order('qs_rank', { ascending: true, nullsFirst: false })
      .limit(25)

    const tokenMatch = (candidates ?? []).find((row) =>
      namesLooselyMatch(name, (row as CollegeRow).name),
    )
    if (tokenMatch) return tokenMatch as CollegeRow
  }

  return null
}

export function formatCollegeKeyFacts(row: CollegeRow): string {
  const parts: string[] = []
  if (row.acceptance_rate != null) parts.push(`Acceptance: ${row.acceptance_rate}%`)
  const cost = row.annual_cost_usd ?? row.annual_tuition_usd
  if (cost != null) {
    const lakh = Math.round((cost * 83) / 100000)
    parts.push(`Cost: ~$${cost.toLocaleString('en-US')}/yr (≈₹${lakh} lakh)`)
  }
  if (row.qs_rank != null) parts.push(`QS #${row.qs_rank}`)
  parts.push(row.intl_financial_aid ? 'Intl aid: yes' : 'Intl aid: limited')
  return parts.join('; ')
}

export type RecommendationPoolBucket = {
  reach: CollegeAISummary[]
  target: CollegeAISummary[]
  safety: CollegeAISummary[]
}

export type RecommendationPool = {
  byCountry: Record<string, RecommendationPoolBucket>
  allNames: string[]
}

/** Pre-fetch verified candidates from counselly_colleges for the recommendations flow. */
export async function fetchRecommendationPool(params: {
  countries: string[]
  programs?: string[]
}): Promise<RecommendationPool> {
  const dbCountries = [...new Set(params.countries.map(mapCountryToDb).filter(Boolean))]
  const fallbackCountries = ['USA', 'UK', 'Canada', 'Germany', 'Singapore']
  const programs = params.programs

  const byCountry: Record<string, RecommendationPoolBucket> = {}
  const allNames: string[] = []

  async function fetchBucket(country: string): Promise<RecommendationPoolBucket> {
    const [reach, target, safety] = await Promise.all([
      searchCollegesForAI({ countries: [country], programs, max_acceptance_rate: 20, limit: 6 }),
      searchCollegesForAI({ countries: [country], programs, min_acceptance_rate: 20, max_acceptance_rate: 50, limit: 6 }),
      searchCollegesForAI({ countries: [country], programs, min_acceptance_rate: 50, limit: 3 }),
    ])
    return { reach, target, safety }
  }

  // Try target countries first; skip any that yield 0 colleges in the DB
  for (const country of dbCountries) {
    const bucket = await fetchBucket(country)
    if (bucket.reach.length + bucket.target.length + bucket.safety.length === 0) continue
    byCountry[country] = bucket
    for (const c of [...bucket.reach, ...bucket.target, ...bucket.safety]) {
      if (!allNames.includes(c.name)) allNames.push(c.name)
    }
  }

  // If we couldn't find colleges for ANY target country, fall back to well-covered countries
  if (Object.keys(byCountry).length === 0) {
    for (const country of fallbackCountries) {
      if (dbCountries.includes(country)) continue // already tried, had 0
      const bucket = await fetchBucket(country)
      if (bucket.reach.length + bucket.target.length + bucket.safety.length === 0) continue
      byCountry[country] = bucket
      for (const c of [...bucket.reach, ...bucket.target, ...bucket.safety]) {
        if (!allNames.includes(c.name)) allNames.push(c.name)
      }
    }
  }

  return { byCountry, allNames }
}

export function formatRecommendationPoolForPrompt(pool: RecommendationPool): string {
  const lines: string[] = [
    'Verified colleges from the Counselly database (counselly_colleges).',
    'You MUST pick 10–14 schools ONLY from the names below — use exact spelling.',
    'All acceptance rates, costs, and rankings must come from this data or search_college_database — never web_search.',
    '',
  ]

  for (const [country, bucket] of Object.entries(pool.byCountry)) {
    lines.push(`### ${country}`)
    const append = (label: string, items: CollegeAISummary[]) => {
      if (items.length === 0) return
      lines.push(`**${label}:**`)
      for (const c of items) {
        const rate = c.acceptance_rate != null ? `${c.acceptance_rate}% accept` : 'accept rate N/A'
        const cost = c.annual_tuition_usd != null ? `$${c.annual_tuition_usd.toLocaleString('en-US')}/yr` : 'cost N/A'
        const qs = c.qs_rank != null ? `QS #${c.qs_rank}` : ''
        lines.push(`- ${c.name} (${rate}; ${cost}; ${qs})`)
      }
      lines.push('')
    }
    append('Reach', bucket.reach)
    append('Target', bucket.target)
    append('Safety', bucket.safety)
  }

  return lines.join('\n')
}

function summaryKeyFacts(c: CollegeAISummary): string {
  const parts: string[] = []
  if (c.acceptance_rate != null) parts.push(`Acceptance: ${c.acceptance_rate}%`)
  if (c.annual_tuition_usd != null) {
    const lakh = Math.round((c.annual_tuition_usd * 83) / 100000)
    parts.push(`Cost: ~$${c.annual_tuition_usd.toLocaleString('en-US')}/yr (≈₹${lakh} lakh)`)
  }
  if (c.qs_rank != null) parts.push(`QS #${c.qs_rank}`)
  parts.push(c.intl_financial_aid ? 'Intl aid: yes' : 'Intl aid: limited')
  return parts.join('; ')
}

/** Deterministic shortlist when the model fails to call suggest_colleges. */
export function buildRecommendationsFromPool(
  pool: RecommendationPool,
  options?: { studyField?: string },
): DbBackedRecommendation[] {
  const field = options?.studyField?.trim() || 'your chosen field'
  const used = new Set<string>()
  const out: DbBackedRecommendation[] = []

  const add = (c: CollegeAISummary, tier: DbBackedRecommendation['tier']) => {
    if (used.has(c.name) || out.length >= 14) return
    used.add(c.name)
    out.push({
      college_name: c.name,
      country: c.country,
      tier,
      fit_summary: `Aligned with your interest in ${field} based on your discovery answers and verified Counselly data.`,
      honest_assessment:
        tier === 'reach'
          ? 'Competitive for your profile — strong academics and testing improve your odds.'
          : tier === 'safety'
            ? 'More achievable admission odds if your scores meet typical published ranges.'
            : 'Solid target-tier fit — compare your profile to typical admitted students.',
      key_facts: summaryKeyFacts(c),
    })
  }

  const countries = Object.keys(pool.byCountry)
  for (let pass = 0; pass < 4 && out.length < 14; pass++) {
    for (const country of countries) {
      const bucket = pool.byCountry[country]
      if (!bucket) continue
      if (pass === 0) {
        if (bucket.reach[0]) add(bucket.reach[0], 'reach')
        if (bucket.target[0]) add(bucket.target[0], 'target')
        if (bucket.safety[0]) add(bucket.safety[0], 'safety')
      } else if (pass === 1) {
        if (bucket.reach[1]) add(bucket.reach[1], 'reach')
        if (bucket.target[1]) add(bucket.target[1], 'target')
        if (bucket.safety[1]) add(bucket.safety[1], 'safety')
      } else {
        const safetyNames = new Set(bucket.safety.map((s) => s.name))
        const reachNames = new Set(bucket.reach.map((s) => s.name))
        for (const c of [...bucket.target, ...bucket.reach, ...bucket.safety]) {
          if (out.length >= 14) break
          const tier: DbBackedRecommendation['tier'] = safetyNames.has(c.name)
            ? 'safety'
            : reachNames.has(c.name)
              ? 'reach'
              : 'target'
          add(c, tier)
        }
      }
    }
  }

  let safetyCount = out.filter((c) => c.tier === 'safety').length
  if (safetyCount < 2) {
    for (const country of countries) {
      for (const c of pool.byCountry[country]?.safety ?? []) {
        if (safetyCount >= 2 || out.length >= 14) break
        if (used.has(c.name)) continue
        add(c, 'safety')
        safetyCount++
      }
    }
  }

  return out.slice(0, 14)
}

export type DbBackedRecommendation = {
  college_name: string
  country: string
  tier: 'reach' | 'target' | 'safety' | 'exam-cutoff'
  program?: string
  fit_summary: string
  honest_assessment: string
  key_facts?: string
}

export async function enrichRecommendationsFromDb(
  colleges: DbBackedRecommendation[],
): Promise<{ enriched: DbBackedRecommendation[]; missing: string[] }> {
  const enriched: DbBackedRecommendation[] = []
  const missing: string[] = []

  for (const college of colleges) {
    const row = await findCollegeByName(college.college_name)
    if (!row) {
      missing.push(college.college_name)
      continue
    }
    enriched.push({
      ...college,
      college_name: row.name,
      country: row.country,
      program: college.program ?? row.strong_programs[0] ?? undefined,
      key_facts: formatCollegeKeyFacts(row),
    })
  }

  return { enriched, missing }
}
