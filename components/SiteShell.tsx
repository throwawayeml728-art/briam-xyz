import SiteNav from '@/components/SiteNav'
import Footer from '@/components/Footer'

export default function SiteShell({
  children,
  number = '01',
  footer = true,
  contentClassName,
}: {
  children: React.ReactNode
  number?: string
  footer?: boolean
  contentClassName?: string
}) {
  return (
    <div className="shell" id="main">
      <div className="shell-frame">
        <SiteNav />
        <div className={['shell-content', contentClassName].filter(Boolean).join(' ')}>
          {number ? <span className="shell-num" aria-hidden="true">{number}</span> : null}
          {children}
        </div>
        {footer ? <Footer /> : null}
      </div>
    </div>
  )
}
