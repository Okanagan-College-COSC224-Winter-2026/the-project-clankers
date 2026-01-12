import './TabNavigation.css'

interface Props {
  tabs: {
    label: string,
    path: string,
  }[]
}

export default function TabNavigation(props: Props) {
  return (
    <div className="TabNav">
      {
        props.tabs.map(tab => {
          return (
            <div
              key={tab.path}
              className={`Tab ${tab.path === window.location.pathname ? 'active' : ''}`}
              onClick={() => window.location.href = tab.path}
            >
              {tab.label}
            </div>
          )
        })
      }
    </div>
  )
}