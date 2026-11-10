import { createServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import RuleDetailClient from './RuleDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RuleDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: rule, error } = await supabase
    .from('optimizer_rules')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !rule) {
    notFound()
  }

  return <RuleDetailClient initialRule={rule} ruleId={id} />
}