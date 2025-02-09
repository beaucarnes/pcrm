import EditContactPage from './EditContactPage'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditContactServerPage({ params }: PageProps) {
  const resolvedParams = await params
  return <EditContactPage id={resolvedParams.id} />
} 