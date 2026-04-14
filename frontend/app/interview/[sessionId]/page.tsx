import BehavioralChat from './BehavioralChat'

export default function BehavioralPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  return <BehavioralChat paramsPromise={params} />
}
