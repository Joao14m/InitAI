import DebriefView from './DebriefView'

export default function DebriefPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  return <DebriefView paramsPromise={params} />
}
