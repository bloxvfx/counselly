import { NextRequest, NextResponse } from 'next/server'
import { searchColleges } from '@/lib/colleges-db'

export const runtime = 'nodejs'

// Public endpoint — no auth required (counselly_colleges has public SELECT RLS)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const q = searchParams.get('q') ?? undefined
  const country = searchParams.getAll('country').length > 0
    ? searchParams.getAll('country')
    : searchParams.get('country') ?? undefined
  const college_type = searchParams.getAll('type').length > 0
    ? searchParams.getAll('type')
    : searchParams.get('type') ?? undefined

  const programsParam = searchParams.get('programs')
  const programs = programsParam ? programsParam.split(',').filter(Boolean) : undefined

  const tagsParam = searchParams.get('tags')
  const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined

  const max_acceptance_rate = searchParams.get('max_acceptance_rate')
    ? Number(searchParams.get('max_acceptance_rate'))
    : undefined
  const min_acceptance_rate = searchParams.get('min_acceptance_rate')
    ? Number(searchParams.get('min_acceptance_rate'))
    : undefined

  const intl_aid = searchParams.get('intl_aid')
  const intl_financial_aid = intl_aid === 'true' ? true : intl_aid === 'false' ? false : undefined

  const test_optional_param = searchParams.get('test_optional')
  const test_optional = test_optional_param === 'true' ? true : test_optional_param === 'false' ? false : undefined

  const max_qs_rank = searchParams.get('max_qs_rank')
    ? Number(searchParams.get('max_qs_rank'))
    : undefined

  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 0
  const limit = searchParams.get('limit') ? Math.min(Number(searchParams.get('limit')), 100) : 24

  try {
    const result = await searchColleges({
      q,
      country,
      college_type,
      programs,
      tags,
      max_acceptance_rate,
      min_acceptance_rate,
      intl_financial_aid,
      test_optional,
      max_qs_rank,
      page,
      limit,
    })

    return NextResponse.json(result, {
      headers: {
        // Cache for 5 minutes at CDN, 60 minutes stale-while-revalidate
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  } catch (err) {
    console.error('[/api/colleges] error:', err)
    return NextResponse.json({ error: 'Failed to fetch colleges' }, { status: 500 })
  }
}
