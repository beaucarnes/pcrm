import EditContactPage from './EditContactPage'

type PageProps = {
  params: { id: string }
}

export default function EditContactServerPage({ params }: PageProps) {
  return <EditContactPage id={params.id} />
} 