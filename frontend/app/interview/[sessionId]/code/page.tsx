import SessionCodeEditor from './SessionCodeEditor'

export default function CodePage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  return <SessionCodeEditor paramsPromise={params} />
}
