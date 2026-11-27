import { useCollections } from '../lib/queries'
import { cx, inputClass } from './ui'

export function CollectionSelect({
  value,
  onChange,
  id,
  className,
}: {
  value: string | null
  onChange: (id: string | null) => void
  id?: string
  className?: string
}) {
  const { data: collections = [] } = useCollections()
  return (
    <select
      id={id}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={cx(inputClass, 'select', className)}
    >
      <option value="">No collection</option>
      {collections.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  )
}
